import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, Clock, TrendingUp, Zap, Trophy } from 'lucide-react';

export default function DashboardStats() {
  const stats = [
    {
      title: 'Problems Solved',
      value: '24',
      change: '+3 today',
      icon: Target,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'AI Sessions',
      value: '47',
      change: '+8 this week',
      icon: Brain,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Time Saved',
      value: '12.5h',
      change: '+2.3h today',
      icon: Clock,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'Success Rate',
      value: '87%',
      change: '+5% this week',
      icon: TrendingUp,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      title: 'Learning Streak',
      value: '15 days',
      change: 'Keep it up!',
      icon: Zap,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
    {
      title: 'Achievements',
      value: '12',
      change: '+2 unlocked',
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