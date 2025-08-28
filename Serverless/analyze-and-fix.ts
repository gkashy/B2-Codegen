// Analyze & Fix Serverless Function: AI-powered code debugging and fixing
// Takes failed test results and provides fixed code with detailed analysis

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// DeepSeek API Configuration
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') || 'sk-f0bed9bef90845c7a03ad816ff80d0d5'; // Use environment variable

serve(async (req) => {
  console.log('🔍 Starting code analysis and fix...');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check if API key is configured
    if (!DEEPSEEK_API_KEY) {
      return new Response(JSON.stringify({
        error: 'DEEPSEEK_API_KEY environment variable not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const requestBody = await req.json();
    const { 
      problem_id, 
      original_code, 
      failed_test_cases = [], 
      passed_test_cases = [],
      compilation_errors = '',
      runtime_errors = '',
      language = 'python'
    } = requestBody;

    if (!problem_id || !original_code) {
      return new Response(JSON.stringify({
        error: 'Missing problem_id or original_code'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch problem details
    const { data: problem, error: problemError } = await supabase
      .from('problems')
      .select('title, content_html, difficulty, parameter_map')
      .eq('id', problem_id)
      .single();

    if (problemError || !problem) {
      throw new Error(`Problem not found: ${problemError?.message}`);
    }

    console.log(`🔍 Analyzing code for problem: ${problem.title}`);

    // Build comprehensive analysis prompt
    const analysisPrompt = buildAnalysisPrompt(
      problem, 
      original_code, 
      failed_test_cases, 
      passed_test_cases,
      compilation_errors,
      runtime_errors,
      language
    );

    // Call DeepSeek API for analysis and fix
    const analysisResult = await callDeepSeekAPI(analysisPrompt);

    // Parse the AI response
    const parsedResult = parseAnalysisResult(analysisResult);

    // Store the analysis attempt for future learning
    await storeAnalysisAttempt(supabase, {
      problem_id,
      original_code,
      fixed_code: parsedResult.fixed_code,
      analysis: parsedResult.analysis,
      confidence: parsedResult.confidence,
      failed_test_count: failed_test_cases.length,
      passed_test_count: passed_test_cases.length
    });

    return new Response(JSON.stringify({
      success: true,
      analysis: parsedResult.analysis,
      fixed_code: parsedResult.fixed_code,
      confidence: parsedResult.confidence,
      changes_summary: parsedResult.changes_summary,
      key_insights: parsedResult.key_insights,
      error_types: categorizeErrors(failed_test_cases, compilation_errors, runtime_errors)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('🚨 Analysis failed:', error);
    return new Response(JSON.stringify({
      error: 'Analysis failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function buildAnalysisPrompt(problem, originalCode, failedTests, passedTests, compilationErrors, runtimeErrors, language) {
  const problemDescription = problem.content_html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  let prompt = `# Code Analysis & Debugging Task

## Problem Context
**Title:** ${problem.title}
**Difficulty:** ${problem.difficulty}
**Description:** ${problemDescription}

## Current Code (${language})
\`\`\`${language}
${originalCode}
\`\`\`

## Test Results Analysis`;

  // Add passed tests for context
  if (passedTests.length > 0) {
    prompt += `

### ✅ Passed Tests (${passedTests.length})
`;
    passedTests.slice(0, 3).forEach((test, i) => {
      prompt += `**Test ${i + 1}:** Input: ${test.input}, Expected: ${test.expected_output}, Result: ✅ PASS
`;
    });
  }

  // Add failed tests for analysis
  if (failedTests.length > 0) {
    prompt += `

### ❌ Failed Tests (${failedTests.length})
`;
    failedTests.forEach((test, i) => {
      prompt += `**Test ${i + 1}:** 
- Input: ${test.input}
- Expected: ${test.expected_output}  
- Actual: ${test.actual_output}
- Status: ${test.status}
${test.error ? `- Error: ${test.error}` : ''}

`;
    });
  }

  // Add compilation/runtime errors
  if (compilationErrors) {
    prompt += `
### 🔥 Compilation Errors
${compilationErrors}
`;
  }

  if (runtimeErrors) {
    prompt += `
### ⚡ Runtime Errors  
${runtimeErrors}
`;
  }

  prompt += `

## Your Task
Analyze the code failures and provide a complete fix. Respond in this EXACT format:

### ANALYSIS
[Detailed explanation of why the code failed - be specific about logic errors, edge cases, algorithm issues]

### ROOT_CAUSE
[Primary reason for failure - algorithmic, implementation, edge case handling, etc.]

### FIXED_CODE
\`\`\`${language}
[Complete corrected code - full solution that addresses all issues]
\`\`\`

### CHANGES_SUMMARY
[Bullet points of what was changed and why]

### KEY_INSIGHTS
[Important lessons learned from this debugging session]

### CONFIDENCE
[Score from 1-10 indicating confidence in the fix]

Focus on:
1. **Logic errors** in algorithm implementation
2. **Edge cases** not handled properly  
3. **Data structure** usage issues
4. **Boundary conditions** and **off-by-one** errors
5. **Performance optimizations** if needed

Provide working, tested code that will pass all test cases.`;

  return prompt;
}

async function callDeepSeekAPI(prompt) {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are an expert code debugger and algorithm specialist. Analyze failed code and provide precise fixes with detailed explanations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3, // Lower temperature for more precise debugging
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

function parseAnalysisResult(aiResponse) {
  const sections = {
    analysis: '',
    root_cause: '',
    fixed_code: '',
    changes_summary: '',
    key_insights: '',
    confidence: 7 // Default confidence
  };

  try {
    // Extract each section using regex
    const analysisMatch = aiResponse.match(/### ANALYSIS\s*([\s\S]*?)(?=### |$)/);
    if (analysisMatch) sections.analysis = analysisMatch[1].trim();

    const rootCauseMatch = aiResponse.match(/### ROOT_CAUSE\s*([\s\S]*?)(?=### |$)/);
    if (rootCauseMatch) sections.root_cause = rootCauseMatch[1].trim();

    const codeMatch = aiResponse.match(/### FIXED_CODE\s*```[a-zA-Z]*\s*([\s\S]*?)```/);
    if (codeMatch) sections.fixed_code = codeMatch[1].trim();

    const changesMatch = aiResponse.match(/### CHANGES_SUMMARY\s*([\s\S]*?)(?=### |$)/);
    if (changesMatch) sections.changes_summary = changesMatch[1].trim();

    const insightsMatch = aiResponse.match(/### KEY_INSIGHTS\s*([\s\S]*?)(?=### |$)/);
    if (insightsMatch) sections.key_insights = insightsMatch[1].trim();

    const confidenceMatch = aiResponse.match(/### CONFIDENCE\s*(\d+)/);
    if (confidenceMatch) sections.confidence = parseInt(confidenceMatch[1]);

    return sections;
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return {
      analysis: 'Failed to parse analysis result',
      fixed_code: '# Analysis parsing failed',
      confidence: 3,
      changes_summary: 'Unable to extract changes',
      key_insights: 'Parsing error occurred'
    };
  }
}

function categorizeErrors(failedTests, compilationErrors, runtimeErrors) {
  const errorTypes = [];

  if (compilationErrors) {
    errorTypes.push('syntax_error');
  }

  if (runtimeErrors) {
    if (runtimeErrors.includes('IndexError') || runtimeErrors.includes('list index')) {
      errorTypes.push('index_error');
    }
    if (runtimeErrors.includes('KeyError')) {
      errorTypes.push('key_error');
    }
    if (runtimeErrors.includes('TypeError')) {
      errorTypes.push('type_error');
    }
    if (runtimeErrors.includes('RecursionError')) {
      errorTypes.push('recursion_error');
    }
    if (runtimeErrors.includes('TimeLimit') || runtimeErrors.includes('timeout')) {
      errorTypes.push('performance_error');
    }
  }

  // Analyze failed test patterns
  if (failedTests.length > 0) {
    const hasWrongOutput = failedTests.some(t => t.actual_output && t.actual_output !== t.expected_output);
    const hasEmptyOutput = failedTests.some(t => !t.actual_output || t.actual_output === '');
    
    if (hasWrongOutput) errorTypes.push('logic_error');
    if (hasEmptyOutput) errorTypes.push('no_output_error');
  }

  return errorTypes.length > 0 ? errorTypes : ['unknown_error'];
}

async function storeAnalysisAttempt(supabase, analysisData) {
  try {
    await supabase
      .from('code_analysis_attempts')
      .insert({
        problem_id: analysisData.problem_id,
        original_code: analysisData.original_code,
        fixed_code: analysisData.fixed_code,
        analysis_summary: analysisData.analysis,
        confidence_score: analysisData.confidence,
        failed_test_count: analysisData.failed_test_count,
        passed_test_count: analysisData.passed_test_count,
        created_at: new Date().toISOString()
      });
    
    console.log('✅ Analysis attempt stored successfully');
  } catch (error) {
    console.error('Failed to store analysis attempt:', error);
    // Don't throw - this is optional logging
  }
}