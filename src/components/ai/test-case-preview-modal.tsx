'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, X, TestTube, Eye, EyeOff } from 'lucide-react';

interface TestCase {
  input_data: any;
  expected_output: any;
  difficulty_level?: string;
  explanation?: string;
  generation_reasoning?: string;
}

interface TestCasePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCases: TestCase[];
  onSave: (selectedTestCases: TestCase[]) => Promise<void>;
  onTestWithSelected: (selectedTestCases: TestCase[]) => Promise<void>;
  isSaving: boolean;
  problemTitle?: string;
}

export function TestCasePreviewModal({
  isOpen,
  onClose,
  testCases,
  onSave,
  onTestWithSelected,
  isSaving,
  problemTitle
}: TestCasePreviewModalProps) {
  const [selectedTestCases, setSelectedTestCases] = useState<Set<number>>(
    new Set(testCases.map((_, index) => index)) // Select all by default
  );
  const [showDetails, setShowDetails] = useState<Set<number>>(new Set());

  const toggleTestCase = (index: number) => {
    const newSelected = new Set(selectedTestCases);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTestCases(newSelected);
  };

  const toggleDetails = (index: number) => {
    const newShowDetails = new Set(showDetails);
    if (newShowDetails.has(index)) {
      newShowDetails.delete(index);
    } else {
      newShowDetails.add(index);
    }
    setShowDetails(newShowDetails);
  };

  const handleSave = async () => {
    const selected = testCases.filter((_, index) => selectedTestCases.has(index));
    await onSave(selected);
  };

  const handleTestWithSelected = async () => {
    const selected = testCases.filter((_, index) => selectedTestCases.has(index));
    await onTestWithSelected(selected);
  };

  // Smart formatting for different data types
  const formatValue = (value: any, isInput: boolean = false): React.ReactNode => {
    if (typeof value === 'string') return value;
    
    // Debug logging (only in development and when needed)
    // console.log('🔍 formatValue:', { value, isInput, type: typeof value });
    
    // Smart detection for different data structures
    const detectDataType = (val: any) => {
      if (!Array.isArray(val)) return null;
      
      // Sudoku grid (9x9)
      if (val.length === 9 && Array.isArray(val[0]) && val[0].length === 9) {
        return { type: 'sudoku', data: val };
      }
      if (val.length === 1 && Array.isArray(val[0]) && val[0].length === 9 && Array.isArray(val[0][0]) && val[0][0].length === 9) {
        return { type: 'sudoku', data: val[0] };
      }
      
      // Matrix/2D array
      if (val.length > 1 && val.length <= 10 && Array.isArray(val[0]) && val[0].length <= 10) {
        return { type: 'matrix', data: val };
      }
      
      // Simple array (numbers/strings)
      if (val.length <= 20 && val.every(item => typeof item === 'number' || typeof item === 'string')) {
        return { type: 'simple', data: val };
      }
      
      // Range/bounds (like [-1000, 1000])
      if (val.length === 2 && typeof val[0] === 'number' && typeof val[1] === 'number') {
        return { type: 'range', data: val };
      }
      
      return null;
    };

    const dataType = detectDataType(value);
    
    // Render based on detected type
    if (dataType) {
      switch (dataType.type) {
        case 'sudoku':
          return (
            <div className="w-fit mx-auto">
              <div className="grid grid-cols-9 gap-0 bg-gray-800 p-3 rounded-lg border-2 border-gray-300">
                {dataType.data.map((row: any[], rowIndex: number) => 
                  row.map((cell: string, colIndex: number) => {
                    const isThickRight = (colIndex + 1) % 3 === 0 && colIndex < 8;
                    const isThickBottom = (rowIndex + 1) % 3 === 0 && rowIndex < 8;
                    
                    return (
                      <div 
                        key={`${rowIndex}-${colIndex}`}
                        className={`w-10 h-10 flex items-center justify-center text-base font-bold bg-white border border-gray-400
                          ${isThickRight ? 'border-r-4 border-r-gray-800' : ''}
                          ${isThickBottom ? 'border-b-4 border-b-gray-800' : ''}
                          ${cell === '.' ? 'text-gray-300' : 'text-gray-900'}
                          hover:bg-blue-50 transition-colors
                        `}
                      >
                        {cell === '.' ? '·' : cell}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="text-center mt-2 text-xs text-gray-500">9×9 Sudoku Grid</div>
            </div>
          );
          
        case 'matrix':
          return (
            <div className="w-fit mx-auto">
              <div className="bg-gray-100 p-4 rounded-lg border">
                <div className="grid gap-1" style={{gridTemplateColumns: `repeat(${dataType.data[0].length}, minmax(0, 1fr))`}}>
                  {dataType.data.map((row: any[], rowIndex: number) => 
                    row.map((cell: any, colIndex: number) => (
                      <div 
                        key={`${rowIndex}-${colIndex}`}
                        className="w-12 h-8 flex items-center justify-center text-sm font-mono bg-white border border-gray-300 rounded"
                      >
                        {cell}
                      </div>
                    ))
                  )}
                </div>
                <div className="text-center mt-2 text-xs text-gray-500">
                  {dataType.data.length}×{dataType.data[0].length} Matrix
                </div>
              </div>
            </div>
          );
          
        case 'range':
          return (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
              <span className="text-sm font-mono text-orange-900">[</span>
              <span className="px-2 py-1 bg-orange-100 rounded text-sm font-bold text-orange-900">{dataType.data[0]}</span>
              <span className="text-orange-600">to</span>
              <span className="px-2 py-1 bg-orange-100 rounded text-sm font-bold text-orange-900">{dataType.data[1]}</span>
              <span className="text-sm font-mono text-orange-900">]</span>
            </div>
          );
          
        case 'simple':
          return (
            <div className="inline-flex items-center gap-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-mono text-blue-900">[</span>
              {dataType.data.map((item: any, index: number) => (
                <React.Fragment key={index}>
                  <span className="px-2 py-1 bg-blue-100 rounded text-sm font-mono text-blue-900">
                    {typeof item === 'string' ? `"${item}"` : item}
                  </span>
                  {index < dataType.data.length - 1 && <span className="text-blue-600">,</span>}
                </React.Fragment>
              ))}
              <span className="text-sm font-mono text-blue-900">]</span>
            </div>
          );
      }
    }
    
    // Handle nested arrays (like [[something]])
    if (Array.isArray(value) && value.length === 1 && Array.isArray(value[0])) {
      // Try to format the inner array
      return (
        <div className="border-l-4 border-purple-300 pl-4">
          <div className="text-xs text-purple-600 mb-1">Nested Array</div>
          {formatValue(value[0], isInput)}
        </div>
      );
    }

    // Large arrays - show summary
    if (Array.isArray(value) && value.length > 20) {
      return (
        <div className="border border-muted rounded-lg p-3 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Large Array ({value.length} items)
            </span>
            <Badge variant="outline" className="text-xs">Array</Badge>
          </div>
          <div className="text-xs">
            <span className="font-mono">First 5: </span>
            <span className="text-blue-600">[{value.slice(0, 5).join(', ')}, ...]</span>
          </div>
        </div>
      );
    }
    
    // Objects or complex structures - make them more readable
    const jsonStr = JSON.stringify(value, null, 2);
    
    // For very long JSON, use collapsible view
    if (jsonStr.length > 300) {
      return (
        <div className="border border-muted rounded-lg p-3 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Complex Data ({jsonStr.length} chars)
            </span>
            <Badge variant="outline" className="text-xs">
              {Array.isArray(value) ? `Array[${value.length}]` : 'Object'}
            </Badge>
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
              Click to expand full data
            </summary>
            <div className="mt-2 p-3 bg-white rounded border max-h-40 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed">
                {jsonStr}
              </pre>
            </div>
          </details>
        </div>
      );
    }
    
    // For shorter JSON, display directly but styled nicely
    return (
      <div className="border border-muted rounded-lg p-3 bg-white">
        <pre className="text-sm whitespace-pre-wrap leading-relaxed text-gray-800 font-mono">
          {jsonStr}
        </pre>
      </div>
    );
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[96vh] overflow-hidden flex flex-col bg-gradient-to-br from-gray-50 to-white">
        <DialogHeader className="pb-6 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TestTube className="h-6 w-6 text-blue-600" />
            </div>
            Preview Generated Test Cases
            {problemTitle && <span className="text-lg text-gray-600">- {problemTitle}</span>}
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 mt-2">
            Review and select which test cases to save. You can test with selected cases before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Selection Summary */}
          <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl mb-6 border border-blue-200/50 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedTestCases.size} of {testCases.length} test cases selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTestCases(new Set(testCases.map((_, i) => i)))}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTestCases(new Set())}
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Test Cases List */}
          <div className="flex-1 overflow-y-auto space-y-6 px-1">
            {testCases.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <TestTube className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No test cases to preview</p>
                </div>
              </div>
            ) : (
              testCases.map((testCase, index) => (
              <Card 
                key={index} 
                className={`transition-all duration-200 border-2 shadow-sm ${
                  selectedTestCases.has(index) 
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/30 shadow-lg ring-1 ring-blue-200' 
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md hover:bg-gray-50/50'
                }`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedTestCases.has(index)}
                        onChange={() => toggleTestCase(index)}
                        className="h-5 w-5 text-blue-600 rounded border-2"
                      />
                      <CardTitle className="text-lg font-semibold">Test Case {index + 1}</CardTitle>
                      {testCase.difficulty_level && (
                        <Badge className={`${getDifficultyColor(testCase.difficulty_level)} px-3 py-1`}>
                          {testCase.difficulty_level}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDetails(index)}
                      className="h-9 w-9 p-0 hover:bg-blue-100"
                    >
                      {showDetails.has(index) ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h4 className="text-base font-semibold text-gray-900">Input</h4>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-xl border border-blue-200/50 shadow-sm">
                        {formatValue(testCase.input_data, true)}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <h4 className="text-base font-semibold text-gray-900">Expected Output</h4>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-6 rounded-xl border border-green-200/50 shadow-sm">
                        {formatValue(testCase.expected_output, false)}
                      </div>
                    </div>
                  </div>

                  {showDetails.has(index) && (
                    <div className="mt-6 pt-4 border-t border-muted">
                      {testCase.explanation && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                            Why this test case matters:
                          </h4>
                          <p className="text-sm text-blue-800 leading-relaxed">{testCase.explanation}</p>
                        </div>
                      )}
                      {testCase.generation_reasoning && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <h4 className="text-sm font-semibold text-green-900 mb-2 flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            What this test validates:
                          </h4>
                          <p className="text-sm text-green-800 leading-relaxed">{testCase.generation_reasoning}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              ))
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t bg-background/95">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isSaving}
            className="px-6 py-3 h-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Discard All
          </Button>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleTestWithSelected}
              disabled={selectedTestCases.size === 0 || isSaving}
              className="px-6 py-3 h-auto border-2 border-blue-200 hover:border-blue-400"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test Selected ({selectedTestCases.size})
            </Button>

            <Button
              onClick={handleSave}
              disabled={selectedTestCases.size === 0 || isSaving}
              className="px-8 py-3 h-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Selected ({selectedTestCases.size})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}