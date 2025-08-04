'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Sparkles, 
  Target, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  TrendingUp,
  TestTube,
  Brain
} from 'lucide-react';
import { useTestCaseGeneration, useProblemMetrics } from '@/hooks/useTestCaseGeneration';
import { TestCasePreviewModal } from '@/components/ai/test-case-preview-modal';

interface TestCaseGeneratorProps {
  problemId: number;
  onGenerated?: (count: number) => void;
}

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  { value: 'hard', label: 'Hard', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  { value: 'expert', label: 'Expert', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' }
];

const FOCUS_AREAS = [
  { value: 'edge_cases', label: 'Edge Cases', icon: Target },
  { value: 'performance', label: 'Performance', icon: Zap },
  { value: 'boundary_conditions', label: 'Boundaries', icon: AlertCircle },
  { value: 'corner_cases', label: 'Corner Cases', icon: TestTube }
];

export function TestCaseGenerator({ problemId, onGenerated }: TestCaseGeneratorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>(['edge_cases']);
  const [testCaseCount, setTestCaseCount] = useState(5);

  // NEW: Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTestCases, setPreviewTestCases] = useState<any[]>([]);

  const { 
    generateTestCases, 
    isGenerating, 
    generationError, 
    lastGenerated,
    saveTestCases,
    isSaving,
    savingError,
    resetGeneration
  } = useTestCaseGeneration();
  const { metrics, loading: metricsLoading, fetchMetrics } = useProblemMetrics(problemId);

  React.useEffect(() => {
    fetchMetrics();
  }, [problemId]);

  // NEW: Generate for preview (don't save yet)
  const handleGenerate = async () => {
    try {
      const result = await generateTestCases({
        problem_id: problemId,
        count: testCaseCount,
        difficulty_level: selectedDifficulty,
        focus_areas: selectedFocusAreas
      });
      
      // Show preview modal with generated test cases
      setPreviewTestCases(result.test_cases || []);
      setShowPreviewModal(true);
      setIsExpanded(false); // Close the settings panel
      
      console.log('✅ Test cases generated for preview:', result.generated_count);
    } catch (err) {
      console.error('❌ Generation failed:', err);
    }
  };

  // NEW: Handle saving selected test cases from preview
  const handleSaveTestCases = async (selectedTestCases: any[]) => {
    try {
      const result = await saveTestCases({
        problem_id: problemId,
        test_cases: selectedTestCases
      });
      
      setShowPreviewModal(false);
      setPreviewTestCases([]);
      
      // Refresh metrics and notify parent
      fetchMetrics();
      onGenerated?.(selectedTestCases.length);
      
      console.log('✅ Test cases saved successfully:', selectedTestCases.length);
    } catch (err) {
      console.error('❌ Saving failed:', err);
    }
  };

  // NEW: Handle testing with selected test cases (placeholder)
  const handleTestWithSelected = async (selectedTestCases: any[]) => {
    // For now, just log - could integrate with code testing later
    console.log('🧪 Testing with selected test cases:', selectedTestCases.length);
  };

  const toggleFocusArea = (area: string) => {
    setSelectedFocusAreas(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <span>AI Test Case Generator</span>
            {metrics && (
              <Badge variant="outline" className="ml-2">
                {metrics.total_test_cases || 0} total cases
              </Badge>
            )}
          </CardTitle>
          
          {!isExpanded && (
            <Button
              onClick={() => setIsExpanded(true)}
              variant="outline"
              size="sm"
              disabled={isGenerating}
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate More
            </Button>
          )}
        </div>

        {/* Problem Metrics Summary */}
        {metrics && !metricsLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(metrics.average_success_rate || 0)}%
              </div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {metrics.total_attempts || 0}
              </div>
              <div className="text-xs text-muted-foreground">Total Attempts</div>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round((metrics.actual_difficulty_score || 0) * 10) / 10}
              </div>
              <div className="text-xs text-muted-foreground">Difficulty Score</div>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {metrics.generated_test_cases || 0}
              </div>
              <div className="text-xs text-muted-foreground">AI Generated</div>
            </div>
          </div>
        )}
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="space-y-6">
              {/* Test Case Count */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Number of Test Cases
                </label>
                <div className="flex items-center space-x-4">
                  {[3, 5, 8, 10].map(count => (
                    <Button
                      key={count}
                      onClick={() => setTestCaseCount(count)}
                      variant={testCaseCount === count ? "default" : "outline"}
                      size="sm"
                    >
                      {count}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Difficulty Level */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Difficulty Level
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTY_OPTIONS.map(option => (
                    <Button
                      key={option.value}
                      onClick={() => setSelectedDifficulty(option.value as any)}
                      variant={selectedDifficulty === option.value ? 'default' : 'outline'}
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <span>{option.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Focus Areas */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Focus Areas (select multiple)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FOCUS_AREAS.map(area => {
                    const Icon = area.icon;
                    const isSelected = selectedFocusAreas.includes(area.value);
                    
                    return (
                      <Button
                        key={area.value}
                        onClick={() => toggleFocusArea(area.value)}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className="flex items-center justify-start space-x-2"
                      >
                        <Icon className="w-4 h-4" />
                        <span>{area.label}</span>
                        {isSelected && <CheckCircle className="w-3 h-3 ml-auto" />}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Error Display */}
              {(generationError || savingError) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-700 dark:text-red-300">
                      {(generationError || savingError)?.message || 'Failed to generate test cases'}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Success Display */}
              {lastGenerated && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-700 dark:text-green-300">
                      Generated {lastGenerated.generated_count} new test cases for preview!
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4">
                <Button
                  onClick={() => {
                    setIsExpanded(false);
                    reset();
                  }}
                  variant="outline"
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || selectedFocusAreas.length === 0}
                  className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate {testCaseCount} Test Cases
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test Case Preview Modal */}
      <TestCasePreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setPreviewTestCases([]);
        }}
        testCases={previewTestCases}
        onSave={handleSaveTestCases}
        onTestWithSelected={handleTestWithSelected}
        isSaving={isSaving}
        problemTitle={`Problem ${problemId}`}
      />
    </Card>
  );
}