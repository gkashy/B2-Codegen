// Core problem types
export interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  examples: ProblemExample[];
  testCases: TestCase[];
  successRate: number;
  avgAttempts: number;
  timeComplexity?: string;
  spaceComplexity?: string;
  status: 'unsolved' | 'attempted' | 'solved';
}

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

// AI solving types
export interface SolvingSession {
  id: string;
  problemId: number;
  status: 'idle' | 'thinking' | 'coding' | 'testing' | 'complete' | 'failed';
  startTime: Date;
  endTime?: Date;
  attempts: Attempt[];
  currentAttempt: number;
  maxAttempts: number;
  reasoning: string;
  currentCode: string;
  finalCode?: string;
  successRate: number;
  improvements: string[];
}

export interface Attempt {
  id: string;
  code: string;
  reasoning: string;
  testResults: TestResult[];
  success: boolean;
  executionTime: number;
  timestamp: Date;
  improvements: string[];
}

export interface TestResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  executionTime: number;
  error?: string;
}

// Streaming types
export interface StreamingData {
  type: 'reasoning' | 'code' | 'result' | 'status';
  content: string;
  timestamp: Date;
}

export interface SessionUpdate {
  sessionId: string;
  type: 'reasoning' | 'code' | 'status' | 'attempt' | 'result';
  data: any;
  timestamp: Date;
}

// Analytics types
export interface Analytics {
  totalProblems: number;
  solvedProblems: number;
  averageSuccessRate: number;
  totalSessions: number;
  timeSaved: number;
  learningTrend: TrendData[];
  difficultyBreakdown: DifficultyStats[];
  topicMastery: TopicMasteryData[];
  attemptDistribution: AttemptDistributionData[];
}

export interface TrendData {
  date: string;
  successRate: number;
  attempts: number;
  problems: number;
}

export interface DifficultyStats {
  difficulty: 'Easy' | 'Medium' | 'Hard';
  solved: number;
  total: number;
  successRate: number;
}

export interface TopicMasteryData {
  topic: string;
  mastery: number;
  problems: number;
  averageAttempts: number;
}

export interface AttemptDistributionData {
  attempts: number;
  problems: number;
  percentage: number;
}

// Learning session types
export interface LearningSession {
  id: string;
  problemId: number;
  problemTitle: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  startTime: Date;
  endTime: Date;
  attempts: Attempt[];
  finalSuccess: boolean;
  improvements: string[];
  insights: string[];
  codeEvolution: CodeEvolution[];
}

export interface CodeEvolution {
  version: number;
  code: string;
  reasoning: string;
  improvements: string[];
  timestamp: Date;
}

// Filter types
export interface ProblemFilters {
  difficulty: ('Easy' | 'Medium' | 'Hard')[];
  topics: string[];
  status: 'all' | 'solved' | 'attempted' | 'unsolved';
  successRateRange: [number, number];
  searchQuery: string;
}

export interface SortOptions {
  field: 'difficulty' | 'successRate' | 'attempts' | 'recent';
  order: 'asc' | 'desc';
}

// UI state types
export interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  currentPage: string;
  isLoading: boolean;
  error: string | null;
}

// User preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  maxAttempts: number;
  showReasoning: boolean;
  codeFontSize: number;
  autoSave: boolean;
  notifications: boolean;
  language: string;
}

// API response types
export interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: Date;
}

export interface SessionResponse {
  sessionId: string;
  status: string;
  message: string;
}

// Activity feed types
export interface ActivityItem {
  id: string;
  type: 'success' | 'improvement' | 'attempt' | 'failure';
  problemTitle: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Chart data types
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

// Component prop types
export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: any;
  color: 'green' | 'blue' | 'purple' | 'orange' | 'red';
}

export interface ProblemCardProps {
  problem: Problem;
  onSolve?: (problemId: number) => void;
  onView?: (problemId: number) => void;
}

export interface TestResultCardProps {
  result: TestResult;
  index: number;
}

// Solving interface types
export interface SolvingOptions {
  maxAttempts: number;
  showReasoning: boolean;
  language: string;
  model: string;
}

export interface WorkspaceStatus {
  isActive: boolean;
  currentStep: string;
  progress: number;
  error?: string;
}

// Time range types
export type TimeRange = '24h' | '7d' | '30d' | '3m' | '1y' | 'all';

// App state types
export interface AppState {
  // Problem state
  problems: Problem[];
  currentProblem: Problem | null;
  filters: ProblemFilters;
  sortOptions: SortOptions;
  
  // Solving state
  currentSession: SolvingSession | null;
  isStreaming: boolean;
  streamingData: StreamingData[];
  
  // Analytics state
  analytics: Analytics;
  learningHistory: LearningSession[];
  
  // UI state
  ui: UIState;
  preferences: UserPreferences;
  
  // Activity state
  activities: ActivityItem[];
}

// Store action types
export interface AppActions {
  // Problem actions
  setProblems: (problems: Problem[]) => void;
  setCurrentProblem: (problem: Problem | null) => void;
  updateFilters: (filters: Partial<ProblemFilters>) => void;
  updateSortOptions: (options: SortOptions) => void;
  
  // Solving actions
  startSession: (options: SolvingOptions) => void;
  endSession: () => void;
  updateSession: (update: Partial<SolvingSession>) => void;
  addStreamingData: (data: StreamingData) => void;
  
  // Analytics actions
  updateAnalytics: (analytics: Analytics) => void;
  addLearningSession: (session: LearningSession) => void;
  
  // UI actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Activity actions
  addActivity: (activity: ActivityItem) => void;
  
  // Preferences actions
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
}

// Hook return types
export interface UseProblemReturn {
  problems: Problem[];
  currentProblem: Problem | null;
  isLoading: boolean;
  error: string | null;
  fetchProblems: () => Promise<void>;
  fetchProblem: (id: number) => Promise<void>;
}

export interface UseAIStreamingReturn {
  reasoning: string;
  code: string;
  status: SolvingSession['status'];
  testResults: TestResult[];
  startSolving: (options: SolvingOptions) => Promise<void>;
  stopSolving: () => void;
  isStreaming: boolean;
}

export interface UseAnalyticsReturn {
  analytics: Analytics;
  learningHistory: LearningSession[];
  isLoading: boolean;
  error: string | null;
  refreshAnalytics: () => Promise<void>;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Navigation types
export interface NavItem {
  title: string;
  href: string;
  icon: any;
  badge?: string | number;
  children?: NavItem[];
}

// Modal types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: any;
}

// Search types
export interface SearchResult {
  id: string;
  title: string;
  type: 'problem' | 'session' | 'topic';
  relevance: number;
  metadata: Record<string, any>;
}

// Notification types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant: 'primary' | 'secondary';
} 