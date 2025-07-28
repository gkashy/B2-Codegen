import React from 'react';
import MainLayout from '@/components/layout/main-layout';
import LearningAnalytics from '@/components/analytics/learning-analytics';

export default function AnalyticsPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Learning Analytics</h1>
              <p className="text-muted-foreground">
                Deep insights into AI learning patterns and performance metrics
              </p>
            </div>
            
            <LearningAnalytics />
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 