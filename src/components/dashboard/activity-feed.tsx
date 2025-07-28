import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Brain, Code, Target } from 'lucide-react';

export default function ActivityFeed() {
  const activities = [
    {
      id: 1,
      type: 'success',
      title: 'Two Sum',
      description: 'AI successfully solved in 2.3 seconds',
      time: '2 minutes ago',
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      id: 2,
      type: 'improvement',
      title: 'Binary Search',
      description: 'AI learned new optimization technique',
      time: '15 minutes ago',
      icon: Brain,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      id: 3,
      type: 'failed',
      title: 'Median of Two Sorted Arrays',
      description: 'AI struggled with time complexity, learning from failure',
      time: '1 hour ago',
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    },
    {
      id: 4,
      type: 'success',
      title: 'Longest Substring Without Repeating Characters',
      description: 'AI used sliding window technique effectively',
      time: '2 hours ago',
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      id: 5,
      type: 'progress',
      title: 'Dynamic Programming Session',
      description: 'AI reinforcement learning session completed',
      time: '3 hours ago',
      icon: Target,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      id: 6,
      type: 'code',
      title: 'Add Two Numbers',
      description: 'AI generated optimized solution with O(n) complexity',
      time: '5 hours ago',
      icon: Code,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10'
    }
  ];

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className={`p-1.5 rounded-full ${activity.bgColor}`}>
                <activity.icon className={`h-4 w-4 ${activity.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  <Badge variant="outline" className="text-xs">
                    {activity.time}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {activity.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 