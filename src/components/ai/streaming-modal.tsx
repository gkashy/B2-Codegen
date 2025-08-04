'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Minimize2, 
  Maximize2, 
  Brain, 
  Search, 
  Map, 
  Code, 
  CheckCircle,
  Activity,
  Clock,
  Circle,
  Zap,
  MessageSquare,
  Lightbulb,
  Target,
  Wrench,
  Eye,
  ArrowRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface StreamingModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAgent?: string | null;
  agentOutputs: {
    analyzer: string;
    planner: string;
    coder: string;
    reviewer: string;
  };
  completedAgents: string[];
  reasoning: string;
  code: string;
  status: 'idle' | 'thinking' | 'coding' | 'complete';
  isStreaming: boolean;
}

interface FormattedSection {
  title: string;
  content: string[];
  type: 'agent-header' | 'section-header' | 'main-header' | 'sub-header' | 'code' | 'normal';
  language?: string;
}

const agents = [
  {
    id: 'analyzer',
    name: 'Problem Analyzer',
    icon: Search,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50/80 dark:bg-blue-950/40',
    borderColor: 'border-blue-200/60 dark:border-blue-800/60',
    iconColor: 'text-blue-600 dark:text-blue-400',
    description: 'Reading and understanding the problem',
    emoji: '🔍'
  },
  {
    id: 'planner',
    name: 'Solution Planner',
    icon: Map,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50/80 dark:bg-purple-950/40',
    borderColor: 'border-purple-200/60 dark:border-purple-800/60',
    iconColor: 'text-purple-600 dark:text-purple-400',
    description: 'Designing the approach and strategy',
    emoji: '🎯'
  },
  {
    id: 'coder',
    name: 'Code Generator',
    icon: Code,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50/80 dark:bg-green-950/40',
    borderColor: 'border-green-200/60 dark:border-green-800/60',
    iconColor: 'text-green-600 dark:text-green-400',
    description: 'Writing the solution code',
    emoji: '💻'
  },
  {
    id: 'reviewer',
    name: 'Code Reviewer',
    icon: CheckCircle,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50/80 dark:bg-orange-950/40',
    borderColor: 'border-orange-200/60 dark:border-orange-800/60',
    iconColor: 'text-orange-600 dark:text-orange-400',
    description: 'Checking and optimizing the solution',
    emoji: '✅'
  }
];

