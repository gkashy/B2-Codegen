import React from 'react';
import MainLayout from '@/components/layout/main-layout';
import DashboardStats from '@/components/dashboard/dashboard-stats';
import ActivityFeed from '@/components/dashboard/activity-feed';
import LearningProgress from '@/components/dashboard/learning-progress';
import RecentProblems from '@/components/dashboard/recent-problems';

export default function Dashboard() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
              <p className="text-muted-foreground">
                Track your AI-powered coding journey and learning progress
              </p>
            </div>

            {/* Stats Cards */}
            <DashboardStats />

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-2 gap-6 mt-8">
              {/* Learning Progress */}
              <LearningProgress />
              
              {/* Recent Problems */}
              <RecentProblems />
            </div>

            {/* Activity Feed */}
            <div className="mt-8">
              <ActivityFeed />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 