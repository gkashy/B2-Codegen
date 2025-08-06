'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Play, 
  Square, 
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Code,
  Activity,
  RotateCcw,
  Edit,
  Save,
  X,
  AlertCircle,
  Search,
  PlaneTakeoff,
  FileCode,
  Shield,
  ArrowRight,
  User,
  Monitor,
  Settings,
  TestTube,
  Sparkles,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAIStreaming } from '@/hooks/useAIStreaming';
import { useCodeTesting } from '@/hooks/useCodeTesting';
import { useLearningSession } from '@/hooks/useLearningSession';
import { useProblem } from '@/hooks/useQueries';
import { useCodeEditing } from '@/hooks/useCodeEditing';
import { useAnalyzeFix } from '@/hooks/useAnalyzeFix';
import { useTestCaseGeneration } from '@/hooks/useTestCaseGeneration';
import { Problem } from '@/types/backend';
import StreamingModal from './streaming-modal';
import { TestCasePreviewModal } from './test-case-preview-modal';
import { AgentCollaborationModal } from './agent-collaboration-modal';

interface AISolvingInterfaceProps {
  problemId: number;
}

export default function AISolvingInterface({ problemId }: AISolvingInterfaceProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [maxAttempts] = useState(3);
  const [displayCode, setDisplayCode] = useState('');
  const [autoMode, setAutoMode] = useState(false);  // NEW: Toggle for auto-mode
  const [iterativeAgentMode, setIterativeAgentMode] = useState(true);  // NEW: Iterative Agent Collaboration Mode (default enabled)
  const [showFixButton, setShowFixButton] = useState(false);  // NEW: Show fix button when tests fail
  
  // NEW: Iterative Agent States
  const [isIterativeProcessing, setIsIterativeProcessing] = useState(false);
  const [iterativeResults, setIterativeResults] = useState<any>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [agentInteractions, setAgentInteractions] = useState<any[]>([]);
  const [currentPhase, setCurrentPhase] = useState<'analysis' | 'planning' | 'implementation' | 'complete'>('analysis');
  const [currentSuccessRate, setCurrentSuccessRate] = useState(0);
  
  // NEW: Code Explainer states
  const [explanationData, setExplanationData] = useState<any>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // Helper function to get ONLY original/problem test cases (exclude AI generated)
  const getAvailableTestCases = () => {
    if (!problem) return [];
    
    // Prioritize relational test cases from separate table - FILTER OUT AI GENERATED
    if (problem.test_cases_data && Array.isArray(problem.test_cases_data) && problem.test_cases_data.length > 0) {
      return problem.test_cases_data
        .filter((tc: any) => tc.source !== 'llm_generated') // Only show original test cases
        .map((tc: any) => ({
          input: Array.isArray(tc.input_data) ? tc.input_data : [tc.input_data],
          expected: tc.expected_output,
          source: tc.source || 'Original',
          difficulty: tc.difficulty_level || 'Medium',
          id: tc.id
        }));
    }
    
    // Fallback to parsed test cases from problem definition
    if (problem.legacy_test_cases && Array.isArray(problem.legacy_test_cases) && problem.legacy_test_cases.length > 0) {
      return problem.legacy_test_cases.map((tc: any, index: number) => ({
        input: tc.slice(0, -1),
        expected: tc[tc.length - 1],
        source: 'Original',
        difficulty: 'Medium',
        id: `original-${index}`
      }));
    }
    
    return [];
  };

  // NEW: Helper function to get ONLY AI generated test cases
  const getAIGeneratedTestCases = () => {
    if (!problem || !problem.test_cases_data) return [];
    
    return (Array.isArray(problem.test_cases_data) ? problem.test_cases_data : [])
      .filter((tc: any) => tc.source === 'llm_generated') // Only AI generated cases
      .map((tc: any) => ({
        input_data: tc.input_data,
        expected_output: tc.expected_output,
        difficulty_level: tc.difficulty_level || 'Medium',
        explanation: tc.generation_reasoning || 'AI generated test case',
        id: tc.id
      }));
  };

  // NEW: Multi-agent UI state
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [agentOutputs, setAgentOutputs] = useState<{
    analyzer: string;
    planner: string;
    coder: string;
    reviewer: string;
    explainer: string;
  }>({
    analyzer: '',
    planner: '',
    coder: '',
    reviewer: '',
    explainer: ''
  });
  const [completedAgents, setCompletedAgents] = useState<string[]>([]);
  const [showStreamingModal, setShowStreamingModal] = useState(false);
  
  // Backend hooks
  const { data: problem, isLoading: problemLoading } = useProblem(problemId);
  const { reasoning, code, status, error, startStreaming, reset: resetStreaming, isStreaming } = useAIStreaming();
  const { results, testCode, isLoading: isTesting } = useCodeTesting();
  const { session, startSession, isLoading: sessionLoading } = useLearningSession();
  const { 
    isEditing, 
    editedCode, 
    isSaving, 
    saveError, 
    saveSuccess, 
    startEditing, 
    cancelEditing, 
    saveCode, 
    updateEditedCode 
  } = useCodeEditing();
  
  // NEW: Analyze & Fix functionality
  const { 
    analyzeAndFix, 
    isAnalyzing, 
    analysisResult, 
    error: analysisError,
    clearResults: clearAnalysisResults 
  } = useAnalyzeFix();
  
  // NEW: Test case generation functionality
  const { 
    generateTestCases,
    isGenerating: isGeneratingTestCases,
    generationError,
    lastGenerated,
    saveTestCases,
    isSaving: isSavingTestCases,
    savingError,
    resetGeneration
  } = useTestCaseGeneration();
  
  // NEW: Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTestCases, setPreviewTestCases] = useState<any[]>([]);
  const [showAllProblemCases, setShowAllProblemCases] = useState(false);
  const [showAllAICases, setShowAllAICases] = useState(false);

  // Calculate available test cases after problem is loaded
  const availableTestCases = useMemo(() => {
    return getAvailableTestCases();
  }, [problem]);

  // Calculate all AI test cases (saved + newly generated)
  // FIXED: Now properly separates AI-generated (source='llm_generated') from original test cases
  const allAITestCases = useMemo(() => {
    const savedAITestCases = getAIGeneratedTestCases(); // From database with source='llm_generated'
    const newTestCases = previewTestCases; // Newly generated, not yet saved
    
    // Combine saved and new test cases, avoiding duplicates by content comparison
    const combined = [...savedAITestCases];
    
    // Add new test cases that aren't already saved (avoid duplicates)
    newTestCases.forEach(newTC => {
      const alreadyExists = savedAITestCases.some(savedTC => 
        JSON.stringify(savedTC.input_data) === JSON.stringify(newTC.input_data) &&
        JSON.stringify(savedTC.expected_output) === JSON.stringify(newTC.expected_output)
      );
      
      if (!alreadyExists) {
        combined.push(newTC);
      }
    });
    
    return combined;
  }, [problem, previewTestCases]);

  const handleStartAI = async () => {
    if (!problem) return;
    
    // NEW: Handle Iterative Agent Mode
    if (iterativeAgentMode) {
      return handleStartIterativeAgents();
    }
    
    resetStreaming();
    setCurrentAttempt(1);
    setShowFixButton(false);  // Reset fix button
    
    // Reset multi-agent states
    setActiveAgent(null);
    setAgentOutputs({
      analyzer: '',
      planner: '',
      coder: '',
      reviewer: '',
      explainer: ''
    });
    setCompletedAgents([]);
    
    // Auto-open streaming modal when AI starts
    setShowStreamingModal(true);
    
    await startStreaming({
      problem_id: problemId,
      language: selectedLanguage,
      attempt_number: currentAttempt,
      auto_mode: autoMode  // NEW: Pass auto-mode flag
    });
  };

  // NEW: Browser Orchestrated Iterative Agent Collaboration
  const handleStartIterativeAgents = async () => {
    if (!problem || isIterativeProcessing) return;
    
    // Reset states
    setIsIterativeProcessing(true);
    setIterativeResults(null);
    setAgentInteractions([]);
    setCurrentPhase('analysis');
    setCurrentSuccessRate(0);
    setShowAgentModal(true);
    
    try {
      // Step 1: Get orchestration data from code-generator
      console.log('🚀 Getting orchestration data...');
      const orchestrationResponse = await fetch('https://mbuiluhrtlgyawlqchaq.supabase.co/functions/v1/code-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: problemId,
          language: selectedLanguage,
          use_iterative_agents: true,
          max_iterations: 10
        })
      });

      if (!orchestrationResponse.ok) {
        throw new Error(`Orchestration failed: ${orchestrationResponse.status}`);
      }

      const orchestrationData = await orchestrationResponse.json();
      
      if (orchestrationData.mode !== 'browser_orchestrated') {
        throw new Error('Expected browser orchestrated mode');
      }

      const { agent_endpoints, prompts, problem_data, max_iterations } = orchestrationData;

      // Step 2: Start the agent collaboration process
      await runBrowserOrchestratedAgents(agent_endpoints, prompts, problem_data, max_iterations);

    } catch (error) {
      console.error('Browser orchestrated agent process failed:', error);
      alert(`Agent process failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsIterativeProcessing(false);
    }
  };

  // Helper function to add interaction and update UI
  const addAgentInteraction = (agent: string, action: string, content: string) => {
    const interaction = {
      agent,
      action,
      content,
      timestamp: new Date().toISOString()
    };
    setAgentInteractions(prev => [...prev, interaction]);
    console.log(`${agent.toUpperCase()}: ${action}`, content.substring(0, 100) + '...');
  };

  // NEW: Call code explainer after successful execution
  const callCodeExplainer = async (finalCode: string, solutionProcess?: string) => {
    if (!problem || !finalCode.trim()) return;
    
    try {
      setIsExplaining(true);
      console.log('🎓 Calling Code Explainer for pedagogical assessment...');
      
      // Reset explainer output
      setAgentOutputs(prev => ({ ...prev, explainer: '' }));
      
      const response = await fetch('https://mbuiluhrtlgyawlqchaq.supabase.co/functions/v1/code-explainer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          problem_data: {
            title: problem.title,
            description: problem.content_html || problem.title,
            id: problem.id
          },
          final_code: finalCode,
          solution_process: solutionProcess || 'Code generated through AI agent collaboration',
          language: selectedLanguage,
          stream: false // Use non-streaming for now
        })
      });

      if (!response.ok) {
        throw new Error(`Code Explainer failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Code Explainer completed:', result);
      
      // For iterative mode - add to agent interactions
      if (iterativeAgentMode) {
        addAgentInteraction('explainer', 'educational_analysis', 
          JSON.stringify({
            explanation: result.explanation,
            rubric: result.rubric_evaluation,
            type: 'pedagogical_assessment'
          })
        );
      } else {
        // For manual mode - update agent outputs and mark as completed
        console.log('🔧 Manual mode: Updating explainer state with result:', result);
        setAgentOutputs(prev => {
          const newOutputs = {
            ...prev,
            explainer: JSON.stringify(result)
          };
          console.log('🔧 Setting agentOutputs:', newOutputs);
          return newOutputs;
        });
        setCompletedAgents(prev => {
          const newCompleted = [...prev.filter(a => a !== 'explainer'), 'explainer'];
          console.log('🔧 Setting completedAgents:', newCompleted);
          return newCompleted;
        });
        setActiveAgent(null);
        console.log('🔧 Explainer should now be completed in UI');
      }
      
      setExplanationData(result);

    } catch (error) {
      console.error('Code Explainer error:', error);
      // Don't show error to user, just log it
    } finally {
      setIsExplaining(false);
    }
  };

  // Helper function to call individual agents
  const callAgent = async (endpoint: string, prompt: string, problemTitle: string, additionalData = {}) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        problem_title: problemTitle,
        ...additionalData
      })
    });

    if (!response.ok) {
      throw new Error(`Agent call failed: ${response.status}`);
    }

    const result = await response.json();
    return result.result;
  };

  // Main orchestration function - SIMPLIFIED FLOW
  const runBrowserOrchestratedAgents = async (endpoints: any, prompts: any, problemData: any, maxIterations: number) => {
    try {
      // STEP 1: ANALYZER (once)
      setCurrentPhase('analysis');
      console.log('🔍 STEP 1: Analysis');
      
      const analysisResult = await callAgent(endpoints.analyzer, prompts.initial_analysis, problemData.title);
      addAgentInteraction('analyzer', 'analyze_problem', analysisResult);

      // STEP 2: PLANNER (once) 
      setCurrentPhase('planning');
      console.log('📋 STEP 2: Planning');
      
      const planPrompt = prompts.planning.replace('{analysis}', analysisResult);
      const planResult = await callAgent(endpoints.planner, planPrompt, problemData.title);
      addAgentInteraction('planner', 'create_plan', planResult);

      // STEP 3: CODER → REVIEWER LOOP (until "perfect")
      setCurrentPhase('implementation');
      console.log('💻 STEP 3: Code → Review Loop');
      
      let currentCode = '';
      let codeIsPerfect = false;
      let codeReviewIterations = 0;
      const maxCodeReviews = 5;

      while (!codeIsPerfect && codeReviewIterations < maxCodeReviews) {
        codeReviewIterations++;
        console.log(`\n🔄 Code Review Iteration ${codeReviewIterations}`);

        // CODER: Generate/fix code
        const coderPrompt = codeReviewIterations === 1 
          ? prompts.initial_coding
              .replace('{analysis}', analysisResult)
              .replace('{plan}', planResult)
          : buildCodeFixingPrompt(problemData, analysisResult, planResult, currentCode, 'reviewer_feedback');
        
        currentCode = await callAgent(endpoints.coder, coderPrompt, problemData.title, {
          coding_type: codeReviewIterations === 1 ? 'initial' : 'fixing'
        });
        
        addAgentInteraction('coder', 
          codeReviewIterations === 1 ? 'generate_code' : 'fix_code', 
          currentCode);

        // REVIEWER: Check if code is perfect
        const reviewPrompt = buildCodeReviewPrompt(problemData, currentCode, codeReviewIterations);
        const reviewResult = await callAgent(endpoints.reviewer, reviewPrompt, problemData.title, {
          review_type: 'code_review'
        });
        
        addAgentInteraction('reviewer', 'review_code', reviewResult);

        // Check if reviewer says "PERFECT"
        codeIsPerfect = reviewResult.toLowerCase().includes("perfect") || 
                       reviewResult.toLowerCase().includes("code_approved") ||
                       reviewResult.toLowerCase().includes("looks good") ||
                       codeReviewIterations >= maxCodeReviews;
        
        console.log(`Code Review ${codeReviewIterations}: ${codeIsPerfect ? 'PERFECT ✅' : 'NEEDS FIX ❌'}`);
        
        if (!codeIsPerfect) {
          // Store reviewer feedback for next coder iteration
          (window as any).lastReviewerFeedback = reviewResult;
        }
      }

      // STEP 4: TESTING LOOP (until all tests pass)
      console.log('🧪 STEP 4: Testing Loop');
      
      let allTestsPassed = false;
      let testingIterations = 0;
      let bestSuccessRate = 0;
      
      while (!allTestsPassed && testingIterations < maxIterations) {
        testingIterations++;
        console.log(`\n🧪 Testing Iteration ${testingIterations}`);

        // TEST the solution using smart-handler
        const testResponse = await fetch(endpoints.tester, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problem_id: problemData.id,
            solution_code: currentCode,
            language: selectedLanguage
          })
        });

        if (!testResponse.ok) {
          throw new Error(`Testing failed: ${testResponse.status}`);
        }

        const testResults = await testResponse.json();
        const successRate = testResults.success_rate;
        setCurrentSuccessRate(successRate);
        
        // Store full test results data for detailed display
        addAgentInteraction('tester', 'run_tests', 
          JSON.stringify({
            summary: `Success Rate: ${successRate}% (${testResults.passed_tests}/${testResults.total_tests})`,
            success_rate: successRate,
            total_tests: testResults.total_tests,
            passed_tests: testResults.passed_tests,
            failed_tests: testResults.failed_tests,
            test_results: testResults.test_results,
            overall_status: testResults.overall_status
          }));

        if (successRate === 100) {
          allTestsPassed = true;
          console.log('🎉 All tests passed!');
          addAgentInteraction('system', 'all_tests_passed', '🎉 Perfect solution! All tests passed.');
          
          // Call code explainer for pedagogical assessment
          await callCodeExplainer(currentCode, 'Iterative AI agent collaboration with testing');
          
          break;
        }

        // If tests failed, get reviewer analysis and fix code
        if (successRate > bestSuccessRate) {
          bestSuccessRate = successRate;
          console.log(`📈 Test improvement: ${bestSuccessRate}%`);
        }

        // REVIEWER: Analyze test failures
        const failedTests = testResults.test_results.filter((t: any) => !t.passed);
        const testFailurePrompt = buildTestFailurePrompt(
          problemData, currentCode, successRate, testResults.passed_tests, 
          testResults.total_tests, failedTests
        );
        
        const testReviewResult = await callAgent(endpoints.reviewer, testFailurePrompt, problemData.title, {
          review_type: 'test_failure'
        });
        addAgentInteraction('reviewer', 'analyze_test_failures', testReviewResult);

        // CODER: Fix code based on test failures
        const testFixPrompt = buildTestFixingPrompt(
          problemData, analysisResult, planResult, currentCode, testReviewResult
        );
        
        currentCode = await callAgent(endpoints.coder, testFixPrompt, problemData.title, {
          coding_type: 'test_fixing'
        });
        
        addAgentInteraction('coder', 'fix_test_failures', currentCode);

        // REVIEWER: Quick approval of test fix
        const quickReviewPrompt = buildQuickReviewPrompt(problemData, currentCode);
        const quickReviewResult = await callAgent(endpoints.reviewer, quickReviewPrompt, problemData.title, {
          review_type: 'quick_approval'
        });
        addAgentInteraction('reviewer', 'approve_test_fix', quickReviewResult);

        if (testingIterations >= maxIterations) {
          console.log('⏹️ Max testing iterations reached');
          addAgentInteraction('system', 'max_iterations', 
            `Testing stopped after ${maxIterations} iterations. Best: ${bestSuccessRate}%`);
          break;
        }
      }

      // Final results
      const finalResult = {
        success: allTestsPassed,
        final_code: currentCode,
        success_rate: allTestsPassed ? 100 : bestSuccessRate,
        interactions: agentInteractions,
        total_iterations: testingIterations,
        code_reviews: codeReviewIterations
      };
      
      setIterativeResults(finalResult);
      setDisplayCode(currentCode);
      setCurrentPhase('complete');

    } catch (error) {
      console.error('Agent orchestration error:', error);
      addAgentInteraction('system', 'error', `Process failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      setIsIterativeProcessing(false);
    }
  };

  // Helper function to build code review prompt
  const buildCodeReviewPrompt = (problemData: any, code: string, iteration: number) => {
    return `🔍 REVIEWER: Review this code for correctness and quality.

Problem: ${problemData.title}
Review Iteration: ${iteration}

Code to Review:
${code}

Your review should check:
1. **Logic Correctness**: Does the algorithm solve the problem correctly?
2. **Edge Cases**: Are all edge cases handled?
3. **Code Quality**: Is it clean, readable, and efficient?
4. **Completeness**: Is anything missing?

If the code is excellent and ready for testing, respond with "PERFECT" or "CODE_APPROVED".
If there are issues, provide specific feedback on what needs to be fixed.`;
  };

  // Helper function to build code fixing prompt  
  const buildCodeFixingPrompt = (problemData: any, analysis: string, plan: string, currentCode: string, feedbackSource: string) => {
    const reviewerFeedback = (window as any).lastReviewerFeedback || 'Fix the issues mentioned';
    
    return `💻 CODER: Fix the code based on reviewer feedback.

Problem: ${problemData.title}
Language: ${selectedLanguage}

Analysis Context:
${analysis}

Plan Context:
${plan}

Current Code:
${currentCode}

Reviewer Feedback:
${reviewerFeedback}

🚨 CRITICAL: Output ONLY the corrected Python code. No markdown, no explanations.
Fix the issues mentioned by the reviewer and ensure the code is perfect.`;
  };

  // Helper function to build test failure prompt
  const buildTestFailurePrompt = (problemData: any, code: string, successRate: number, passedTests: number, totalTests: number, failedTests: any[]) => {
    return `🔍 REVIEWER: Analyze why tests are failing and provide fixing guidance.

Problem: ${problemData.title}
Current Code:
${code}

Test Results:
- Success Rate: ${successRate}%
- Passed: ${passedTests}/${totalTests} tests

Failed Tests:
${failedTests.map((test: any, i: number) => 
  `${i + 1}. Input: ${test.input} → Expected: ${test.expected_output}, Got: ${test.actual_output}${test.error ? ` (Error: ${test.error})` : ''}`
).join('\n')}

Analyze:
1. **Root Cause**: Why are these specific tests failing?
2. **Pattern**: Is there a common issue across failures?
3. **Fix Strategy**: What specific changes are needed?
4. **Edge Cases**: Any missed edge cases?

Provide clear, actionable guidance for the coder to fix these issues.`;
  };

  // Helper function to build test fixing prompt
  const buildTestFixingPrompt = (problemData: any, analysis: string, plan: string, currentCode: string, reviewerAnalysis: string) => {
    return `💻 CODER: Fix the failing tests based on reviewer analysis.

Problem: ${problemData.title}
Language: ${selectedLanguage}

Original Analysis:
${analysis}

Original Plan:
${plan}

Current Failing Code:
${currentCode}

Reviewer's Test Failure Analysis:
${reviewerAnalysis}

🚨 CRITICAL: Output ONLY the corrected Python code. No markdown, no explanations.
Fix the specific test failures identified by the reviewer. Ensure all edge cases are handled.`;
  };

  // Helper function to build quick review prompt
  const buildQuickReviewPrompt = (problemData: any, code: string) => {
    return `🔍 REVIEWER: Quick approval check for test-fixed code.

Problem: ${problemData.title}

Updated Code:
${code}

Quick check:
1. Does the logic look sound?
2. Are the test failure fixes applied?

If it looks good, respond with "LOOKS_GOOD" or "APPROVED".
If there are obvious issues, mention them briefly.`;
  };

  const handleTestCode = async () => {
    if (!displayCode || !problem) return;
    
    await testCode({
      problem_id: problemId,
      solution_code: displayCode,
      language: selectedLanguage
    });
    
    // Show "Fix & Improve" button if tests fail and we're in manual mode
    setShowFixButton(true);
    
    // Call code explainer after testing completes (handled in useEffect)
  };

  // NEW: Handle analyze and fix functionality
  const handleAnalyzeAndFix = async () => {
    if (!displayCode || !problem || !results) return;
    
    try {
      // Clear previous analysis
      clearAnalysisResults();
      
      // Extract failed and passed test cases
      const failedTests = results.test_results.filter(test => !test.passed);
      const passedTests = results.test_results.filter(test => test.passed);
      
      // Call analyze and fix API
      const analysisResult = await analyzeAndFix({
        problem_id: problemId,
        original_code: displayCode,
        failed_test_cases: failedTests,
        passed_test_cases: passedTests,
        language: selectedLanguage
      });
      
      // Auto-apply the fixed code
      if (analysisResult.fixed_code) {
        setDisplayCode(analysisResult.fixed_code);
        console.log('✅ Code fix applied automatically');
      }
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
    }
  };

  // NEW: Handle test case generation (preview only)
  const handleGenerateTestCases = async () => {
    if (!problem) return;
    
    try {
      const result = await generateTestCases({
        problem_id: problemId,
        count: 3, // Generate 3 additional test cases
        difficulty_level: 'hard',
        focus_areas: ['edge_cases', 'boundary_conditions', 'corner_cases']
      });
      
      // Show preview modal with generated test cases
      setPreviewTestCases(result.test_cases || []);
      setShowPreviewModal(true);
      
      console.log('✅ Test cases generated for preview:', result.generated_count);
    } catch (error) {
      console.error('❌ Test case generation failed:', error);
    }
  };

  // NEW: Handle saving selected test cases from preview
  const handleSaveTestCases = async (selectedTestCases: any[], closeModal: boolean = true) => {
    if (!problem) return;
    
    try {
      await saveTestCases({
        problem_id: problemId,
        test_cases: selectedTestCases
      });
      
      if (closeModal) {
        setShowPreviewModal(false);
        setPreviewTestCases([]);
      }
      
      console.log('✅ Test cases saved successfully:', selectedTestCases.length);
    } catch (error) {
      console.error('❌ Test case saving failed:', error);
    }
  };

  // NEW: Handle testing with selected test cases
  const handleTestWithSelected = async (selectedTestCases: any[]) => {
    if (!displayCode || !problem || selectedTestCases.length === 0) {
      console.error('❌ Cannot test: missing code, problem, or test cases');
      return;
    }
    
    console.log('🧪 Testing code against selected test cases:', selectedTestCases.length);
    
    try {
      // Test against specific selected test cases
      const response = await fetch('/api/test-with-custom-cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problem_id: problemId,
          solution_code: displayCode,
          language: selectedLanguage,
          custom_test_cases: selectedTestCases
        }),
      });

      if (!response.ok) {
        throw new Error(`Test failed: ${response.status}`);
      }

      const testResults = await response.json();
      console.log('✅ Test results for selected cases:', testResults);
      
      // You could display these results in a special modal or section
      // For now, we'll just log them
      alert(`Test Results:\n${testResults.passed_tests}/${testResults.total_tests} tests passed`);
      
    } catch (error) {
      console.error('❌ Testing with selected cases failed:', error);
      // Fallback to regular testing
      console.log('🔄 Falling back to regular testing...');
      await testCode({
        problem_id: problemId,
        solution_code: displayCode,
        language: selectedLanguage
      });
    }
  };

  // NEW: Test with newly generated test cases
  const handleTestWithNewCases = async () => {
    if (!displayCode || !problem) return;
    
    // Run the test again - smart-handler will automatically include new test cases
    await testCode({
      problem_id: problemId,
      solution_code: displayCode,
      language: selectedLanguage
    });
  };

  const handleStartLearningSession = async () => {
    if (!problem) return;
    
    await startSession({
      problem_id: problemId,
      language: selectedLanguage,
      max_attempts: maxAttempts
    });
  };

  // NEW: Handle "Fix & Improve" button
  const handleFixAndImprove = async () => {
    if (!problem) return;
    
    setShowFixButton(false);
    
    await startSession({
      problem_id: problemId,
      language: selectedLanguage,
      max_attempts: 3  // Fixed 3 attempts for fix mode
    });
  };

  const handleSaveCode = async () => {
    await saveCode({
      problem_id: problemId,
      language: selectedLanguage,
      onSaveSuccess: (savedCode) => {
        setDisplayCode(savedCode);
      }
    });
  };

  // Update displayCode when AI generates new code
  React.useEffect(() => {
    if (code) {
      setDisplayCode(code);
    }
  }, [code]);

  // Parse multi-agent reasoning output
  React.useEffect(() => {
    if (reasoning) {
      parseAgentReasoning(reasoning);
    }
  }, [reasoning]);



  const parseAgentReasoning = (reasoningText: string) => {
    const lines = reasoningText.split('\n');
    let currentAgent: string | null = null;
    const outputs = { ...agentOutputs };
    const completed: string[] = [];

    for (const line of lines) {
      if (line.includes('**ANALYZER AGENT**')) {
        currentAgent = 'analyzer';
        setActiveAgent('analyzer');
        outputs.analyzer = '';
      } else if (line.includes('**PLANNER AGENT**')) {
        if (currentAgent === 'analyzer') completed.push('analyzer');
        currentAgent = 'planner';
        setActiveAgent('planner');
        outputs.planner = '';
      } else if (line.includes('**CODER AGENT**')) {
        if (currentAgent === 'planner') completed.push('planner');
        currentAgent = 'coder';
        setActiveAgent('coder');
        outputs.coder = '';
      } else if (line.includes('**REVIEWER AGENT**')) {
        if (currentAgent === 'coder') completed.push('coder');
        currentAgent = 'reviewer';
        setActiveAgent('reviewer');
        outputs.reviewer = '';
      } else if (currentAgent && line.trim()) {
        // Skip the agent header lines
        if (!line.includes('**') || !line.includes('AGENT')) {
          outputs[currentAgent as keyof typeof outputs] += line + '\n';
        }
      }
    }

    // Mark final agent as completed if reasoning is complete
    if (status === 'complete' && currentAgent) {
      completed.push(currentAgent);
      setActiveAgent(null);
    }

    setAgentOutputs(outputs);
    setCompletedAgents(completed);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'thinking': return 'bg-yellow-500';
      case 'coding': return 'bg-blue-500';
      case 'complete': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'thinking': return 'Analyzing Problem...';
      case 'coding': return 'Generating Code...';
      case 'complete': return 'Solution Complete';
      default: return 'Ready';
    }
  };

  // Enhanced agent configuration with vivid colors
  const agents = [
    {
      id: 'analyzer',
      name: 'Analyzer',
      icon: Search,
      emoji: '🔍',
      color: 'blue',
      description: 'Analyzes problem structure and constraints',
      bgColor: 'bg-blue-100 dark:bg-blue-900/50',
      borderColor: 'border-blue-400 dark:border-blue-500',
      iconColor: 'text-blue-700 dark:text-blue-300',
      accentColor: 'bg-blue-600',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-blue-600'
    },
    {
      id: 'planner',
      name: 'Planner',
      icon: PlaneTakeoff,
      emoji: '🎯',
      color: 'purple',
      description: 'Develops solution strategy and approach',
      bgColor: 'bg-purple-100 dark:bg-purple-900/50',
      borderColor: 'border-purple-400 dark:border-purple-500',
      iconColor: 'text-purple-700 dark:text-purple-300',
      accentColor: 'bg-purple-600',
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-purple-600'
    },
    {
      id: 'coder',
      name: 'Coder',
      icon: FileCode,
      emoji: '💻',
      color: 'green',
      description: 'Implements the solution in code',
      bgColor: 'bg-green-100 dark:bg-green-900/50',
      borderColor: 'border-green-400 dark:border-green-500',
      iconColor: 'text-green-700 dark:text-green-300',
      accentColor: 'bg-green-600',
      gradientFrom: 'from-green-500',
      gradientTo: 'to-green-600'
    },
    {
      id: 'reviewer',
      name: 'Reviewer',
      icon: Shield,
      emoji: '✅',
      color: 'orange',
      description: 'Reviews and validates the solution',
      bgColor: 'bg-orange-100 dark:bg-orange-900/50',
      borderColor: 'border-orange-400 dark:border-orange-500',
      iconColor: 'text-orange-700 dark:text-orange-300',
      accentColor: 'bg-orange-600',
      gradientFrom: 'from-orange-500',
      gradientTo: 'to-orange-600'
    }
  ];

  // NEW: Expandable agent states
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  
  // NEW: Reasoning tab state
  const [reasoningSelectedAgent, setReasoningSelectedAgent] = useState<string | null>(null);
  
  // Auto-select first agent when reasoning data becomes available
  React.useEffect(() => {
    const reasoningData = getReasoningData();
    if (reasoningData.length > 0 && !reasoningSelectedAgent) {
      setReasoningSelectedAgent(`${reasoningData[0].id}-0`);
    }
  }, [agentInteractions, agentOutputs, reasoningSelectedAgent]);
  
  // Enhanced markdown parser for Code Explainer content
  const parseMarkdownContent = (content: string): React.ReactElement[] => {
    if (!content) return [];
    
    const lines = content.split('\n');
    const elements: React.ReactElement[] = [];
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let currentListItems: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          if (codeContent.length > 0) {
            elements.push(
              <div key={`code-${i}`} className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm my-3 overflow-x-auto">
                <pre>{codeContent.join('\n')}</pre>
              </div>
            );
          }
          codeContent = [];
          inCodeBlock = false;
        } else {
          // Start code block
          inCodeBlock = true;
          if (currentListItems.length > 0) {
            elements.push(
              <ul key={`list-${i}`} className="list-disc ml-6 space-y-1 my-3">
                {currentListItems.map((item, idx) => (
                  <li key={idx} className="text-blue-800">{parseInlineMarkdown(item)}</li>
                ))}
              </ul>
            );
            currentListItems = [];
          }
        }
        continue;
      }
      
      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }
      
      // Handle headers
      if (trimmedLine.startsWith('####')) {
        if (currentListItems.length > 0) {
          elements.push(
            <ul key={`list-${i}`} className="list-disc ml-6 space-y-1 my-3">
              {currentListItems.map((item, idx) => (
                <li key={idx} className="text-blue-800">{parseInlineMarkdown(item)}</li>
              ))}
            </ul>
          );
          currentListItems = [];
        }
        
        const headerText = trimmedLine.replace(/^####\s*/, '');
        elements.push(
          <h4 key={i} className="text-lg font-bold text-blue-900 mt-6 mb-3 border-b border-blue-200 pb-1">
            {parseInlineMarkdown(headerText)}
          </h4>
        );
      } else if (trimmedLine.startsWith('###')) {
        if (currentListItems.length > 0) {
          elements.push(
            <ul key={`list-${i}`} className="list-disc ml-6 space-y-1 my-3">
              {currentListItems.map((item, idx) => (
                <li key={idx} className="text-blue-800">{parseInlineMarkdown(item)}</li>
              ))}
            </ul>
          );
          currentListItems = [];
        }
        
        const headerText = trimmedLine.replace(/^###\s*/, '');
        elements.push(
          <h3 key={i} className="text-xl font-bold text-blue-900 mt-6 mb-4 border-b-2 border-blue-300 pb-2">
            {parseInlineMarkdown(headerText)}
          </h3>
        );
      }
      // Handle list items
      else if (trimmedLine.match(/^[-*]\s+/) || trimmedLine.match(/^\d+\.\s+/)) {
        const listItemText = trimmedLine.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
        currentListItems.push(listItemText);
      }
      // Handle regular paragraphs
      else if (trimmedLine) {
        if (currentListItems.length > 0) {
          elements.push(
            <ul key={`list-${i}`} className="list-disc ml-6 space-y-1 my-3">
              {currentListItems.map((item, idx) => (
                <li key={idx} className="text-blue-800">{parseInlineMarkdown(item)}</li>
              ))}
            </ul>
          );
          currentListItems = [];
        }
        
        elements.push(
          <p key={i} className="text-blue-800 mb-3 leading-relaxed">
            {parseInlineMarkdown(trimmedLine)}
          </p>
        );
      }
      else if (!trimmedLine && elements.length > 0) {
        elements.push(<div key={`space-${i}`} className="mb-2"></div>);
      }
    }
    
    if (currentListItems.length > 0) {
      elements.push(
        <ul key="final-list" className="list-disc ml-6 space-y-1 my-3">
          {currentListItems.map((item, idx) => (
            <li key={idx} className="text-blue-800">{parseInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
    }
    
    return elements;
  };

  // Parse inline markdown (bold, inline code, etc.)
  const parseInlineMarkdown = (text: string): React.ReactNode => {
    if (!text) return text;
    
    const boldRegex = /(\*\*.*?\*\*)/g;
    const parts = text.split(boldRegex);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold text-blue-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      
      const codeRegex = /(`[^`]+`)/g;
      const codeParts = part.split(codeRegex);
      
      return codeParts.map((codePart, codeIndex) => {
        if (codePart.startsWith('`') && codePart.endsWith('`')) {
          return (
            <code key={`${index}-${codeIndex}`} className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">
              {codePart.slice(1, -1)}
            </code>
          );
        }
        return codePart;
      });
    });
  };

  // Parse structured content (similar to agent collaboration modal)
  const parseStructuredContent = (content: string): React.ReactElement[] => {
    if (!content || typeof content !== 'string') {
      return [<div key="empty" className="text-gray-500">No content available</div>];
    }
    
    // Split by patterns and create formatted elements
    const lines = content.split('\n');
    const elements: React.ReactElement[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        elements.push(<br key={`br-${index}`} />);
        return;
      }
      
      // Handle various markdown patterns
      if (trimmedLine.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="text-lg font-bold text-gray-900 mt-4 mb-2">
            {trimmedLine.substring(4)}
          </h3>
        );
      } else if (trimmedLine.startsWith('#### ')) {
        elements.push(
          <h4 key={index} className="text-md font-bold text-gray-800 mt-3 mb-2">
            {trimmedLine.substring(5)}
          </h4>
        );
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
        elements.push(
          <div key={index} className="ml-4 mb-1 flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span className="text-gray-700">{trimmedLine.substring(2)}</span>
          </div>
        );
      } else {
        // Regular text with bold formatting
        const formattedText = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        elements.push(
          <p key={index} className="text-gray-700 mb-2 leading-relaxed" 
             dangerouslySetInnerHTML={{ __html: formattedText }} />
        );
      }
    });
    
    return elements;
  };
  
  // NEW: Function to get comprehensive reasoning data from all modes
  const getReasoningData = () => {
    const allAgentData = [];
    
    // Manual mode: Use agentOutputs (from parsing reasoning text)
    if (reasoning || agentOutputs.analyzer || agentOutputs.planner || agentOutputs.coder || agentOutputs.reviewer) {
      agents.forEach(agent => {
        const output = agentOutputs[agent.id as keyof typeof agentOutputs];
        const isCompleted = completedAgents.includes(agent.id);
        const isActive = activeAgent === agent.id;
        
        if (output || isCompleted || isActive) {
          allAgentData.push({
            id: agent.id,
            name: agent.name,
            description: agent.description,
            icon: agent.icon,
            emoji: agent.emoji,
            color: agent.color,
            bgColor: agent.bgColor,
            borderColor: agent.borderColor,
            iconColor: agent.iconColor,
            content: output || '',
            isActive,
            isCompleted,
            timestamp: new Date().toISOString(),
            action: 'analysis'
          });
        }
      });
      
      // Add explainer if available
      if (agentOutputs.explainer) {
        allAgentData.push({
          id: 'explainer',
          name: 'Code Explainer',
          description: 'Educational analysis and quality assessment',
          icon: null,
          emoji: '🎓',
          color: 'from-purple-600 to-purple-700',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          iconColor: 'text-purple-600',
          content: agentOutputs.explainer,
          isActive: false,
          isCompleted: true,
          timestamp: new Date().toISOString(),
          action: 'educational_analysis'
        });
      }
    }
    
    // Iterative mode: Use agentInteractions
    if (agentInteractions && agentInteractions.length > 0) {
      return agentInteractions.map(interaction => ({
        id: interaction.agent,
        name: interaction.agent === 'explainer' ? 'Code Explainer' : 
              interaction.agent.charAt(0).toUpperCase() + interaction.agent.slice(1),
        description: interaction.agent === 'explainer' ? 'Educational analysis and quality assessment' : 
                    `AI ${interaction.agent} analysis`,
        icon: null,
        emoji: interaction.agent === 'analyzer' ? '🔍' :
               interaction.agent === 'planner' ? '🎯' :
               interaction.agent === 'coder' ? '💻' :
               interaction.agent === 'reviewer' ? '✅' :
               interaction.agent === 'tester' ? '🧪' :
               interaction.agent === 'explainer' ? '🎓' : '🤖',
        color: interaction.agent === 'explainer' ? 'from-purple-600 to-purple-700' :
               interaction.agent === 'analyzer' ? 'from-blue-500 to-blue-600' :
               interaction.agent === 'planner' ? 'from-purple-500 to-purple-600' :
               interaction.agent === 'coder' ? 'from-green-500 to-green-600' :
               interaction.agent === 'reviewer' ? 'from-orange-500 to-orange-600' :
               'from-gray-500 to-gray-600',
        bgColor: interaction.agent === 'explainer' ? 'bg-purple-50' :
                interaction.agent === 'analyzer' ? 'bg-blue-50' :
                interaction.agent === 'planner' ? 'bg-purple-50' :
                interaction.agent === 'coder' ? 'bg-green-50' :
                interaction.agent === 'reviewer' ? 'bg-orange-50' : 'bg-gray-50',
        borderColor: interaction.agent === 'explainer' ? 'border-purple-200' :
                    interaction.agent === 'analyzer' ? 'border-blue-200' :
                    interaction.agent === 'planner' ? 'border-purple-200' :
                    interaction.agent === 'coder' ? 'border-green-200' :
                    interaction.agent === 'reviewer' ? 'border-orange-200' : 'border-gray-200',
        iconColor: interaction.agent === 'explainer' ? 'text-purple-600' :
                  interaction.agent === 'analyzer' ? 'text-blue-600' :
                  interaction.agent === 'planner' ? 'text-purple-600' :
                  interaction.agent === 'coder' ? 'text-green-600' :
                  interaction.agent === 'reviewer' ? 'text-orange-600' : 'text-gray-600',
        content: interaction.content,
        isActive: false,
        isCompleted: true,
        timestamp: interaction.timestamp,
        action: interaction.action
      }));
    }
    
    return allAgentData;
  };

  const AgentCard = ({ agent, isActive, isCompleted, output }: {
    agent: typeof agents[0],
    isActive: boolean,
    isCompleted: boolean,
    output: string
  }) => {
    const isExpanded = expandedAgent === agent.id;
    const hasContent = (isActive || isCompleted) && output;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2"
      >
        {/* Compact Agent Button */}
        <button
          onClick={() => hasContent && setExpandedAgent(isExpanded ? null : agent.id)}
          disabled={!hasContent}
          className={`w-full p-3 rounded-lg border-2 transition-all duration-300 ${
            isActive 
              ? `${agent.borderColor} bg-gradient-to-r ${agent.gradientFrom} ${agent.gradientTo} text-white shadow-lg transform scale-[1.02]` 
              : isCompleted
              ? `${agent.borderColor} ${agent.bgColor} hover:shadow-md ${hasContent ? 'cursor-pointer hover:scale-[1.01]' : 'cursor-default'}`
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-default'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Agent Status Indicator */}
              <div className={`relative p-2 rounded-lg ${
                isActive 
                  ? 'bg-white/20' 
                  : isCompleted 
                  ? 'bg-white dark:bg-gray-800' 
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                <agent.icon className={`w-5 h-5 ${
                  isActive 
                    ? 'text-white' 
                    : isCompleted 
                    ? agent.iconColor 
                    : 'text-gray-400'
                }`} />
                
                {/* Pulse ring for active agent */}
                {isActive && (
                  <div className="absolute inset-0 rounded-lg bg-white/30 animate-ping" />
                )}
              </div>

              <div className="text-left">
                <div className="flex items-center space-x-2">
                  <h3 className={`font-semibold text-sm ${
                    isActive 
                      ? 'text-white' 
                      : isCompleted 
                      ? agent.iconColor 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {agent.name} Agent
                  </h3>
                  
                  {/* Status indicators */}
                  {isActive && (
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                  
                  {isCompleted && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
                
                <p className={`text-xs ${
                  isActive 
                    ? 'text-white/80' 
                    : isCompleted 
                    ? 'text-gray-600 dark:text-gray-400' 
                    : 'text-gray-400'
                }`}>
                  {agent.description}
                </p>
              </div>
            </div>

            {/* Expand/Collapse indicator */}
            {hasContent && (
              <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                <svg className={`w-4 h-4 ${
                  isActive 
                    ? 'text-white' 
                    : agent.iconColor
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}
          </div>
        </button>

        {/* Expandable Content */}
        <AnimatePresence>
          {isExpanded && hasContent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className={`mt-2 p-4 rounded-lg border-l-4 ${agent.borderColor} ${agent.bgColor} shadow-sm`}
            >
              <div className="prose prose-sm max-w-none">
                <div className="text-sm whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200">
                  {output}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  if (problemLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="loading-dots">
            <div></div>
            <div></div>
            <div></div>
          </div>
          <p className="text-muted-foreground">Loading problem...</p>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <XCircle className="h-16 w-16 text-destructive mx-auto" />
          <p className="text-muted-foreground">Problem not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-screen">
      {/* Problem Panel */}
      <Card className="lg:col-span-1 flex flex-col h-full">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl truncate pr-2">{problem.title}</CardTitle>
            <Badge variant={
              problem.difficulty === 'Easy' ? 'default' :
              problem.difficulty === 'Medium' ? 'secondary' : 'destructive'
            } className="flex-shrink-0">
              {problem.difficulty}
            </Badge>
          </div>
          <CardDescription>
            Problem ID: {problem.id}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4 flex-1 overflow-hidden">
          {/* Scrollable Problem Content */}
          <div className="flex-1 overflow-y-auto pr-2">
            <div 
              className="prose prose-sm max-w-none text-foreground break-words"
              dangerouslySetInnerHTML={{ __html: problem.content_html }}
            />
          </div>
          
          {/* Fixed Controls Section */}
          <div className="flex-shrink-0 space-y-4 border-t pt-4">
            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Language:</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-background"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>

            {/* AI Mode - Only Iterative Agent Collaboration */}
            <div className="space-y-2">
              <label className="text-sm font-medium">AI Mode:</label>
              <div className="space-y-2">
                {/* Iterative Agent Mode - Always Active */}
                <div className="flex items-center space-x-3 p-3 border border-purple-500 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                  <div className="w-4 h-4 rounded-full border-2 border-purple-500 bg-purple-500">
                    <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium flex items-center gap-2">
                      Iterative Agent Collaboration
                      <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700">
                        <Sparkles className="w-3 h-3 mr-1" />
                        ACTIVE
                      </Badge>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Analyzer → Planner → Coder ↔ Reviewer → Test → Fix until perfect
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button 
                onClick={handleStartAI}
                disabled={isStreaming || sessionLoading || isIterativeProcessing}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                {isStreaming || isIterativeProcessing ? (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Stop Agents
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Agent Collaboration
                  </>
                )}
              </Button>
              
              {/* View Agent Process button when collaboration completes */}
              {iterativeResults && !isIterativeProcessing && (
                <Button 
                  onClick={() => setShowAgentModal(true)}
                  variant="outline"
                  className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  View Agent Collaboration Process
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Workspace */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Brain className="w-5 h-5" />
              <span>AI Workspace</span>
            </CardTitle>
            <div className="flex items-center space-x-3">
              {/* Streaming Modal Button in Header */}
              {(isStreaming || reasoning || code) && (
                <Button 
                  onClick={() => setShowStreamingModal(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <Monitor className="w-4 h-4" />
                  <span className="hidden sm:inline">Full View</span>
                </Button>
              )}
              <div className="flex items-center space-x-2">
                <div className={`w-[8px] h-[8px] rounded-full ${getStatusColor(status)} ${isStreaming ? 'animate-pulse' : ''}`} />
                <span className="text-sm text-muted-foreground">{getStatusText(status)}</span>
              </div>
            </div>
          </div>
          <CardDescription>
            Attempt {currentAttempt} of {maxAttempts}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="reasoning" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="testcases">Test Cases</TabsTrigger>
              <TabsTrigger value="session">Session</TabsTrigger>
            </TabsList>
            
            <TabsContent value="reasoning" className="space-y-4">
              <div className="h-[500px] overflow-hidden">
                {(() => {
                  const reasoningData = getReasoningData();
                  
                  if (reasoningData.length === 0 && !isStreaming) {
                    return (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center space-y-6">
                          {/* Agent Preview */}
                          <div className="grid grid-cols-4 gap-3">
                            {agents.map((agent, index) => (
                              <div key={agent.id} className="text-center">
                                <div className={`p-3 rounded-lg ${agent.bgColor} border-2 ${agent.borderColor} mb-2 opacity-50`}>
                                  <agent.icon className={`w-5 h-5 ${agent.iconColor} mx-auto opacity-70`} />
                                </div>
                                <span className="text-xs text-gray-500 font-medium">{agent.name}</span>
                              </div>
                            ))}
                          </div>
                            <div>
                            <Brain className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="font-medium text-gray-600 dark:text-gray-300">Multi-agent reasoning will appear here</p>
                            <p className="text-xs mt-1 text-gray-500">Click "Solve with AI" to see each agent contribute their expertise</p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Use two-panel layout like the modals
                  return (
                    <div className="flex h-full bg-white rounded-lg border border-gray-200 shadow-sm">
                      {/* Left Panel: Agent Timeline */}
                      <div className="w-1/4 border-r border-gray-200 p-4 overflow-y-auto bg-gray-50">
                        <div className="space-y-3">
                          <div className="text-sm font-medium text-gray-700 mb-4">Agent Timeline</div>
                          
                          {reasoningData.map((agentData, index) => {
                            const isSelected = reasoningSelectedAgent === `${agentData.id}-${index}`;
                            const hasContent = agentData.content && agentData.content.trim().length > 0;
                            
                            return (
                              <div
                                key={`${agentData.id}-${index}`}
                                onClick={() => hasContent && setReasoningSelectedAgent(`${agentData.id}-${index}`)}
                                className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                                  isSelected
                                    ? 'border-blue-300 bg-blue-50 shadow-sm'
                                    : hasContent
                                    ? 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                    : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                                }`}
                              >
                                <div className="flex items-center gap-3 mb-2">
                                  <div className={`p-1.5 rounded-lg ${
                                    isSelected 
                                      ? `bg-gradient-to-r ${agentData.color} text-white shadow-sm`
                                      : hasContent
                                      ? `${agentData.bgColor} ${agentData.iconColor}`
                                      : 'bg-gray-200 text-gray-400'
                                  }`}>
                                    {agentData.icon && typeof agentData.icon === 'function' ? (
                                      React.createElement(agentData.icon as any, { className: "w-3 h-3" })
                                    ) : (
                                      <span className="text-xs">{agentData.emoji}</span>
                                    )}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-gray-900 truncate flex items-center gap-1">
                                      <span className="text-xs">{agentData.emoji}</span>
                                      <span>{agentData.name}</span>
                            </div>
                          </div>
                          
                                  <div className="flex-shrink-0">
                                    {agentData.isActive && <Activity className="w-3 h-3 animate-spin text-green-500" />}
                                    {agentData.isCompleted && !agentData.isActive && <CheckCircle className="w-3 h-3 text-blue-500" />}
                            </div>
                          </div>

                                <div className="text-xs text-gray-600">
                                  {agentData.isActive ? 'Working...' : 
                                   agentData.isCompleted ? 'Complete' : 'Waiting'}
                                </div>

                                {/* Status indicator bar */}
                                <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                                  <div className={`h-1 rounded-full transition-all duration-300 ${
                                    agentData.isCompleted 
                                      ? 'bg-blue-500 w-full' 
                                      : agentData.isActive
                                      ? 'bg-green-500 w-3/4 animate-pulse'
                                      : hasContent
                                      ? 'bg-yellow-500 w-1/2'
                                      : 'bg-gray-300 w-0'
                                  }`} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right Panel: Selected Agent Content */}
                      <div className="flex-1 p-6 overflow-y-auto bg-white">
                        {reasoningSelectedAgent ? (() => {
                          const selectedData = reasoningData.find((data, index) => 
                            `${data.id}-${index}` === reasoningSelectedAgent
                          );
                          
                          if (!selectedData) {
                            return (
                              <div className="flex items-center justify-center h-full text-gray-500">
                                <div className="text-center">
                                  <Brain className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                  <p>Agent content not found</p>
                      </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="space-y-4">
                              {/* Agent Header */}
                              <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                                <div className={`p-2 rounded-lg ${selectedData.bgColor}`}>
                                  {selectedData.icon && typeof selectedData.icon === 'function' ? (
                                    React.createElement(selectedData.icon as any, { className: `w-5 h-5 ${selectedData.iconColor}` })
                                  ) : (
                                    <span className="text-lg">{selectedData.emoji}</span>
                                  )}
                          </div>
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900">{selectedData.name}</h3>
                                  <p className="text-sm text-gray-600">{selectedData.description}</p>
                                </div>
                                {selectedData.isCompleted && (
                                  <div className="ml-auto">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                  </div>
                      )}
                    </div>
                              
                              {/* Agent Content */}
                              {selectedData.action === 'educational_analysis' ? (
                                // Special handling for Code Explainer
                                <div className="space-y-4">
                                  {(() => {
                                    try {
                                      const explainerData = JSON.parse(selectedData.content as string);
                                      const rubric = explainerData.rubric_evaluation || {};
                                      
                                      return (
                                        <>
                                          {/* Explanation */}
                                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                            <h4 className="font-bold text-blue-900 mb-2">📚 Code Explanation</h4>
                                            <div className="text-sm leading-relaxed">
                                              {explainerData.explanation ? 
                                                parseMarkdownContent(explainerData.explanation) : 
                                                <p className="text-blue-800">No explanation available</p>
                                              }
                              </div>
                                          </div>

                                          {/* Rubric Evaluation */}
                                          {rubric && (
                                            <div className="bg-gray-50 p-4 rounded-lg border">
                                              <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-bold text-gray-900">📊 Code Quality Assessment</h4>
                                                <div className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                                  Grade: {rubric.grade || 'N/A'}
                                                </div>
                                              </div>
                                              
                                              {/* Scores Grid */}
                                              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-3">
                                                <div className="text-center p-2 bg-white rounded border">
                                                  <div className="font-bold text-lg text-green-600">{rubric.correctness_score || 0}/5</div>
                                                  <div className="text-xs text-gray-600">Correctness</div>
                                                </div>
                                                <div className="text-center p-2 bg-white rounded border">
                                                  <div className="font-bold text-lg text-blue-600">{rubric.efficiency_score || 0}/5</div>
                                                  <div className="text-xs text-gray-600">Efficiency</div>
                                                </div>
                                                <div className="text-center p-2 bg-white rounded border">
                                                  <div className="font-bold text-lg text-purple-600">{rubric.structure_score || 0}/5</div>
                                                  <div className="text-xs text-gray-600">Structure</div>
                                                </div>
                                                <div className="text-center p-2 bg-white rounded border">
                                                  <div className="font-bold text-lg text-orange-600">{rubric.readability_score || 0}/5</div>
                                                  <div className="text-xs text-gray-600">Readability</div>
                                                </div>
                                                <div className="text-center p-2 bg-white rounded border">
                                                  <div className="font-bold text-lg text-indigo-600">{rubric.robustness_score || 0}/5</div>
                                                  <div className="text-xs text-gray-600">Robustness</div>
                                                </div>
                                              </div>

                                              {/* Overall Score */}
                                              <div className="text-center p-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded border border-purple-200">
                                                <div className="font-bold text-xl text-purple-700">
                                                  Overall: {rubric.overall_score || 0}/5
                                                </div>
                                                <div className="text-sm text-purple-600">
                                                  {rubric.summary || 'Assessment completed'}
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </>
                                      )
                                    } catch (e) {
                                      // Fallback for parsing errors - still try to format as markdown
                                      const content = typeof selectedData.content === 'string' ? selectedData.content : JSON.stringify(selectedData.content, null, 2);
                                      return (
                                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                          <h4 className="font-bold text-purple-900 mb-2">🎓 Educational Analysis</h4>
                                          <div className="text-sm">
                                            {parseMarkdownContent(content)}
                                          </div>
                                        </div>
                                      )
                                    }
                                  })()}
                                </div>
                              ) : selectedData.action === 'run_tests' ? (
                                // Special handling for test results
                                <div className="space-y-4">
                                  {(() => {
                                    try {
                                      const testData = JSON.parse(selectedData.content as string)
                                      return (
                                        <div className="bg-gray-50 p-4 rounded-lg border">
                                          <h4 className="font-bold text-gray-900 mb-2">🧪 Test Results</h4>
                                          <div className="space-y-2">
                                            <div className="text-sm">
                                              Success Rate: <span className="font-bold">{testData.success_rate}%</span>
                                            </div>
                                            {testData.test_results && testData.test_results.map((test: any, idx: number) => (
                                              <div key={idx} className={`p-3 rounded border ${test.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                <div className="text-sm">
                                                  Test {idx + 1}: {test.passed ? '✅ PASSED' : '❌ FAILED'}
                                                </div>
                                                {!test.passed && test.error && (
                                                  <div className="text-xs text-red-600 mt-1">
                                                    Error: {test.error}
                                                  </div>
                                                )}
                            </div>
                          ))}
                        </div>
                        </div>
                                      )
                                    } catch (e) {
                                      return (
                                        <div className="text-sm text-gray-800 whitespace-pre-wrap">
                                          {selectedData.content}
                      </div>
                                      )
                                    }
                                  })()}
                                </div>
                              ) : (
                                // Regular agent content with markdown parsing
                                <div className="text-sm text-gray-800 leading-relaxed space-y-3">
                                  {parseStructuredContent(selectedData.content as string)}
                    </div>
                  )}
                            </div>
                          );
                        })() : (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                              <Brain className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                              <p>Select an agent from the timeline to view their analysis</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </TabsContent>
            
            <TabsContent value="code" className="space-y-4">
              {/* Code Editor/Display */}
              <div className="bg-gray-900 rounded-lg p-4 h-[400px] overflow-y-auto border border-green-500/20">
                <AnimatePresence>
                  {(displayCode || isEditing) ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-2 h-full"
                    >
                      {/* Edit Mode */}
                      {isEditing ? (
                        <div className="h-full flex flex-col">
                          <textarea
                            value={editedCode}
                            onChange={(e) => updateEditedCode(e.target.value)}
                            className="flex-1 bg-gray-800 text-green-400 font-mono text-sm p-3 border border-green-500/30 rounded resize-none focus:outline-none focus:ring-2 focus:ring-green-500/50 glow-text"
                            placeholder="Enter your code here..."
                            spellCheck={false}
                          />
                          
                          {/* Edit Mode Controls */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex space-x-2">
                              <Button
                                onClick={handleSaveCode}
                                disabled={isSaving || !editedCode.trim()}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {isSaving ? (
                                  <>
                                    <Activity className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={cancelEditing}
                                disabled={isSaving}
                                size="sm"
                                variant="outline"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                                            </Button>
              
              {/* Streaming Modal Toggle */}
              {(isStreaming || reasoning || code) && (
                <Button 
                  onClick={() => setShowStreamingModal(true)}
                  variant={isStreaming ? "default" : "outline"}
                  className={`w-full ${isStreaming ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg' : ''}`}
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  {isStreaming ? 'Watch AI Live' : 'View AI Analysis'}
                  {isStreaming && <div className="ml-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
                </Button>
              )}
            </div>
                          </div>
                        </div>
                      ) : (
                        /* View Mode */
                        <div className="h-full flex flex-col">
                          <div className="flex-1">
                            <pre className="text-sm font-mono text-green-400 glow-text h-full overflow-auto">
                              <code>{displayCode}</code>
                      </pre>
                      {isStreaming && (
                        <motion.div
                                className="inline-block w-[8px] h-5 bg-green-400 shadow-lg shadow-green-400/50"
                          animate={{ opacity: [1, 0] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                        />
                            )}
                          </div>
                          

                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <Code className="h-8 w-8 mx-auto mb-2" />
                        <p>Generated code will appear here...</p>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Success/Error Messages */}
              {saveSuccess && (
                <div className="p-3 bg-green-100 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Code saved successfully!
                    </span>
                  </div>
                </div>
              )}
              
              {saveError && (
                <div className="p-3 bg-red-100 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">
                      {saveError}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              {displayCode && !isStreaming && !isEditing && (
                <div className="flex space-x-2">
                  <Button
                    onClick={() => startEditing(displayCode)}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Code
                  </Button>

                </div>
              )}
            </TabsContent>
            
            <TabsContent value="testcases" className="space-y-4">
              <div className="min-h-[400px] space-y-6 max-w-none">
                
                {/* Original Test Cases Section */}
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                          <TestTube className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                            Problem Test Cases
                          </h3>
                        </div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md px-3 py-1">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          {availableTestCases.length} cases
                        </span>
                      </div>
                    </div>
                  
                  {availableTestCases.length > 0 ? (
                    <>
                      <div className="space-y-4">
                        {availableTestCases.slice(0, showAllProblemCases ? availableTestCases.length : 5).map((testCase, index) => (
                          <div key={testCase.id || index} className="bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-800 rounded-lg p-3 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-blue-500 rounded text-white text-xs flex items-center justify-center font-medium">
                                  {index + 1}
                                </div>
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  Test Case {index + 1}
                                </span>
                              </div>
                              <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                                {testCase.difficulty}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded p-2">
                                <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Input</div>
                                <code className="text-xs font-mono text-green-800 dark:text-green-200 block whitespace-pre-wrap break-all">
                                  {JSON.stringify(testCase.input, null, 2)}
                                </code>
                              </div>
                              
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded p-2">
                                <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Expected Output</div>
                                <code className="text-xs font-mono text-blue-800 dark:text-blue-200 block whitespace-pre-wrap break-all">
                                  {JSON.stringify(testCase.expected, null, 2)}
                                </code>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {availableTestCases.length > 5 && (
                          <div className="text-center mt-3">
                            <Button
                              onClick={() => setShowAllProblemCases(!showAllProblemCases)}
                              variant="outline"
                              size="sm"
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              {showAllProblemCases ? (
                                <>Show Less ({availableTestCases.length - 5} hidden)</>
                              ) : (
                                <>Show More ({availableTestCases.length - 5} more cases)</>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        onClick={() => testCode({ problem_id: problemId, solution_code: displayCode, language: selectedLanguage })}
                        disabled={!displayCode || isTesting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
                      >
                        {isTesting ? (
                          <>
                            <Activity className="w-4 h-4 mr-2 animate-spin" />
                            Testing Code...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Test Code Against Problem Cases
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <TestTube className="h-8 w-8 mx-auto mb-3 text-blue-500" />
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">No Problem Test Cases</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">This problem doesn't have predefined test cases</p>
                    </div>
                  )}
                  </div>
                </div>

                {/* AI Generated Test Cases Section */}
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-teal-200 dark:border-teal-800 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-teal-900 dark:text-teal-100">
                            AI Generated Test Cases
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {allAITestCases.length > 0 && (
                          <div className="bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700 rounded-md px-3 py-1">
                            <span className="text-sm font-medium text-teal-700 dark:text-teal-300">
                              {allAITestCases.length} cases
                            </span>
                          </div>
                        )}
                        <Button
                          onClick={handleGenerateTestCases}
                          disabled={isGeneratingTestCases || !problem}
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700 text-white"
                        >
                          {isGeneratingTestCases ? (
                            <>
                              <Activity className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate AI Test Cases
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                  {allAITestCases.length > 0 ? (
                    <>
                      <div className="space-y-4">
                        {allAITestCases.slice(0, showAllAICases ? allAITestCases.length : 5).map((testCase, index) => (
                          <div key={index} className="bg-white dark:bg-gray-800 border border-teal-100 dark:border-teal-800 rounded-lg p-3 hover:border-teal-300 dark:hover:border-teal-600 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-teal-500 rounded text-white text-xs flex items-center justify-center font-medium">
                                  {index + 1}
                                </div>
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  AI Test {index + 1}
                                </span>
                                {testCase.id && (
                                  <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">
                                    ✓ Saved
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded">
                                {testCase.difficulty_level || 'Medium'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded p-2">
                                <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Input</div>
                                <code className="text-xs font-mono text-green-800 dark:text-green-200 block whitespace-pre-wrap break-all">
                                  {JSON.stringify(testCase.input_data, null, 2)}
                                </code>
                              </div>
                              
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded p-2">
                                <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Expected Output</div>
                                <code className="text-xs font-mono text-blue-800 dark:text-blue-200 block whitespace-pre-wrap break-all">
                                  {JSON.stringify(testCase.expected_output, null, 2)}
                                </code>
                              </div>
                            </div>
                            
                            {testCase.explanation && (
                              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded p-2">
                                <div className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">Why this test case</div>
                                <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                                  {testCase.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {allAITestCases.length > 5 && (
                          <div className="text-center mt-3">
                            <Button
                              onClick={() => setShowAllAICases(!showAllAICases)}
                              variant="outline"
                              size="sm"
                              className="text-teal-600 border-teal-300 hover:bg-teal-50"
                            >
                              {showAllAICases ? (
                                <>Show Less ({allAITestCases.length - 5} hidden)</>
                              ) : (
                                <>Show More ({allAITestCases.length - 5} more cases)</>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-3 mt-4">
                        <Button
                          onClick={() => handleTestWithSelected(allAITestCases)}
                          disabled={!displayCode || isTesting}
                          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                        >
                          {isTesting ? (
                            <>
                              <Activity className="w-4 h-4 mr-2 animate-spin" />
                              Testing AI Cases...
                            </>
                          ) : (
                            <>
                              <TestTube className="w-4 h-4 mr-2" />
                              Test All AI Cases
                            </>
                          )}
                        </Button>
                        
                        {previewTestCases.length > 0 && (
                          <Button
                            onClick={() => handleSaveTestCases(previewTestCases, false)}
                            disabled={isSavingTestCases}
                            className="flex-1"
                            variant="outline"
                          >
                            {isSavingTestCases ? (
                              <>
                                <Activity className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save New Cases ({previewTestCases.length})
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-700">
                      <Sparkles className="h-8 w-8 mx-auto mb-3 text-teal-500" />
                      <p className="text-sm font-medium text-teal-800 dark:text-teal-200 mb-1">Generate Intelligent Test Cases</p>
                      <p className="text-xs text-teal-600 dark:text-teal-400">AI will create edge cases and challenging scenarios</p>
                    </div>
                  )}
                  </div>
                </div>

                {/* Agent Collaboration Results Section */}
                {iterativeResults && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b-2 border-purple-100 dark:border-purple-900">
                      <h3 className="text-xl font-bold flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 rounded-lg">
                          <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-purple-900 dark:text-purple-100">Agent Collaboration Results</span>
                        <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700">
                          <Sparkles className="w-3 h-3 mr-1" />
                          NEW
                        </Badge>
                      </h3>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {iterativeResults.success_rate}%
                          </div>
                          <div className="text-sm text-purple-700 dark:text-purple-300">Success Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {iterativeResults.total_iterations}
                          </div>
                          <div className="text-sm text-blue-700 dark:text-blue-300">Iterations</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-indigo-600">
                            {iterativeResults.interactions?.length || 0}
                          </div>
                          <div className="text-sm text-indigo-700 dark:text-indigo-300">Agent Actions</div>
                        </div>
                      </div>

                      <div className="text-center">
                        <Badge 
                          variant={iterativeResults.success ? 'default' : 'secondary'}
                          className={`px-4 py-2 text-lg font-bold ${
                            iterativeResults.success 
                              ? 'bg-green-600 text-white' 
                              : 'bg-orange-500 text-white'
                          }`}
                        >
                          {iterativeResults.success ? '🎉 Perfect Solution!' : `Best Attempt: ${iterativeResults.success_rate}%`}
                        </Badge>
                      </div>

                      {iterativeResults.success && (
                        <div className="mt-4 text-center text-sm text-green-700 dark:text-green-300">
                          ✅ All test cases passed through iterative agent collaboration
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="session" className="space-y-4">
              <div className="space-y-4">
                {session ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Session Progress</span>
                      <Badge variant="outline">
                        {session.current_attempt}/{session.best_success_rate}
                      </Badge>
                    </div>
                    
                    <Progress value={(session.current_attempt / 5) * 100} className="w-full" />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-green-500">
                          {Math.round(session.best_success_rate)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Success Rate</div>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold">
                          {session.current_attempt}
                        </div>
                        <div className="text-xs text-muted-foreground">Attempts</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Improvements:</span>
                      <div className="space-y-1">
                        {session.improvement_summary.map((improvement, index) => (
                          <div key={index} className="text-sm text-muted-foreground p-2 bg-muted/30 rounded">
                            {improvement}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    <div className="text-center">
                      <Activity className="h-8 w-8 mx-auto mb-2" />
                      <p>No active session</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Results Panel */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>Test Results</span>
          </CardTitle>
          <CardDescription>
            Code execution and validation results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Error</span>
                </div>
                <p className="text-sm text-destructive mt-1">{error}</p>
              </div>
            )}
            
            {results && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Status</span>
                  <Badge variant={results.success_rate === 100 ? 'default' : 'secondary'}>
                    {results.success_rate}% Success
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold text-green-500">
                      {results.passed_tests}
                    </div>
                    <div className="text-xs text-muted-foreground">Passed</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold text-red-500">
                      {results.failed_tests}
                    </div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold">
                      {results.total_tests}
                    </div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <span className="text-sm font-medium">Test Cases:</span>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {results.test_results.map((test, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg border ${
                          test.passed 
                            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                            : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Test {index + 1}</span>
                          {test.passed ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          <div>Input: {test.input}</div>
                          <div>Expected: {test.expected_output}</div>
                          <div>Actual: {test.actual_output}</div>
                          {test.error && (
                            <div className="text-red-500 mt-1">Error: {test.error}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* NEW: Action buttons based on test results */}
                <div className="space-y-3 pt-4 border-t">
                  {/* Show Analyze & Fix button when tests fail */}
                  {results.success_rate < 100 && (
                    <Button
                      onClick={handleAnalyzeAndFix}
                      disabled={isAnalyzing}
                      className="w-full"
                      variant="destructive"
                    >
                      {isAnalyzing ? (
                        <>
                          <Activity className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing & Fixing...
                        </>
                      ) : (
                        <>
                          <Settings className="w-4 h-4 mr-2" />
                          Analyze & Fix Code
                        </>
                      )}
                    </Button>
                  )}
                  
                  {/* Show Generate Tests button when all tests pass */}
                  {results.success_rate === 100 && (
                    <div className="space-y-2">
                      <Button
                        onClick={handleGenerateTestCases}
                        disabled={isGeneratingTestCases}
                        className="w-full"
                        variant="outline"
                      >
                        {isGeneratingTestCases ? (
                          <>
                            <Activity className="w-4 h-4 mr-2 animate-spin" />
                            Generating Tests...
                          </>
                        ) : (
                          <>
                            <TestTube className="w-4 h-4 mr-2" />
                            Generate More Tests
                          </>
                        )}
                      </Button>
                      
                      {/* Show Test with New Cases button after generation */}
                      {(lastGenerated?.generated_count || 0) > 0 && (
                        <Button
                          onClick={handleTestWithNewCases}
                          disabled={isTesting}
                          className="w-full"
                        >
                          {isTesting ? (
                            <>
                              <Activity className="w-4 h-4 mr-2 animate-spin" />
                              Testing with New Cases...
                            </>
                          ) : (
                            <>
                              <Target className="w-4 h-4 mr-2" />
                              Test with New Cases
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {/* Show analysis result when available */}
                  {analysisResult && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
                      <div className="flex items-center mb-2">
                        <Sparkles className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          Code Fixed (Confidence: {analysisResult.confidence}/10)
                        </span>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {analysisResult.changes_summary}
                      </p>
                    </div>
                  )}
                  
                  {/* Show generation success message */}
                  {(lastGenerated?.generated_count || 0) > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                      <div className="flex items-center">
                        <TestTube className="w-4 h-4 text-blue-500 mr-2" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Generated {lastGenerated?.generated_count || 0} new test cases
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {!results && !error && (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p>Run tests to see results</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Floating Action Button for Mobile */}
      {(isStreaming || reasoning || code) && !showStreamingModal && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed bottom-6 right-6 z-40 md:hidden"
        >
          <Button
            onClick={() => setShowStreamingModal(true)}
            size="lg"
            className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-2xl border-2 border-white/20"
          >
            <Monitor className="w-6 h-6" />
            {isStreaming && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse border-2 border-white" />
            )}
          </Button>
        </motion.div>
      )}

      {/* Streaming Modal */}
      <StreamingModal
        isOpen={showStreamingModal}
        onClose={() => setShowStreamingModal(false)}
        activeAgent={activeAgent}
        agentOutputs={agentOutputs}
        completedAgents={completedAgents}
        reasoning={reasoning}
        code={code}
        status={status}
        isStreaming={isStreaming}
        results={results}
        displayCode={displayCode}
        problem={problem}
        selectedLanguage={selectedLanguage}
        iterativeAgentMode={iterativeAgentMode}
        callCodeExplainer={callCodeExplainer}
      />

      {/* Test Case Preview Modal */}
      <TestCasePreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setPreviewTestCases([]);
        }}
        testCases={previewTestCases}
        onSave={handleSaveTestCases}
        onTestWithSelected={handleTestWithSelected}
        isSaving={isSavingTestCases}
        problemTitle={problem?.title}
      />



      {/* NEW: Agent Collaboration Modal */}
      <AgentCollaborationModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        problemTitle={problem?.title || 'Problem'}
        interactions={agentInteractions}
        currentPhase={currentPhase}
        successRate={currentSuccessRate}
        isProcessing={isIterativeProcessing}
      />
    </div>
  );
} 