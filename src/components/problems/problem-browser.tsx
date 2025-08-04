'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, SortAsc, Play, CheckCircle, XCircle, Clock, Target, TrendingUp, TestTube } from 'lucide-react';
import Link from 'next/link';
import { useProblemsWithMetrics, getDifficultyInfo, getProblemStatus, getPerformanceDisplay } from '@/hooks/useProblemsWithMetrics';
import { Problem } from '@/types/backend';

export default function ProblemBrowser() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState('id');

  // Fetch problems with metrics from database
  const { data: problems = [], isLoading, error } = useProblemsWithMetrics({
    search: searchTerm,
    difficulty: selectedDifficulty === 'All' ? undefined : [selectedDifficulty]
  });

  // Debug logging
  console.log('Problems with metrics result:', { problems, isLoading, error });

  // Only use fallback data when there's an error AND no search/filter is applied
  const shouldUseFallback = error && !searchTerm && selectedDifficulty === 'All';
  const displayProblems = shouldUseFallback && problems.length === 0 ? [
    {
      id: 1,
      question_id: 1,
      title: 'Two Sum',
      difficulty: 'Easy' as const,
      content_html: '<p>Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.</p>',
      code: 'def two_sum(nums, target):',
      test_cases: '[{"input": "[2,7,11,15], 9", "expected": "[0,1]"}]',
      parameter_map: '{}',
      title_slug: 'two-sum',
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      question_id: 2,
      title: 'Add Two Numbers',
      difficulty: 'Medium' as const,
      content_html: '<p>You are given two non-empty linked lists representing two non-negative integers.</p>',
      code: 'def add_two_numbers(l1, l2):',
      test_cases: '[{"input": "[2,4,3], [5,6,4]", "expected": "[7,0,8]"}]',
      parameter_map: '{}',
      title_slug: 'add-two-numbers',
      created_at: new Date().toISOString(),
    },
    {
      id: 3,
      question_id: 3,
      title: 'Longest Substring Without Repeating Characters',
      difficulty: 'Medium' as const,
      content_html: '<p>Given a string s, find the length of the longest substring without repeating characters.</p>',
      code: 'def length_of_longest_substring(s):',
      test_cases: '[{"input": "abcabcbb", "expected": "3"}]',
      parameter_map: '{}',
      title_slug: 'longest-substring-without-repeating-characters',
      created_at: new Date().toISOString(),
    },
    {
      id: 4,
      question_id: 4,
      title: 'Median of Two Sorted Arrays',
      difficulty: 'Hard' as const,
      content_html: '<p>Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.</p>',
      code: 'def find_median_sorted_arrays(nums1, nums2):',
      test_cases: '[{"input": "[1,3], [2]", "expected": "2.0"}]',
      parameter_map: '{}',
      title_slug: 'median-of-two-sorted-arrays',
      created_at: new Date().toISOString(),
    },
    {
      id: 5,
      question_id: 5,
      title: 'Longest Palindromic Substring',
      difficulty: 'Medium' as const,
      content_html: '<p>Given a string s, return the longest palindromic substring in s.</p>',
      code: 'def longest_palindrome(s):',
      test_cases: '[{"input": "babad", "expected": "bab"}]',
      parameter_map: '{}',
      title_slug: 'longest-palindromic-substring',
      created_at: new Date().toISOString(),
    },
  ] : problems;

  const filteredProblems = useMemo(() => {
    let filtered = [...displayProblems];

    // Only apply client-side search if not already filtered by database
    if (searchTerm && shouldUseFallback) {
      filtered = filtered.filter(problem => 
        problem.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Only apply client-side difficulty filter if using fallback data
    if (selectedDifficulty !== 'All' && shouldUseFallback) {
      filtered = filtered.filter(problem => 
        problem.difficulty.toLowerCase() === selectedDifficulty.toLowerCase()
      );
    }

    // Sort problems
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'difficulty':
          const difficultyOrder = { 'easy': 1, 'Easy': 1, 'medium': 2, 'Medium': 2, 'hard': 3, 'Hard': 3 };
          return (difficultyOrder[a.difficulty] || 2) - (difficultyOrder[b.difficulty] || 2);
        case 'id':
        default:
          return a.id - b.id;
      }
    });

    return filtered;
  }, [displayProblems, searchTerm, selectedDifficulty, sortBy, shouldUseFallback]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading problems...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive">Error loading problems: {error.message}</p>
          <Button onClick={() => window.location.reload()} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Removed old functions - now using dynamic difficulty and status system from hooks

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search problems..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        
        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="All">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="id">Sort by ID</option>
          <option value="title">Sort by Title</option>
          <option value="difficulty">Sort by Difficulty</option>
        </select>
      </div>

      {/* Problem count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredProblems.length} problem{filteredProblems.length !== 1 ? 's' : ''}
        {shouldUseFallback && ' (using fallback data)'}
      </div>

      {/* Empty state */}
      {filteredProblems.length === 0 && !shouldUseFallback && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">No problems found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {searchTerm ? `No problems match "${searchTerm}"` : 
               selectedDifficulty !== 'All' ? `No ${selectedDifficulty.toLowerCase()} problems available` :
               'Try adjusting your search or filters'}
            </p>
          </div>
        </div>
      )}

      {/* Problems grid */}
      {Array.isArray(filteredProblems) && filteredProblems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProblems.map((problem) => {
          const difficultyInfo = getDifficultyInfo(problem);
          const status = getProblemStatus(problem);
          const performance = getPerformanceDisplay(problem);

          return (
            <Card key={problem.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{problem.title}</CardTitle>
                    {status === 'solved' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {status === 'attempted' && <Clock className="h-4 w-4 text-yellow-500" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={difficultyInfo.color}>
                      {difficultyInfo.difficulty}
                      {difficultyInfo.isDynamic && (
                        <span className="ml-1 text-xs">({difficultyInfo.score?.toFixed(1)})</span>
                      )}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div 
                    className="text-sm text-muted-foreground line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: problem.content_html }}
                  />
                  
                  {/* Dynamic Metrics Display */}
                  {performance.hasData && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <div className="font-medium text-green-600">{performance.successRate}%</div>
                        <div className="text-muted-foreground">Success Rate</div>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <div className="font-medium text-blue-600">{performance.attempts}</div>
                        <div className="text-muted-foreground">Attempts</div>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <div className="font-medium text-purple-600">{performance.testCases}</div>
                        <div className="text-muted-foreground">Test Cases</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">#{problem.id}</span>
                    {(performance.generatedTests || 0) > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <TestTube className="h-3 w-3 mr-1" />
                        +{performance.generatedTests} AI tests
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1">
                      <Link href={`/problems/${problem.id}`}>
                        View Problem
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link href={`/problems/${problem.id}/solve`}>
                        <Play className="h-4 w-4 mr-1" />
                        Solve with AI
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
          })}
        </div>
      )}
    </div>
  );
} 