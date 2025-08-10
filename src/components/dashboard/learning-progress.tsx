'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, BookOpen, Zap, Target, Loader2, Brain, Code } from 'lucide-react';
import { useLearningProgress } from '@/hooks/useDashboardMetrics';

export default function LearningProgress() {
  const { data: learningData, isLoading, error } = useLearningProgress();

  if (isLoading) {
    return (
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            <p>Failed to load learning progress</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const skillProgress = learningData?.skillProgress || [];
  const recentLearning = learningData?.recentLearning || [];
  const overallPerformance = learningData?.overallPerformance || 0;
  const improvement = learningData?.improvement || 0;

  const getRecentLearningIcon = (index: number) => {
    const icons = [BookOpen, Target, Zap, Brain, Code];
    return icons[index % icons.length];
  };

  const getRecentLearningColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 60) return 'text-blue-500';
    if (confidence >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Learning Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Skill Progress */}
        <div>
          <h3 className="text-sm font-medium mb-3">Problem Categories</h3>
          <div className="space-y-3">
            {skillProgress.map((skill, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{skill.skill}</span>
                  <span className="text-muted-foreground">{skill.progress}%</span>
                </div>
                <Progress value={skill.progress} className="h-[8px]" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Learning */}
        <div>
          <h3 className="text-sm font-medium mb-3">Recent Learning</h3>
          <div className="space-y-3">
            {recentLearning.length > 0 ? (
              recentLearning.map((item, index) => {
                const Icon = getRecentLearningIcon(index);
                const color = getRecentLearningColor(item.confidence);
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full bg-muted/20`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.topic}</p>
                        <p className="text-xs text-muted-foreground">{item.sessions} sessions</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {item.confidence}% confident
                    </Badge>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent learning sessions found
              </p>
            )}
          </div>
        </div>

        {/* Overall Score */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Overall AI Performance</p>
              <p className="text-2xl font-bold mt-1">{overallPerformance}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Average Success Rate</p>
              <p className={`text-sm font-medium ${improvement >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {improvement >= 0 ? '+' : ''}{improvement}% trend
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 