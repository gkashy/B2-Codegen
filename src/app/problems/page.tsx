import React from 'react';
import MainLayout from '@/components/layout/main-layout';
import ProblemBrowser from '@/components/problems/problem-browser';

export default function ProblemsPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Problem Browser</h1>
              <p className="text-muted-foreground">
                Explore and filter LeetCode problems for AI solving
              </p>
            </div>
            
            <ProblemBrowser />
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 