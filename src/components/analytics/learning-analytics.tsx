'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Brain, Clock, Target, BarChart3, TestTube, Code2, Loader2 } from 'lucide-react';
import { useDashboardMetrics, usePerformanceAnalytics } from '@/hooks/useDashboardMetrics';

export default function LearningAnalytics() {
  const { metrics, loading: metricsLoading, error } = useDashboardMetrics();
  const { data: performanceData, isLoading: perfLoading } = usePerformanceAnalytics();

  const loading = metricsLoading || perfLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-center h-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">Unable to load analytics</p>
          <p className="text-sm">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((metrics?.averageSuccessRate || 0) * 100)}%</div>
            <p className="text-xs text-muted-foreground">{metrics?.totalAttempts || 0} total attempts</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Problems Solved</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.solvedProblems || 0}</div>
            <p className="text-xs text-muted-foreground">out of {metrics?.totalProblems || 0} total</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Cases</CardTitle>
            <TestTube className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalTestCases || 0}</div>
            <p className="text-xs text-muted-foreground">{metrics?.aiGeneratedTestCases || 0} AI generated</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Difficulty</CardTitle>
            <Brain className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics?.averageDifficultyScore || 0).toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">dynamic scoring</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Difficulty */}
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance by Difficulty
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {(performanceData && performanceData.length > 0) ? (
              performanceData.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium capitalize">{item.category || 'Unknown'}</h3>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          item.category === 'easy' ? 'border-green-500/20 text-green-500' :
                          item.category === 'medium' ? 'border-yellow-500/20 text-yellow-500' :
                          item.category === 'hard' ? 'border-red-500/20 text-red-500' :
                          'border-gray-500/20 text-gray-500'
                        }`}
                      >
                        {item.solved}/{item.total} solved
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Success: {item.successRate}%</span>
                      <span>Score: {item.avgTime}</span>
                    </div>
                  </div>
                  <Progress value={item.successRate} className="h-[8px]" />
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No performance data available yet.</p>
                <p className="text-sm">Start solving problems to see analytics!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 