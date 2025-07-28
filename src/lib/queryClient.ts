import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

// Query keys
export const queryKeys = {
  problems: ['problems'] as const,
  problem: (id: number) => ['problems', id] as const,
  session: (id: string) => ['session', id] as const,
  analytics: (timeRange?: string) => ['analytics', timeRange] as const,
  recentSessions: ['recentSessions'] as const,
} 