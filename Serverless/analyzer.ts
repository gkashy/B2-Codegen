// Analyzer Agent - Individual Serverless Function
// Deploy as: analyzer
// URL: https://mbuiluhrtlgyawlqchaq.supabase.co/functions/v1/analyzer

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// DeepSeek API Configuration
const DEEPSEEK_API_KEY = "sk-43c52ba16c3f4308890bc63e21cae08a"
const DEEPSEEK_BASE_URL = "https://api.deepseek.com"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, problem_title } = await req.json()

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 ANALYZER: Starting analysis for ${problem_title}`)

    const result = await callDeepSeekAPI(prompt)

    return new Response(JSON.stringify({
      success: true,
      result: result,
      agent: 'analyzer',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Analyzer error:', error)
    return new Response(JSON.stringify({
      error: 'Analyzer failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function callDeepSeekAPI(prompt: string): Promise<string> {
  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are the ANALYZER - expert at problem analysis and pattern recognition. Be thorough and methodical.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`)
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      throw new Error(`Invalid response format: ${text.substring(0, 200)}`)
    }

    const data = await response.json()
    
    if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error(`Invalid API response structure: ${JSON.stringify(data)}`)
    }

    return data.choices[0].message.content
  } catch (error) {
    console.error('DeepSeek API call failed:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`API call failed: ${String(error)}`)
  }
}