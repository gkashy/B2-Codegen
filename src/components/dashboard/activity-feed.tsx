'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Brain, Code, Target, Loader2 } from 'lucide-react';
import { useRecentActivity } from '@/hooks/useDashboardMetrics';

export default function ActivityFeed() {
  const { data: activities, isLoading, error } = useRecentActivity();

  if (isLoading) {
    return (
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
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
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            <p>Failed to load recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }



  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'failed': return XCircle;
      case 'test_generated': return Code;
      case 'analysis': return Brain;
      default: return Target;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'success': return { color: 'text-green-500', bgColor: 'bg-green-500/10' };
      case 'failed': return { color: 'text-red-500', bgColor: 'bg-red-500/10' };
      case 'test_generated': return { color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' };
      case 'analysis': return { color: 'text-blue-500', bgColor: 'bg-blue-500/10' };
      default: return { color: 'text-purple-500', bgColor: 'bg-purple-500/10' };
    }
  };

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
          {activities && activities.length > 0 ? (
            activities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const colors = getActivityColor(activity.type);
              
              return (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`p-1.5 rounded-full ${colors.bgColor}`}>
                    <Icon className={`h-4 w-4 ${colors.color}`} />
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
                    {activity.language && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {activity.language}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent activity found.</p>
              <p className="text-sm">Start solving problems to see your activity!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 