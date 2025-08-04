'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

const ANALYZE_FIX_URL = 'https://mbuiluhrtlgyawlqchaq.supabase.co/functions/v1/analyze-fix';

interface AnalyzeFixRequest {
  problem_id: number;
  original_code: string;
  failed_test_cases: any[];
  passed_test_cases: any[];
  compilation_errors?: string;
  runtime_errors?: string;
  language?: string;
}

interface AnalyzeFixResponse {
  success: boolean;
  analysis: string;
  fixed_code: string;
  confidence: number;
  changes_summary: string;
  key_insights: string;
  error_types: string[];
}

export function useAnalyzeFix() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeFixResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async (request: AnalyzeFixRequest): Promise<AnalyzeFixResponse> => {
      console.log('🔍 Starting code analysis...', request);
      
      const response = await fetch(ANALYZE_FIX_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      return result;
    },
    onMutate: () => {
      setIsAnalyzing(true);
      setError(null);
      setAnalysisResult(null);
    },
    onSuccess: (data) => {
      console.log('✅ Analysis completed:', data);
      setAnalysisResult(data);
      setIsAnalyzing(false);
    },
    onError: (error: Error) => {
      console.error('❌ Analysis failed:', error);
      setError(error.message);
      setIsAnalyzing(false);
    },
  });

  const analyzeAndFix = async (request: AnalyzeFixRequest) => {
    return analyzeMutation.mutateAsync(request);
  };

  const clearResults = () => {
    setAnalysisResult(null);
    setError(null);
  };

  return {
    analyzeAndFix,
    isAnalyzing,
    analysisResult,
    error,
    clearResults,
    // Helper to check if analysis is available
    hasAnalysis: !!analysisResult,
    // Helper to get confidence level description
    getConfidenceLevel: (confidence: number) => {
      if (confidence >= 9) return 'Very High';
      if (confidence >= 7) return 'High';
      if (confidence >= 5) return 'Medium';
      if (confidence >= 3) return 'Low';
      return 'Very Low';
    }
  };
}