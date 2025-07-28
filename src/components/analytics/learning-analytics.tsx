import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Brain, Clock, Target, BarChart3, PieChart, Activity } from 'lucide-react';

export default function LearningAnalytics() {
  const performanceData = [
    { category: 'Array Problems', solved: 18, total: 25, successRate: 72, avgTime: '4.2s' },
    { category: 'String Problems', solved: 12, total: 20, successRate: 60, avgTime: '6.1s' },
    { category: 'Dynamic Programming', solved: 8, total: 15, successRate: 53, avgTime: '12.3s' },
    { category: 'Graph Problems', solved: 5, total: 12, successRate: 42, avgTime: '18.7s' },
    { category: 'Tree Problems', solved: 9, total: 18, successRate: 50, avgTime: '8.9s' }
  ];

  const learningPatterns = [
    { pattern: 'Sliding Window', confidence: 92, usage: 24, effectiveness: 'High' },
    { pattern: 'Two Pointers', confidence: 88, usage: 31, effectiveness: 'High' },
    { pattern: 'Binary Search', confidence: 76, usage: 18, effectiveness: 'Medium' },
    { pattern: 'Backtracking', confidence: 45, usage: 8, effectiveness: 'Low' },
    { pattern: 'Greedy', confidence: 67, usage: 15, effectiveness: 'Medium' }
  ];

  const improvementAreas = [
    { area: 'Time Complexity Analysis', current: 65, target: 85, priority: 'High' },
    { area: 'Space Optimization', current: 72, target: 90, priority: 'Medium' },
    { area: 'Edge Case Handling', current: 80, target: 95, priority: 'Medium' },
    { area: 'Algorithm Selection', current: 58, target: 80, priority: 'High' },
    { area: 'Code Optimization', current: 75, target: 90, priority: 'Low' }
  ];

  const weeklyProgress = [
    { week: 'Week 1', solved: 5, failed: 2, avgTime: 15.2 },
    { week: 'Week 2', solved: 8, failed: 3, avgTime: 12.8 },
    { week: 'Week 3', solved: 12, failed: 2, avgTime: 10.1 },
    { week: 'Week 4', solved: 15, failed: 1, avgTime: 8.7 },
    { week: 'Week 5', solved: 18, failed: 1, avgTime: 7.2 }
  ];

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
            <div className="text-2xl font-bold">73%</div>
            <p className="text-xs text-muted-foreground">+8% from last week</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Solve Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.7s</div>
            <p className="text-xs text-muted-foreground">-2.3s improvement</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Patterns</CardTitle>
            <Brain className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Active patterns</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Problems Solved</CardTitle>
            <Target className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">52</div>
            <p className="text-xs text-muted-foreground">+6 this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Category */}
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {performanceData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{item.category}</h3>
                    <Badge variant="outline" className="text-xs">
                      {item.solved}/{item.total} solved
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Success: {item.successRate}%</span>
                    <span>Avg Time: {item.avgTime}</span>
                  </div>
                </div>
                <Progress value={item.successRate} className="h-[8px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Learning Patterns & Improvement Areas */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Learning Patterns */}
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Learning Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {learningPatterns.map((pattern, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{pattern.pattern}</span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          pattern.effectiveness === 'High' ? 'bg-green-500/10 text-green-500' :
                          pattern.effectiveness === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-red-500/10 text-red-500'
                        }`}
                      >
                        {pattern.effectiveness}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Confidence: {pattern.confidence}%</span>
                      <span>Used: {pattern.usage} times</span>
                    </div>
                  </div>
                  <div className="w-16">
                    <Progress value={pattern.confidence} className="h-[8px]" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Improvement Areas */}
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Improvement Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {improvementAreas.map((area, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{area.area}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          area.priority === 'High' ? 'border-red-500/20 text-red-500' :
                          area.priority === 'Medium' ? 'border-yellow-500/20 text-yellow-500' :
                          'border-green-500/20 text-green-500'
                        }`}
                      >
                        {area.priority}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {area.current}% → {area.target}%
                    </span>
                  </div>
                  <div className="relative">
                    <Progress value={area.current} className="h-[8px]" />
                    <div 
                      className="absolute top-0 h-[8px] w-1 bg-primary rounded-full"
                      style={{ left: `${area.target}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Progress */}
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Weekly Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {weeklyProgress.map((week, index) => (
              <div key={index} className="p-4 rounded-lg border border-border bg-card/30">
                <h3 className="font-medium text-sm mb-2">{week.week}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-green-500">Solved</span>
                    <span className="font-medium">{week.solved}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-red-500">Failed</span>
                    <span className="font-medium">{week.failed}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-500">Avg Time</span>
                    <span className="font-medium">{week.avgTime}s</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 