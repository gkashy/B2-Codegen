import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';

export default function RecentProblems() {
  const problems = [
    {
      id: 1,
      title: 'Two Sum',
      difficulty: 'Easy',
      status: 'solved',
      time: '2.3s',
      attempts: 1,
      date: '2 hours ago',
      tags: ['Array', 'Hash Table']
    },
    {
      id: 3,
      title: 'Longest Substring Without Repeating Characters',
      difficulty: 'Medium',
      status: 'solved',
      time: '5.7s',
      attempts: 2,
      date: '4 hours ago',
      tags: ['String', 'Sliding Window']
    },
    {
      id: 4,
      title: 'Median of Two Sorted Arrays',
      difficulty: 'Hard',
      status: 'failed',
      time: '45.2s',
      attempts: 3,
      date: '1 day ago',
      tags: ['Array', 'Binary Search']
    },
    {
      id: 2,
      title: 'Add Two Numbers',
      difficulty: 'Medium',
      status: 'solved',
      time: '8.1s',
      attempts: 1,
      date: '2 days ago',
      tags: ['Linked List', 'Math']
    },
    {
      id: 5,
      title: 'Longest Palindromic Substring',
      difficulty: 'Medium',
      status: 'in_progress',
      time: '12.3s',
      attempts: 2,
      date: '3 days ago',
      tags: ['String', 'Dynamic Programming']
    }
  ];

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
          {problems.map((problem) => (
            <div key={problem.id} className="p-4 rounded-lg border border-border bg-card/30 hover:bg-card/50 transition-colors">
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
                    Time: <span className="font-medium">{problem.time}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Attempts: <span className="font-medium">{problem.attempts}</span>
                  </span>
                </div>
                <div className="flex gap-1">
                  {problem.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 