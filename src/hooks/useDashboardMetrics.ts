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

// Recent Activity Feed
export function useRecentActivity() {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      try {
        // Fetch recent solution attempts with problem details
        const { data: attempts, error } = await supabase
          .from('solution_attempts')
          .select(`
            id,
            problem_id,
            success_rate,
            language,
            created_at,
            attempt_number,
            generated_code,
            reasoning_content,
            problems (
              title,
              difficulty
            )
          `)
          .order('created_at', { ascending: false })
          .limit(15);

        if (error) {
          console.warn('Failed to fetch recent activity:', error);
          return [];
        }

        return (attempts || []).map((attempt, index) => {
          const timeAgo = getTimeAgo(attempt.created_at);
          const isSuccess = attempt.success_rate >= 80;
          const isGenerated = attempt.generated_code?.length > 0;
          
          let type = 'analysis';
          let description = `Analyzed problem with ${Math.round(attempt.success_rate)}% success rate`;
          
          if (isSuccess) {
            type = 'success';
            description = `Successfully solved with ${Math.round(attempt.success_rate)}% accuracy`;
          } else if (attempt.success_rate < 50) {
            type = 'failed';
            description = `Solution struggled with ${Math.round(attempt.success_rate)}% success rate`;
          } else if (isGenerated) {
            type = 'test_generated';
            description = `Generated solution code, ${Math.round(attempt.success_rate)}% success`;
          }

          return {
            id: `${attempt.id}-${index}`,
            type,
            title: (attempt as any).problems?.title || `Problem #${attempt.problem_id}`,
            description,
            time: timeAgo,
            language: attempt.language || 'Unknown',
            difficulty: (attempt as any).problems?.difficulty
          };
        });
      } catch (error) {
        console.warn('Failed to fetch recent activity:', error);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });
}

// Helper function to get time ago string
function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} days ago`;
}

// Learning Progress Analytics
export function useLearningProgress() {
  return useQuery({
    queryKey: ['learning-progress'],
    queryFn: async () => {
      try {
        // Fetch problem metrics with problem details
        const { data: metrics, error: metricsError } = await supabase
          .from('problem_metrics')
          .select(`
            *,
            problems (
              title,
              difficulty,
              content_html
            )
          `);

        if (metricsError) {
          console.warn('Failed to fetch learning progress:', metricsError);
          return null;
        }

        const metricsArray = metrics || [];
        
        // Group by difficulty and calculate progress
        const difficultyProgress = metricsArray.reduce((acc: any, metric) => {
          const difficulty = metric.problems?.difficulty || 'Unknown';
          
          if (!acc[difficulty]) {
            acc[difficulty] = {
              total: 0,
              solved: 0,
              totalSuccessRate: 0
            };
          }
          
          acc[difficulty].total++;
          acc[difficulty].totalSuccessRate += metric.average_success_rate || 0;
          
          if (metric.average_success_rate >= 90) {
            acc[difficulty].solved++;
          }
          
          return acc;
        }, {});

        // Convert to skill progress format
        const skillProgress = Object.entries(difficultyProgress).map(([difficulty, data]: [string, any]) => ({
          skill: `${difficulty} Problems`,
          progress: Math.round((data.solved / data.total) * 100) || 0,
          color: getDifficultyColor(difficulty)
        }));

        // Recent learning topics - analyze recent attempts
        const recentAttempts = await supabase
          .from('solution_attempts')
          .select('problem_id, success_rate, created_at, problems(title)')
          .order('created_at', { ascending: false })
          .limit(20);

        const recentLearning = (recentAttempts.data || [])
          .slice(0, 5)
          .map(attempt => ({
            topic: (attempt as any).problems?.title || `Problem #${attempt.problem_id}`,
            confidence: Math.round(attempt.success_rate || 0),
            sessions: 1 // Could be calculated from multiple attempts
          }));

        // Overall performance calculation
        const overallSuccessRate = metricsArray.length > 0
          ? Math.round(metricsArray.reduce((sum, m) => sum + (m.average_success_rate || 0), 0) / metricsArray.length)
          : 0;

        return {
          skillProgress,
          recentLearning,
          overallPerformance: overallSuccessRate,
          improvement: 5 // Could be calculated from historical data
        };
      } catch (error) {
        console.warn('Failed to fetch learning progress:', error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

// Helper function for difficulty colors
function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'easy': return 'bg-green-500';
    case 'medium': return 'bg-yellow-500';
    case 'hard': return 'bg-red-500';
    default: return 'bg-blue-500';
  }
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