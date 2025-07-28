'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, SortAsc, Play, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useProblems } from '@/hooks/useQueries';
import { Problem } from '@/types/backend';

export default function ProblemBrowser() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState('id');

  // Fetch problems from database
  const { data: problems = [], isLoading, error } = useProblems({
    search: searchTerm,
    difficulty: selectedDifficulty === 'All' ? undefined : [selectedDifficulty as any]
  });

  // Debug logging
  console.log('Problems query result:', { problems, isLoading, error });

  // Use problems from database, or fallback if empty
  const displayProblems = problems.length > 0 ? problems : [
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
  ];

  const filteredProblems = useMemo(() => {
    let filtered = displayProblems.filter(problem => {
      const matchesSearch = problem.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDifficulty = selectedDifficulty === 'All' || problem.difficulty === selectedDifficulty;
      
      return matchesSearch && matchesDifficulty;
    });

    // Sort problems
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'difficulty':
          const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        case 'id':
        default:
          return a.id - b.id;
      }
    });

    return filtered;
  }, [displayProblems, searchTerm, selectedDifficulty, sortBy]);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'solved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'attempted':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

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
        {problems.length === 0 && ' (using fallback data)'}
      </div>

      {/* Problems grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProblems.map((problem) => (
          <Card key={problem.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{problem.title}</CardTitle>
                <Badge className={getDifficultyColor(problem.difficulty)}>
                  {problem.difficulty}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div 
                  className="text-sm text-muted-foreground line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: problem.content_html }}
                />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">#{problem.id}</span>
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
        ))}
      </div>

      {filteredProblems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No problems found matching your criteria.</p>
        </div>
      )}
    </div>
  );
} 