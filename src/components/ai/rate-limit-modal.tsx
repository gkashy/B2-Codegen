"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react'

interface RateLimitModalProps {
  isOpen: boolean
  onClose: () => void
  message?: string
  remainingTime?: number
  testsCompleted?: number
  testsNotExecuted?: number
}

export function RateLimitModal({
  isOpen,
  onClose,
  message,
  remainingTime,
  testsCompleted = 0,
  testsNotExecuted = 0
}: RateLimitModalProps) {
  const formatTimeRemaining = (seconds?: number) => {
    if (!seconds) return "later today or tomorrow"
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`
    } else {
      return `${seconds} second${seconds > 1 ? 's' : ''}`
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 shadow-2xl">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-yellow-100 rounded-full border-2 border-yellow-300">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          
          <DialogTitle className="text-xl font-bold text-gray-900 mb-2">
            🚫 Judge0 API Limit Reached
          </DialogTitle>
          
          <DialogDescription className="text-gray-700 text-base leading-relaxed">
            <div className="space-y-3">
              <p className="font-medium text-gray-800">
                Judge0 allows <strong>200 test cases per day</strong>. 
                Your daily quota has been exhausted.
              </p>
              
              {testsCompleted > 0 && (
                <div className="bg-white p-3 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Progress before limit:</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    • ✅ Completed {testsCompleted} test case{testsCompleted > 1 ? 's' : ''}
                    {testsNotExecuted > 0 && (
                      <> • ⏸️ {testsNotExecuted} test case{testsNotExecuted > 1 ? 's' : ''} not executed</>
                    )}
                  </div>
                </div>
              )}
              
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-sm">
                  <RefreshCw className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">Try again:</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {remainingTime ? 
                    `In ${formatTimeRemaining(remainingTime)}` : 
                    "Tomorrow (quota resets at midnight UTC)"
                  }
                </p>
              </div>
              
              {message && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border">
                  <strong>Technical details:</strong> {message}
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center pt-4">
          <Button 
            onClick={onClose}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-8"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}