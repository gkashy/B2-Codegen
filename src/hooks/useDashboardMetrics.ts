'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface DashboardMetrics {
  totalProblems: number;
  solvedProblems: number;
  totalAttempts: number;
  averageSuccessRate: number;
  totalTestCases: number;
  aiGeneratedTestCases: number;
  averageDifficultyScore: number;
  recentActivity: {
    totalSessions: number;
    weeklyImprovement: number;
  };
}

interface ProblemMetric {
  problem_id: number;
  total_attempts: number;
  successful_attempts: number;
  average_success_rate: number;
  average_execution_time: number;
  actual_difficulty_score: number;
  total_test_cases: number;
  generated_test_cases: number;
  original_test_cases: number;
  last_updated: string;
}

interface ReinforcementSession {
  id: string;
  problem_id: number;
  status: 'in_progress' | 'solved' | 'max_attempts_reached';
  best_success_rate: number;
  total_attempts: number;
  started_at: string;
  completed_at?: string;
}

async function fetchFromSupabase<T>(table: string, query?: string): Promise<T[]> {
  let supabaseQuery = supabase.from(table).select('*');
  
  // Parse query parameters if provided
  if (query) {
    const params = new URLSearchParams(query);
    
    // Handle ordering
    if (params.has('order')) {
      const orderParam = params.get('order')!;
      const [column, direction] = orderParam.split('.');
      supabaseQuery = supabaseQuery.order(column, { 
        ascending: direction !== 'desc' 
      });
    }
    
    // Handle limit
    if (params.has('limit')) {
      const limit = parseInt(params.get('limit')!);
      supabaseQuery = supabaseQuery.limit(limit);
    }
  }
  
  const { data, error } = await supabaseQuery;
  
  if (error) {
    throw new Error(`Failed to fetch ${table}: ${error.message}`);
  }
  
  return Array.isArray(data) ? data : [];
}

// Fetch all problem metrics
export function useProblemMetrics() {
  return useQuery({
    queryKey: ['problem-metrics'],
    queryFn: async () => {
      try {
        return await fetchFromSupabase<ProblemMetric>('problem_metrics');
      } catch (error) {
        console.warn('Problem metrics table not found, returning empty array:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

// Fetch reinforcement sessions for AI activity
export function useReinforcementSessions() {
  return useQuery({
    queryKey: ['reinforcement-sessions'],
    queryFn: async () => {
      try {
        return await fetchFromSupabase<ReinforcementSession>(
          'reinforcement_sessions', 
          'order=created_at.desc&limit=50'
        );
      } catch (error) {
        console.warn('Reinforcement sessions table not found, returning empty array:', error);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false, // Don't retry on table not found errors
  });
}

// Main dashboard metrics hook
export function useDashboardMetrics(): {
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const { data: problemMetrics, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useProblemMetrics();
  const { data: sessions, isLoading: sessionsLoading, error: sessionsError } = useReinforcementSessions();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    // Always set metrics, even if problemMetrics is empty or null
    const metricsArray = problemMetrics || [];
    
    // Calculate aggregated metrics
    const totalProblems = metricsArray.length;
    const solvedProblems = metricsArray.filter(m => m.average_success_rate === 100).length;
    const totalAttempts = metricsArray.reduce((sum, m) => sum + (m.total_attempts || 0), 0);
    const averageSuccessRate = totalProblems > 0 
      ? metricsArray.reduce((sum, m) => sum + (m.average_success_rate || 0), 0) / totalProblems 
      : 0;
    
    const totalTestCases = metricsArray.reduce((sum, m) => sum + (m.total_test_cases || 0), 0);
    const aiGeneratedTestCases = metricsArray.reduce((sum, m) => sum + (m.generated_test_cases || 0), 0);
    const averageDifficultyScore = totalProblems > 0
      ? metricsArray.reduce((sum, m) => sum + (m.actual_difficulty_score || 0), 0) / totalProblems
      : 0;

    // AI Sessions metrics (handle missing or empty sessions)
    const sessionsArray = sessions || [];
    const totalSessions = sessionsArray.length;
    const completedSessions = sessionsArray.filter(s => s.status === 'solved').length;
    const weeklyImprovement = completedSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    setMetrics({
      totalProblems,
      solvedProblems,
      totalAttempts,
      averageSuccessRate,
      totalTestCases,
      aiGeneratedTestCases,
      averageDifficultyScore,
      recentActivity: {
        totalSessions,
        weeklyImprovement
      }
    });
  }, [problemMetrics, sessions]);

  return {
    metrics,
    loading: metricsLoading, // Don't wait for sessions to load
    error: metricsError?.message || null, // Ignore sessions errors
    refetch: refetchMetrics
  };
}

// Recent problems with real data
export function useRecentProblems() {
  return useQuery({
    queryKey: ['recent-problems'],
    queryFn: async () => {
      try {
        // Try to fetch recent solution attempts with problem details
        const { data: attempts, error } = await supabase
          .from('solution_attempts')
          .select(`
            *,
            problems (
              id,
              title,
              difficulty
            )
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.warn('Solution attempts table not found, returning empty array:', error);
          return [];
        }
        
        return (attempts || []).map(attempt => ({
          id: attempt.problem_id,
          title: attempt.problems?.title || 'Unknown Problem',
          difficulty: attempt.problems?.difficulty || 'medium',
          status: attempt.success_rate === 100 ? 'solved' : 'failed',
          successRate: attempt.success_rate,
          attempts: attempt.attempt_number,
          date: new Date(attempt.created_at).toLocaleDateString(),
          language: attempt.language
        }));
      } catch (error) {
        console.warn('Failed to fetch recent problems:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

// Performance analytics by difficulty
export function usePerformanceAnalytics() {
  return useQuery({
    queryKey: ['performance-analytics'],
    queryFn: async () => {
      const metrics = await fetchFromSupabase<ProblemMetric>('problem_metrics');
      const problems = await fetchFromSupabase<any>('problems');
      
      // Add null checks
      if (!Array.isArray(problems) || !Array.isArray(metrics)) {
        console.warn('Performance analytics: Invalid data structure', { problems, metrics });
        return [];
      }
      
      // Group by difficulty
      const performanceByDifficulty = problems.reduce((acc: any, problem: any) => {
        const metric = metrics.find(m => m.problem_id === problem.id);
        const difficulty = problem.difficulty || 'Unknown';
        
        if (!acc[difficulty]) {
          acc[difficulty] = {
            category: difficulty,
            solved: 0,
            total: 0,
            totalSuccessRate: 0,
            avgTime: 0,
            timeCount: 0
          };
        }
        
        acc[difficulty].total++;
        if (metric) {
          if (metric.average_success_rate === 100) {
            acc[difficulty].solved++;
          }
          acc[difficulty].totalSuccessRate += metric.average_success_rate;
          if (metric.average_execution_time > 0) {
            acc[difficulty].avgTime += metric.average_execution_time;
            acc[difficulty].timeCount++;
          }
        }
        
        return acc;
      }, {});
      
      // Calculate final metrics
      return Object.values(performanceByDifficulty).map((perf: any) => ({
        category: `${perf.category} Problems`,
        solved: perf.solved,
        total: perf.total,
        successRate: Math.round(perf.totalSuccessRate / perf.total),
        avgTime: perf.timeCount > 0 ? `${(perf.avgTime / perf.timeCount).toFixed(1)}s` : 'N/A'
      }));
    },
    staleTime: 10 * 60 * 1000,
  });
}