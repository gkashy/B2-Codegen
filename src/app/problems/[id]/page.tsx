'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, ArrowLeft, Code2, TestTube } from 'lucide-react';
import { useProblem } from '@/hooks/useQueries';
import { TestCaseGenerator } from '@/components/problems/test-case-generator';

export default function ProblemDetailPage() {
  const params = useParams();
  const problemId = parseInt(params.id as string);
  
  const { data: problem, isLoading, error } = useProblem(problemId);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading problem...</p>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !problem) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-4">
                <p className="text-destructive">Problem not found</p>
                <Button asChild>
                  <Link href="/problems">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Problems
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Parse test cases - use proper legacy parsing instead of JSON.parse
  let testCases = [];
  if (problem.test_cases) {
    try {
      // Use the same parsing logic as smart-handler.ts for legacy format
      testCases = parseTestCasesLegacy(problem.test_cases);
    } catch (e) {
      console.error('Error parsing test cases:', e);
      testCases = [];
    }
  }

  // Helper function to parse legacy test case format
  function parseTestCasesLegacy(testCasesString: string): any[] {
    try {
      const testCases: any[] = [];
      // Split by '), (' to get individual test cases
      const cases = testCasesString.split('), (');
      for (let i = 0; i < cases.length; i++) {
        let caseStr = cases[i];
        // Clean up the string
        caseStr = caseStr.replace(/^\(/, '').replace(/\)$/, '');
        
        // Try to split into input and output (last comma-separated value is usually output)
        const parts = smartSplit(caseStr);
        if (parts.length >= 2) {
          const inputs = parts.slice(0, -1);
          const expectedOutput = parts[parts.length - 1];
          testCases.push({
            input: inputs.length === 1 ? JSON.stringify(inputs[0]) : JSON.stringify(inputs),
            expected: JSON.stringify(expectedOutput),
            display: caseStr
          });
        } else {
          // Fallback for malformed cases
          testCases.push({ 
            input: caseStr, 
            expected: 'N/A',
            display: caseStr 
          });
        }
      }
      return testCases.slice(0, 3); // Show max 3 examples
    } catch (error) {
      console.error('Error parsing legacy test cases:', error);
      return [];
    }
  }

  // Smart split function (simplified version of smart-handler logic)
  function smartSplit(str: string): any[] {
    const parts: any[] = [];
    let current = '';
    let depth = 0;
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        current += char;
      } else if (!inQuotes && char === '[') {
        depth++;
        current += char;
      } else if (!inQuotes && char === ']') {
        depth--;
        current += char;
      } else if (!inQuotes && char === ',' && depth === 0) {
        parts.push(parseValue(current.trim()));
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      parts.push(parseValue(current.trim()));
    }
    return parts;
  }

  // Parse individual values
  function parseValue(str: string): any {
    str = str.trim();
    // Handle arrays
    if (str.startsWith('[') && str.endsWith(']')) {
      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    }
    // Handle strings
    if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
      return str.slice(1, -1);
    }
    // Handle numbers
    if (!isNaN(Number(str))) {
      return Number(str);
    }
    return str;
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" asChild>
                <Link href="/problems">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Problems
                </Link>
              </Button>
              
              <Button asChild>
                <Link href={`/problems/${problemId}/solve`}>
                  <Play className="h-4 w-4 mr-2" />
                  Solve with AI
                </Link>
              </Button>
            </div>

            {/* Problem Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl">{problem.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getDifficultyColor(problem.difficulty)}>
                        {problem.difficulty}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Problem #{problem.id}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Problem Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Problem Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: problem.content_html }}
                />
              </CardContent>
            </Card>

            {/* Test Cases */}
            {testCases.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TestTube className="h-5 w-5" />
                    Test Cases
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {testCases.map((testCase, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-muted/50">
                        <div className="font-medium text-sm mb-2">Example {index + 1}:</div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Input:</span>
                            <pre className="bg-background p-2 rounded mt-1 overflow-x-auto">
                              <code>{testCase.input || 'N/A'}</code>
                            </pre>
                          </div>
                          <div>
                            <span className="font-medium">Expected Output:</span>
                            <pre className="bg-background p-2 rounded mt-1 overflow-x-auto">
                              <code>{testCase.expected || testCase.expected_output || 'N/A'}</code>
                            </pre>
                          </div>
                          {testCase.explanation && (
                            <div>
                              <span className="font-medium">Explanation:</span>
                              <p className="mt-1 text-muted-foreground">{testCase.explanation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Test Case Generator */}
            <TestCaseGenerator 
              problemId={problemId}
              onGenerated={(count) => {
                console.log(`Generated ${count} new test cases`);
                // Could add a toast notification here
              }}
            />

            {/* Starter Code */}
            {problem.code && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Code2 className="h-5 w-5" />
                    Starter Code
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <code>{problem.code}</code>
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center pt-6">
              <Button size="lg" asChild>
                <Link href={`/problems/${problemId}/solve`}>
                  <Play className="h-5 w-5 mr-2" />
                  Start Solving with AI
                </Link>
              </Button>
            </div>

          </div>
        </div>
      </div>
    </MainLayout>
  );
}