// Function to format agent output in a user-friendly way
const formatAgentOutput = (output: string, agentType: string): FormattedSection[] => {
  if (!output) return [];
  
  // Split the output into sections
  const sections: FormattedSection[] = [];
  const lines = output.split('\n');
  let currentSection: FormattedSection = { title: '', content: [], type: 'normal' };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect agent headers (🔍 **ANALYZER AGENT**: ...)
    if (line.match(/^[🔍📋💻✅🎯🔧].+\*\*.*AGENT\*\*:/)) {
      if (currentSection.content.length > 0) {
        sections.push(currentSection);
      }
      const agentName = line.match(/\*\*(.*?AGENT)\*\*/)?.[1] || 'AGENT';
      const description = line.split(':')[1]?.trim() || '';
      currentSection = {
        title: agentName,
        content: [description],
        type: 'agent-header'
      };
      continue;
    }
    
    // Detect markdown headers (### or ####)
    if (line.match(/^#{3,4}\s+/)) {
      if (currentSection.content.length > 0) {
        sections.push(currentSection);
      }
      const level = line.match(/^(#{3,4})/)?.[1].length || 3;
      const title = line.replace(/^#{3,4}\s+/, '').replace(/\*\*/g, '');
      currentSection = {
        title: title,
        content: [],
        type: level === 3 ? 'main-header' : 'sub-header'
      };
      continue;
    }
    
    // Detect section headers (**Title:**)
    if (line.match(/^\*\*[^*]+:\*\*$/)) {
      if (currentSection.content.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line.replace(/\*\*/g, '').replace(':', ''),
        content: [],
        type: 'section-header'
      };
      continue;
    }
    
    // Detect code blocks (only include for coder agent)
    if (line.trim().startsWith('```')) {
      if (agentType === 'coder') {
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        const language = line.trim().replace('```', '') || 'code';
        currentSection = {
          title: `Generated Code`,
          content: [],
          type: 'code',
          language: language
        };
        
        // Collect code content until closing ```
        i++; // Skip opening ```
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          currentSection.content.push(lines[i]);
          i++;
        }
        sections.push(currentSection);
        currentSection = { title: '', content: [], type: 'normal' };
      } else {
        // Skip code blocks for non-coder agents
        i++; // Skip opening ```
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          i++;
        }
      }
      continue;
    }
    
    // Add content to current section
    if (line.trim()) {
      currentSection.content.push(line);
    }
  }
  
  // Add final section
  if (currentSection.content.length > 0) {
    sections.push(currentSection);
  }
  
  return sections;
};

// Function to get user-friendly agent messages
const getAgentMessage = (agentType: string, output: string, isActive: boolean, isCompleted: boolean): string | FormattedSection[] => {
  if (isActive) {
    switch (agentType) {
      case 'analyzer':
        return "I'm reading through this problem carefully to understand what we need to solve...";
      case 'planner':
        return "Let me think about the best approach and strategy for this problem...";
      case 'coder':
        return "Time to write some clean, efficient code based on our plan...";
      case 'reviewer':
        return "Let me review this solution and make sure it's optimized and correct...";
      default:
        return "Working on this step...";
    }
  }
  
  if (isCompleted && output) {
    const sections = formatAgentOutput(output, agentType);
    return sections.length > 0 ? sections : "✅ Analysis complete!";
  }
  
  return "";
};

// Function to render formatted content with proper styling
const renderFormattedContent = (content: string) => {
  // Handle bold text (**text**)
  const parts = content.split(/(\*\*.*?\*\*)/);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <span key={index} className="font-semibold text-gray-900 dark:text-white">
          {part.replace(/\*\*/g, '')}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

// Function to render a list item with proper formatting
const renderListItem = (item: string, index: number) => {
  // Handle numbered lists (1. 2. 3.)
  if (item.match(/^\d+\./)) {
    return (
      <div key={index} className="flex items-start space-x-2 mb-2">
        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
          {item.match(/^(\d+)\./)?.[1]}
        </span>
        <span className="flex-1 text-gray-700 dark:text-gray-300">
          {renderFormattedContent(item.replace(/^\d+\.\s*/, ''))}
        </span>
      </div>
    );
  }
  
  // Handle bullet points (- or *)
  if (item.trim().startsWith('-') || item.trim().startsWith('*')) {
    return (
      <div key={index} className="flex items-start space-x-2 mb-2">
        <span className="flex-shrink-0 w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mt-2"></span>
        <span className="flex-1 text-gray-700 dark:text-gray-300">
          {renderFormattedContent(item.replace(/^[-*]\s*/, '').trim())}
        </span>
      </div>
    );
  }
  
  // Regular paragraph
  return (
    <p key={index} className="text-gray-700 dark:text-gray-300 mb-2 leading-relaxed">
      {renderFormattedContent(item)}
    </p>
  );
};

export default function StreamingModal({
  isOpen,
  onClose,
  activeAgent,
  agentOutputs,
  completedAgents,
  reasoning,
  code,
  status,
  isStreaming
}: StreamingModalProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [currentOutput, setCurrentOutput] = useState<string | FormattedSection[]>('');
  const [currentAgentMessage, setCurrentAgentMessage] = useState('');

  // Auto-select the active agent or keep the selected tab
  useEffect(() => {
    if (activeAgent && isStreaming) {
      // Auto-follow the active agent while streaming
      setSelectedTab(activeAgent);
    } else if (!selectedTab && completedAgents.length > 0) {
      // Select the first completed agent if no tab is selected
      setSelectedTab(completedAgents[0]);
    }
  }, [activeAgent, isStreaming, selectedTab, completedAgents]);

  // Update current output based on selected tab
  useEffect(() => {
    if (selectedTab) {
      const output = agentOutputs[selectedTab as keyof typeof agentOutputs];
      const isCompleted = completedAgents.includes(selectedTab);
      const isActive = activeAgent === selectedTab;
      const message = getAgentMessage(selectedTab, output, isActive && !isCompleted, isCompleted);
      
      if (typeof message === 'string') {
        setCurrentAgentMessage(message);
        setCurrentOutput('');
      } else {
        setCurrentAgentMessage('');
        setCurrentOutput(message); // This will be the sections array
      }
    } else if (reasoning) {
      setCurrentOutput(reasoning);
      setCurrentAgentMessage("Getting ready to solve this problem step by step...");
    }
  }, [selectedTab, agentOutputs, completedAgents, activeAgent, reasoning]);

  if (!isOpen) return null;

  const progress = (completedAgents.length / agents.length) * 100;
  const currentAgent = agents.find(a => a.id === activeAgent);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ 
            scale: isMinimized ? 0.3 : 1, 
            opacity: 1,
            y: isMinimized ? window.innerHeight * 0.3 : 0,
            x: isMinimized ? window.innerWidth * 0.3 : 0
          }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5 }}
          className={`bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden ${
            isMinimized ? 'w-72 h-44' : 'w-full max-w-7xl h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 dark:border-gray-700/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/30 dark:to-purple-950/30 flex-shrink-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
                  <Brain className="w-6 h-6" />
                </div>
                {isStreaming && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg" />
                )}
              </div>
              <div>
                <h2 className="font-bold text-xl text-gray-900 dark:text-white">AI Problem Solving</h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {currentAgent ? (
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{currentAgent.emoji}</span>
                      {currentAgent.name} is working...
                    </span>
                  ) : (
                    'Multi-agent reasoning system'
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {isStreaming && (
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Live</span>
                </div>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-gray-600 dark:text-gray-300 hover:bg-white/20"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="text-gray-600 dark:text-gray-300 hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <div className="flex flex-col h-full min-h-0">
              {/* Agent Tabs */}
              <div className="flex-shrink-0 border-b border-white/10 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {Math.round(progress)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {completedAgents.length}/{agents.length} agents completed
                    </div>
                  </div>
                  <div className="flex-1 mx-6">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full shadow-lg"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-2">
                  {agents.map((agent) => {
                    const isActive = activeAgent === agent.id;
                    const isCompleted = completedAgents.includes(agent.id);
                    const isSelected = selectedTab === agent.id;
                    // Allow clicking on completed tabs always, active tab always, and tabs with content
                    const hasContent = agentOutputs[agent.id] && agentOutputs[agent.id].trim().length > 0;
                    const isClickable = isCompleted || isActive || hasContent;

                    return (
                      <button
                        key={agent.id}
                        onClick={() => isClickable && setSelectedTab(agent.id)}
                        disabled={!isClickable}
                        className={`flex items-center space-x-2 px-4 py-3 rounded-lg border transition-all duration-300 ${
                          isSelected
                            ? `${agent.bgColor} ${agent.borderColor} shadow-lg ring-2 ring-blue-300/50`
                            : isClickable
                            ? 'bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-md cursor-pointer'
                            : 'bg-gray-100/50 dark:bg-gray-900/50 border-gray-200/30 dark:border-gray-800/30 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${
                          isSelected 
                            ? `bg-gradient-to-r ${agent.color} text-white shadow-md`
                            : isClickable
                            ? `${agent.bgColor} ${agent.iconColor}`
                            : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                        }`}>
                          <agent.icon className="w-4 h-4" />
                        </div>
                        
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">{agent.emoji}</span>
                            <h3 className={`font-medium text-sm truncate ${
                              isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {agent.name}
                            </h3>
                            {isActive && <Activity className="w-3 h-3 animate-spin text-green-500 flex-shrink-0" />}
                            {isCompleted && !isActive && <CheckCircle className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                            {!isCompleted && !isActive && hasContent && <Clock className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                            {!isClickable && <Circle className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Content Header */}
                <div className="flex-shrink-0 p-6 border-b border-white/10 dark:border-gray-700/50 bg-gradient-to-r from-gray-50/50 to-white/50 dark:from-gray-800/30 dark:to-gray-900/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {selectedTab ? (
                        <>
                          <div className={`p-2 rounded-lg ${
                            agents.find(a => a.id === selectedTab)?.id === activeAgent
                              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          }`}>
                            {agents.find(a => a.id === selectedTab)?.icon && 
                              React.createElement(agents.find(a => a.id === selectedTab)!.icon, { className: "w-5 h-5" })
                            }
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-lg flex items-center space-x-2">
                              <span>{agents.find(a => a.id === selectedTab)?.emoji}</span>
                              <span>{agents.find(a => a.id === selectedTab)?.name}</span>
                              {selectedTab === activeAgent && isStreaming && (
                                <Activity className="w-4 h-4 animate-spin text-blue-500" />
                              )}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {selectedTab === activeAgent && isStreaming 
                                ? 'Currently working...' 
                                : completedAgents.includes(selectedTab)
                                ? 'Analysis complete'
                                : 'Waiting to start...'}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                              AI Assistant
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Ready to help
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    {selectedTab === activeAgent && isStreaming && (
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Live</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Streaming Content */}  
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-6 pb-16">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                      >
                        {currentAgentMessage || currentOutput ? (
                          <div className="space-y-4">
                            {/* Agent Message */}
                            {currentAgentMessage && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl p-6 border border-blue-200/30 dark:border-blue-800/30"
                              >
                                <div className="flex items-start space-x-3">
                                  {selectedTab && (
                                    <div className="text-2xl">{agents.find(a => a.id === selectedTab)?.emoji}</div>
                                  )}
                                  <div className="flex-1">
                                    <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                                      {currentAgentMessage}
                                      {isStreaming && selectedTab === activeAgent && (
                                        <motion.span
                                          animate={{ opacity: [1, 0] }}
                                          transition={{ repeat: Infinity, duration: 1 }}
                                          className="inline-block w-2 h-5 bg-blue-500 ml-1 rounded-sm"
                                        />
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            )}

                            {/* Detailed Output */}
                            {currentOutput && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                              >
                                {Array.isArray(currentOutput) ? (
                                  // Render structured sections
                                  currentOutput.map((section, sectionIndex) => (
                                    <motion.div
                                      key={sectionIndex}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: sectionIndex * 0.1 }}
                                      className={`rounded-xl p-6 border backdrop-blur-sm ${
                                        section.type === 'agent-header' 
                                          ? 'bg-gradient-to-r from-blue-50/80 to-purple-50/80 dark:from-blue-950/40 dark:to-purple-950/40 border-blue-200/50 dark:border-blue-800/50'
                                          : section.type === 'main-header'
                                          ? 'bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-950/40 dark:to-emerald-950/40 border-green-200/50 dark:border-green-800/50'
                                          : section.type === 'sub-header'
                                          ? 'bg-gradient-to-r from-purple-50/80 to-pink-50/80 dark:from-purple-950/40 dark:to-pink-950/40 border-purple-200/50 dark:border-purple-800/50'
                                          : section.type === 'section-header'
                                          ? 'bg-gray-50/80 dark:bg-gray-800/80 border-gray-200/50 dark:border-gray-700/50'
                                          : section.type === 'code'
                                          ? 'bg-gray-900/95 border-green-500/20'
                                          : 'bg-white/60 dark:bg-gray-800/60 border-gray-200/50 dark:border-gray-700/50'
                                      }`}
                                    >
                                      {section.type === 'agent-header' && (
                                        <div className="flex items-center space-x-3 mb-3">
                                          <div className="text-2xl">
                                            {section.title.includes('ANALYZER') ? '🔍' :
                                             section.title.includes('PLANNER') ? '📋' :
                                             section.title.includes('CODER') ? '💻' :
                                             section.title.includes('REVIEWER') ? '✅' : '🤖'}
                                          </div>
                                          <div>
                                            <h3 className="font-bold text-lg text-blue-600 dark:text-blue-400">
                                              {section.title}
                                            </h3>
                                            {section.content.length > 0 && (
                                              <p className="text-gray-700 dark:text-gray-300 text-sm">
                                                {section.content[0]}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {section.type === 'main-header' && (
                                        <div className="mb-4">
                                          <h3 className="font-bold text-xl text-gray-900 dark:text-white flex items-center space-x-3">
                                            <div className="w-2 h-8 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                                            <span>{section.title}</span>
                                          </h3>
                                        </div>
                                      )}
                                      
                                      {section.type === 'sub-header' && (
                                        <div className="mb-3">
                                          <h4 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center space-x-2">
                                            <div className="w-1.5 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                                            <span>{section.title}</span>
                                          </h4>
                                        </div>
                                      )}
                                      
                                      {section.type === 'section-header' && (
                                        <div className="mb-4">
                                          <h4 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center space-x-2">
                                            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                                            <span>{section.title}</span>
                                          </h4>
                                        </div>
                                      )}
                                      
                                      {section.type === 'code' && (
                                        <div>
                                          <div className="flex items-center space-x-2 mb-3">
                                            <Code className="w-4 h-4 text-green-400" />
                                            <span className="text-sm font-medium text-green-400">
                                              {section.title} ({section.language || 'code'})
                                            </span>
                                          </div>
                                          <div className="bg-black/50 rounded-lg p-4 border border-green-500/20 max-h-96 overflow-y-auto">
                                            <pre className="text-green-400 font-mono text-sm leading-relaxed">
                                              <code>{section.content.join('\n')}</code>
                                            </pre>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {section.type === 'normal' && section.content.length > 0 && (
                                        <div className="space-y-3">
                                          {section.content.map((item, itemIndex) => 
                                            renderListItem(item, itemIndex)
                                          )}
                                        </div>
                                      )}
                                      
                                      {(section.type === 'section-header' || section.type === 'agent-header' || section.type === 'main-header' || section.type === 'sub-header') && 
                                       section.content.length > (section.type === 'agent-header' ? 1 : 0) && (
                                        <div className="space-y-3">
                                          {section.content.slice(section.type === 'agent-header' ? 1 : 0).map((item, itemIndex) => 
                                            renderListItem(item, itemIndex)
                                          )}
                                        </div>
                                      )}
                                    </motion.div>
                                  ))
                                ) : (
                                  // Render simple text output
                                  <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm"
                                  >
                                    <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                                      {currentOutput.split('\n\n').map((paragraph, index) => (
                                        <motion.div
                                          key={index}
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: index * 0.1 }}
                                          className="mb-3"
                                        >
                                          {renderFormattedContent(paragraph)}
                                        </motion.div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </motion.div>
                            )}
                          </div>
                        ) : selectedTab === 'coder' && code ? (
                          /* Code Generator Tab with Code - Show code prominently */
                          <div className="space-y-4">
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 border border-green-200/30 dark:border-green-800/30">
                              <div className="flex items-center space-x-3">
                                <div className="text-2xl">💻</div>
                                <div>
                                  <h3 className="font-bold text-lg text-green-700 dark:text-green-300">Code Generation Complete!</h3>
                                  <p className="text-sm text-green-600 dark:text-green-400">Here's the optimized solution for your problem</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-gray-900/95 rounded-xl border border-green-500/20 min-h-96">
                              <div className="flex items-center justify-between p-4 border-b border-green-500/20">
                                <div className="flex items-center space-x-2">
                                  <Code className="w-5 h-5 text-green-400" />
                                  <span className="font-medium text-green-400">Generated Solution</span>
                                </div>
                                <div className="text-xs text-green-400/70">Python</div>
                              </div>
                              <div className="p-6 max-h-96 overflow-y-auto">
                                <pre className="text-green-400 font-mono text-sm leading-relaxed">
                                  <code>{code}</code>
                                </pre>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Empty state based on selected tab */
                          <div className="flex items-center justify-center min-h-96 text-gray-500 dark:text-gray-400">
                            <div className="text-center space-y-4">
                              {selectedTab ? (
                                <>
                                  <div className="text-6xl">
                                    {agents.find(a => a.id === selectedTab)?.emoji || '🤖'}
                                  </div>
                                  <div>
                                    {selectedTab === activeAgent && isStreaming ? (
                                      <>
                                        <p className="text-xl font-medium text-gray-700 dark:text-gray-300">
                                          {agents.find(a => a.id === selectedTab)?.name} is working...
                                        </p>
                                        <p className="text-gray-600 dark:text-gray-400">Analysis will appear here as it&apos;s generated</p>
                                      </>
                                    ) : completedAgents.includes(selectedTab) ? (
                                      <>
                                        <p className="text-xl font-medium text-gray-700 dark:text-gray-300">Analysis complete</p>
                                        <p className="text-gray-600 dark:text-gray-400">This agent has finished their work</p>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-xl font-medium text-gray-700 dark:text-gray-300">Waiting to start</p>
                                        <p className="text-gray-600 dark:text-gray-400">This agent will work after the previous ones complete</p>
                                      </>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-6xl">🤖</div>
                                  <div>
                                    {completedAgents.length > 0 ? (
                                      <>
                                        <p className="text-xl font-medium text-gray-700 dark:text-gray-300">Select an agent to view their analysis</p>
                                        <p className="text-gray-600 dark:text-gray-400">Click on the completed agent tabs above to see their detailed work</p>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-xl font-medium text-gray-700 dark:text-gray-300">Ready to solve!</p>
                                        <p className="text-gray-600 dark:text-gray-400">Our AI agents will work together to analyze and solve your problem</p>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </div>


              </div>
            </div>
          )}

          {/* Minimized View */}
          {isMinimized && (
            <div className="p-4 text-center">
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <div className="text-lg">🤖</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">AI Working...</div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                    animate={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {selectedTab ? (
                    <span>{agents.find(a => a.id === selectedTab)?.emoji} {agents.find(a => a.id === selectedTab)?.name}</span>
                  ) : (
                    `${completedAgents.length}/${agents.length} complete`
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}