import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// DeepSeek API Configuration for intelligent parsing
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { problem_id, raw_test_cases, problem_context } = await req.json();
    
    if (!problem_id) {
      return new Response(JSON.stringify({
        error: 'Missing problem_id'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch problem details if not provided
    let problem = problem_context;
    if (!problem) {
      const { data: problemData, error } = await supabase
        .from('problems')
        .select('*')
        .eq('id', problem_id)
        .single();
      
      if (error || !problemData) {
        return new Response(JSON.stringify({
          error: 'Problem not found'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      problem = problemData;
    }

    // Fetch raw test cases if not provided
    let testCasesData = raw_test_cases;
    if (!testCasesData) {
      const { data, error } = await supabase
        .from('test_cases')
        .select('*')
        .eq('problem_id', problem_id)
        .eq('is_active', true)
        .order('id');
      
      if (error) {
        console.error('Error fetching test cases:', error);
        return new Response(JSON.stringify({
          error: 'Failed to fetch test cases'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      testCasesData = data || [];
    }

    console.log(`🔍 Processing ${testCasesData.length} test cases for problem ${problem_id}`);

    // Process test cases with LLM intelligence
    const processedTestCases = await processTestCasesWithLLM(problem, testCasesData);

    // Return formatted test cases ready for smart-handler
    return new Response(JSON.stringify({
      problem_id,
      processed_test_cases: processedTestCases,
      metadata: {
        original_count: testCasesData.length,
        processed_count: processedTestCases.length,
        problem_title: problem.title,
        parameter_map: problem.parameter_map
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in test case preprocessor:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processTestCasesWithLLM(problem, rawTestCases) {
  console.log('🤖 Using LLM for intelligent test case parsing...');
  
  // For small datasets, process directly
  if (rawTestCases.length <= 3) {
    return await processTestCasesDirectlyWithLLM(problem, rawTestCases);
  }
  
  // For larger datasets, use pattern detection + LLM validation
  return await processTestCasesWithPatternDetection(problem, rawTestCases);
}

async function processTestCasesDirectlyWithLLM(problem, rawTestCases) {
  if (!DEEPSEEK_API_KEY) {
    console.log('⚠️ No LLM API key, falling back to heuristic parsing');
    return processTestCasesHeuristically(problem, rawTestCases);
  }

  const prompt = buildParsingPrompt(problem, rawTestCases);
  
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
            content: `You are a LeetCode test case parsing expert. Your job is to transform raw test case data into the exact parameter format needed for function execution.

CORE MISSION:
Transform raw input_data arrays into individual function parameters that match the function signature exactly.

STEP-BY-STEP PROCESS:
1.  READ the function signature to understand parameter types and names
2.  COUNT how many input parameters the function expects
3.  ANALYZE the raw input_data structure 
4.  SPLIT/FORMAT the data to match each parameter exactly
5.  VALIDATE that formatted_inputs length matches expected parameter count

TRANSFORMATION EXAMPLES BY PROBLEM TYPE:

 Array Problems:
Function: twoSum(nums, target)
Raw input_data: [[2,7,11,15], 9]
Formatted: [2,7,11,15], 9 (array and number)

Function: findMedianSortedArrays(nums1, nums2)  
Raw input_data: [[1,3], [2]]
Formatted: [1,3], [2] (two separate arrays)

 String Problems:
Function: longestPalindrome(s)
Raw input_data: ["babad"]
Formatted: "babad" (single string)

Function: isAnagram(s, t)
Raw input_data: ["anagram", "nagaram"]  
Formatted: "anagram", "nagaram" (two strings)

 Tree Problems:
Function: maxDepth(root)
Raw input_data: [[3,9,20,null,null,15,7]]
Formatted: [3,9,20,null,null,15,7] (tree array representation)

Function: lowestCommonAncestor(root, p, q)
Raw input_data: [[6,2,8,0,4,7,9,null,null,3,5], 2, 8]
Formatted: [6,2,8,0,4,7,9,null,null,3,5], 2, 8 (tree + two values)

 Linked List Problems:
Function: reverseList(head)
Raw input_data: [[1,2,3,4,5]]
Formatted: [1,2,3,4,5] (list array representation)

Function: mergeTwoLists(list1, list2)
Raw input_data: [[1,2,4], [1,3,4]]
Formatted: [1,2,4], [1,3,4] (two separate lists)

 Matrix/2D Problems:
Function: solveSudoku(board)
Raw input_data: [[[5,3,0],[6,0,0]]]
Formatted: [[5,3,0],[6,0,0]] (single 2D array)

Function: searchMatrix(matrix, target)
Raw input_data: [[[1,4,7],[2,5,8]], 5]
Formatted: [[1,4,7],[2,5,8]], 5 (matrix and target)

 Graph Problems:
Function: canFinish(numCourses, prerequisites)
Raw input_data: [2, [[1,0]]]
Formatted: 2, [[1,0]] (number and 2D array)

Function: numIslands(grid)
Raw input_data: [[["1","1","0"],["0","1","0"]]]
Formatted: [["1","1","0"],["0","1","0"]] (single 2D grid)

 Interval Problems:
Function: merge(intervals)
Raw input_data: [[[1,3],[2,6],[8,10]]]
Formatted: [[1,3],[2,6],[8,10]] (array of intervals)

Function: canAttendMeetings(intervals)
Raw input_data: [[[0,30],[5,10],[15,20]]]
Formatted: [[0,30],[5,10],[15,20]] (array of intervals)

 Math/Multiple Types:
Function: myPow(x, n)
Raw input_data: [2.0, 10]
Formatted: 2.0, 10 (float and integer)

Function: divide(dividend, divisor)  
Raw input_data: [10, 3]
Formatted: 10, 3 (two integers)

RESPONSE FORMAT (JSON only, no markdown):
[
  {
    "id": test_case_id,
    "formatted_inputs": [param1_value, param2_value, ...],  
    "expected_output": expected_result,
    "parsing_reasoning": "How you transformed the input",
    "original_input_data": original_raw_data
  }
]

CRITICAL VALIDATION:
- formatted_inputs.length MUST equal the number of function input parameters
- Each element in formatted_inputs MUST match the corresponding parameter type
- The transformation MUST be reversible and logical

EXPECTED OUTPUT FORMATTING:
- If expected_output is a Python string representation (e.g. "['a', 'b']" or "[1, 2, 3]"), convert it to proper JSON format
- Replace single quotes with double quotes: 'a' → "a"
- Replace Python booleans: True → true, False → false, None → null
- Return the parsed object/array, not the string representation
- Example: "['AAAAACCCCC', 'CCCCCAAAAA']" should become ["AAAAACCCCC", "CCCCCAAAAA"]`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.1,  // Low temperature for consistent parsing
        stream: true       // ENABLE STREAMING!
      })
    });

    // Handle streaming response
    if (!response.body) {
      throw new Error('No response body received from DeepSeek API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = '';
    
    console.log(' Processing streaming response from DeepSeek...');
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const data = line.replace('data: ', '').trim();
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                content += parsed.choices[0].delta.content;
              }
            } catch (e) {
              // Skip invalid JSON chunks
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    console.log(` Received ${content.length} characters from streaming response`);
    
    // Clean any markdown formatting
    content = cleanLLMResponse(content);
    
    const parsedResults = JSON.parse(content);
    console.log(` LLM successfully parsed ${parsedResults.length} test cases`);
    
    return parsedResults;
    
  } catch (error) {
    console.error('Streaming LLM parsing failed, trying non-streaming fallback:', error);
    
    // Fallback: Try non-streaming request
    try {
      console.log(' Attempting non-streaming fallback...');
      const fallbackResponse = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
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
              content: `You are a LeetCode test case parsing expert. Transform raw input_data arrays into individual function parameters that match the function signature exactly. Also convert Python-formatted expected outputs (e.g., "['a', 'b']") to proper JSON format (e.g., ["a", "b"]). Return JSON format only.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.1
          // No stream: true - blocking request as fallback
        })
      });
      
      const fallbackData = await fallbackResponse.json();
      let fallbackContent = fallbackData.choices[0].message.content;
      fallbackContent = cleanLLMResponse(fallbackContent);
      
      const fallbackResults = JSON.parse(fallbackContent);
      console.log(` Non-streaming fallback succeeded with ${fallbackResults.length} test cases`);
      return fallbackResults;
      
    } catch (fallbackError) {
      console.error('Both streaming and non-streaming LLM failed, using heuristics:', fallbackError);
      return processTestCasesHeuristically(problem, rawTestCases);
    }
  }
}

async function processTestCasesWithPatternDetection(problem, rawTestCases) {
  console.log(' Using pattern detection + LLM validation for large dataset');
  
  // Analyze first few test cases with LLM to detect pattern
  const sampleCases = rawTestCases.slice(0, 3);
  const patternAnalysis = await processTestCasesDirectlyWithLLM(problem, sampleCases);
  
  // Apply detected pattern to remaining test cases
  const remainingCases = rawTestCases.slice(3);
  const patternResults = remainingCases.map(tc => 
    applyDetectedPattern(tc, patternAnalysis, problem)
  );
  
  return [...patternAnalysis, ...patternResults];
}

function buildParsingPrompt(problem, rawTestCases) {
  const parameterMap = problem.parameter_map?.split(',').map(p => p.trim()) || [];
  const inputParams = parameterMap.filter(p => p !== 'output');
  
  // Extract function name and signature from code
  const functionMatch = problem.code.match(/def\s+(\w+)\s*\([^)]*\)/);
  const functionSignature = functionMatch ? functionMatch[0] : 'Function signature not found';
  const functionName = functionMatch ? functionMatch[1] : 'unknown';
  
  return `
PROBLEM CONTEXT:
Title: "${problem.title}"
Difficulty: ${problem.difficulty}
Parameter Map: [${parameterMap.join(', ')}]

FUNCTION SIGNATURE:
${functionSignature}

PARSING OBJECTIVE:
Transform raw input_data into ${inputParams.length} separate parameters for ${functionName}(${inputParams.join(', ')})

SPECIFIC MAPPING REQUIRED:
${inputParams.map((param, i) => `Parameter ${i + 1}: "${param}"`).join('\n')}

RAW TEST CASES TO TRANSFORM:
${rawTestCases.map((tc, i) => `
━━━ Test Case ${i + 1} ━━━
ID: ${tc.id}
Raw input_data: ${JSON.stringify(tc.input_data)}
Expected output: ${JSON.stringify(tc.expected_output)}

TASK: Split input_data into ${inputParams.length} parameters:
${inputParams.map((param, idx) => `  ${param} = ?`).join('\n')}
`).join('')}

PARSING RULES & EXAMPLES:
1. If input_data is a ${inputParams.length}-element array where each element matches a parameter:
   Example: [[1,2], [3,4]] → ${inputParams[0]}=[1,2], ${inputParams[1] || 'param2'}=[3,4]

2. If input_data is a nested structure that needs unwrapping:
   Example: [[[board_data]]] → ${inputParams[0]}=[[board_data]] (single 2D parameter)

3. If input_data is already in correct format:
   Example: [val1, val2] → ${inputParams[0]}=val1, ${inputParams[1] || 'param2'}=val2

CRITICAL SUCCESS CRITERIA:
- The formatted_inputs array MUST have exactly ${inputParams.length} elements
- Each element corresponds to: [${inputParams.join(', ')}]
- The function call ${functionName}(...formatted_inputs) must be valid

Analyze each test case and determine the correct parameter splitting strategy.
`;
}

function applyDetectedPattern(testCase, patternSamples, problem) {
  // Extract the parsing logic from successful LLM patterns
  const firstSample = patternSamples[0];
  if (!firstSample) {
    return processTestCaseHeuristically(testCase, problem);
  }
  
  // Apply similar transformation logic
  try {
    // Simple pattern matching based on structure similarity
    const inputData = testCase.input_data;
    const sampleInput = patternSamples[0].original_input_data;
    const sampleFormatted = patternSamples[0].formatted_inputs;
    
    // If structures are similar, apply the same transformation
    if (JSON.stringify(inputData).length === JSON.stringify(sampleInput).length &&
        Array.isArray(inputData) === Array.isArray(sampleInput)) {
      
      if (Array.isArray(inputData) && Array.isArray(sampleInput) && 
          inputData.length === sampleInput.length) {
        // Apply the same splitting logic
        return {
          id: testCase.id,
          formatted_inputs: inputData,
          expected_output: formatExpectedOutput(testCase.expected_output),
          parsing_reasoning: "Applied detected pattern from LLM analysis",
          original_input_data: testCase.input_data
        };
      }
    }
    
    // Fallback to heuristic
    return processTestCaseHeuristically(testCase, problem);
    
  } catch (error) {
    console.error('Pattern application failed:', error);
    return processTestCaseHeuristically(testCase, problem);
  }
}

function processTestCasesHeuristically(problem, rawTestCases) {
  console.log('🔧 Using heuristic parsing (fallback)');
  
  return rawTestCases.map(tc => processTestCaseHeuristically(tc, problem));
}

function processTestCaseHeuristically(testCase, problem) {
  const parameterMap = problem.parameter_map?.split(',').map(p => p.trim()) || [];
  const expectedInputParams = parameterMap.filter(param => param !== 'output').length;
  
  let parsedInputData = testCase.input_data;
  
  // Handle string inputs that need JSON parsing
  if (typeof parsedInputData === 'string') {
    try {
      parsedInputData = JSON.parse(parsedInputData);
    } catch (e) {
      // Keep as string if parsing fails
    }
  }
  
  let formattedInputs;
  let reasoning;
  
  //  ENHANCED HEURISTIC LOGIC for different problem types
  
  // Case 1: Single parameter expected
  if (expectedInputParams === 1) {
    if (Array.isArray(parsedInputData) && parsedInputData.length === 1) {
      // Check if this is a wrapped 2D matrix (common for Sudoku, matrix problems, Clone Graph)
      if (Array.isArray(parsedInputData[0]) && Array.isArray(parsedInputData[0][0])) {
        // Detect Clone Graph adjacency list: [[[2,4],[1,3]]] → [[2,4],[1,3]]
        if (problem.function_name && problem.function_name.toLowerCase().includes('clone')) {
          formattedInputs = parsedInputData; // Unwrap once: [[[adjacency]]] → [[adjacency]]
          reasoning = "Unwrapped Clone Graph adjacency list from triple-nested structure";
        } else {
          // This is a wrapped 2D matrix: [[2D_matrix]] → [2D_matrix]
          formattedInputs = parsedInputData;
          reasoning = "Unwrapped 2D matrix from triple-nested structure";
        }
      } else {
        // Regular single-element array: ["string"] → "string"
        formattedInputs = [parsedInputData[0]];
        reasoning = "Unwrapped single-element array";
      }
    } else if (Array.isArray(parsedInputData) && Array.isArray(parsedInputData[0]) && 
               typeof parsedInputData[0][0] === 'string' && parsedInputData.length === 9 &&
               parsedInputData[0].length === 9) {
      // Special case: Sudoku 9x9 board detection
      formattedInputs = [parsedInputData];
      reasoning = "Detected Sudoku 9x9 board - kept as 2D matrix";
    } else if (Array.isArray(parsedInputData) && Array.isArray(parsedInputData[0]) && 
               problem.function_name && problem.function_name.toLowerCase().includes('clone')) {
      // Clone Graph adjacency list: [[2,4],[1,3]] (already correct format)
      formattedInputs = [parsedInputData];
      reasoning = "Clone Graph adjacency list - kept as 2D adjacency matrix";
    } else if (Array.isArray(parsedInputData) && Array.isArray(parsedInputData[0])) {
      // This is already a 2D matrix, don't wrap it again
      formattedInputs = [parsedInputData];
      reasoning = "Kept 2D matrix as single parameter (matrix problem)";
    } else {
      // Keep as-is for other single parameters: "string", number, 1D array
      formattedInputs = [parsedInputData];
      reasoning = "Single parameter as-is";
    }
  }
  
  // Case 2: Multiple parameters expected
  else if (expectedInputParams > 1) {
    if (Array.isArray(parsedInputData)) {
      // Check if array length matches expected parameters
      if (parsedInputData.length === expectedInputParams) {
        // Perfect match: [val1, val2] → val1, val2
        formattedInputs = parsedInputData;
        reasoning = `Array length matches ${expectedInputParams} parameters`;
      }
      // Special case: 2D array with matching dimensions
      else if (parsedInputData.length > 0 && 
               Array.isArray(parsedInputData[0]) && 
               parsedInputData.length === expectedInputParams &&
               parsedInputData.every(row => Array.isArray(row))) {
        // Multiple arrays: [[1,2], [3,4]] → [1,2], [3,4]
        formattedInputs = parsedInputData;
        reasoning = "Split 2D array into separate array parameters";
      }
      // Nested structure that needs unwrapping
      else if (parsedInputData.length === 1 && Array.isArray(parsedInputData[0])) {
        // Check if inner array matches expected count
        const innerArray = parsedInputData[0];
        if (innerArray.length === expectedInputParams) {
          formattedInputs = innerArray;
          reasoning = "Unwrapped nested array structure";
        } else {
          // Keep outer structure
          formattedInputs = parsedInputData;
          reasoning = "Kept nested structure as-is";
        }
      }
      // Default: spread array elements and pad if needed
      else {
        formattedInputs = parsedInputData.slice(0, expectedInputParams);
        if (formattedInputs.length < expectedInputParams) {
          // Pad with nulls if not enough elements
          while (formattedInputs.length < expectedInputParams) {
            formattedInputs.push(null);
          }
        }
        reasoning = `Spread array, padded to ${expectedInputParams} parameters`;
      }
    } else {
      // Non-array input for multiple parameters
      formattedInputs = [parsedInputData];
      while (formattedInputs.length < expectedInputParams) {
        formattedInputs.push(null);
      }
      reasoning = `Single value padded to ${expectedInputParams} parameters`;
    }
  }
  
  // Case 3: Unknown parameter count (fallback)
  else {
    if (Array.isArray(parsedInputData)) {
      formattedInputs = parsedInputData;
      reasoning = "Array spread (unknown parameter count)";
    } else {
      formattedInputs = [parsedInputData];
      reasoning = "Single value (unknown parameter count)";
    }
  }
  
  return {
    id: testCase.id,
    formatted_inputs: formattedInputs,
    expected_output: formatExpectedOutput(testCase.expected_output),
    parsing_reasoning: `Heuristic: ${reasoning}`,
    original_input_data: testCase.input_data
  };
}

function cleanLLMResponse(content) {
  // Remove markdown code blocks
  if (content.includes('```json')) {
    const match = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) return match[1].trim();
  }
  if (content.includes('```')) {
    const match = content.match(/```\s*([\s\S]*?)\s*```/);
    if (match) return match[1].trim();
  }
  return content.trim();
}

// Ultra-robust expected output formatter for chaotic database formats
function formatExpectedOutput(expectedOutput) {
  // If it's not a string, return as-is (already properly formatted)
  if (typeof expectedOutput !== 'string') {
    return expectedOutput;
  }
  
  const trimmed = expectedOutput.trim();
  
  // Handle empty string cases
  if (trimmed === '' || trimmed === 'null' || trimmed === 'None') {
    return null;
  }
  
  // Handle boolean strings
  if (trimmed === 'true' || trimmed === 'True') return true;
  if (trimmed === 'false' || trimmed === 'False') return false;
  
  // Handle numeric strings: "42", "3.14", "-5"
  if (/^-?\d+\.?\d*$/.test(trimmed)) {
    const num = parseFloat(trimmed);
    return Number.isInteger(num) ? parseInt(trimmed) : num;
  }
  
  // Handle JSON strings: "[1,2,3]", "{'key': 'value'}"
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || 
      (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const parsed = JSON.parse(trimmed);
      console.log('🔄 Parsed JSON string expected output:', {
        original: expectedOutput,
        parsed: parsed
      });
      return parsed;
    } catch (e) { 
      // Continue to Python format handling 
    }
  }
  
  // Handle Python format strings: "['a', 'b']", "[True, False, None]"  
  if ((trimmed.startsWith('[') || trimmed.startsWith("['")) ||
      (trimmed.startsWith('{') || trimmed.startsWith("{'")) ||
      trimmed.includes('True') || trimmed.includes('False') || trimmed.includes('None')) {
    
    try {
      // Convert Python format to JSON format
      let jsonStr = trimmed
        .replace(/'/g, '"')           // Replace single quotes with double quotes
        .replace(/\bNone\b/g, 'null') // Replace Python None with JSON null (word boundary)
        .replace(/\bTrue\b/g, 'true') // Replace Python True with JSON true (word boundary)  
        .replace(/\bFalse\b/g, 'false'); // Replace Python False with JSON false (word boundary)
      
      // Try to parse as JSON to validate and return parsed object
      const parsed = JSON.parse(jsonStr);
      
      console.log('🔄 Converted Python expected output to JSON:', {
        original: expectedOutput,
        converted: jsonStr,
        parsed: parsed
      });
      
      return parsed;
      
    } catch (parseError) {
      console.log('⚠️ Failed to convert Python expected output, trying more aggressive parsing...', parseError);
      
      // Try more aggressive Python parsing for malformed strings
      try {
        let aggressiveStr = trimmed
          // Handle spacing around brackets/braces
          .replace(/\[\s+/g, '[')
          .replace(/\s+\]/g, ']') 
          .replace(/\{\s+/g, '{')
          .replace(/\s+\}/g, '}')
          // Handle spacing around commas
          .replace(/\s*,\s*/g, ',')
          // Convert quotes
          .replace(/'/g, '"')
          // Convert Python literals
          .replace(/\bNone\b/g, 'null')
          .replace(/\bTrue\b/g, 'true')
          .replace(/\bFalse\b/g, 'false');
        
        const aggressiveParsed = JSON.parse(aggressiveStr);
        console.log('✅ Aggressive Python parsing succeeded:', {
          original: expectedOutput,
          aggressive: aggressiveStr,
          parsed: aggressiveParsed
        });
        return aggressiveParsed;
        
      } catch (aggressiveError) {
        console.log('⚠️ All Python parsing attempts failed, returning as-is');
        return expectedOutput;
      }
    }
  }
  
  // Last resort: Try content-only extraction for very malformed data
  try {
    const contentOnly = extractContentOnlyFromString(trimmed);
    if (contentOnly && contentOnly !== trimmed) {
      console.log('🔄 Content-only extraction as final attempt:', {
        original: expectedOutput,
        contentOnly: contentOnly
      });
      
      // Try to infer the type from content
      if (contentOnly === 'true') return true;
      if (contentOnly === 'false') return false;
      if (contentOnly === 'null') return null;
      if (/^\d+$/.test(contentOnly)) return parseInt(contentOnly);
      if (/^\d+\.\d+$/.test(contentOnly)) return parseFloat(contentOnly);
      
      // If it looks like space-separated values, return as array
      const values = contentOnly.split(/\s+/).filter(v => v.length > 0);
      if (values.length > 1) {
        console.log('🔄 Inferred array from content:', values);
        return values;
      }
      
      return contentOnly; // Return as string
    }
  } catch (e) {
    // Ignore content extraction errors
  }
  
  // Return as-is if no conversions worked
  return expectedOutput;
}

// Extract content-only from malformed strings
function extractContentOnlyFromString(str) {
  return str
    .replace(/[^a-zA-Z0-9.\s]/g, ' ')   // Remove all punctuation except dots and spaces
    .replace(/\s+/g, ' ')               // Collapse spaces
    .trim()                             // Remove leading/trailing spaces
    .toLowerCase();                     // Normalize case
}

// Supabase Edge Function entry point
// Deploy this as: supabase functions deploy test-case-preprocessor

console.log(' Test Case Preprocessor Edge Function initialized');
