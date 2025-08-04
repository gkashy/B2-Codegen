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

interface AISolvingInterfaceProps {
  problemId: number;
}

export default function AISolvingInterface({ problemId }: AISolvingInterfaceProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [maxAttempts] = useState(3);
  const [displayCode, setDisplayCode] = useState('');
  const [autoMode, setAutoMode] = useState(false);  // NEW: Toggle for auto-mode
  const [showFixButton, setShowFixButton] = useState(false);  // NEW: Show fix button when tests fail

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
  }>({
    analyzer: '',
    planner: '',
    coder: '',
    reviewer: ''
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
    
    resetStreaming();
    setCurrentAttempt(1);
    setShowFixButton(false);  // Reset fix button
    
    // Reset multi-agent states
    setActiveAgent(null);
    setAgentOutputs({
      analyzer: '',
      planner: '',
      coder: '',
      reviewer: ''
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

  const handleTestCode = async () => {
    if (!displayCode || !problem) return;
    
    await testCode({
      problem_id: problemId,
      solution_code: displayCode,
      language: selectedLanguage
    });
    
    // Show "Fix & Improve" button if tests fail and we're in manual mode
    setShowFixButton(true);
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

            {/* NEW: Auto Mode Toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mode:</label>
              <div className="flex items-center space-x-3 p-3 border border-border rounded-lg bg-background">
                <button
                  onClick={() => setAutoMode(!autoMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoMode ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {autoMode ? 'Auto-Test & Fix' : 'Manual Control'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {autoMode 
                      ? 'Generate → Test → Fix automatically' 
                      : 'Manual testing and improvement'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button 
                onClick={handleStartAI}
                disabled={isStreaming || sessionLoading}
                className="w-full"
              >
                {isStreaming ? (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Stop AI
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Solve with AI
                  </>
                )}
              </Button>
              
              {/* Show Fix & Improve button when tests fail in manual mode */}
              {!autoMode && showFixButton && results && results.success_rate < 100 && (
                <Button 
                  onClick={handleFixAndImprove}
                  disabled={sessionLoading || isStreaming}
                  variant="secondary"
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Fix & Improve
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
              <div className="h-[500px] overflow-y-auto">
                <AnimatePresence>
                  {reasoning || isStreaming ? (
                    <div className="space-y-6 pr-2">
                      {/* Compact Multi-Agent Progress Header */}
                      <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 rounded-lg p-3 border-2 border-blue-300 dark:border-blue-600">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Brain className="w-5 h-5 text-blue-700 dark:text-blue-300" />
                            <div>
                              <h3 className="font-bold text-blue-900 dark:text-blue-100 text-sm">
                                Multi-Agent Reasoning System
                              </h3>
                              <p className="text-xs text-blue-700 dark:text-blue-300">
                                {activeAgent 
                                  ? `${agents.find(a => a.id === activeAgent)?.name} Agent is working...`
                                  : completedAgents.length === agents.length
                                  ? 'All agents completed their analysis'
                                  : 'Ready to analyze your problem'
                                }
                              </p>
                            </div>
                          </div>
                          
                          {/* Compact Progress Indicator */}
                          <div className="text-right">
                            <span className="text-xs text-blue-700 dark:text-blue-300 font-bold">
                              {completedAgents.length}/{agents.length}
                            </span>
                            <div className="w-16 bg-blue-200 dark:bg-blue-800 rounded-full h-1.5 mt-1">
                              <motion.div
                                className="bg-gradient-to-r from-blue-600 to-purple-600 h-1.5 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${(completedAgents.length / agents.length) * 100}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Compact Agent Cards */}
                      <div className="space-y-1">
                        {agents.map((agent, index) => (
                          <AgentCard
                            key={agent.id}
                            agent={agent}
                            isActive={activeAgent === agent.id}
                            isCompleted={completedAgents.includes(agent.id)}
                            output={agentOutputs[agent.id as keyof typeof agentOutputs]}
                          />
                        ))}
                      </div>

                      {/* Auto-mode specific indicators */}
                      {autoMode && status === 'thinking' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3"
                        >
                          <div className="flex items-center space-x-2">
                            <Zap className="w-4 h-4 text-green-600 dark:text-green-400 animate-pulse" />
                            <span className="text-sm font-medium text-green-800 dark:text-green-200">
                              Auto-mode: Will automatically test and improve after generation
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[400px] text-muted-foreground">
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
                  )}
                </AnimatePresence>
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
                  
                  {/* Only show Test Code button in manual mode */}
                  {!autoMode && (
                    <Button 
                      onClick={handleTestCode}
                      disabled={isTesting}
                      className="flex-1"
                    >
                      {isTesting ? (
                        <>
                          <Activity className="w-4 h-4 mr-2 animate-spin" />
                          Testing Code...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Test Code
                        </>
                      )}
                    </Button>
                  )}
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

                {/* Test Results Section */}
                {results && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b-2 border-green-100 dark:border-green-900">
                      <h3 className="text-xl font-bold flex items-center space-x-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                          <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-green-900 dark:text-green-100">Test Results</span>
                      </h3>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-lg font-semibold text-green-900 dark:text-green-100">Overall Performance</span>
                        <Badge 
                          variant={results.success_rate === 100 ? 'default' : 'secondary'}
                          className={`px-4 py-2 text-lg font-bold ${
                            results.success_rate === 100 
                              ? 'bg-green-600 text-white' 
                              : 'bg-yellow-500 text-white'
                          }`}
                        >
                          {results.success_rate}% Success
                        </Badge>
                      </div>
                      <div className="text-lg text-green-700 dark:text-green-300">
                        <strong>{results.passed_tests}</strong> out of <strong>{results.total_tests}</strong> test cases passed
                      </div>
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
    </div>
  );
} 