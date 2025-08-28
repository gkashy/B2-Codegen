// Reviewer Agent - Individual Serverless Function
// Deploy as: reviewer
// URL: https://mbuiluhrtlgyawlqchaq.supabase.co/functions/v1/reviewer

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
    const { prompt, problem_title, review_type = 'general' } = await req.json()

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 REVIEWER: Starting ${review_type} review for ${problem_title}`)

    const result = await callDeepSeekAPI(prompt, review_type)

    return new Response(JSON.stringify({
      success: true,
      result: result,
      agent: 'reviewer',
      review_type: review_type,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Reviewer error:', error)
    return new Response(JSON.stringify({
      error: 'Reviewer failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function callDeepSeekAPI(prompt: string, reviewType: string): Promise<string> {
  try {
    const systemPrompt = getSystemPrompt(reviewType)
    
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
            content: systemPrompt
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

function getSystemPrompt(reviewType: string): string {
  const base = "You are the REVIEWER - expert at code review and quality assurance. Be critical but constructive."
  
  switch (reviewType) {
    case 'analysis':
      return `${base} You are reviewing a problem analysis. Check for completeness, accuracy, and missing insights. If satisfied, include "ANALYSIS_APPROVED" in your response.`
    case 'code_review':
      return `${base} You are reviewing code for correctness, quality, and completeness. If the code is perfect and ready for testing, include "PERFECT" or "CODE_APPROVED" in your response.`
    case 'test_failure':
      return `${base} You are analyzing test failures. Identify root causes and provide specific, actionable guidance for fixing the code.`
    case 'quick_approval':
      return `${base} You are doing a quick review of test-fixed code. If it looks good, include "LOOKS_GOOD" or "APPROVED" in your response.`
    case 'failure_analysis':
      return `${base} You are analyzing test failures. Provide specific, actionable feedback on what went wrong and how to fix it.`
    default:
      return base
  }
}