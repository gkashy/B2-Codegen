import { useState, useCallback } from 'react'
import { apiService } from '@/lib/api'
import { TestExecutionResponse } from '@/types/backend'

export function useCodeTesting() {
  const [results, setResults] = useState(null as TestExecutionResponse | null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null as string | null)
  
  const testCode = useCallback(async (params: {
    problem_id: number
    solution_code: string
    language?: string
  }) => {
    setIsLoading(true)
    setError(null)
    setResults(null)
    
    try {
      const result = await apiService.testCode(params)
      setResults(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Testing failed')
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  return {
    results,
    isLoading,
    error,
    testCode,
    reset: () => setResults(null)
  }
} 