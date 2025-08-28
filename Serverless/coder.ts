// Coder Agent - Individual Serverless Function
// Deploy as: coder
// URL: https://mbuiluhrtlgyawlqchaq.supabase.co/functions/v1/coder

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
    const { prompt, problem_title, coding_type = 'initial' } = await req.json()

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`💻 CODER: ${coding_type === 'initial' ? 'Initial implementation' : 'Fixing code'} for ${problem_title}`)

    const result = await callDeepSeekAPI(prompt, coding_type)
    const cleanCode = extractPureCode(result)

    return new Response(JSON.stringify({
      success: true,
      result: cleanCode,
      raw_result: result,
      agent: 'coder',
      coding_type: coding_type,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Coder error:', error)
    return new Response(JSON.stringify({
      error: 'Coder failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function callDeepSeekAPI(prompt: string, codingType: string): Promise<string> {
  try {
    const systemPrompt = getSystemPrompt(codingType)
    
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
        temperature: 0.1
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

function getSystemPrompt(codingType: string): string {
  const base = `You are the CODER - expert at clean, efficient code implementation.
🚨 CRITICAL: Output ONLY raw Python code. No markdown (no \`\`\`python), no explanations, no text.
Start directly with 'from typing import List' or 'class Solution:' and end with Python code only. Nothing else.`
  
  switch (codingType) {
    case 'initial':
      return `${base} You are implementing the initial solution based on analysis and plan.`
    case 'fixing':
      return `${base} You are fixing code based on reviewer feedback. Focus on the specific issues mentioned.`
    case 'test_fixing':
      return `${base} You are fixing code that failed tests. Focus on the test failure patterns and edge cases.`
    default:
      return base
  }
}

function extractPureCode(content: string): string {
  // Remove any markdown blocks
  let cleaned = content.replace(/```python\n?/g, '').replace(/```/g, '')
  
  // Find actual Python code
  const lines = cleaned.split('\n')
  const codeLines: string[] = []
  let foundCode = false
  
  for (const line of lines) {
    if (line.includes('from typing import') || line.includes('class Solution:') || line.includes('def ')) {
      foundCode = true
    }
    
    if (foundCode) {
      // Stop at explanation text
      if (line.trim().startsWith('###') || 
          line.trim().startsWith('Explanation') ||
          line.trim().startsWith('This approach')) {
        break
      }
      codeLines.push(line)
    }
  }
  
  return codeLines.join('\n').trim() || cleaned.trim()
}