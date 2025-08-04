'use client';

import { useState, useCallback } from 'react'
import { apiService } from '@/lib/api'

export function useCodeEditing() {
  const [isEditing, setIsEditing] = useState(false)
  const [editedCode, setEditedCode] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  const startEditing = useCallback((currentCode: string) => {
    setEditedCode(currentCode)
    setIsEditing(true)
    setSaveError(null)
    setSaveSuccess(false)
  }, [])
  
  const cancelEditing = useCallback(() => {
    setIsEditing(false)
    setEditedCode('')
    setSaveError(null)
    setSaveSuccess(false)
  }, [])
  
  const saveCode = useCallback(async (params: {
    problem_id: number
    language?: string
    onSaveSuccess?: (savedCode: string) => void
  }) => {
    if (!editedCode.trim()) {
      setSaveError('Code cannot be empty')
      return false
    }
    
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    
    try {
      await apiService.saveCode({
        problem_id: params.problem_id,
        code: editedCode,
        language: params.language
      })
      
      setSaveSuccess(true)
      setIsEditing(false)
      
      // Call the callback to update the parent component's code state
      if (params.onSaveSuccess) {
        params.onSaveSuccess(editedCode)
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
      
      return true
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save code')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [editedCode])
  
  const updateEditedCode = useCallback((code: string) => {
    setEditedCode(code)
    setSaveError(null)
  }, [])
  
  return {
    isEditing,
    editedCode,
    isSaving,
    saveError,
    saveSuccess,
    startEditing,
    cancelEditing,
    saveCode,
    updateEditedCode
  }
} 