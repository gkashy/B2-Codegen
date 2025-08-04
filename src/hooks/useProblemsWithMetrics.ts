'use client';

import { useQuery } from '@tanstack/react-query';
import { Problem } from '@/types/backend';
import { supabase } from '@/lib/supabase';

interface ProblemWithMetrics extends Problem {
  metrics?: {
    total_attempts: number;
    successful_attempts: number;
    average_success_rate: number;
    average_execution_time: number;
    actual_difficulty_score: number;
    total_test_cases: number;
    generated_test_cases: number;
    original_test_cases: number;
  };
}

async function fetchFromSupabase<T>(table: string, query?: string): Promise<T[]> {
  let supabaseQuery = supabase.from(table).select('*');
  
  // Parse query parameters if provided
  if (query) {
    const params = new URLSearchParams(query);
    
    // Handle select
    if (params.has('select')) {
      const selectParam = params.get('select')!;
      if (selectParam !== '*') {
        supabaseQuery = supabase.from(table).select(selectParam);
      }
    }
    
    // Handle text search
    params.forEach((value, key) => {
      if (key.includes('.ilike.')) {
        const [column] = key.split('.');
        const searchValue = value.replace(/^\*/, '').replace(/\*$/, '');
        supabaseQuery = supabaseQuery.ilike(column, `%${searchValue}%`);
      } else if (key.includes('.in.')) {
        const [column] = key.split('.');
        const values = value.replace(/[()]/g, '').split(',');
        supabaseQuery = supabaseQuery.in(column, values);
      }
    });
  }
  
  const { data, error } = await supabaseQuery;
  
  if (error) {
    throw new Error(`Failed to fetch ${table}: ${error.message}`);
  }
  
  return data || [];
}

// Fetch problems with their metrics  
export function useProblemsWithMetrics(options?: {
  search?: string;
  difficulty?: string[];
}) {
  return useQuery({
    queryKey: ['problems-with-metrics', options],
    queryFn: async (): Promise<ProblemWithMetrics[]> => {
      console.log('Fetching problems with options:', options);

      // Build Supabase query directly
      let problemsQuery = supabase.from('problems').select('*');

      // Apply search filter
      if (options?.search) {
        problemsQuery = problemsQuery.ilike('title', `%${options.search}%`);
      }

      // Apply difficulty filter
      if (options?.difficulty && options.difficulty.length > 0) {
        const uniqueDifficulties = [...new Set(options.difficulty)];
        console.log('Filtering by difficulties:', uniqueDifficulties);
        problemsQuery = problemsQuery.in('difficulty', uniqueDifficulties);
      }

      // Execute both queries
      const [problemsResult, metricsResult] = await Promise.all([
        problemsQuery,
        supabase.from('problem_metrics').select('*')
      ]);

      console.log('Database results:', { 
        problemsCount: problemsResult.data?.length || 0, 
        metricsCount: metricsResult.data?.length || 0,
        problemsError: problemsResult.error,
        metricsError: metricsResult.error,
        appliedFilters: {
          search: options?.search,
          difficulty: options?.difficulty
        }
      });

      if (problemsResult.error) {
        throw new Error(`Failed to fetch problems: ${problemsResult.error.message}`);
      }

      const problems = problemsResult.data || [];
      const metrics = metricsResult.data || [];

      // Debug: log difficulty values in database
      if (problems.length > 0) {
        const difficulties = [...new Set(problems.map(p => p.difficulty))];
        console.log('Available difficulties in database:', difficulties);
        console.log('Sample problems:', problems.slice(0, 3).map(p => ({ id: p.id, title: p.title, difficulty: p.difficulty })));
      } else {
        console.log('No problems found in database - this might indicate:');
        console.log('1. Database is empty');
        console.log('2. Filtering is too restrictive');  
        console.log('3. Database connection issue');
        
        // Test: try to fetch all problems without any filters
        if (options?.difficulty || options?.search) {
          console.log('Testing database connection with no filters...');
          const testQuery = await supabase.from('problems').select('*').limit(5);
          console.log('Test query result:', { 
            count: testQuery.data?.length || 0, 
            error: testQuery.error,
            sampleData: testQuery.data?.slice(0, 2)
          });
        }
      }

      // Combine problems with their metrics
      const problemsWithMetrics: ProblemWithMetrics[] = problems.map(problem => {
        const problemMetrics = metrics.find(m => m.problem_id === problem.id);
        
        return {
          ...problem,
          metrics: problemMetrics || undefined
        };
      });

      return problemsWithMetrics;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Helper function to get difficulty color with dynamic scoring
export function getDifficultyInfo(problem: ProblemWithMetrics) {
  const staticDifficulty = problem.difficulty;
  const dynamicScore = problem.metrics?.actual_difficulty_score;
  const hasAttempts = problem.metrics && problem.metrics.total_attempts > 0;
  
  // Only use dynamic score if there are actual attempts and the score is meaningful
  const shouldUseDynamic = hasAttempts && dynamicScore !== undefined && dynamicScore > 0;
  const effectiveDifficulty = shouldUseDynamic ? getDynamicDifficulty(dynamicScore) : staticDifficulty;
  
  const colors = {
    'easy': 'bg-green-500/10 text-green-600 border-green-200',
    'Easy': 'bg-green-500/10 text-green-600 border-green-200',
    'medium': 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    'Medium': 'bg-yellow-500/10 text-yellow-600 border-yellow-200', 
    'hard': 'bg-red-500/10 text-red-600 border-red-200',
    'Hard': 'bg-red-500/10 text-red-600 border-red-200'
  };

  const difficultyKey = effectiveDifficulty || 'Medium';
  
  return {
    difficulty: difficultyKey,
    color: colors[difficultyKey as keyof typeof colors] || colors['Medium'],
    score: shouldUseDynamic ? dynamicScore : null,
    isDynamic: shouldUseDynamic
  };
}

// Convert numeric difficulty score to category
function getDynamicDifficulty(score: number): 'Easy' | 'Medium' | 'Hard' {
  if (score <= 3) return 'Easy';
  if (score <= 7) return 'Medium'; 
  return 'Hard';
}

// Get status based on user's performance
export function getProblemStatus(problem: ProblemWithMetrics): 'solved' | 'attempted' | 'not_attempted' {
  if (!problem.metrics) return 'not_attempted';
  
  if (problem.metrics.average_success_rate === 100) return 'solved';
  if (problem.metrics.total_attempts > 0) return 'attempted';
  return 'not_attempted';
}

// Get performance metrics display
export function getPerformanceDisplay(problem: ProblemWithMetrics) {
  if (!problem.metrics) {
    return {
      successRate: null,
      attempts: 0,
      testCases: 0,
      generatedTests: 0,
      hasData: false
    };
  }

  return {
    successRate: Math.round(problem.metrics.average_success_rate || 0),
    attempts: problem.metrics.total_attempts || 0,
    testCases: problem.metrics.total_test_cases || 0,
    generatedTests: problem.metrics.generated_test_cases || 0,
    hasData: true
  };
}