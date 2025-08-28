import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};
// Judge0 API Configuration
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY_PRIMARY = '2ffabb17ebmshcaccacc199044b9p1ef187jsn2f0e1fe002ef';
const RAPIDAPI_KEY_FALLBACK = 'bec639ff53msh1ce026cfc602abcp1765aejsneb09d31a53c7';
const RAPIDAPI_KEY_FALLBACK_2 = 'e8df190bebmshfc85a79888b07e2p185c30jsn7bccec96bf0e';
const RAPIDAPI_KEY_FALLBACK_3 = 'feeec14afcmshedea9101cfd39c1p136a30jsnd600e9cbe9f2';
const RAPIDAPI_KEY_FALLBACK_4 = '8b5d3c3079msh70334f1012ba627p104edajsn187859b5264b';
const RAPIDAPI_HOST = 'judge0-ce.p.rapidapi.com';

// Custom error class for API rate limiting
class APIRateLimitError extends Error {
  constructor(message: string, public remainingTime?: number) {
    super(message);
    this.name = 'APIRateLimitError';
  }
}
// Common language IDs for Judge0
const LANGUAGE_IDS = {
  'python': 71,
  'java': 62,
  'cpp': 54,
  'javascript': 63,
  'c': 50,
  'go': 60,
  'rust': 73
};
serve(async (req)=>{
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { problem_id, solution_code, language = 'python' } = await req.json();
    if (!problem_id || !solution_code) {
      return new Response(JSON.stringify({
        error: 'Missing problem_id or solution_code'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // 🚀 NEW APPROACH: Try using code as-is first, extract only if needed
    console.log('Original code length:', solution_code.length);
    console.log('🔍 FIRST 200 CHARS:', solution_code.substring(0, 200));
    
    let cleanCode = solution_code;
    let codeSource = 'original';
    
    // 🚨 VALIDATE ORIGINAL CODE first
    let validationResult = validatePythonCode(solution_code, language);
    
    if (!validationResult.isValid) {
      console.log('⚠️ Original code failed validation, attempting extraction...');
      console.log('❌ Original validation errors:', validationResult.errors);
      
      // FALLBACK: Extract and clean the code
      cleanCode = extractCleanCode(solution_code, language);
      codeSource = 'extracted';
      
      // Re-validate extracted code  
      validationResult = validatePythonCode(cleanCode, language);
      
      if (!validationResult.isValid) {
        console.error('🚨 BOTH ORIGINAL AND EXTRACTED CODE FAILED VALIDATION!');
        return new Response(JSON.stringify({
          error: 'Code validation failed for both original and extracted code',
          original_errors: validatePythonCode(solution_code, language).errors,
          extracted_errors: validationResult.errors,
          original_code: solution_code,
          extracted_code: cleanCode
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    console.log(`✅ Using ${codeSource} code (${cleanCode.length} chars)`);
    console.log('🧹 FINAL CODE:');
    console.log('=' .repeat(50));
    console.log(cleanCode);
    console.log('=' .repeat(50));
    // Initialize Supabase client
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Fetch problem from database
    const { data: problem, error: dbError } = await supabase.from('problems').select('*').eq('id', problem_id).single();
    if (dbError || !problem) {
      return new Response(JSON.stringify({
        error: 'Problem not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // 🚀 NEW ARCHITECTURE: Call Test Case Preprocessor for intelligent parsing
    let testCases: any[] = [];
    let testCasesData: any[] = [];
    
    try {
      const preprocessorUrl = Deno.env.get('TEST_CASE_PREPROCESSOR_URL') || 'https://mbuiluhrtlgyawlqchaq.supabase.co/functions/v1/test-case-preprocessor';
      console.log('🔄 Calling Test Case Preprocessor for intelligent parsing...');
      console.log('📍 Preprocessor URL:', preprocessorUrl);
      
      const preprocessorResponse = await fetch(preprocessorUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          problem_id: problem_id,
          problem_context: problem
        })
      });
      
      if (preprocessorResponse.ok) {
        const preprocessorData = await preprocessorResponse.json();
        console.log(`✅ Preprocessor returned ${preprocessorData.processed_test_cases.length} formatted test cases`);
        
        // Convert preprocessed format to execution format
        testCases = preprocessorData.processed_test_cases.map(ptc => [
          ...ptc.formatted_inputs,
          ptc.expected_output
        ]);
        
        // Keep original data for database operations
        testCasesData = preprocessorData.processed_test_cases.map(ptc => ({
          id: ptc.id,
          input_data: ptc.original_input_data,
          expected_output: ptc.expected_output
        }));
        
        console.log('🎯 Preprocessor parsing successful:', {
          total_cases: testCases.length,
          first_case_preview: testCases[0] ? JSON.stringify(testCases[0]).substring(0, 100) + '...' : 'none'
        });
        
      } else {
        const errorText = await preprocessorResponse.text();
        console.error('❌ Preprocessor failed:', {
          status: preprocessorResponse.status,
          statusText: preprocessorResponse.statusText,
          error: errorText
        });
        throw new Error(`Preprocessor failed: ${preprocessorResponse.status} - ${errorText}`);
      }
      
    } catch (preprocessorError) {
      console.error('⚠️ Preprocessor failed, falling back to legacy parsing:', preprocessorError.message);
      
      // FALLBACK: Use original parsing logic
      const { data: rawTestCasesData, error: testCasesError } = await supabase
        .from('test_cases')
        .select('*')
        .eq('problem_id', problem_id)
        .eq('is_active', true)
        .order('id');

      if (testCasesError) {
        console.error('Error fetching test cases:', testCasesError);
      }

      // Legacy parsing (simplified version of old logic)
      testCasesData = rawTestCasesData || [];
      testCases = testCasesData.map(tc => {
        const inputs = Array.isArray(tc.input_data) ? tc.input_data : [tc.input_data];
        return [...inputs, tc.expected_output];
      });
      
      console.log('📦 Fallback parsing completed:', testCases.length, 'test cases');
    }
    
    const parameterMap = parseParameterMap(problem.parameter_map);
    console.log('Database test cases:', testCases.length);
    console.log('Final test cases:', testCases);
    console.log('Parameter map:', parameterMap);
    
    // Fallback to legacy format if no database test cases
    if (testCases.length === 0 && problem.test_cases) {
      console.log('🔄 Falling back to legacy test_cases format');
      const legacyTestCases = parseTestCases(problem.test_cases);
      testCases.push(...legacyTestCases);
      console.log(`✅ Loaded ${legacyTestCases.length} test cases from legacy format`);
    }
    // Execute tests using Judge0 with CLEAN CODE
    const executionResult = await executeTests(cleanCode, testCases, parameterMap, language, testCasesData);
    
    // Store solution attempt in database (compatible with reinforcement loop)
    const { data: solutionAttempt, error: insertError } = await supabase
      .from('solution_attempts')
      .insert({
        problem_id: problem_id, // int4 - Fixed variable name
        generated_code: cleanCode, // text
        language: language, // text
        success_rate: executionResult.success_rate, // float8 - already a number
        failed_test_cases: executionResult.test_results.filter((r: any) => !r.passed), // jsonb array
        error_messages: executionResult.test_results.filter((r: any) => r.error).map((r: any) => r.error), // jsonb array
        attempt_number: 1, // int4 - Default for manual testing
        created_at: new Date().toISOString() // timestamptz
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to store solution attempt:', insertError);
    }

    // Store individual test case results (new schema)
    if (solutionAttempt && testCasesData) {
      const testCaseResults = executionResult.test_results.map((result: any, index: number) => ({
        test_case_id: testCasesData[index]?.id, // int4 reference to test_cases
        solution_attempt_id: solutionAttempt.id, // int4 reference to solution_attempts
        passed: Boolean(result.passed), // bool
        execution_time: result.execution_time ? parseFloat(String(result.execution_time)) : null, // float8
        memory_used: result.memory_used ? parseFloat(String(result.memory_used)) : null, // float8
        actual_output: result.actual_output, // jsonb
        error_message: result.error || null, // text
        created_at: new Date().toISOString() // timestamptz
      })).filter(r => r.test_case_id); // Only include results with valid test_case_id

      if (testCaseResults.length > 0) {
        await supabase.from('test_case_results').insert(testCaseResults);
      }
    }

    // Update problem metrics
    await updateProblemMetrics(supabase, problem_id, executionResult);
    return new Response(JSON.stringify({
      ...executionResult,
      extraction_info: {
        original_length: solution_code.length,
        clean_length: cleanCode.length,
        extraction_successful: cleanCode !== solution_code
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
function parseTestCases(testCasesString: string): any[] {
  try {
    // Handle format: "([2, 7, 11, 15], 9, [0, 1]), ([3, 2, 4], 6, [1, 2])"
    // or: "('babad', 'bab'), ('cbbd', 'bb')"
    const testCases: any[] = [];
    // Split by '), (' to get individual test cases
    const cases = testCasesString.split('), (');
    for(let i = 0; i < cases.length; i++){
      let caseStr = cases[i];
      // Clean up the string
      caseStr = caseStr.replace(/^\(/, '').replace(/\)$/, '');
      // Split by comma but be careful with arrays
      const parts = smartSplit(caseStr);
      testCases.push(parts);
    }
    return testCases;
  } catch (error) {
    console.error('Error parsing test cases:', error);
    return [];
  }
}
function smartSplit(str: string): any[] {
  const parts: any[] = [];
  let current = '';
  let depth = 0;
  let inQuotes = false;
  let quoteChar = '';
  for(let i = 0; i < str.length; i++){
    const char = str[i];
    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false;
      current += char;
    } else if (!inQuotes && char === '[') {
      depth++;
      current += char;
    } else if (!inQuotes && char === ']') {
      depth--;
      current += char;
    } else if (!inQuotes && char === ',' && depth === 0) {
      parts.push(parseValue(current.trim()));
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    parts.push(parseValue(current.trim()));
  }
  return parts;
}
function parseValue(str) {
  str = str.trim();
  // Handle arrays
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      return JSON.parse(str);
    } catch  {
      return str;
    }
  }
  // Handle strings
  if (str.startsWith('"') && str.endsWith('"') || str.startsWith("'") && str.endsWith("'")) {
    return str.slice(1, -1);
  }
  // Handle numbers
  if (!isNaN(Number(str))) {
    return Number(str);
  }
  return str;
}
function parseParameterMap(parameterMapString) {
  // Handle format: "nums, target, output" or "s, output"
  return parameterMapString.split(',').map((param)=>param.trim());
}
async function executeTests(solutionCode: string, testCases: any[], parameterMap: string[], language: string, testCasesData: any = null) {
  const languageId = LANGUAGE_IDS[language] || LANGUAGE_IDS['python'];
  const results: any[] = [];
  
  for (const testCase of testCases){
    try {
      console.log('Processing test case:', testCase);
      // Separate inputs from expected output
      const inputs = testCase.slice(0, -1) // All but last element
      ;
      const expectedOutput = testCase[testCase.length - 1] // Last element
      ;
      console.log('Extracted inputs:', inputs);
      console.log('Expected output:', expectedOutput);
      // Create the complete solution code with test input
      const completeCode = createCompleteCode(solutionCode, inputs, parameterMap, language);
      console.log('Generated Python code:');
      console.log('🐍 COMPLETE PYTHON CODE:');
      console.log('=' .repeat(60));
      console.log(completeCode);
      console.log('=' .repeat(60));
      // Submit to Judge0
      const submissionResult = await submitToJudge0(completeCode, languageId);
      // Process result
      const testResult: any = {
        input: JSON.stringify(inputs),
        expected_output: JSON.stringify(expectedOutput),
        actual_output: submissionResult.stdout || '',
        passed: false,
        execution_time: submissionResult.time || 0,
        memory_used: submissionResult.memory || 0,
        status: submissionResult.status?.description || 'Unknown'
      };
      if (submissionResult.stderr) {
        testResult.error = submissionResult.stderr;
      }
      // Check if test passed
      if (submissionResult.status?.id === 3) {
        try {
          const actualOutputStr = submissionResult.stdout.trim();
          const actualOutput = JSON.parse(actualOutputStr);
          testResult.actual_output = actualOutputStr;
          
          // Smart comparison handling different formats with maximum leniency
          let passed = JSON.stringify(actualOutput) === JSON.stringify(expectedOutput);
          
          // If direct comparison fails, try various format conversions
          if (!passed) {
            passed = smartCompareWithLeniency(actualOutput, expectedOutput);
          }
          
          testResult.passed = passed;
          
        } catch (parseError) {
          // If JSON parsing fails, compare as strings
          testResult.actual_output = submissionResult.stdout.trim();
          testResult.passed = submissionResult.stdout.trim() === JSON.stringify(expectedOutput);
        }
      }
      results.push(testResult);
    } catch (error) {
      console.error('Error executing test case:', error);
      
      // Check if this is an API rate limit error - if so, stop execution and return special result
      if (error instanceof APIRateLimitError) {
        console.error('🚫 Judge0 API Rate Limit Reached - Stopping test execution');
        
        const passedTests = results.filter((r: any)=>r.passed).length;
        const totalTests = results.length; // Only count completed tests
        
        return {
          success_rate: totalTests > 0 ? passedTests / totalTests * 100 : 0,
          total_tests: totalTests,
          passed_tests: passedTests,
          failed_tests: totalTests - passedTests,
          test_results: results,
          overall_status: 'API Rate Limit Reached',
          api_limit_reached: true,
          remaining_time: error.remainingTime,
          message: error.message,
          tests_not_executed: testCases.length - results.length
        };
      }
      
      // For non-rate-limit errors, add to results as before
      results.push({
        input: JSON.stringify(testCase.slice(0, -1)),
        expected_output: JSON.stringify(testCase[testCase.length - 1]),
        actual_output: '',
        passed: false,
        execution_time: 0,
        memory_used: 0,
        status: 'Error',
        error: error.message
      });
    }
  }
  const passedTests = results.filter((r: any)=>r.passed).length;
  const totalTests = results.length;
  return {
    success_rate: totalTests > 0 ? passedTests / totalTests * 100 : 0,
    total_tests: totalTests,
    passed_tests: passedTests,
    failed_tests: totalTests - passedTests,
    test_results: results,
    overall_status: passedTests === totalTests ? 'All Passed' : 'Some Failed'
  };
}
function createCompleteCode(solutionCode, inputs, parameterMap, language) {
  if (language === 'python') {
    const functionName = extractFunctionNameFromCode(solutionCode);
    
    // Check if code uses common LeetCode data structures
    const needsListNode = solutionCode.includes('ListNode');
    const needsTreeNode = solutionCode.includes('TreeNode');
    const needsNode = (solutionCode.includes('Node') && !solutionCode.includes('ListNode') && !solutionCode.includes('TreeNode')) ||
                     solutionCode.includes('class Node') || functionName.toLowerCase().includes('clone');
    const needsInterval = solutionCode.includes('Interval');
    const needsUnionFind = solutionCode.includes('UnionFind');
    const needsTrieNode = solutionCode.includes('TrieNode');
    
    let dataStructures = '';
    
    if (needsListNode) {
      dataStructures += `
# Definition for singly-linked list
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
`;
    }
    
    if (needsTreeNode) {
      dataStructures += `
# Definition for a binary tree node
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
`;
    }
    
    if (needsNode) {
      dataStructures += `
# Definition for a graph node
class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []
`;
    }
    
    if (needsInterval) {
      dataStructures += `
# Definition for an interval
class Interval:
    def __init__(self, start=0, end=0):
        self.start = start
        self.end = end
`;
    }
    
    if (needsTrieNode) {
      dataStructures += `
# Definition for a Trie node
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False
`;
    }
    
    if (needsUnionFind) {
      dataStructures += `
# Definition for Union-Find (Disjoint Set)
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
    
    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
    
    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py:
            return
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
`;
    }
    
    // Add conversion helper functions if needed
    let helperFunctions = '';
    
    if (needsListNode) {
      helperFunctions += `
# Helper function to convert array to ListNode
def array_to_listnode(arr):
    if not arr:
        return None
    head = ListNode(arr[0])
    current = head
    for val in arr[1:]:
        current.next = ListNode(val)
        current = current.next
    return head

# Helper function to convert ListNode to array (for output)  
def listnode_to_array(head):
    result = []
    current = head
    while current:
        result.append(current.val)
        current = current.next
    return result
`;
    }
    
    if (needsTreeNode) {
      helperFunctions += `
# Helper function to convert array to TreeNode (level-order)
def array_to_treenode(arr):
    if not arr or arr[0] is None:
        return None
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    while queue and i < len(arr):
        node = queue.pop(0)
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            queue.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            queue.append(node.right)
        i += 1
    return root
`;
    }
    
    if (needsNode) {
      helperFunctions += `
# Helper function to convert adjacency list to graph Node
def adjacency_to_graph(adj_list):
    if not adj_list:
        return None
    
    # Create nodes with correct values (1-indexed for Clone Graph)
    nodes_dict = {}
    for i in range(len(adj_list)):
        node_val = i + 1  # Clone Graph uses 1-indexed node values
        nodes_dict[node_val] = Node(node_val)
    
    # Connect neighbors using the dictionary lookup
    for i, neighbors in enumerate(adj_list):
        current_node_val = i + 1
        if current_node_val in nodes_dict:
            nodes_dict[current_node_val].neighbors = [nodes_dict[neighbor] for neighbor in neighbors if neighbor in nodes_dict]
    
    return nodes_dict[1] if 1 in nodes_dict else None

# Helper function to convert Node back to adjacency list 
def node_to_adjacency_list(node):
    if not node:
        return []
    
    visited = {}
    nodes_found = {}
    
    # First pass: discover all nodes
    def discover_nodes(current_node):
        if current_node.val in visited:
            return
        visited[current_node.val] = True
        nodes_found[current_node.val] = current_node
        
        for neighbor in current_node.neighbors:
            if neighbor.val not in visited:
                discover_nodes(neighbor)
    
    discover_nodes(node)
    
    # Create result adjacency list (1-indexed, so we need to adjust)
    if not nodes_found:
        return []
        
    min_val = min(nodes_found.keys())
    max_val = max(nodes_found.keys())
    
    # If nodes are 1-indexed, we want to return 0-indexed adjacency list
    result = []
    for i in range(min_val, max_val + 1):
        if i in nodes_found:
            neighbors = [neighbor.val for neighbor in nodes_found[i].neighbors]
            # Convert to 0-indexed position
            result.append(neighbors)
        else:
            result.append([])
    
    return result
`;
    }

    const testCode = `from typing import List, Optional, Dict, Set, Tuple, Deque
from collections import defaultdict, deque, Counter
import json
import heapq
import math
import copy
${dataStructures}${helperFunctions}
${solutionCode}

# Test execution
if __name__ == "__main__":
    solution = Solution()
    ${generatePythonTestCall(inputs, parameterMap, functionName, solutionCode)}
`;
    return testCode;
  }
  // Add support for other languages later
  return solutionCode;
}
function extractFunctionNameFromCode(code) {
  // Extract function name from solution code - avoid __init__ and look for actual solution method
  console.log('🔍 Extracting function name from code...');
  
  // First try to find method inside Solution class (most accurate)
  const classMatch = code.match(/class\s+Solution\s*:[\s\S]*?def\s+(\w+)\s*\(/);
  if (classMatch && classMatch[1] !== '__init__') {
    console.log(`✅ Found method in Solution class: ${classMatch[1]}`);
    return classMatch[1];
  }
  
  // Fallback: Find any def that's not __init__
  const allMatches = [...code.matchAll(/def\s+(\w+)\s*\(/g)];
  const nonInitMethods = allMatches.filter(match => match[1] !== '__init__');
  
  if (nonInitMethods.length > 0) {
    console.log(`✅ Found non-init method: ${nonInitMethods[0][1]}`);
    return nonInitMethods[0][1];
  }
  
  // Last resort: check comprehensive LeetCode method names in the code
  const commonMethods = [
    // Basic Problems
    'twoSum', 'addTwoNumbers', 'lengthOfLongestSubstring', 'findMedianSortedArrays', 'longestPalindrome',
    'convert', 'reverse', 'isPalindrome', 'romanToInt', 'longestCommonPrefix', 'threeSum', 'threeSumClosest',
    
    // String Problems  
    'letterCombinations', 'removeNthFromEnd', 'mergeTwoLists', 'generateParentheses', 'mergeKLists',
    'reverseKGroup', 'strStr', 'divide', 'nextPermutation', 'longestValidParentheses', 'search',
    'searchRange', 'searchInsert', 'solveSudoku', 'combinationSum', 'firstMissingPositive',
    'trap', 'multiply', 'isMatch', 'maxArea', 'intToRoman',
    
    // Array Problems
    'jump', 'permute', 'permuteUnique', 'rotate', 'myPow', 'solveNQueens', 'totalNQueens',
    'maxSubArray', 'spiralOrder', 'canJump', 'merge', 'insert', 'lengthOfLastWord',
    'generateMatrix', 'getPermutation', 'rotateRight', 'uniquePaths', 'uniquePathsWithObstacles',
    'minPathSum', 'plusOne', 'addBinary', 'fullJustify', 'mySqrt', 'climbStairs',
    
    // DP Problems
    'minDistance', 'setZeroes', 'searchMatrix', 'sortColors', 'minWindow', 'combine',
    'subsets', 'exist', 'searchII', 'removeDuplicates', 'deleteDuplicates', 'largestRectangleArea',
    'maximalRectangle', 'partition', 'isScramble', 'merge', 'grayCode', 'subsetsWithDup',
    'reverseBetween', 'restoreIpAddresses', 'numTrees', 'isInterleave', 'numDistinct',
    'generate', 'getRow', 'minimumTotal', 'maxProfit', 'isPalindrome', 'findLadders',
    'ladderLength', 'longestConsecutive', 'sumNumbers', 'partition', 'minCut',
    'cloneGraph', 'canCompleteCircuit', 'candy', 'singleNumber', 'wordBreak',
    'wordBreak', 'hasCycle', 'reorderList', 'insertionSortList', 'sortList',
    'maxPoints', 'evalRPN', 'reverseWords', 'maxProduct', 'findMin', 'findPeakElement',
    'maximumGap', 'fractionToDecimal', 'twoSumII', 'titleToNumber', 'convertToTitle',
    'trailingZeroes', 'calculateMinimumHP', 'largestNumber', 'findRepeatedDnaSequences',
    'maxProfitIV', 'rotate', 'rob'
  ];
  
  for (const method of commonMethods) {
    if (code.includes(`def ${method}(`)) {
      console.log(`✅ Found common LeetCode method: ${method}`);
      return method;
    }
  }
  
  console.log('⚠️ Could not find function name, defaulting to "solve"');
  return 'solve';
}
function generatePythonTestCall(inputs, parameterMap, functionName, solutionCode = '') {
  // Remove 'output' from parameter map to get function parameters
  const functionParams = parameterMap.filter((param)=>param !== 'output');
  
  console.log('Generating Python test call:', { inputs, functionParams, functionName });
  
  // Handle missing or insufficient inputs
  if (!inputs || inputs.length < functionParams.length) {
    return `print("Error: Not enough inputs. Expected ${functionParams.length}, got ${inputs ? inputs.length : 0}")`;
  }
  
  // Convert JavaScript values to proper Python literals with smart data structure conversion
  function toPythonLiteral(value, parameterName = '', isLinkedList = false, isTree = false, isGraph = false) {
    if (value === null) return 'None';
    if (value === undefined) return 'None';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    
    // Smart conversion for linked lists
    if (Array.isArray(value) && isLinkedList) {
      if (value.length === 0) return 'None';
      // Only use array_to_listnode if needsListNode is true (helper function will be defined)
      if (solutionCode.includes('ListNode')) {
        return `array_to_listnode([${value.map(item => toPythonLiteral(item)).join(', ')}])`;
      } else {
        console.log('⚠️ Attempted to use linked list conversion without ListNode - falling back to regular array');
        return '[' + value.map(item => toPythonLiteral(item)).join(', ') + ']';
      }
    }
    
    // Smart conversion for binary trees  
    if (Array.isArray(value) && isTree) {
      if (value.length === 0) return 'None';
      // Only use array_to_treenode if needsTreeNode is true (helper function will be defined)
      if (solutionCode.includes('TreeNode')) {
        return `array_to_treenode([${value.map(item => item === null ? 'None' : toPythonLiteral(item)).join(', ')}])`;
      } else {
        console.log('⚠️ Attempted to use tree conversion without TreeNode - falling back to regular array');
        return '[' + value.map(item => item === null ? 'None' : toPythonLiteral(item)).join(', ') + ']';
      }
    }
    
    // Smart conversion for graph nodes (adjacency list to Node)
    if (Array.isArray(value) && isGraph) {
      if (value.length === 0) return 'None';
      // Only use adjacency_to_graph if needsNode is true (helper function will be defined)
      if (solutionCode.includes('class Node') || solutionCode.includes('Node(')) {
        return `adjacency_to_graph([${value.map(neighbors => `[${neighbors.join(', ')}]`).join(', ')}])`;
      } else {
        console.log('⚠️ Attempted to use graph conversion without Node class - falling back to regular array');
        return '[' + value.map(neighbors => `[${neighbors.join(', ')}]`).join(', ') + ']';
      }
    }
    
    // Regular array handling
    if (Array.isArray(value)) {
      return '[' + value.map(item => toPythonLiteral(item)).join(', ') + ']';
    }
    
    if (typeof value === 'object') {
      // Convert JS object to Python dict
      const pairs = Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${toPythonLiteral(v)}`);
      return '{' + pairs.join(', ') + '}';
    }
    return JSON.stringify(value); // Fallback
  }
  
  // Check for 2D array/interval problems that should NOT be treated as linked lists
  const is2DArrayProblem = functionName.toLowerCase().includes('interval') ||
                          functionName.toLowerCase().includes('matrix') ||
                          functionName.toLowerCase().includes('grid') ||
                          functionName.toLowerCase().includes('board') ||
                          parameterMap.some(p => {
                            const param = p.toLowerCase();
                            return param.includes('interval') || param.includes('matrix') || 
                                   param.includes('grid') || param.includes('board') ||
                                   param === 'intervals';
                          }) ||
                          // Check if input structure suggests 2D arrays
                          (Array.isArray(inputs[0]) && inputs[0].length > 0 && Array.isArray(inputs[0][0]) && 
                           inputs[0][0].length <= 3 && typeof inputs[0][0][0] === 'number'); // Looks like intervals [[1,3],[2,6]]

  // Enhanced detection for linked list parameters - BE VERY SPECIFIC!
  const usesLinkedList = !is2DArrayProblem && (
                        solutionCode.includes('ListNode') || 
                        // Only detect linked list function names if they're ACTUALLY linked list problems
                        (functionName.toLowerCase().includes('list') && !functionName.toLowerCase().includes('interval')) ||
                        // More specific merge detection - only for actual linked list merges
                        (functionName.toLowerCase().includes('merge') && 
                         (functionName.toLowerCase().includes('list') || functionName.toLowerCase().includes('sorted') || 
                          parameterMap.some(p => p.toLowerCase().includes('l1') || p.toLowerCase().includes('l2')))) ||
                        // Reverse only for linked lists, not arrays  
                        (functionName.toLowerCase().includes('reverse') && 
                         (functionName.toLowerCase().includes('list') || parameterMap.some(p => p.toLowerCase().includes('head')))) ||
                        // Remove only if it has linked list indicators
                        (functionName.toLowerCase().includes('remove') && 
                         (functionName.toLowerCase().includes('list') || parameterMap.some(p => p.toLowerCase().includes('head')))) ||
                        // Strong parameter indicators for linked lists
                        parameterMap.some(p => {
                          const param = p.toLowerCase();
                          return param.includes('l1') || param.includes('l2') || 
                                 param.includes('head') || param === 'list' || param === 'list1' || param === 'list2' ||
                                 param.includes('node1') || param.includes('node2') ||
                                 (param.startsWith('l') && param.length === 2); // l1, l2, etc.
                        }));
  
  // Enhanced detection for tree parameters  
  const usesTree = solutionCode.includes('TreeNode') || 
                  functionName.toLowerCase().includes('tree') ||
                  functionName.toLowerCase().includes('depth') ||
                  functionName.toLowerCase().includes('path') ||
                  functionName.toLowerCase().includes('ancestor') ||
                  parameterMap.some(p => {
                    const param = p.toLowerCase();
                    return param.includes('root') || param.includes('tree') ||
                           param.includes('node') && !param.includes('list');
                  });
                  
  // Enhanced detection for graph problems - BE SPECIFIC to avoid LinkedList/Tree conflicts
  const usesGraph = !usesLinkedList && !usesTree && (
                   solutionCode.includes('class Node') ||  // ✅ Graph Node class definition
                   (solutionCode.includes('Node(') && !solutionCode.includes('ListNode') && !solutionCode.includes('TreeNode')) || // ✅ Node creation but not ListNode/TreeNode
                   functionName.toLowerCase().includes('clone') ||
                   functionName.toLowerCase().includes('graph') ||
                   parameterMap.some(p => p.toLowerCase().includes('graph') || 
                                         p.toLowerCase() === 'node'));
  
  console.log('🔍 Enhanced parameter analysis:', { 
    functionName, 
    parameterMap, 
    is2DArrayProblem, 
    usesLinkedList, 
    usesTree, 
    usesGraph,
    inputStructure: inputs[0] ? 
      (Array.isArray(inputs[0]) ? `Array[${inputs[0].length}] with first element: ${JSON.stringify(inputs[0][0])}` : typeof inputs[0])
      : 'No input',
    solutionContainsListNode: solutionCode.includes('ListNode'),
    functionContainsMerge: functionName.toLowerCase().includes('merge')
  });
  
  // Smart output handling for data structures and in-place modifications
  const isInPlaceModification = !usesGraph && !usesLinkedList && !usesTree && (
                               functionName.toLowerCase().includes('sudoku') ||
                               functionName.toLowerCase().includes('sort') ||
                               functionName.toLowerCase().includes('rotate') ||
                               functionName.toLowerCase().includes('setzero') ||
                               solutionCode.includes('-> None') ||
                               solutionCode.includes('return None'));
                               
  let outputConversion = '';
  
  if (usesLinkedList) {
    outputConversion = 'result = listnode_to_array(result) if result and hasattr(result, "val") else result';
  } else if (usesGraph) {
    // For graph problems like Clone Graph, convert result back to adjacency list
    outputConversion = 'result = node_to_adjacency_list(result) if result and hasattr(result, "val") else result';
  } else if (isInPlaceModification && functionParams.length === 1) {
    // For in-place modifications like Sudoku, return the modified input parameter
    outputConversion = 'result = param1_copy if result is None else result';
  }
  
  if (functionParams.length === 1) {
    const param1 = toPythonLiteral(inputs[0], functionParams[0], 
      usesLinkedList, usesTree, usesGraph);  // ✅ Apply graph conversion if it's a graph problem
      
    if (isInPlaceModification) {
      // For in-place modifications, create a copy and use that
      return `param1_copy = copy.deepcopy(${param1})
    result = solution.${functionName}(param1_copy)
    ${outputConversion}
    print(json.dumps(result))`;
    } else {
      return `result = solution.${functionName}(${param1})
    ${outputConversion}
    print(json.dumps(result))`;
    }
  } else if (functionParams.length === 2) {
    const param1 = toPythonLiteral(inputs[0], functionParams[0], 
      usesLinkedList && (functionParams[0].includes('l1') || functionParams[0].includes('head') || functionParams[0].includes('list1')),
      usesTree && functionParams[0].includes('root'),
      usesGraph && (functionParams[0].includes('node') || functionParams[0].includes('graph')));
    const param2 = toPythonLiteral(inputs[1], functionParams[1], 
      usesLinkedList && (functionParams[1].includes('l2') || functionParams[1].includes('head') || functionParams[1].includes('list2')),
      usesTree && functionParams[1].includes('root'),
      usesGraph && (functionParams[1].includes('node') || functionParams[1].includes('graph')));
    return `result = solution.${functionName}(${param1}, ${param2})
    ${outputConversion}
    print(json.dumps(result))`;
  } else if (functionParams.length === 3) {
    const param1 = toPythonLiteral(inputs[0], functionParams[0], 
      usesLinkedList && (functionParams[0].includes('l1') || functionParams[0].includes('head') || functionParams[0].includes('list')),
      usesTree && functionParams[0].includes('root'),
      usesGraph && (functionParams[0].includes('node') || functionParams[0].includes('graph')));
    const param2 = toPythonLiteral(inputs[1], functionParams[1], 
      usesLinkedList && (functionParams[1].includes('l2') || functionParams[1].includes('head') || functionParams[1].includes('list')),
      usesTree && functionParams[1].includes('root'),
      usesGraph && (functionParams[1].includes('node') || functionParams[1].includes('graph'))); 
    const param3 = toPythonLiteral(inputs[2], functionParams[2],
      usesLinkedList && (functionParams[2].includes('l') || functionParams[2].includes('head') || functionParams[2].includes('list')),
      usesTree && functionParams[2].includes('root'),
      usesGraph && (functionParams[2].includes('node') || functionParams[2].includes('graph')));
    return `result = solution.${functionName}(${param1}, ${param2}, ${param3})
    ${outputConversion}
    print(json.dumps(result))`;
  }
  // Handle more parameters as needed
  return `print("Error: Unsupported parameter count: ${functionParams.length}")`;
}
function getFunctionName(param) {
  // Map parameter names to likely function names
  const functionMap = {
    'nums': 'twoSum',
    's': 'longestPalindrome',
    'l1': 'addTwoNumbers',
    'l2': 'addTwoNumbers'
  };
  return functionMap[param] || 'solve';
}
async function submitToJudge0(sourceCode, languageId) {
  // 🔑 API Key Fallback Strategy: Try 5 keys in order for maximum reliability
  // Primary → Fallback_1 → Fallback_2 → Fallback_3 → Fallback_4
  const apiKeys = [
    RAPIDAPI_KEY_PRIMARY, 
    RAPIDAPI_KEY_FALLBACK, 
    RAPIDAPI_KEY_FALLBACK_2, 
    RAPIDAPI_KEY_FALLBACK_3, 
    RAPIDAPI_KEY_FALLBACK_4
  ];
  
  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const currentKey = apiKeys[keyIndex];
    const keyLabel = keyIndex === 0 ? 'PRIMARY' : `FALLBACK_${keyIndex}`;
    
    try {
      console.log(`🔑 Attempting Judge0 submission with ${keyLabel} API key`);
      
      // Encode source code in base64
      const encodedSourceCode = btoa(sourceCode);
      
      // Submit code
      const submitResponse = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=false&fields=*`, {
        method: 'POST',
        headers: {
          'X-RapidAPI-Key': currentKey,
          'X-RapidAPI-Host': RAPIDAPI_HOST,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          language_id: languageId,
          source_code: encodedSourceCode,
          stdin: ''
        })
      });
      
      const submissionData = await submitResponse.json();
      
      // Check for API key specific errors
      if (!submitResponse.ok) {
        // Check if this is a rate limit error (429 status code)
        if (submitResponse.status === 429) {
          console.error(`🚫 Judge0 API Rate Limit Exceeded with ${keyLabel} key`);
          
          // Extract rate limit info from response headers if available
          const retryAfter = submitResponse.headers.get('retry-after');
          const resetTime = submitResponse.headers.get('x-ratelimit-requests-reset');
          const remainingTime = retryAfter ? parseInt(retryAfter) : (resetTime ? parseInt(resetTime) : undefined);
          
          // If this is the last key, throw rate limit error
          if (keyIndex === apiKeys.length - 1) {
                      throw new APIRateLimitError(
            `Judge0 API rate limit exceeded. Judge0 allows 200 test cases per day, and your daily quota has been exhausted. All ${apiKeys.length} API keys have reached their limits.`,
            remainingTime
          );
          }
          // Otherwise, continue to next key
          continue;
        }
        
        const errorMsg = `Judge0 ${keyLabel} key failed (${submitResponse.status}): ${submissionData.error || 'Unknown error'}`;
        console.error(errorMsg);
        
        // If this is the last key, throw error
        if (keyIndex === apiKeys.length - 1) {
          throw new Error(errorMsg);
        }
        // Otherwise, continue to next key
        continue;
      }
      
      if (!submissionData.token) {
        const errorMsg = `${keyLabel} key: No token received from Judge0`;
        console.error(errorMsg);
        
        // If this is the last key, throw error
        if (keyIndex === apiKeys.length - 1) {
          throw new Error(errorMsg);
        }
        // Otherwise, continue to next key
        continue;
      }
      
      console.log(`✅ Successfully submitted with ${keyLabel} key, token: ${submissionData.token}`);
      
      // Poll for results using the same key
      let result;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      do {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
        
        const resultResponse = await fetch(`${JUDGE0_API_URL}/submissions/${submissionData.token}?base64_encoded=true&fields=*`, {
          headers: {
            'X-RapidAPI-Key': currentKey,
            'X-RapidAPI-Host': RAPIDAPI_HOST
          }
        });
        
        // Check for rate limit during polling
        if (!resultResponse.ok && resultResponse.status === 429) {
          console.error(`🚫 Judge0 API Rate Limit Exceeded during result polling with ${keyLabel} key`);
          
          const retryAfter = resultResponse.headers.get('retry-after');
          const resetTime = resultResponse.headers.get('x-ratelimit-requests-reset');
          const remainingTime = retryAfter ? parseInt(retryAfter) : (resetTime ? parseInt(resetTime) : undefined);
          
          throw new APIRateLimitError(
            `Judge0 API rate limit exceeded during result polling. Judge0 allows 200 test cases per day, and your daily quota has been exhausted.`,
            remainingTime
          );
        }
        
        result = await resultResponse.json();
        attempts++;
      } while (result.status?.id <= 2 && attempts < maxAttempts); // Status 1=queued, 2=processing
      
      // Decode base64 outputs
      if (result.stdout) {
        result.stdout = atob(result.stdout);
      }
      if (result.stderr) {
        result.stderr = atob(result.stderr);
      }
      if (result.compile_output) {
        result.compile_output = atob(result.compile_output);
      }
      
      console.log(`✅ Judge0 execution completed with ${keyLabel} key`);
      return result;
      
    } catch (error) {
      console.error(`❌ Judge0 ${keyLabel} key error:`, error.message);
      
      // If this is the last key, re-throw the error
      if (keyIndex === apiKeys.length - 1) {
        console.error('🚨 All Judge0 API keys failed');
        throw new Error(`All Judge0 API keys failed. Last error: ${error.message}`);
      }
      
      // Otherwise, continue to next key
      console.log(`🔄 Trying next API key...`);
    }
  }
}
function extractCleanCode(code, language) {
  console.log('=== SMART HANDLER CODE EXTRACTION ===');
  console.log('Input code length:', code.length);
  console.log('Target language:', language);
  console.log('First 200 chars:', code.substring(0, 200));
  
  // ⭐ ENHANCED DEBUGGING: Key indicators
  console.log('🔍 CODE ANALYSIS:');
  console.log('- Contains "class Solution:"?', code.includes('class Solution:'));
  console.log('- Contains "def "?', code.includes('def '));
  console.log('- Contains "```python"?', code.includes('```python'));
  console.log('- Contains "```"?', code.includes('```'));
  console.log('- Contains "from typing"?', code.includes('from typing'));
  
  // Show more context if it's short
  if (code.length < 500) {
    console.log('📄 COMPLETE CODE (short):', code);
  }
  // Pattern 1: Standard markdown code block ```language ... ```
  const standardPattern = new RegExp(`\`\`\`${language}\\s*\\n([\\s\\S]*?)\\n?\`\`\``, 'i');
  const standardMatch = standardPattern.exec(code);
  if (standardMatch && standardMatch[1]) {
    const extracted = standardMatch[1].trim();
    console.log('✅ SUCCESS: Extracted via standard markdown pattern');
    console.log('Extracted code preview:', extracted.substring(0, 150) + '...');
    return ensureSolutionClass(extracted, 'standard markdown');
  }
  // Pattern 2: Open code block without closing ```language ... (text)
  const openPattern = new RegExp(`\`\`\`${language}\\s*\\n([\\s\\S]*)`, 'i');
  const openMatch = openPattern.exec(code);
  if (openMatch && openMatch[1]) {
    let codeContent = openMatch[1];
    // Find natural stopping points - be more careful about what we cut
    const stopPatterns = [
      '```',
      '\n### ',
      '\n## ',
      '\nExplanation:',
      '\nThis approach',
      '\n**Explanation',
      '\nTime Complexity:',
      '\nSpace Complexity:',
      '\n---',
      '\n## Approach',
      '\n## Solution'
    ];
    let earliestStop = codeContent.length;
    for (const pattern of stopPatterns){
      const index = codeContent.indexOf(pattern);
      if (index !== -1 && index < earliestStop) {
        // Make sure we're not cutting off in the middle of code
        const beforeCut = codeContent.substring(0, index).trim();
        // Only cut if the previous content ends properly (ends with closing brace, return, etc.)
        if (beforeCut.endsWith('}') || beforeCut.endsWith('\n') || beforeCut.endsWith('pass') || beforeCut.match(/\n\s*return /)) {
          earliestStop = index;
        }
      }
    }
    codeContent = codeContent.substring(0, earliestStop).trim();
    
    // 🚨 SAFETY CHECK: Ensure we didn't cut off in the middle of a line
    const lines = codeContent.split('\n');
    const lastLine = lines[lines.length - 1];
    if (lastLine && !lastLine.trim().match(/^(class |def |return |pass|#|$)/)) {
      console.log(`⚠️ WARNING: Last line looks incomplete: "${lastLine}"`);
      console.log('This might cause syntax errors!');
    }
    console.log('✅ SUCCESS: Extracted via open block pattern');
    console.log('Extracted code preview:', codeContent.substring(0, 150) + '...');
    return ensureSolutionClass(codeContent, 'open block pattern');
  }
  // Pattern 3: Look for class Solution directly (no markdown)
  if (language === 'python') {
    // Find from "from typing import" or "class Solution" to end of code
    const lines = code.split('\n');
    let startIndex = -1;
    let endIndex = lines.length;
    // Find start
    for(let i = 0; i < lines.length; i++){
      if (lines[i].includes('from typing import') || lines[i].includes('class Solution:')) {
        startIndex = i;
        break;
      }
    }
    if (startIndex !== -1) {
      // Find end (explanation text)
      for(let i = startIndex + 1; i < lines.length; i++){
        const line = lines[i].trim();
        if (line.startsWith('###') || line.startsWith('Explanation') || line.startsWith('This ') || line.startsWith('The ') || line.match(/^\d+\.\s+\*\*/)) {
          endIndex = i;
          break;
        }
      }
      const extractedLines = lines.slice(startIndex, endIndex);
      const extracted = extractedLines.join('\n').trim();
      if (extracted.includes('class Solution:')) {
        console.log('✅ SUCCESS: Extracted via class detection');
        console.log('Extracted code preview:', extracted.substring(0, 150) + '...');
        return ensureSolutionClass(extracted, 'class detection');
      }
    }
  }
  // Pattern 4: More flexible class Solution extraction
  if (code.includes('class Solution:')) {
    console.log('🔍 Found "class Solution:" - attempting flexible extraction');
    
    // Remove any markdown blocks first
    let cleanedCode = code;
    if (code.includes('```')) {
      // Remove everything before the first ```python and after any closing ```
      const pythonMatch = cleanedCode.match(/```python\s*\n([\s\S]*?)(?:\n```|$)/i);
      if (pythonMatch) {
        cleanedCode = pythonMatch[1];
        console.log('✅ Extracted from ```python block');
      } else {
        // Try to find any ``` block
        const anyMatch = cleanedCode.match(/```\s*\n([\s\S]*?)(?:\n```|$)/i);
        if (anyMatch) {
          cleanedCode = anyMatch[1];
          console.log('✅ Extracted from generic ``` block');
        }
      }
    }
    
    // If we still have class Solution, return it
    if (cleanedCode.includes('class Solution:')) {
      console.log('✅ SUCCESS: Flexible class Solution extraction');
      console.log('Extracted code preview:', cleanedCode.substring(0, 150) + '...');
      return ensureSolutionClass(cleanedCode.trim(), 'flexible extraction');
    }
  }
  
  // Pattern 5: No extraction needed (already clean)
  if (code.includes('class Solution:') && !code.includes('```')) {
    console.log('✅ Code appears to be already clean');
    return ensureSolutionClass(code.trim(), 'already clean');
  }
  // Fallback: return original
  console.log('⚠️ FALLBACK: No extraction pattern matched, returning original');
  console.log('This might cause syntax errors!');
  
  // ⭐ ENHANCED DEBUGGING: Show what we're actually returning
  console.log('📊 FALLBACK CODE ANALYSIS:');
  console.log('- Contains "class Solution:"?', code.includes('class Solution:'));
  console.log('- Contains "def "?', code.includes('def '));
  console.log('- Contains "```"?', code.includes('```'));
  console.log('- Total lines:', code.split('\n').length);
  console.log('- First 300 chars:', code.substring(0, 300));
  console.log('- Last 200 chars:', code.substring(Math.max(0, code.length - 200)));
  
  // ⚠️ FINAL SAFETY CHECK: Ensure we have a Solution class
  const finalCode = code.trim();
  
  if (!finalCode.includes('class Solution:')) {
    console.error('🚨 CRITICAL: Final code does not contain "class Solution:" - this will cause NameError!');
    console.error('🚨 This suggests the input code was malformed or extraction failed completely');
    
    // Try one last desperate attempt to find any Python class
    if (finalCode.includes('class ') && finalCode.includes('def ')) {
      console.log('🔧 ATTEMPTING: Found some class, trying to preserve it...');
      return finalCode;
    }
    
    // If we have function definitions but no class, wrap them in a Solution class
    if (finalCode.includes('def ') && !finalCode.includes('class ')) {
      console.log('🔧 ATTEMPTING: Found functions without class, wrapping in Solution class...');
      const wrappedCode = `class Solution:\n${finalCode.split('\n').map(line => '    ' + line).join('\n')}`;
      console.log('Wrapped code preview:', wrappedCode.substring(0, 200) + '...');
      return wrappedCode;
    }
  }
  
  return ensureSolutionClass(finalCode, 'fallback');
}

// 🚨 CODE VALIDATION: Check for common syntax issues before execution
function validatePythonCode(code, language) {
  const errors: string[] = [];
  
  if (language !== 'python') {
    return { isValid: true, errors: [] }; // Skip validation for non-Python
  }
  
  // Basic structure checks
  if (!code || code.trim().length === 0) {
    errors.push('Code is empty');
    return { isValid: false, errors };
  }
  
  // Check for required Solution class
  if (!code.includes('class Solution:')) {
    errors.push('Missing "class Solution:" - this will cause NameError');
  }
  
  // Check for truncated lines (common issue)
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Check for lines that end abruptly (like "num_map[num] = i ^")
    if (trimmed.endsWith('^') || trimmed.endsWith('\\') || trimmed.endsWith('=')) {
      errors.push(`Line ${i + 1} appears to be truncated: "${trimmed}"`);
    }
    
    // Check for unmatched brackets/parentheses (basic check)
    const openBrackets = (line.match(/[\[\(]/g) || []).length;
    const closeBrackets = (line.match(/[\]\)]/g) || []).length;
    if (openBrackets > closeBrackets && !line.includes('#') && !trimmed.endsWith(':')) {
      console.log(`⚠️ Line ${i + 1} might have unmatched brackets: "${trimmed}"`);
    }
  }
  
  // Check for proper indentation (Python requirement)
  let hasClassContent = false;
  let inClass = false;
  for (const line of lines) {
    if (line.includes('class Solution:')) {
      inClass = true;
      continue;
    }
    if (inClass && line.trim() && !line.startsWith('    ') && !line.startsWith('\t')) {
      if (line.startsWith('def ') || line.startsWith('class ')) {
        inClass = false; // Ended the Solution class
      } else if (!line.trim().startsWith('#')) {
        errors.push(`Line not properly indented inside Solution class: "${line.trim()}"`);
      }
    }
    if (inClass && (line.includes('def ') || line.trim().length > 0)) {
      hasClassContent = true;
    }
  }
  
  if (code.includes('class Solution:') && !hasClassContent) {
    errors.push('Solution class appears to be empty');
  }
  
  // Check for common Python syntax patterns
  if (code.includes('def ') && !code.match(/def\s+\w+\s*\(/)) {
    errors.push('Function definition syntax appears malformed');
  }
  
  console.log(`✅ Code validation complete: ${errors.length === 0 ? 'PASSED' : 'FAILED'}`);
  if (errors.length > 0) {
    console.log('❌ Validation errors:', errors);
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// ⭐ SAFETY WRAPPER: Ensure extracted code always has Solution class
function ensureSolutionClass(extractedCode, debugLabel) {
  console.log(`🔍 SAFETY CHECK for ${debugLabel}:`);
  
  if (!extractedCode.includes('class Solution:')) {
    console.error(`🚨 SAFETY CHECK FAILED for ${debugLabel}: No "class Solution:" found!`);
    console.error('This will cause NameError in Judge0');
    
    // If we have function definitions but no class, wrap them in a Solution class
    if (extractedCode.includes('def ') && !extractedCode.includes('class ')) {
      console.log('🔧 AUTO-FIX: Wrapping functions in Solution class...');
      const wrappedCode = `class Solution:\n${extractedCode.split('\n').map(line => '    ' + line).join('\n')}`;
      console.log('Auto-fixed code preview:', wrappedCode.substring(0, 200) + '...');
      return wrappedCode;
    }
    
    console.error('🚨 CANNOT AUTO-FIX: No functions found to wrap');
    return extractedCode; // Return as-is, will likely fail
  }
  
  console.log(`✅ SAFETY CHECK PASSED for ${debugLabel}: Solution class found`);
  return extractedCode;
}

// Update problem metrics based on execution results
async function updateProblemMetrics(supabase, problemId, executionResult) {
  try {
    // Get current metrics
    const { data: currentMetrics } = await supabase
      .from('problem_metrics')
      .select('*')
      .eq('problem_id', problemId)
      .single();

    // Calculate new metrics
    const totalAttempts = (currentMetrics?.total_attempts || 0) + 1;
    const successfulAttempts = (currentMetrics?.successful_attempts || 0) + 
      (executionResult.success_rate === 100 ? 1 : 0);
    
    const newAverageSuccessRate = currentMetrics 
      ? ((currentMetrics.average_success_rate * (totalAttempts - 1)) + executionResult.success_rate) / totalAttempts
      : executionResult.success_rate;

    // Calculate average execution time from test results
    const executionTimes = executionResult.test_results
      .map(r => r.execution_time || 0)
      .filter(t => t > 0);
    const avgExecutionTime = executionTimes.length > 0 
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length 
      : 0;

    // Update metrics with calculated averages
    const newAverageExecutionTime = currentMetrics && currentMetrics.average_execution_time > 0
      ? ((currentMetrics.average_execution_time * (totalAttempts - 1)) + avgExecutionTime) / totalAttempts
      : avgExecutionTime;

    // Calculate dynamic difficulty score (0-10 based on success rates)
    const actualDifficultyScore = Math.max(0, 10 - (newAverageSuccessRate / 10));

    // Upsert metrics with proper data types
    await supabase
      .from('problem_metrics')
      .upsert({
        problem_id: problemId, // int4 
        total_attempts: totalAttempts, // int4
        successful_attempts: successfulAttempts, // int4
        average_success_rate: newAverageSuccessRate, // float8 - already a number
        average_execution_time: newAverageExecutionTime, // float8 - already a number
        actual_difficulty_score: actualDifficultyScore, // float8 - already a number
        last_updated: new Date().toISOString() // timestamptz
      }, {
        onConflict: 'problem_id'
      });

    // Update individual test case performance
    if (executionResult.test_results && executionResult.test_results.length > 0) {
      for (let i = 0; i < executionResult.test_results.length; i++) {
        const result = executionResult.test_results[i];
        
        // Update test case pass rates (if we have test case IDs)
        await supabase.rpc('update_test_case_performance', {
          p_test_case_index: i,
          p_problem_id: problemId,
          p_passed: result.passed
        });
      }
    }

    console.log(`Updated metrics for problem ${problemId}: ${successfulAttempts}/${totalAttempts} success rate`);
  } catch (error) {
    console.error('Failed to update problem metrics:', error);
  }
}

// Ultra-lenient comparison function for chaotic database formats
function smartCompareWithLeniency(actualOutput, expectedOutput) {
  try {
    console.log('🔍 Smart lenient comparison:', {
      actual: actualOutput,
      actualType: typeof actualOutput,
      expected: expectedOutput, 
      expectedType: typeof expectedOutput
    });
    
    // Scenario 1: Direct equality (different types but same value)
    if (actualOutput == expectedOutput) {
      console.log('✅ Loose equality match');
      return true;
    }
    
    // Scenario 2: Both can be converted to same JSON string
    if (JSON.stringify(actualOutput) === JSON.stringify(expectedOutput)) {
      console.log('✅ JSON stringify match');
      return true;
    }
    
    // Scenario 3: Expected is string, try to parse it
    if (typeof expectedOutput === 'string') {
      const trimmed = expectedOutput.trim();
      
      // Handle empty string cases
      if (trimmed === '' && (actualOutput === null || actualOutput === undefined || actualOutput === '')) {
        console.log('✅ Empty value match');
        return true;
      }
      
      // Handle numeric strings: "42" vs 42
      if (/^-?\d+\.?\d*$/.test(trimmed)) {
        const numExpected = parseFloat(trimmed);
        if (numExpected === actualOutput) {
          console.log('✅ Numeric string conversion match:', trimmed, '→', numExpected);
          return true;
        }
      }
      
      // Handle boolean/null strings: "true", "false", "null"
      if (trimmed === 'true' && actualOutput === true) {
        console.log('✅ Boolean string match: true');
        return true;
      }
      if (trimmed === 'false' && actualOutput === false) {
        console.log('✅ Boolean string match: false');
        return true;
      }
      if (trimmed === 'null' && actualOutput === null) {
        console.log('✅ Null string match');
        return true;
      }
      
      // Handle JSON strings: "[1,2,3]" or "{'key': 'value'}"
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || 
          (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try {
          const parsed = JSON.parse(trimmed);
          if (JSON.stringify(actualOutput) === JSON.stringify(parsed)) {
            console.log('✅ JSON string parsing match');
            return true;
          }
        } catch (e) { /* Continue to Python format check */ }
      }
      
      // Handle Python format strings: "['a', 'b']", "[True, False, None]"
      if ((trimmed.startsWith('[') || trimmed.startsWith("['")) ||
          (trimmed.startsWith('{') || trimmed.startsWith("{'")) ||
          trimmed.includes('True') || trimmed.includes('False') || trimmed.includes('None')) {
        try {
          let pythonStr = trimmed
            .replace(/'/g, '"')           // 'a' → "a"
            .replace(/None/g, 'null')     // None → null
            .replace(/True/g, 'true')     // True → true  
            .replace(/False/g, 'false');  // False → false
          
          const parsed = JSON.parse(pythonStr);
          if (JSON.stringify(actualOutput) === JSON.stringify(parsed)) {
            console.log('✅ Python format conversion match:', {
              original: expectedOutput,
              converted: pythonStr,
              parsed: parsed
            });
            return true;
          }
        } catch (e) { 
          console.log('⚠️ Python conversion failed:', e.message);
        }
      }
    }
    
    // Scenario 4: Actual is string, expected is object (reverse case)
    if (typeof actualOutput === 'string' && typeof expectedOutput !== 'string') {
      try {
        const parsedActual = JSON.parse(actualOutput);
        if (JSON.stringify(parsedActual) === JSON.stringify(expectedOutput)) {
          console.log('✅ Reverse JSON parsing match');
          return true;
        }
      } catch (e) { /* Not valid JSON */ }
    }
    
    // Scenario 5: Array vs single value (handle [42] vs 42 cases)
    if (Array.isArray(expectedOutput) && expectedOutput.length === 1 && 
        expectedOutput[0] === actualOutput) {
      console.log('✅ Array unwrapping match:', expectedOutput, '→', actualOutput);
      return true;
    }
    if (Array.isArray(actualOutput) && actualOutput.length === 1 && 
        actualOutput[0] === expectedOutput) {
      console.log('✅ Array unwrapping match (reverse):', actualOutput, '→', expectedOutput);
      return true;
    }
    
    // Scenario 6: Content-only comparison (ignore ALL formatting)
    const actualContent = extractContentOnly(actualOutput);
    const expectedContent = extractContentOnly(expectedOutput);
    
    if (actualContent && expectedContent && actualContent === expectedContent) {
      console.log('✅ Content-only match (ignoring formatting):', {
        actualContent,
        expectedContent,
        originalActual: actualOutput,
        originalExpected: expectedOutput
      });
      return true;
    }
    
    console.log('❌ No lenient match found');
    return false;
    
  } catch (error) {
    console.log('⚠️ Smart comparison error, fallback to false:', error.message);
    return false;
  }
}

// Extract just the essential content, ignoring all formatting
function extractContentOnly(value) {
  try {
    let content = '';
    
    // Convert value to string representation
    if (typeof value === 'string') {
      content = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      content = String(value);
    } else if (value === null || value === undefined) {
      content = 'null';
    } else {
      // Convert objects/arrays to JSON then extract content
      content = JSON.stringify(value);
    }
    
    // Extract only alphanumeric characters and normalize
    const extracted = content
      .replace(/[^a-zA-Z0-9.]/g, ' ')    // Replace all punctuation with spaces
      .replace(/\s+/g, ' ')             // Collapse multiple spaces
      .trim()                           // Remove leading/trailing spaces
      .toLowerCase();                   // Normalize case
    
    return extracted || null;
    
  } catch (error) {
    return null;
  }
}

