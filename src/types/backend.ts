// Backend-specific types matching the Supabase schema
export interface Problem {
  id: number
  question_id: number
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  content_html: string
  code: string
  test_cases: string // Legacy field - may contain text format
  parameter_map: string
  title_slug: string
  created_at: string
  // New relational test cases
  test_cases_data?: TestCaseData[]
  test_cases_relation?: TestCaseData[]
  legacy_test_cases?: any[]
}

export interface TestCaseData {
  id: number
  problem_id: number
  input_data: any
  expected_output: any
  difficulty_level?: string
  source?: string
  is_active: boolean
  created_at: string
}

export interface LearningSession {
  id: string
  problem_id: number
  status: 'in_progress' | 'solved' | 'max_attempts_reached'
  best_success_rate: number
  total_attempts: number
  max_attempts: number
  started_at: string
  completed_at: string | null
}

export interface SolutionAttempt {
  id: number
  session_id: string
  problem_id: number
  attempt_number: number
  generated_code: string
  reasoning_content: string
  explanation: string
  full_response: string
  language: string
  success_rate: number
  failed_test_cases: TestResult[]
  error_messages: string[]
  created_at: string
}

export interface TestResult {
  input: string
  expected_output: string
  actual_output: string
  passed: boolean
  execution_time: string
  memory_used: number
  status: string
  error?: string
}

export interface ImprovementLog {
  id: number
  session_id: string
  from_attempt: number
  to_attempt: number
  changes_made: string
  improvement_strategy: string
  created_at: string
}

// Streaming types
export interface StreamingChunk {
  type: 'reasoning' | 'code' | 'complete' | 'error'
  content?: string
  metadata?: any
}

// API Response types
export interface CodeGenerationResponse {
  generated_code: string
  explanation: string
  full_response: string
  reasoning_content: string
  model_used: string
  generation_time: number
  problem_id: number
  language: string
}

export interface TestExecutionResponse {
  success_rate: number
  total_tests: number
  passed_tests: number
  failed_tests: number
  test_results: TestResult[]
  overall_status: string
  
  // Rate limiting properties
  api_limit_reached?: boolean
  remaining_time?: number
  message?: string
  tests_not_executed?: number
}

export interface ReinforcementResponse {
  session_id: string
  problem_id: number
  status: 'solved' | 'in_progress' | 'max_attempts_reached'
  current_attempt: number
  best_success_rate: number
  latest_solution: {
    code: string
    reasoning: string
    explanation: string
    full_response: string
    success_rate: number
    test_results: TestResult[]
  }
  improvement_summary: string[]
  total_time_spent: number
}

// Filter types
export interface ProblemFilters {
  difficulty?: string[]
  search?: string
  status?: 'solved' | 'attempted' | 'unsolved'
  topics?: string[]
}

// Analytics types
export interface AnalyticsData {
  totalProblems: number
  successRate: number
  totalSessions: number
  avgAttempts: number
  difficultyBreakdown: { difficulty: string; count: number; success_rate: number }[]
  progressOverTime: { date: string; success_rate: number }[]
  topicMastery: { topic: string; mastery: number }[]
}

// Streaming data for UI
export interface StreamingData {
  reasoning: string
  code: string
  status: 'idle' | 'thinking' | 'coding' | 'complete'
}

// Error types
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export function handleAPIError(error: unknown): string {
  if (error instanceof APIError) {
    return error.message
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return 'An unexpected error occurred'
} 