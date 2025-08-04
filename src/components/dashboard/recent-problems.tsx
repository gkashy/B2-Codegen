'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { useRecentProblems } from '@/hooks/useDashboardMetrics';

export default function RecentProblems() {
  const { data: problems, isLoading, error } = useRecentProblems();

  if (isLoading) {
    return (
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Problems
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
            Recent Problems
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            <p>Failed to load recent problems</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-500/10 text-green-500';
      case 'Medium': return 'bg-yellow-500/10 text-yellow-500';
      case 'Hard': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'solved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Recent Problems
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {problems && problems.length > 0 ? (
            problems.map((problem) => (
              <div key={`${problem.id}-${problem.date}`} className="p-4 rounded-lg border border-border bg-card/30 hover:bg-card/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(problem.status)}
                      <h3 className="font-medium text-sm">{problem.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>#{problem.id}</span>
                      <span>•</span>
                      <span>{problem.date}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={getDifficultyColor(problem.difficulty)}>
                    {problem.difficulty}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      Success Rate: <span className="font-medium">{Math.round(problem.successRate)}%</span>
                    </span>
                    <span className="text-muted-foreground">
                      Attempts: <span className="font-medium">{problem.attempts}</span>
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {problem.language}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent problems found.</p>
              <p className="text-sm">Start solving problems to see your activity!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 