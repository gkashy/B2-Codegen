import React from 'react';
import AISolvingInterface from '@/components/ai/ai-solving-interface';
import MainLayout from '@/components/layout/main-layout';

interface SolvePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SolvePage({ params }: SolvePageProps) {
  const { id } = await params;
  const problemId = parseInt(id);

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6">
          <AISolvingInterface problemId={problemId} />
        </div>
      </div>
    </MainLayout>
  );
} 