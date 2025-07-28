import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  AppState, 
  AppActions, 
  Problem, 
  ProblemFilters, 
  SortOptions, 
  SolvingSession, 
  StreamingData, 
  Analytics, 
  LearningSession, 
  UIState, 
  UserPreferences, 
  ActivityItem,
  SolvingOptions
} from '@/types';

// Default state values
const defaultFilters: ProblemFilters = {
  difficulty: [],
  topics: [],
  status: 'all',
  successRateRange: [0, 100],
  searchQuery: '',
};

const defaultSortOptions: SortOptions = {
  field: 'recent',
  order: 'desc',
};

const defaultUIState: UIState = {
  theme: 'dark',
  sidebarOpen: false,
  currentPage: '/',
  isLoading: false,
  error: null,
};

const defaultPreferences: UserPreferences = {
  theme: 'dark',
  maxAttempts: 3,
  showReasoning: true,
  codeFontSize: 14,
  autoSave: true,
  notifications: true,
  language: 'python',
};

const defaultAnalytics: Analytics = {
  totalProblems: 0,
  solvedProblems: 0,
  averageSuccessRate: 0,
  totalSessions: 0,
  timeSaved: 0,
  learningTrend: [],
  difficultyBreakdown: [],
  topicMastery: [],
  attemptDistribution: [],
};

// Main app store
export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        problems: [],
        currentProblem: null,
        filters: defaultFilters,
        sortOptions: defaultSortOptions,
        currentSession: null,
        isStreaming: false,
        streamingData: [],
        analytics: defaultAnalytics,
        learningHistory: [],
        ui: defaultUIState,
        preferences: defaultPreferences,
        activities: [],

        // Problem actions
        setProblems: (problems: Problem[]) =>
          set({ problems }, false, 'setProblems'),

        setCurrentProblem: (problem: Problem | null) =>
          set({ currentProblem: problem }, false, 'setCurrentProblem'),

        updateFilters: (filters: Partial<ProblemFilters>) =>
          set(
            (state) => ({
              filters: { ...state.filters, ...filters },
            }),
            false,
            'updateFilters'
          ),

        updateSortOptions: (options: SortOptions) =>
          set({ sortOptions: options }, false, 'updateSortOptions'),

        // Solving actions
        startSession: (options: SolvingOptions) => {
          const currentProblem = get().currentProblem;
          if (!currentProblem) return;

          const session: SolvingSession = {
            id: `session-${Date.now()}`,
            problemId: currentProblem.id,
            status: 'idle',
            startTime: new Date(),
            attempts: [],
            currentAttempt: 0,
            maxAttempts: options.maxAttempts,
            reasoning: '',
            currentCode: '',
            successRate: 0,
            improvements: [],
          };

          set(
            {
              currentSession: session,
              isStreaming: true,
              streamingData: [],
            },
            false,
            'startSession'
          );
        },

        endSession: () => {
          const { currentSession } = get();
          if (!currentSession) return;

          const completedSession = {
            ...currentSession,
            status: 'complete' as const,
            endTime: new Date(),
          };

          set(
            {
              currentSession: null,
              isStreaming: false,
              streamingData: [],
            },
            false,
            'endSession'
          );

          // Add to learning history
          const learningSession: LearningSession = {
            id: completedSession.id,
            problemId: completedSession.problemId,
            problemTitle: get().currentProblem?.title || 'Unknown',
            difficulty: get().currentProblem?.difficulty || 'Medium',
            startTime: completedSession.startTime,
            endTime: completedSession.endTime!,
            attempts: completedSession.attempts,
            finalSuccess: completedSession.attempts.some(a => a.success),
            improvements: completedSession.improvements,
            insights: [],
            codeEvolution: [],
          };

          get().addLearningSession(learningSession);
        },

        updateSession: (update: Partial<SolvingSession>) => {
          const { currentSession } = get();
          if (!currentSession) return;

          set(
            {
              currentSession: { ...currentSession, ...update },
            },
            false,
            'updateSession'
          );
        },

        addStreamingData: (data: StreamingData) =>
          set(
            (state) => ({
              streamingData: [...state.streamingData, data],
            }),
            false,
            'addStreamingData'
          ),

        // Analytics actions
        updateAnalytics: (analytics: Analytics) =>
          set({ analytics }, false, 'updateAnalytics'),

        addLearningSession: (session: LearningSession) =>
          set(
            (state) => ({
              learningHistory: [session, ...state.learningHistory],
            }),
            false,
            'addLearningSession'
          ),

        // UI actions
        setTheme: (theme: 'light' | 'dark') =>
          set(
            (state) => ({
              ui: { ...state.ui, theme },
              preferences: { ...state.preferences, theme },
            }),
            false,
            'setTheme'
          ),

        toggleSidebar: () =>
          set(
            (state) => ({
              ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen },
            }),
            false,
            'toggleSidebar'
          ),

        setLoading: (loading: boolean) =>
          set(
            (state) => ({
              ui: { ...state.ui, isLoading: loading },
            }),
            false,
            'setLoading'
          ),

        setError: (error: string | null) =>
          set(
            (state) => ({
              ui: { ...state.ui, error },
            }),
            false,
            'setError'
          ),

        // Activity actions
        addActivity: (activity: ActivityItem) =>
          set(
            (state) => ({
              activities: [activity, ...state.activities.slice(0, 49)], // Keep last 50
            }),
            false,
            'addActivity'
          ),

        // Preferences actions
        updatePreferences: (preferences: Partial<UserPreferences>) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, ...preferences },
            }),
            false,
            'updatePreferences'
          ),
      }),
      {
        name: 'ai-leetcode-storage',
        partialize: (state) => ({
          preferences: state.preferences,
          filters: state.filters,
          sortOptions: state.sortOptions,
          learningHistory: state.learningHistory,
          analytics: state.analytics,
        }),
      }
    ),
    {
      name: 'ai-leetcode-store',
    }
  )
);

// Selector hooks for optimized re-renders
export const useProblems = () => useAppStore((state) => state.problems);
export const useCurrentProblem = () => useAppStore((state) => state.currentProblem);
export const useFilters = () => useAppStore((state) => state.filters);
export const useSortOptions = () => useAppStore((state) => state.sortOptions);
export const useCurrentSession = () => useAppStore((state) => state.currentSession);
export const useIsStreaming = () => useAppStore((state) => state.isStreaming);
export const useStreamingData = () => useAppStore((state) => state.streamingData);
export const useAnalytics = () => useAppStore((state) => state.analytics);
export const useLearningHistory = () => useAppStore((state) => state.learningHistory);
export const useUIState = () => useAppStore((state) => state.ui);
export const usePreferences = () => useAppStore((state) => state.preferences);
export const useActivities = () => useAppStore((state) => state.activities);

// Action hooks
export const useProblemActions = () => useAppStore((state) => ({
  setProblems: state.setProblems,
  setCurrentProblem: state.setCurrentProblem,
  updateFilters: state.updateFilters,
  updateSortOptions: state.updateSortOptions,
}));

export const useSolvingActions = () => useAppStore((state) => ({
  startSession: state.startSession,
  endSession: state.endSession,
  updateSession: state.updateSession,
  addStreamingData: state.addStreamingData,
}));

export const useUIActions = () => useAppStore((state) => ({
  setTheme: state.setTheme,
  toggleSidebar: state.toggleSidebar,
  setLoading: state.setLoading,
  setError: state.setError,
}));

export const useActivityActions = () => useAppStore((state) => ({
  addActivity: state.addActivity,
}));

export const usePreferencesActions = () => useAppStore((state) => ({
  updatePreferences: state.updatePreferences,
})); 