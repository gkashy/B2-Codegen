'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, Clock, TrendingUp, Zap, Trophy, Loader2 } from 'lucide-react';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';

export default function DashboardStats() {
  const { metrics, loading, error } = useDashboardMetrics();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="border-border bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500">
        <p>Failed to load dashboard metrics: {error}</p>
      </div>
    );
  }

  if (!metrics) return null;

  const stats = [
    {
      title: 'Problems Solved',
      value: metrics.solvedProblems.toString(),
      change: `${metrics.totalProblems} total`,
      icon: Target,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'AI Sessions',
      value: metrics.recentActivity.totalSessions.toString(),
      change: `${Math.round(metrics.recentActivity.weeklyImprovement)}% success rate`,
      icon: Brain,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Test Cases',
      value: metrics.totalTestCases.toString(),
      change: `${metrics.aiGeneratedTestCases} AI generated`,
      icon: Clock,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'Success Rate',
      value: `${Math.round(metrics.averageSuccessRate)}%`,
      change: `${metrics.totalAttempts} attempts`,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      title: 'Avg Difficulty',
      value: metrics.averageDifficultyScore.toFixed(1),
      change: 'out of 10.0',
      icon: Zap,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
    {
      title: 'Problems Available',
      value: metrics.totalProblems.toString(),
      change: 'in database',
      icon: Trophy,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{stat.value}</div>
            <Badge variant="secondary" className="text-xs">
              {stat.change}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 