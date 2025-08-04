'use client';

import { useState, useCallback } from 'react'
import { apiService } from '@/lib/api'

export function useAIStreaming() {
  const [reasoning, setReasoning] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('idle' as 'idle' | 'thinking' | 'coding' | 'complete')
  const [error, setError] = useState(null as string | null)
  
  const startStreaming = useCallback(async (params: {
    problem_id: number
    language?: string
    context?: string
    attempt_number?: number
    auto_mode?: boolean  // NEW: Auto-mode toggle
  }) => {
    setReasoning('')
    setCode('')
    setError(null)
    setStatus('thinking')
    
    try {
      const stream = await apiService.streamCodeGeneration(params)
      const reader = stream.getReader()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        if (value.type === 'reasoning') {
          setReasoning(prev => prev + value.content)
        } else if (value.type === 'code') {
          setStatus('coding')
          setCode(prev => prev + value.content)
        } else if (value.type === 'complete') {
          setStatus('complete')
          break
        } else if (value.type === 'error') {
          setError(value.content || 'An error occurred')
          setStatus('idle')
          break
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('idle')
    }
  }, [])
  
  const reset = useCallback(() => {
    setReasoning('')
    setCode('')
    setStatus('idle')
    setError(null)
  }, [])
  
  return {
    reasoning,
    code,
    status,
    error,
    startStreaming,
    reset,
    isStreaming: status === 'thinking' || status === 'coding'
  }
} 