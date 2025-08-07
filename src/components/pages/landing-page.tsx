'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  Code2, 
  Play, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';


const features = [
  {
    icon: Brain,
    title: "Self-Learning AI",
    description: "AI that learns from mistakes and improves over time",
    color: "bg-purple-500/10 text-purple-500"
  },
  {
    icon: Zap,
    title: "Real-time Streaming",
    description: "Watch AI think and code in real-time",
    color: "bg-yellow-500/10 text-yellow-500"
  },
  {
    icon: TrendingUp,
    title: "Learning Analytics",
    description: "Detailed insights into AI performance and improvement",
    color: "bg-green-500/10 text-green-500"
  },
  {
    icon: Code2,
    title: "Multi-Language Support",
    description: "Python, Java, C++, JavaScript, and more",
    color: "bg-blue-500/10 text-blue-500"
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-blue-600/20 to-blue-700/20 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.1)_50%,transparent_75%,transparent)]" />
        </div>

        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-4"
            >
              <Badge variant="outline" className="px-4 py-2 text-sm">
                <Sparkles className="w-4 h-4 mr-2" />
                AI-Powered Learning Platform
              </Badge>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                <span className="gradient-text">AI That Learns</span>
                <br />
                <span className="text-foreground">to Code</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                Watch AI solve LeetCode problems, learn from failures, and improve in real-time. 
                Experience the future of algorithmic problem-solving.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/problems">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-8 py-6 text-lg"
              >
                <Play className="w-5 h-5 mr-2" />
                Watch AI Solve Problems
              </Button>
              </Link>
              <Link href="/problems">
              <Button 
                variant="outline" 
                size="lg"
                className="px-8 py-6 text-lg"
              >
                View Problem Gallery
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>



      {/* Features Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Why Choose AI LeetCode Agent?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our AI doesn't just solve problems - it learns, adapts, and improves with every attempt.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 transition-all duration-300">
                <CardHeader className="pb-4">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${feature.color} mb-4`}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Watch AI Learn?
            </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of developers who are already experiencing the future of algorithmic problem-solving.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/problems">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg">
                <Play className="w-5 h-5 mr-2" />
                Start Watching AI
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
                View Dashboard
              </Button>
            </Link>
            </div>
        </div>
      </section>
    </div>
  );
} 