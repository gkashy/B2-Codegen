import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// DeepSeek API Configuration
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') || "sk-f0bed9bef90845c7a03ad816ff80d0d5";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

serve(async (req) => {
  console.log('Received request:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check if API key is configured
    if (!DEEPSEEK_API_KEY) {
      return new Response(JSON.stringify({
        error: 'DEEPSEEK_API_KEY environment variable not configured. Please add your DeepSeek API key to Supabase environment variables.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let requestBody;
    let rawBody;
    try {
      rawBody = await req.text();
      console.log('Raw request body:', rawBody);
      
      if (!rawBody.trim()) {
        console.error('Empty request body received');
        return new Response(
          JSON.stringify({ error: 'Empty request body received' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      requestBody = JSON.parse(rawBody);
      console.log('Parsed request body:', requestBody);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError, 'Raw body:', rawBody);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message,
          receivedBody: rawBody?.substring(0, 100) + (rawBody?.length > 100 ? '...' : '')
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      problem_id, 
      count = 5, 
      difficulty_level = 'medium',
      focus_areas = [], // ['edge_cases', 'performance', 'boundary_conditions']
      should_save = false, // Control whether to save to database
      test_cases_to_save = null // NEW: Exact test cases to save (for preview->save flow)
    } = requestBody;

    if (!problem_id) {
      return new Response(
        JSON.stringify({ error: 'Missing problem_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch problem details
    const { data: problem, error: dbError } = await supabase
      .from('problems')
      .select('*')
      .eq('id', problem_id)
      .single();

    if (dbError || !problem) {
      return new Response(
        JSON.stringify({ error: 'Problem not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let generatedTestCases = [];
    let insertedTestCases = null;

    if (should_save && test_cases_to_save) {
      // SAVE MODE: Save the exact test cases provided by user
      console.log(`💾 Saving ${test_cases_to_save.length} user-selected test cases`);
      
      const testCaseInserts = test_cases_to_save.map(testCase => ({
        problem_id: problem_id, // int4
        input_data: testCase.input_data, // jsonb - array of inputs
        expected_output: testCase.expected_output, // jsonb - expected result
        source: 'llm_generated', // varchar(20)
        difficulty_level: testCase.difficulty_level || 'medium', // varchar(10)
        pass_rate: 0.0, // float8 - initial value
        failure_count: 0, // int4
        success_count: 0, // int4
        generated_by: 'deepseek-chat', // varchar(50)
        generation_prompt: testCase.generation_reasoning || '', // text
        generation_reasoning: testCase.explanation || '', // text
        is_active: true, // bool
        is_validated: false, // bool
        created_at: new Date().toISOString() // timestamptz
      }));

      const { data: savedTestCases, error: insertError } = await supabase
        .from('test_cases')
        .insert(testCaseInserts)
        .select();

      if (insertError) {
        console.error('Failed to insert test cases:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save test cases' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      insertedTestCases = savedTestCases;
      generatedTestCases = test_cases_to_save; // Return the saved test cases
      
    } else {
      // GENERATE MODE: Generate new test cases (don't save)
      console.log(`🧠 Generating ${count} new test cases for preview`);
      
      // Get existing test cases for context
      const { data: existingTestCases } = await supabase
        .from('test_cases')
        .select('*')
        .eq('problem_id', problem_id)
        .eq('is_active', true);

      // Generate new test cases using LLM
      generatedTestCases = await generateTestCasesWithLLM(
        problem, 
        existingTestCases || [], 
        count, 
        difficulty_level, 
        focus_areas
      );
    }

    // Only update problem metrics if we actually saved test cases
    if (should_save && insertedTestCases) {
      await updateProblemMetrics(supabase, problem_id);
    }

    return new Response(JSON.stringify({
      success: true,
      generated_count: generatedTestCases.length,
      test_cases: generatedTestCases, // Always return generated test cases for preview
      saved_test_cases: insertedTestCases, // Only populated if saved
      was_saved: should_save,
      metadata: {
        problem_id,
        difficulty_level,
        focus_areas,
        generation_timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Test case generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateTestCasesWithLLM(problem, existingTestCases, count, difficultyLevel, focusAreas) {
  const prompt = buildTestGenerationPrompt(problem, existingTestCases, count, difficultyLevel, focusAreas);
  
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
          content: `You are a test case generation expert. Generate comprehensive, diverse test cases for coding problems.

CRITICAL INSTRUCTIONS:
- Respond with ONLY a valid JSON array
- NO markdown code blocks (no \`\`\`json or \`\`\`)
- NO explanatory text before or after
- Start directly with [ and end with ]
- Each test case must be valid and solvable
- NEVER generate duplicate inputs - check against ALL existing test cases
- MAINTAIN exact format consistency with existing test cases
- Generate UNIQUE test scenarios that add new coverage

Format:
[
  {
    "input_data": [param1, param2, ...],
    "expected_output": result,
    "difficulty_level": "easy|medium|hard|expert",
    "explanation": "Why this test case is important",
    "generation_reasoning": "What aspect this tests"
  }
]

DUPLICATE PREVENTION: Before generating each test case, mentally verify that the input_data does NOT match any existing test case inputs shown in the user prompt.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.7
    })
  });

  const data = await response.json();
  let content = data.choices[0].message.content;
  
  try {
    // Strip markdown code blocks if present
    if (content.includes('```json')) {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        content = jsonMatch[1];
      }
    } else if (content.includes('```')) {
      // Handle generic code blocks
      const codeMatch = content.match(/```[\s\S]*?\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        content = codeMatch[1];
      }
    }
    
    console.log('Cleaned content for parsing:', content.substring(0, 200) + '...');
    
    const parsedTestCases = JSON.parse(content);
    console.log('🔍 Parsed test cases preview:', parsedTestCases.map(tc => ({
      input_data: tc.input_data,
      expected_output: tc.expected_output,
      has_input: tc.input_data !== undefined && tc.input_data !== null,
      has_output: tc.expected_output !== undefined && tc.expected_output !== null
    })));
    
    // Validate that it's an array
    if (!Array.isArray(parsedTestCases)) {
      throw new Error('LLM response is not an array of test cases');
    }
    
    // Validate each test case has required fields
    for (const testCase of parsedTestCases) {
      if (testCase.input_data === undefined || testCase.input_data === null || 
          testCase.expected_output === undefined || testCase.expected_output === null) {
        console.error('❌ Invalid test case:', testCase);
        throw new Error('Test case missing required fields: input_data or expected_output');
      }
    }
    
    console.log(`✅ Successfully parsed and validated ${parsedTestCases.length} test cases`);
    console.log('🎯 All test cases have valid input_data and expected_output fields');
    return parsedTestCases;
    
  } catch (parseError) {
    console.error('Failed to parse LLM response:', parseError.message);
    console.error('Raw content:', content.substring(0, 500) + '...');
    throw new Error(`Failed to generate valid test cases: ${parseError.message}`);
  }
}

function buildTestGenerationPrompt(problem, existingTestCases, count, difficultyLevel, focusAreas) {
  const problemText = problem.content_html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const parameterMap = problem.parameter_map?.split(',').map(p => p.trim()) || [];
  
  let prompt = `
Problem: ${problem.title}
Difficulty: ${problem.difficulty}
Description: ${problemText}

Parameter Map: ${parameterMap.join(', ')}
Starting Code Template:
${problem.code}

Existing Test Cases (${existingTestCases.length}):`;

  // Show ALL existing test cases to prevent duplicates (limited to reasonable amount)
  const testCasesToShow = Math.min(existingTestCases.length, 10); // Show up to 10 existing cases
  existingTestCases.slice(0, testCasesToShow).forEach((tc, i) => {
    prompt += `\n${i + 1}. Input: ${JSON.stringify(tc.input_data)} → Output: ${JSON.stringify(tc.expected_output)}`;
  });

  if (existingTestCases.length > testCasesToShow) {
    prompt += `\n... and ${existingTestCases.length - testCasesToShow} more existing test cases`;
  }

  prompt += `\n\nGENERATE ${count} NEW test cases with difficulty level: ${difficultyLevel}`;
  
  if (focusAreas.length > 0) {
    prompt += `\nFocus on: ${focusAreas.join(', ')}`;
  }

  prompt += `\n\nCRITICAL REQUIREMENTS:
🚫 AVOID DUPLICATES: Do NOT generate test cases with inputs that match ANY of the ${existingTestCases.length} existing test cases above
📐 MAINTAIN FORMAT: Use the exact same JSON structure and data types as existing test cases
🎯 NEW SCENARIOS: Cover edge cases, corner cases, and input patterns NOT covered by existing tests
✅ DIVERSE INPUTS: Ensure each new test case tests different aspects/scenarios
🔍 UNIQUE VALUE: Each test case should add unique coverage to the test suite

Additional Requirements:
- Include boundary conditions not covered by existing tests
- Test different algorithmic execution paths  
- Validate correctness of expected outputs
- Ensure inputs are within problem constraints`;

  // Add problem-specific validation
  if (problem.title.toLowerCase().includes('sudoku')) {
    prompt += `\n- For Sudoku: Ensure all expected outputs are VALID Sudoku solutions (no duplicate numbers in rows/columns/boxes)
- Verify each row contains digits 1-9 exactly once
- Verify each column contains digits 1-9 exactly once  
- Verify each 3x3 box contains digits 1-9 exactly once`;
  }

  prompt += `\n\nGenerate comprehensive test cases that would catch bugs and verify solution correctness.`;

  return prompt;
}

async function updateProblemMetrics(supabase, problemId) {
  // Get current test case count
  const { count: testCaseCount } = await supabase
    .from('test_cases')
    .select('*', { count: 'exact' })
    .eq('problem_id', problemId)
    .eq('is_active', true);

  const { count: generatedCount } = await supabase
    .from('test_cases')
    .select('*', { count: 'exact' })
    .eq('problem_id', problemId)
    .eq('source', 'llm_generated')
    .eq('is_active', true);

  const { count: originalCount } = await supabase
    .from('test_cases')
    .select('*', { count: 'exact' })
    .eq('problem_id', problemId) 
    .eq('source', 'original')
    .eq('is_active', true);

  // Upsert metrics with proper data types
  await supabase
    .from('problem_metrics')
    .upsert({
      problem_id: problemId, // int4
      total_test_cases: testCaseCount || 0, // int4
      generated_test_cases: generatedCount || 0, // int4
      original_test_cases: originalCount || 0, // int4
      last_updated: new Date().toISOString() // timestamptz
    }, {
      onConflict: 'problem_id'
    });
}