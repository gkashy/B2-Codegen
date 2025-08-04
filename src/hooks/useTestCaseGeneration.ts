'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface GenerateTestCasesRequest {
  problem_id: number;
  count?: number;
  difficulty_level?: 'easy' | 'medium' | 'hard' | 'expert';
  focus_areas?: string[];
  should_save?: boolean; // NEW: Control whether to save to database
}

interface GeneratedTestCase {
  id?: number; // Optional since it's only set when saved
  input_data: any;
  expected_output: any;
  source?: string;
  difficulty_level?: string;
  generated_by?: string;
  generation_reasoning?: string;
  explanation?: string;
  created_at?: string;
}

interface GenerateTestCasesResponse {
  success: boolean;
  generated_count: number;
  test_cases: GeneratedTestCase[]; // Always contains generated test cases for preview
  saved_test_cases: GeneratedTestCase[] | null; // Only populated if saved
  was_saved: boolean; // Whether the test cases were saved
  metadata: {
    problem_id: number;
    difficulty_level: string;
    focus_areas: string[];
    generation_timestamp: string;
  };
}

interface SaveTestCasesRequest {
  problem_id: number;
  test_cases: GeneratedTestCase[];
}

// Direct endpoint URL as provided by user
const TEST_CASE_GENERATOR_URL = 'https://mbuiluhrtlgyawlqchaq.supabase.co/functions/v1/test-case-generator';

// Generate test cases for preview (without saving)
async function generateTestCasesPreview(params: Omit<GenerateTestCasesRequest, 'should_save'>): Promise<GenerateTestCasesResponse> {
  const response = await fetch(TEST_CASE_GENERATOR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...params, should_save: false }),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to generate test cases';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch (jsonError) {
      // If JSON parsing fails, get the raw text
      const rawText = await response.text();
      console.error('❌ Server returned non-JSON response:', rawText);
      errorMessage = `Server error (${response.status}): ${rawText.substring(0, 200)}`;
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  console.log('✅ Received response from serverless:', result);
  return result;
}

// Save selected test cases to database (save the EXACT test cases user previewed)
async function saveTestCases(params: SaveTestCasesRequest): Promise<GenerateTestCasesResponse> {
  const response = await fetch(TEST_CASE_GENERATOR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      problem_id: params.problem_id,
      should_save: true,
      test_cases_to_save: params.test_cases // Pass the EXACT test cases to save
    }),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to save test cases';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch (jsonError) {
      // If JSON parsing fails, get the raw text
      const rawText = await response.text();
      console.error('❌ Server returned non-JSON response (save):', rawText);
      errorMessage = `Server error (${response.status}): ${rawText.substring(0, 200)}`;
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  console.log('✅ Save response from serverless:', result);
  return result;
}

export function useTestCaseGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Mutation for generating test cases (preview only)
  const generateMutation = useMutation({
    mutationFn: async (params: Omit<GenerateTestCasesRequest, 'should_save'>): Promise<GenerateTestCasesResponse> => {
      return generateTestCasesPreview(params);
    },
    onMutate: () => {
      setIsGenerating(true);
    },
    onSuccess: (data: GenerateTestCasesResponse) => {
      setIsGenerating(false);
      console.log('✅ Test cases generated for preview:', data.generated_count);
    },
    onError: (error: any) => {
      console.error('❌ Test case generation failed:', error);
      setIsGenerating(false);
    },
  });

  // Mutation for saving selected test cases
  const saveMutation = useMutation({
    mutationFn: async (params: SaveTestCasesRequest): Promise<GenerateTestCasesResponse> => {
      return saveTestCases(params);
    },
    onMutate: () => {
      setIsSaving(true);
    },
    onSuccess: (data: GenerateTestCasesResponse) => {
      // Invalidate and refetch problem data to show new test cases
      queryClient.invalidateQueries({ queryKey: ['problem', data.metadata.problem_id] });
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      setIsSaving(false);
      console.log('✅ Test cases saved successfully:', data.generated_count);
    },
    onError: (error: any) => {
      console.error('❌ Test case saving failed:', error);
      setIsSaving(false);
    },
  });

  const generateForPreview = async (params: Omit<GenerateTestCasesRequest, 'should_save'>) => {
    return generateMutation.mutateAsync(params);
  };

  const saveSelected = async (params: SaveTestCasesRequest) => {
    return saveMutation.mutateAsync(params);
  };

  return {
    // Preview generation
    generateTestCases: generateForPreview,
    isGenerating: isGenerating || generateMutation.isPending,
    generationError: generateMutation.error,
    lastGenerated: generateMutation.data,
    
    // Saving functionality  
    saveTestCases: saveSelected,
    isSaving: isSaving || saveMutation.isPending,
    savingError: saveMutation.error,
    lastSaved: saveMutation.data,
    
    // Reset functions
    resetGeneration: generateMutation.reset,
    resetSaving: saveMutation.reset,
  };
}

// Hook for fetching problem metrics
export function useProblemMetrics(problemId: number) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('problem_metrics')
        .select('*')
        .eq('problem_id', problemId)
        .single();

      if (error) {
        console.error('Failed to fetch problem metrics:', error);
        setMetrics(null);
      } else {
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch problem metrics:', error);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    metrics,
    loading,
    fetchMetrics,
  };
}