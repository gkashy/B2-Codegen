import { useState, useCallback } from 'react'
import { apiService } from '@/lib/api'
import { ReinforcementResponse } from '@/types/backend'

export function useLearningSession() {
  const [session, setSession] = useState(null as ReinforcementResponse | null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null as string | null)
  
  const startSession = useCallback(async (params: {
    problem_id: number
    language?: string
    max_attempts?: number
  }) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await apiService.startLearningSession(params)
      setSession(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session')
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  const continueSession = useCallback(async (sessionId: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await apiService.startLearningSession({ 
        problem_id: session!.problem_id,
        session_id: sessionId 
      })
      setSession(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue session')
    } finally {
      setIsLoading(false)
    }
  }, [session])
  
  return {
    session,
    isLoading,
    error,
    startSession,
    continueSession,
    reset: () => setSession(null)
  }
} 