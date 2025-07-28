'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Home, 
  Code2, 
  Brain, 
  BarChart3, 
  Settings, 
  Search,
  Bell,
  User,
  Menu,
  X,
  Github,
  Twitter,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
// NavigationMenu components removed - using simple nav instead
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAppStore } from '@/store';

interface MainLayoutProps {
  children: any;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Problems', href: '/problems', icon: Code2 },
  { name: 'AI Solver', href: '/problems', icon: Brain },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function MainLayout({ children }: MainLayoutProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { ui, toggleSidebar } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4">
          {/* Logo */}
          <div className="mr-4 flex">
            <motion.div 
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Brain className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="hidden font-bold text-xl gradient-text sm:inline-block">
                AI LeetCode
              </span>
            </motion.div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => (
              <Button
                key={item.name}
                variant="ghost"
                className="flex items-center space-x-2"
                asChild
              >
                <a href={item.href} className="flex items-center space-x-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                </a>
                    </Button>
              ))}
          </nav>

          {/* Search */}
          <div className="flex flex-1 items-center justify-center px-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search problems..."
                className="w-full bg-background pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-2">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs"
              >
                3
              </Badge>
            </Button>

            {/* User Profile */}
            <Button variant="ghost" size="icon">
              <User className="h-4 w-4" />
            </Button>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col space-y-4">
                  {navigation.map((item) => (
                    <motion.a
                      key={item.name}
                      href={item.href}
                      className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                      whileHover={{ x: 4 }}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </motion.a>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -280 }}
          animate={{ x: ui.sidebarOpen ? 0 : -280 }}
          className="fixed inset-y-0 left-0 z-40 w-[280px] border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-14 hidden lg:block"
        >
          <div className="flex h-full flex-col">
            {/* Quick Stats */}
            <div className="p-4 border-b border-border">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Success Rate</span>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                    87%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Problems Solved</span>
                  <Badge variant="secondary">42</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Session</span>
                  <div className="flex items-center space-x-1">
                    <div className="h-[8px] w-[8px] rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Live</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="font-semibold text-sm mb-3">Recent Activity</h3>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="h-[8px] w-[8px] rounded-full bg-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">Two Sum</p>
                      <p className="text-xs text-muted-foreground">Solved in 1 attempt</p>
                    </div>
                    <span className="text-xs text-muted-foreground">2m</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center justify-center space-x-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Github className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto lg:ml-[280px]">
          <div className="container mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Navigation Bottom */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border md:hidden"
      >
        <div className="grid grid-cols-5 items-center h-16">
          {navigation.map((item) => (
            <motion.a
              key={item.name}
              href={item.href}
              className="flex flex-col items-center justify-center space-y-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </motion.a>
          ))}
        </div>
      </motion.nav>
    </div>
  );
} 