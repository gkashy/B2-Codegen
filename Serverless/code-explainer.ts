import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};
const DEEPSEEK_API_KEY = 'sk-43c52ba16c3f4308890bc63e21cae08a';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { problem_data, final_code, solution_process, language, stream = false } = await req.json();
    if (!problem_data || !final_code) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: problem_data and final_code'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('🎓 CODE EXPLAINER: Starting explanation and rubric evaluation...');
    // If streaming is requested, return streaming response
    if (stream) {
      return createStreamingResponse(problem_data, final_code, solution_process || '', language || 'python');
    }
    // Otherwise, return regular response
    const explanation = await generateCodeExplanation(problem_data, final_code, solution_process || '', language || 'python');
    const rubricEvaluation = await evaluateWithRubric(explanation, final_code, problem_data);
    return new Response(JSON.stringify({
      explanation,
      rubric_evaluation: rubricEvaluation,
      agent_type: 'explainer',
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Code Explainer error:', error);
    return new Response(JSON.stringify({
      error: 'Code Explainer failed',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
function createStreamingResponse(problemData, finalCode, solutionProcess, language) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start (controller) {
      let streamClosed = false;
      const safeEnqueue = (data)=>{
        if (!streamClosed) {
          try {
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            console.error('Failed to enqueue data:', error);
            streamClosed = true;
          }
        }
      };
      const safeClose = ()=>{
        if (!streamClosed) {
          try {
            streamClosed = true;
            controller.close();
          } catch (error) {
            console.error('Failed to close stream:', error);
          }
        }
      };
      try {
        // Stream the explanation process
        safeEnqueue(`data: ${JSON.stringify({
          type: 'reasoning',
          content: '🎓 **CODE EXPLAINER**: Analyzing your solution for educational insights...\n\n'
        })}\n\n`);
        // Generate explanation
        safeEnqueue(`data: ${JSON.stringify({
          type: 'reasoning',
          content: '📚 **EXPLANATION PHASE**: Generating comprehensive code walkthrough...\n\n'
        })}\n\n`);
        const explanation = await generateCodeExplanation(problemData, finalCode, solutionProcess, language);
        safeEnqueue(`data: ${JSON.stringify({
          type: 'reasoning',
          content: explanation + '\n\n'
        })}\n\n`);
        // Generate rubric evaluation
        safeEnqueue(`data: ${JSON.stringify({
          type: 'reasoning',
          content: '📊 **RUBRIC EVALUATION**: Assessing code quality...\n\n'
        })}\n\n`);
        const rubricEvaluation = await evaluateWithRubric(explanation, finalCode, problemData);
        // Format rubric results
        const formattedRubric = `**Code Quality Assessment Results:**
- **Correctness/Functionality:** ${rubricEvaluation.correctness_score}/5
- **Code Efficiency/Performance:** ${rubricEvaluation.efficiency_score}/5  
- **Code Structure/Organization:** ${rubricEvaluation.structure_score}/5
- **Code Style/Readability:** ${rubricEvaluation.readability_score}/5
- **Edge Case Handling/Robustness:** ${rubricEvaluation.robustness_score}/5

**Overall Grade: ${rubricEvaluation.grade} (${rubricEvaluation.overall_score}/5)**

${rubricEvaluation.strengths?.length > 0 ? `
**✅ Strengths:**
${rubricEvaluation.strengths.map((s)=>`• ${s}`).join('\n')}` : ''}

${rubricEvaluation.improvements?.length > 0 ? `
**🔧 Areas for Improvement:**
${rubricEvaluation.improvements.map((i)=>`• ${i}`).join('\n')}` : ''}`;
        safeEnqueue(`data: ${JSON.stringify({
          type: 'reasoning',
          content: formattedRubric + '\n\n'
        })}\n\n`);
        // Send completion with metadata
        safeEnqueue(`data: ${JSON.stringify({
          type: 'complete',
          metadata: {
            timestamp: new Date().toISOString(),
            agent_type: 'explainer',
            explanation,
            rubric_evaluation: rubricEvaluation
          }
        })}\n\n`);
        safeClose();
      } catch (error) {
        console.error('Streaming explainer error:', error);
        if (!streamClosed) {
          safeEnqueue(`data: ${JSON.stringify({
            type: 'error',
            content: `Explainer failed: ${error.message}`
          })}\n\n`);
          safeClose();
        }
      }
    }
  });
  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
async function generateCodeExplanation(problemData, code, process, language) {
  try {
    const systemPrompt = `You are the CODE EXPLAINER - expert at making complex code understandable for learning.

Your job is to explain the final working solution in an educational way that helps people learn.

Provide a comprehensive explanation with:
1. **Problem Summary**: What the problem asks for
2. **Solution Approach**: High-level strategy used
3. **Code Walkthrough**: Line-by-line explanation of key logic
4. **Algorithm Analysis**: Time/space complexity
5. **Key Insights**: What makes this solution work
6. **Learning Points**: What concepts this teaches

Be thorough but clear. Use examples where helpful.`;
    const userPrompt = `Problem: ${problemData.title}
${problemData.description ? `Description: ${problemData.description}` : ''}

Final Working Code:
\`\`\`${language}
${code}
\`\`\`

${process ? `Solution Process Summary: ${process}` : ''}

Please provide a comprehensive educational explanation of this solution.`;
    return await callDeepSeekAPI(systemPrompt, userPrompt);
  } catch (error) {
    console.error('Failed to generate code explanation:', error);
    throw error;
  }
}
async function evaluateWithRubric(explanation, code, problemData) {
  try {
    const systemPrompt = `You are a CODE QUALITY ASSESSMENT EXPERT evaluating programming solutions.

Rate the CODE QUALITY using this rubric (1-5 scale for each criterion):

**RUBRIC CRITERIA:**
1. **Correctness/Functionality** (1-5): Does the code solve the problem for all test cases, including edge cases?
2. **Code Efficiency/Performance** (1-5): Does the code use optimal time and space complexity?
3. **Code Structure/Organization** (1-5): Is the code modular, readable, and logically structured?
4. **Code Style/Readability** (1-5): Proper naming, indentation, comments, consistent formatting?
5. **Edge Case Handling/Robustness** (1-5): Does the code handle edge cases and error conditions properly?

**SCORING GUIDELINES:**
- 5: Excellent - Production-ready, optimal solution
- 4: Good - Solid implementation with minor improvements possible
- 3: Satisfactory - Works correctly but has room for optimization
- 2: Needs Improvement - Functional but inefficient or poorly structured
- 1: Poor - Incorrect, inefficient, or hard to understand

Respond in this EXACT JSON format:
{
  "correctness_score": 4,
  "efficiency_score": 5, 
  "structure_score": 4,
  "readability_score": 5,
  "robustness_score": 4,
  "overall_score": 4.4,
  "strengths": ["Optimal algorithm", "Clean structure"],
  "improvements": ["Could add more comments"],
  "grade": "B+",
  "summary": "Solid solution with good performance..."
}`;
    const userPrompt = `Problem: ${problemData.title}

Code Being Explained:
\`\`\`
${code}
\`\`\`

Explanation to Evaluate:
${explanation}

Please evaluate this explanation using the rubric and return the JSON assessment.`;
    const response = await callDeepSeekAPI(systemPrompt, userPrompt);
    // Try to parse as JSON, fallback to structured response if needed
    try {
      return JSON.parse(response);
    } catch  {
      // If JSON parsing fails, create structured response from text
      return parseRubricResponse(response);
    }
  } catch (error) {
    console.error('Failed to evaluate with rubric:', error);
    // Return default rubric if evaluation fails
    return {
      correctness_score: 3,
      efficiency_score: 3,
      structure_score: 3,
      readability_score: 3,
      robustness_score: 3,
      overall_score: 3.0,
      strengths: [
        "Code solution provided"
      ],
      improvements: [
        "Could be more optimized"
      ],
      grade: "C",
      summary: "Basic code quality assessment"
    };
  }
}
async function callDeepSeekAPI(systemPrompt, userPrompt) {
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
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Expected JSON response, got: ${contentType}. Response: ${text}`);
    }
    const data = await response.json();
    if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error(`Invalid API response structure: ${JSON.stringify(data)}`);
    }
    return data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API call failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`API call failed: ${String(error)}`);
  }
}
function parseRubricResponse(response) {
  // Fallback parser for non-JSON responses
  const scores = {
    correctness_score: extractScore(response, 'correctness'),
    efficiency_score: extractScore(response, 'efficiency'),
    structure_score: extractScore(response, 'structure'),
    readability_score: extractScore(response, 'readability'),
    robustness_score: extractScore(response, 'robustness')
  };
  const avgScore = Object.values(scores).reduce((a, b)=>a + b, 0) / Object.values(scores).length;
  return {
    ...scores,
    overall_score: Math.round(avgScore * 10) / 10,
    strengths: [
      "Code solution works"
    ],
    improvements: [
      "Could be more optimized"
    ],
    grade: getLetterGrade(avgScore),
    summary: "Code quality assessment completed"
  };
}
function extractScore(text, criterion) {
  // Try to extract score for criterion from text
  const regex = new RegExp(`${criterion}[^\\d]*(\\d)`, 'i');
  const match = text.match(regex);
  return match ? parseInt(match[1]) || 3 : 3;
}
function getLetterGrade(score) {
  if (score >= 4.5) return 'A';
  if (score >= 4.0) return 'A-';
  if (score >= 3.5) return 'B+';
  if (score >= 3.0) return 'B';
  if (score >= 2.5) return 'B-';
  if (score >= 2.0) return 'C+';
  return 'C';
}
