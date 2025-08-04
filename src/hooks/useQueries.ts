'use client';

import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'
import { ProblemFilters } from '@/types/backend'

export function useProblems(filters?: ProblemFilters) {
  return useQuery({
    queryKey: [...queryKeys.problems, filters],
    queryFn: () => apiService.getProblems(filters),
  })
}

export function useProblem(id: number) {
  return useQuery({
    queryKey: queryKeys.problem(id),
    queryFn: () => apiService.getProblem(id),
    enabled: !!id,
  })
}

export function useLearningSessionDetails(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.session(sessionId),
    queryFn: () => apiService.getLearningSession(sessionId),
    enabled: !!sessionId,
  })
}

export function useRecentSessions() {
  return useQuery({
    queryKey: queryKeys.recentSessions,
    queryFn: () => apiService.getRecentSessions(),
  })
}

export function useAnalytics(timeRange?: string) {
  return useQuery({
    queryKey: queryKeys.analytics(timeRange),
    queryFn: () => apiService.getAnalytics(),
    staleTime: 2 * 60 * 1000, // 2 minutes for analytics
  })
} 