import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, BookOpen, Zap, Target } from 'lucide-react';

export default function LearningProgress() {
  const skillProgress = [
    { skill: 'Array & Strings', progress: 85, color: 'bg-green-500' },
    { skill: 'Dynamic Programming', progress: 72, color: 'bg-blue-500' },
    { skill: 'Tree & Graphs', progress: 68, color: 'bg-purple-500' },
    { skill: 'Backtracking', progress: 45, color: 'bg-yellow-500' },
    { skill: 'Bit Manipulation', progress: 38, color: 'bg-red-500' }
  ];

  const recentLearning = [
    {
      topic: 'Sliding Window',
      confidence: 92,
      sessions: 5,
      icon: BookOpen,
      color: 'text-green-500'
    },
    {
      topic: 'Two Pointers',
      confidence: 88,
      sessions: 8,
      icon: Target,
      color: 'text-blue-500'
    },
    {
      topic: 'Binary Search',
      confidence: 76,
      sessions: 12,
      icon: Zap,
      color: 'text-purple-500'
    }
  ];

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
            {recentLearning.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-full bg-muted/20`}>
                    <item.icon className={`h-4 w-4 ${item.color}`} />
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
            ))}
          </div>
        </div>

        {/* Overall Score */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Overall AI Performance</p>
              <p className="text-2xl font-bold mt-1">87%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="text-sm font-medium text-green-500">+5% improvement</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 