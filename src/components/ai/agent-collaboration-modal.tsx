// Two-Panel Agent Collaboration Modal - Beautiful UX with no scrolling!
'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Brain, 
  ClipboardCheck, 
  Code2, 
  Search, 
  TestTube, 
  CheckCircle2, 
  XCircle, 
  Clock,
  MessageCircle,
  ArrowRight,
  Sparkles,
  Play,
  Pause,
  User
} from 'lucide-react'

interface AgentInteraction {
  agent: string
  action: string
  content: string
  timestamp: string
}

interface AgentCollaborationModalProps {
  isOpen: boolean
  onClose: () => void
  problemTitle: string
  interactions: AgentInteraction[]
  currentPhase: 'analysis' | 'planning' | 'implementation' | 'complete'
  successRate: number
  isProcessing: boolean
}

const AGENT_CONFIG = {
  analyzer: {
    name: 'Analyzer',
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    icon: Search,
    description: 'Problem analysis & pattern recognition'
  },
  planner: {
    name: 'Planner', 
    color: 'bg-green-500',
    textColor: 'text-green-600',
    icon: ClipboardCheck,
    description: 'Solution strategy & algorithm design'
  },
  coder: {
    name: 'Coder',
    color: 'bg-purple-500',
    textColor: 'text-purple-600',
    icon: Code2,
    description: 'Code implementation & optimization'
  },
  reviewer: {
    name: 'Reviewer',
    color: 'bg-orange-500',
    textColor: 'text-orange-600',
    icon: Brain,
    description: 'Code review & quality assurance'
  },
  tester: {
    name: 'Tester',
    color: 'bg-pink-500',
    textColor: 'text-pink-600',
    icon: TestTube,
    description: 'Test execution & validation'
  },
  explainer: {
    name: 'Code Explainer',
    color: 'bg-purple-600',
    textColor: 'text-purple-700',
    icon: Sparkles,
    description: 'Educational analysis & quality assessment'
  },
  system: {
    name: 'System',
    color: 'bg-gray-500',
    textColor: 'text-gray-600',
    icon: MessageCircle,
    description: 'System notifications'
  }
}

const PHASE_CONFIG = {
  analysis: {
    title: 'Problem Analysis',
    description: 'Understanding problem patterns and constraints',
    icon: '🔍',
    color: 'border-blue-200 bg-blue-50'
  },
  planning: {
    title: 'Solution Planning', 
    description: 'Designing algorithmic approach and strategy',
    icon: '📋',
    color: 'border-green-200 bg-green-50'
  },
  implementation: {
    title: 'Code Implementation',
    description: 'Writing, testing, and refining the solution',
    icon: '💻', 
    color: 'border-purple-200 bg-purple-50'
  },
  complete: {
    title: 'Complete',
    description: 'Perfect solution achieved',
    icon: '🎉',
    color: 'border-emerald-200 bg-emerald-50'
  }
}

// Enhanced markdown parser for Code Explainer content (same as streaming modal)
const parseMarkdownContent = (content: string): React.ReactElement[] => {
  if (!content) return [];
  
  const lines = content.split('\n');
  const elements: React.ReactElement[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let currentListItems: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Handle code blocks
    if (trimmedLine.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        if (codeContent.length > 0) {
          elements.push(
            <div key={`code-${i}`} className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm my-3 overflow-x-auto">
              <pre>{codeContent.join('\n')}</pre>
            </div>
          );
        }
        codeContent = [];
        inCodeBlock = false;
      } else {
        // Start code block
        inCodeBlock = true;
        // Flush any pending list items
        if (currentListItems.length > 0) {
          elements.push(
            <ul key={`list-${i}`} className="list-disc ml-6 space-y-1 my-3">
              {currentListItems.map((item, idx) => (
                <li key={idx} className="text-blue-800">{parseInlineMarkdown(item)}</li>
              ))}
            </ul>
          );
          currentListItems = [];
        }
      }
      continue;
    }
    
    // If in code block, collect content
    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }
    
    // Handle headers
    if (trimmedLine.startsWith('####')) {
      // Flush any pending list items
      if (currentListItems.length > 0) {
        elements.push(
          <ul key={`list-${i}`} className="list-disc ml-6 space-y-1 my-3">
            {currentListItems.map((item, idx) => (
              <li key={idx} className="text-blue-800">{parseInlineMarkdown(item)}</li>
            ))}
          </ul>
        );
        currentListItems = [];
      }
      
      const headerText = trimmedLine.replace(/^####\s*/, '');
      elements.push(
        <h4 key={i} className="text-lg font-bold text-blue-900 mt-6 mb-3 border-b border-blue-200 pb-1">
          {parseInlineMarkdown(headerText)}
        </h4>
      );
    } else if (trimmedLine.startsWith('###')) {
      // Flush any pending list items
      if (currentListItems.length > 0) {
        elements.push(
          <ul key={`list-${i}`} className="list-disc ml-6 space-y-1 my-3">
            {currentListItems.map((item, idx) => (
              <li key={idx} className="text-blue-800">{parseInlineMarkdown(item)}</li>
            ))}
          </ul>
        );
        currentListItems = [];
      }
      
      const headerText = trimmedLine.replace(/^###\s*/, '');
      elements.push(
        <h3 key={i} className="text-xl font-bold text-blue-900 mt-6 mb-4 border-b-2 border-blue-300 pb-2">
          {parseInlineMarkdown(headerText)}
        </h3>
      );
    }
    // Handle list items
    else if (trimmedLine.match(/^[-*]\s+/) || trimmedLine.match(/^\d+\.\s+/)) {
      const listItemText = trimmedLine.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
      currentListItems.push(listItemText);
    }
    // Handle regular paragraphs
    else if (trimmedLine) {
      // Flush any pending list items first
      if (currentListItems.length > 0) {
        elements.push(
          <ul key={`list-${i}`} className="list-disc ml-6 space-y-1 my-3">
            {currentListItems.map((item, idx) => (
              <li key={idx} className="text-blue-800">{parseInlineMarkdown(item)}</li>
            ))}
          </ul>
        );
        currentListItems = [];
      }
      
      elements.push(
        <p key={i} className="text-blue-800 mb-3 leading-relaxed">
          {parseInlineMarkdown(trimmedLine)}
        </p>
      );
    }
    // Handle empty lines (spacing)
    else if (!trimmedLine && elements.length > 0) {
      // Add spacing between sections
      elements.push(<div key={`space-${i}`} className="mb-2"></div>);
    }
  }
  
  // Flush any remaining list items
  if (currentListItems.length > 0) {
    elements.push(
      <ul key="final-list" className="list-disc ml-6 space-y-1 my-3">
        {currentListItems.map((item, idx) => (
          <li key={idx} className="text-blue-800">{parseInlineMarkdown(item)}</li>
        ))}
      </ul>
    );
  }
  
  return elements;
};

// Parse inline markdown (bold, inline code, etc.)
const parseInlineMarkdown = (text: string): React.ReactNode => {
  if (!text) return text;
  
  // Handle bold text (**text**)
  const boldRegex = /(\*\*.*?\*\*)/g;
  const parts = text.split(boldRegex);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-blue-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    
    // Handle inline code (`code`)
    const codeRegex = /(`[^`]+`)/g;
    const codeParts = part.split(codeRegex);
    
    return codeParts.map((codePart, codeIndex) => {
      if (codePart.startsWith('`') && codePart.endsWith('`')) {
        return (
          <code key={`${index}-${codeIndex}`} className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">
            {codePart.slice(1, -1)}
          </code>
        );
      }
      return codePart;
    });
  });
};

export function AgentCollaborationModal({
  isOpen,
  onClose,
  problemTitle,
  interactions,
  currentPhase,
  successRate = 0,
  isProcessing
}: AgentCollaborationModalProps) {
  const [visibleInteractions, setVisibleInteractions] = useState<AgentInteraction[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  
  // Show all interactions immediately
  useEffect(() => {
    setVisibleInteractions(interactions)
  }, [interactions])

  // Reset when modal opens and auto-select most recent agent
  useEffect(() => {
    if (isOpen) {
      setVisibleInteractions(interactions)
      if (interactions.length > 0) {
        const lastInteraction = interactions[interactions.length - 1]
        setSelectedAgent(lastInteraction.agent)
      }
    }
  }, [isOpen, interactions])

  // Auto-update selected agent to most recent when new interaction arrives
  useEffect(() => {
    if (interactions.length > 0 && isProcessing) {
      const lastInteraction = interactions[interactions.length - 1]
      setSelectedAgent(lastInteraction.agent)
    }
  }, [interactions, isProcessing])

  const getPhaseProgress = () => {
    if (currentPhase === 'complete') return 100
    
    let baseProgress = 0
    switch (currentPhase) {
      case 'analysis': baseProgress = 10; break
      case 'planning': baseProgress = 30; break  
      case 'implementation': baseProgress = 50; break
      default: baseProgress = 0; break
    }

    const interactionProgress = Math.min(interactions.length * 3, 20)
    const successProgress = successRate > 0 ? Math.min(successRate / 100 * 30, 30) : 0
    
    const totalProgress = baseProgress + interactionProgress + successProgress
    return Math.min(Math.max(totalProgress, baseProgress), 100)
  }

  // Get unique agents that have interactions
  const getUniqueAgents = () => {
    const agentMap = new Map()
    visibleInteractions.forEach(interaction => {
      const agent = interaction.agent.toLowerCase()
      if (!agentMap.has(agent)) {
        agentMap.set(agent, {
          ...interaction,
          count: 1,
          lastAction: interaction.action,
          lastTimestamp: interaction.timestamp
        })
      } else {
        const existing = agentMap.get(agent)
        agentMap.set(agent, {
          ...existing,
          count: existing.count + 1,
          lastAction: interaction.action,
          lastTimestamp: interaction.timestamp
        })
      }
    })
    return Array.from(agentMap.values())
  }

  // Get interactions for selected agent
  const getSelectedAgentInteractions = () => {
    if (!selectedAgent) return []
    return visibleInteractions.filter(interaction => 
      interaction.agent.toLowerCase() === selectedAgent.toLowerCase()
    )
  }

  const getCurrentWorkingDescription = () => {
    const lastInteraction = visibleInteractions[visibleInteractions.length - 1]
    
    if (currentPhase === 'analysis') {
      return 'Analyzing problem constraints, identifying patterns, and determining optimal algorithmic approach...'
    } else if (currentPhase === 'planning') {
      return 'Creating detailed implementation strategy with step-by-step solution design...'
    } else if (currentPhase === 'implementation') {
      if (lastInteraction?.action === 'run_tests') {
        return 'Analyzing test results and identifying areas for code improvement...'
      } else if (lastInteraction?.agent.toLowerCase() === 'reviewer') {
        return 'Implementing fixes based on code review feedback...'
      } else {
        return 'Writing optimized code and running comprehensive test validation...'
      }
    }
    return 'Preparing agent collaboration workflow...'
  }

  // Enhanced formatter for agent content
  const formatAgentContent = (content: string, agent: string) => {
    if (!content) return <div className="text-gray-500 italic">Processing...</div>
    
    // For code output, preserve formatting with syntax highlighting
    if (agent === 'coder' && (content.includes('def ') || content.includes('class Solution'))) {
      return (
        <div className="bg-slate-900 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Python Code</span>
            <span className="text-xs text-emerald-400">✓ Generated</span>
          </div>
          <pre className="text-sm font-mono overflow-x-auto">
            <code className="text-emerald-300">{content}</code>
          </pre>
        </div>
      )
    }
    
    // Parse structured content for other agents
    return parseStructuredContent(content, agent)
  }

  const parseStructuredContent = (content: string, agent: string) => {
    const lines = content.split('\n')
    const elements: React.ReactElement[] = []
    let key = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Main headers (### **Title**)
      if (line.match(/^### \*\*.*\*\*$/)) {
        const title = line.replace(/^### \*\*|\*\*$/g, '')
        elements.push(
          <div key={key++} className="mb-4 mt-6 first:mt-0">
            <h3 className="text-lg font-bold text-blue-700 border-b-2 border-blue-200 pb-2 flex items-center gap-2">
              <span className="text-blue-600">📋</span>
              {formatInlineText(title)}
            </h3>
          </div>
        )
      }
      // Numbered lists with bold (#### **1. Title**) - CHECK FIRST
      else if (line.match(/^#### \*\*\d+\.\s*.*\*\*$/)) {
        const match = line.match(/^#### \*\*(\d+)\.\s*(.*)\*\*$/)
        if (match) {
          elements.push(
            <div key={key++} className="mb-4 flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {match[1]}
              </span>
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 mb-2">{formatInlineText(match[2])}</h4>
              </div>
            </div>
          )
        }
      }
      // Plain numbered lists (#### 1. Title) - CHECK SECOND
      else if (line.match(/^#### \d+\.\s*.*$/)) {
        const match = line.match(/^#### (\d+)\.\s*(.*)$/)
        if (match) {
          elements.push(
            <div key={key++} className="mb-4 flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {match[1]}
              </span>
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 mb-2">{formatInlineText(match[2])}</h4>
              </div>
            </div>
          )
        }
      }
      // Sub headers with bold (#### **Title**)
      else if (line.match(/^#### \*\*.*\*\*$/)) {
        const title = line.replace(/^#### \*\*|\*\*$/g, '')
        elements.push(
          <div key={key++} className="mb-3 mt-5">
            <h4 className="text-md font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              {formatInlineText(title)}
            </h4>
          </div>
        )
      }
      // Plain sub headers (#### Title) - CHECK LAST to avoid conflicts
      else if (line.match(/^#### [^*\d].*$/)) {
        const title = line.replace(/^#### /, '')
        elements.push(
          <div key={key++} className="mb-3 mt-5">
            <h4 className="text-md font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              {formatInlineText(title)}
            </h4>
          </div>
        )
      }
      // Bold standalone items (**Item**)
      else if (line.match(/^\*\*[^*]+\*\*$/)) {
        const title = line.replace(/^\*\*|\*\*$/g, '')
        elements.push(
          <div key={key++} className="mb-2">
            <h5 className="font-bold text-slate-800 text-sm">{formatInlineText(title)}</h5>
          </div>
        )
      }
      // Code blocks (```...```)
      else if (line.includes('```python') || line.includes('```')) {
        let codeBlock = ''
        let j = i + 1
        while (j < lines.length && !lines[j].includes('```')) {
          codeBlock += lines[j] + '\n'
          j++
        }
        elements.push(
          <div key={key++} className="my-4 bg-slate-900 p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Python Implementation</span>
              <span className="text-xs text-emerald-400">✓ Code</span>
            </div>
            <pre className="text-sm font-mono overflow-x-auto">
              <code className="text-emerald-300">{codeBlock.trim()}</code>
            </pre>
          </div>
        )
        i = j // Skip processed lines
      }
      // Bold items with description (**Item**: text)
      else if (line.match(/^\s*- \*\*.*\*\*:/)) {
        const match = line.match(/^\s*- \*\*([^*]+)\*\*:\s*(.*)/)
        if (match) {
          elements.push(
            <div key={key++} className="mb-3 pl-4 border-l-3 border-blue-200 bg-blue-50 p-3 rounded-r">
              <div className="font-semibold text-blue-800 mb-1">{formatInlineText(match[1])}</div>
              <div className="text-slate-700">{formatInlineText(match[2])}</div>
            </div>
          )
        }
      }
      // Numbered lists (1. **Item**: text)
      else if (line.match(/^\s*\d+\.\s*\*\*.*\*\*:/)) {
        const match = line.match(/^\s*(\d+)\.\s*\*\*([^*]+)\*\*:\s*(.*)/)
        if (match) {
          elements.push(
            <div key={key++} className="mb-4 flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {match[1]}
              </span>
              <div className="flex-1">
                <div className="font-semibold text-slate-800 mb-1">{formatInlineText(match[2])}</div>
                <div className="text-slate-600">{formatInlineText(match[3])}</div>
              </div>
            </div>
          )
        }
      }
      // Dash bullet points (- item)
      else if (line.match(/^\s*-\s+/) && !line.match(/^\s*- \*\*/)) {
        const text = line.replace(/^\s*-\s+/, '')
        elements.push(
          <div key={key++} className="mb-2 flex items-start gap-3 ml-4">
            <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
            <div className="text-slate-700">{formatInlineText(text)}</div>
          </div>
        )
      }
      // Standalone sub-headings (like "Variables", "Testing", etc.)
      else if (line.match(/^[A-Z][A-Za-z\s]*$/) && 
               line.trim().length > 2 && 
               line.trim().length < 30 && 
               !line.includes('.') && 
               !line.includes(',')) {
        elements.push(
          <div key={key++} className="mb-3 mt-4">
            <h5 className="font-bold text-purple-700 text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
              {formatInlineText(line.trim())}
            </h5>
          </div>
        )
      }
      // Simple definition style (word followed by description)
      else if (line.match(/^[A-Za-z][A-Za-z\s]+$/) && 
               i + 1 < lines.length && 
               lines[i + 1].trim() && 
               !lines[i + 1].match(/^[#*\-\d]/)) {
        // Check if next line is a description (not a header or list)
        const nextLine = lines[i + 1]
        if (nextLine && nextLine.trim() && !nextLine.match(/^[#*\-\d]/) && nextLine.length > line.length) {
          elements.push(
            <div key={key++} className="mb-3 bg-gray-50 p-3 rounded border-l-4 border-blue-300">
              <div className="font-semibold text-slate-800 mb-1">{formatInlineText(line.trim())}</div>
              <div className="text-slate-600 text-sm">{formatInlineText(nextLine.trim())}</div>
            </div>
          )
          i++ // Skip the next line since we processed it
        } else {
          // Check if it's a standalone sub-heading
          if (line.trim().length <= 20 && !line.includes('.')) {
            elements.push(
              <div key={key++} className="mb-2 mt-3">
                <h5 className="font-bold text-purple-700 text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                  {formatInlineText(line.trim())}
                </h5>
              </div>
            )
          } else {
            // Regular paragraph
            elements.push(
              <p key={key++} className="mb-3 text-slate-700 leading-relaxed">
                {formatInlineText(line)}
              </p>
            )
          }
        }
      }
      // Regular paragraphs
      else if (line.trim()) {
        elements.push(
          <p key={key++} className="mb-3 text-slate-700 leading-relaxed">
            {formatInlineText(line)}
          </p>
        )
      }
    }

    return <div className="space-y-2">{elements}</div>
  }

  // Enhanced inline text formatter
  const formatInlineText = (text: string) => {
    // Split by **bold** patterns while preserving the delimiters
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return (
      <span>
        {parts.map((part, idx) => {
          if (part.match(/^\*\*.*\*\*$/)) {
            const boldText = part.replace(/^\*\*|\*\*$/g, '')
            return <strong key={idx} className="font-semibold text-slate-800">{boldText}</strong>
          }
          // Handle `code` spans
          if (part.includes('`')) {
            const codeParts = part.split(/(`[^`]+`)/g)
            return (
              <span key={idx}>
                {codeParts.map((codePart, codeIdx) => {
                  if (codePart.match(/^`.*`$/)) {
                    const codeText = codePart.replace(/^`|`$/g, '')
                    return <code key={codeIdx} className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-blue-700 border">{codeText}</code>
                  }
                  return codePart
                })}
              </span>
            )
          }
          return part
        })}
      </span>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col bg-white border-2 border-gray-300 shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 -m-6 mb-4">
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500 rounded-full">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-800">Agent Collaboration</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">{problemTitle}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Top Status Bar */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-2xl">{PHASE_CONFIG[currentPhase].icon}</div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">{PHASE_CONFIG[currentPhase].title}</h3>
                <p className="text-sm text-gray-600">{PHASE_CONFIG[currentPhase].description}</p>
              </div>
              {isProcessing && currentPhase !== 'complete' && (
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              )}
            </div>
            
            {successRate > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">{successRate}%</div>
                <div className="text-xs text-gray-500">Success Rate</div>
              </div>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <Progress value={getPhaseProgress()} className="h-2" />
          </div>
        </div>

        {/* Main Two-Panel Layout */}
        <div className="flex-1 flex gap-4 min-h-0">
          
          {/* LEFT PANEL - Agent Timeline */}
          <div className="w-80 bg-gray-50 rounded-lg border flex flex-col">
            <div className="p-4 border-b bg-white rounded-t-lg">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <User className="w-4 h-4" />
                Agent Timeline
              </h3>
              <p className="text-xs text-gray-600 mt-1">Click an agent to view their output</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {getUniqueAgents().length === 0 && !isProcessing && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🤖</div>
                  <p className="text-sm">Agents will appear here when the process starts</p>
                </div>
              )}
              
              {getUniqueAgents().length === 0 && isProcessing && (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Starting agent collaboration...</p>
                </div>
              )}
              
              {getUniqueAgents().map((agentData) => {
                const agent = AGENT_CONFIG[agentData.agent.toLowerCase() as keyof typeof AGENT_CONFIG]
                if (!agent) return null
                
                const Icon = agent.icon
                const isSelected = selectedAgent === agentData.agent
                const isActive = isProcessing && 
                  visibleInteractions.length > 0 && 
                  visibleInteractions[visibleInteractions.length - 1].agent === agentData.agent
                
                return (
                  <div
                    key={agentData.agent}
                    onClick={() => setSelectedAgent(agentData.agent)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'border-blue-400 bg-blue-50 shadow-md' 
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${agent.color} flex-shrink-0`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-800 truncate">{agent.name}</h4>
                          {isActive && (
                            <div className="flex items-center gap-1">
                              <Play className="w-3 h-3 text-green-500" />
                              <span className="text-xs text-green-600 font-medium">ACTIVE</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 truncate capitalize">
                          {agentData.lastAction.replace(/_/g, ' ')}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">
                            {new Date(agentData.lastTimestamp).toLocaleTimeString()}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {agentData.count} {agentData.count === 1 ? 'action' : 'actions'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* RIGHT PANEL - Main Content */}
          <div className="flex-1 bg-white rounded-lg border flex flex-col min-w-0">
            {!selectedAgent ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="text-6xl mb-4">🤖</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Select an Agent</h3>
                  <p className="text-gray-600">
                    Choose an agent from the timeline to view their detailed output and analysis.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Content Header */}
                <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                  {(() => {
                    const agent = AGENT_CONFIG[selectedAgent.toLowerCase() as keyof typeof AGENT_CONFIG]
                    if (!agent) return null
                    const Icon = agent.icon
                    const agentInteractions = getSelectedAgentInteractions()
                    
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${agent.color}`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800">{agent.name}</h3>
                            <p className="text-sm text-gray-600">{agent.description}</p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {agentInteractions.length} {agentInteractions.length === 1 ? 'interaction' : 'interactions'}
                        </Badge>
                      </div>
                    )
                  })()}
                </div>
                
                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-4">
                  {(() => {
                    const agentInteractions = getSelectedAgentInteractions()
                    
                    if (agentInteractions.length === 0) {
                      return (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="text-4xl mb-3">⏳</div>
                            <p className="text-gray-600">This agent hasn't started yet</p>
                          </div>
                        </div>
                      )
                    }
                    
                    return (
                      <div className="space-y-6">
                        {agentInteractions.map((interaction, index) => (
                          <div key={`${interaction.timestamp}-${index}`} className="bg-gray-50 rounded-lg p-4 border">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-800 capitalize">
                                {interaction.action.replace(/_/g, ' ')}
                              </h4>
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                {new Date(interaction.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="bg-white rounded border p-3">
                              {interaction.action === 'educational_analysis' ? (
                                <div className="space-y-4">
                                  {(() => {
                                    try {
                                      const explainerData = JSON.parse(interaction.content)
                                      const rubric = explainerData.rubric || {}
                                      
                                      return (
                                        <>
                                          {/* Header */}
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <Sparkles className="w-5 h-5 text-purple-500" />
                                              <span className="font-bold text-gray-800">Educational Analysis</span>
                                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            </div>
                                            <div className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                              Grade: {rubric.grade || 'N/A'}
                                            </div>
                                          </div>

                                          {/* Explanation */}
                                          <div className="bg-blue-50 p-4 rounded border border-blue-200">
                                            <h4 className="font-bold text-blue-900 mb-2">📚 Code Explanation</h4>
                                            <div className="text-sm leading-relaxed">
                                              {explainerData.explanation ? 
                                                parseMarkdownContent(explainerData.explanation) : 
                                                <p className="text-blue-800">No explanation available</p>
                                              }
                                            </div>
                                          </div>

                                          {/* Rubric Evaluation */}
                                          {rubric && (
                                            <div className="bg-gray-50 p-4 rounded border">
                                              <h4 className="font-bold text-gray-900 mb-3">📊 Code Quality Assessment</h4>
                                              
                                              {/* Scores */}
                                              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-3">
                                                <div className="text-center p-2 bg-white rounded border">
                                                  <div className="font-bold text-lg text-green-600">{rubric.correctness_score || 0}/5</div>
                                                  <div className="text-xs text-gray-600">Correctness</div>
                                                </div>
                                                <div className="text-center p-2 bg-white rounded border">
                                                  <div className="font-bold text-lg text-blue-600">{rubric.efficiency_score || 0}/5</div>
                                                  <div className="text-xs text-gray-600">Efficiency</div>
                                                </div>
                                                <div className="text-center p-2 bg-white rounded border">
                                                  <div className="font-bold text-lg text-purple-600">{rubric.structure_score || 0}/5</div>
                                                  <div className="text-xs text-gray-600">Structure</div>
                                                </div>
                                                <div className="text-center p-2 bg-white rounded border">
                                                  <div className="font-bold text-lg text-orange-600">{rubric.readability_score || 0}/5</div>
                                                  <div className="text-xs text-gray-600">Readability</div>
                                                </div>
                                                <div className="text-center p-2 bg-white rounded border">
                                                  <div className="font-bold text-lg text-indigo-600">{rubric.robustness_score || 0}/5</div>
                                                  <div className="text-xs text-gray-600">Robustness</div>
                                                </div>
                                              </div>

                                              {/* Overall Score */}
                                              <div className="text-center p-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded border border-purple-200">
                                                <div className="font-bold text-xl text-purple-700">
                                                  Overall: {rubric.overall_score || 0}/5
                                                </div>
                                                <div className="text-sm text-purple-600">
                                                  {rubric.summary || 'Assessment completed'}
                                                </div>
                                              </div>

                                              {/* Strengths and Improvements */}
                                              {(rubric.strengths || rubric.improvements) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                                  {rubric.strengths && rubric.strengths.length > 0 && (
                                                    <div className="p-3 bg-green-50 rounded border border-green-200">
                                                      <h5 className="font-bold text-green-800 mb-2">✅ Strengths</h5>
                                                      <ul className="text-sm text-green-700 space-y-1">
                                                        {rubric.strengths.map((strength: string, idx: number) => (
                                                          <li key={idx} className="flex items-start gap-1">
                                                            <span className="text-green-600">•</span>
                                                            <span>{strength}</span>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {rubric.improvements && rubric.improvements.length > 0 && (
                                                    <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                                                      <h5 className="font-bold text-yellow-800 mb-2">🔧 Improvements</h5>
                                                      <ul className="text-sm text-yellow-700 space-y-1">
                                                        {rubric.improvements.map((improvement: string, idx: number) => (
                                                          <li key={idx} className="flex items-start gap-1">
                                                            <span className="text-yellow-600">•</span>
                                                            <span>{improvement}</span>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </>
                                      )
                                    } catch (e) {
                                      // Fallback for parsing errors
                                      return (
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-purple-500" />
                                            <span className="font-bold text-gray-800">Educational Analysis</span>
                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                          </div>
                                          <div className="text-sm text-gray-700 p-3 bg-gray-50 rounded border">
                                            {interaction.content}
                                          </div>
                                        </div>
                                      )
                                    }
                                  })()}
                                </div>
                              ) : interaction.action === 'run_tests' ? (
                                <div className="space-y-4">
                                  {(() => {
                                    try {
                                      const testData = JSON.parse(interaction.content)
                                      const isAllPassed = testData.success_rate === 100
                                      
                                      return (
                                        <>
                                          {/* Header */}
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <TestTube className="w-5 h-5 text-pink-500" />
                                              <span className="font-bold text-gray-800">Test Results</span>
                                              {isAllPassed ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                              ) : (
                                                <XCircle className="w-5 h-5 text-red-500" />
                                              )}
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                              isAllPassed 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                              {testData.success_rate}% Success
                                            </div>
                                          </div>

                                          {/* Summary */}
                                          <div className="bg-gray-50 p-3 rounded border">
                                            <div className="text-lg font-bold text-gray-900">
                                              {testData.summary || (testData.api_limit_reached ? 'Rate Limited' : 'No summary')}
                                            </div>
                                            <div className="text-sm text-gray-600 mt-1">
                                              {testData.api_limit_reached ? 'API Rate Limit Reached' : testData.overall_status} • {testData.passed_tests} passed, {testData.failed_tests} failed
                                            </div>
                                          </div>

                                          {/* Individual Test Cases */}
                                          <div className="space-y-2">
                                            <div className="text-sm font-medium text-gray-700">Individual Test Cases:</div>
                                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                              {testData.test_results && testData.test_results.length > 0 ? testData.test_results.map((test: any, index: number) => (
                                                <div 
                                                  key={index} 
                                                  className={`p-3 rounded-lg border ${
                                                    test.passed 
                                                      ? 'bg-green-50 border-green-200' 
                                                      : 'bg-red-50 border-red-200'
                                                  }`}
                                                >
                                                  <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-900">Test {index + 1}</span>
                                                    <div className="flex items-center gap-2">
                                                      {test.execution_time && (
                                                        <span className="text-xs text-gray-500">
                                                          {test.execution_time}s
                                                        </span>
                                                      )}
                                                      {test.passed ? (
                                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                      ) : (
                                                        <XCircle className="w-4 h-4 text-red-500" />
                                                      )}
                                                    </div>
                                                  </div>
                                                  
                                                  <div className="text-xs space-y-1">
                                                    <div className="flex">
                                                      <span className="font-medium text-gray-600 w-16">Input:</span>
                                                      <span className="text-gray-800 font-mono bg-gray-100 px-1 rounded">
                                                        {test.input}
                                                      </span>
                                                    </div>
                                                    <div className="flex">
                                                      <span className="font-medium text-gray-600 w-16">Expected:</span>
                                                      <span className="text-gray-800 font-mono bg-gray-100 px-1 rounded">
                                                        {test.expected_output}
                                                      </span>
                                                    </div>
                                                    <div className="flex">
                                                      <span className="font-medium text-gray-600 w-16">Actual:</span>
                                                      <span className={`font-mono px-1 rounded ${
                                                        test.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                      }`}>
                                                        {test.actual_output || '(no output)'}
                                                      </span>
                                                    </div>
                                                    {test.error && (
                                                      <div className="flex">
                                                        <span className="font-medium text-red-600 w-16">Error:</span>
                                                        <span className="text-red-700 text-xs bg-red-50 px-1 rounded">
                                                          {test.error}
                                                        </span>
                                                      </div>
                                                    )}
                                                    {test.status && test.status !== 'Accepted' && (
                                                      <div className="flex">
                                                        <span className="font-medium text-gray-600 w-16">Status:</span>
                                                        <span className="text-gray-700 text-xs">
                                                          {test.status}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              )) : (
                                                <div className="p-4 text-center text-gray-500">
                                                  {testData.api_limit_reached ? 
                                                    'No test cases to display - API rate limit reached before execution' : 
                                                    'No test results available'
                                                  }
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </>
                                      )
                                    } catch (e) {
                                      // Fallback for old format or parsing errors
                                      return (
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2">
                                            <TestTube className="w-5 h-5 text-pink-500" />
                                            <span className="font-bold text-gray-800">Test Results</span>
                                            {interaction.content.includes('100%') ? (
                                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            ) : (
                                              <XCircle className="w-5 h-5 text-red-500" />
                                            )}
                                          </div>
                                          <div className="text-lg font-bold text-gray-900 p-2 bg-gray-50 rounded border">
                                            {interaction.content}
                                          </div>
                                        </div>
                                      )
                                    }
                                  })()}
                                </div>
                              ) : (
                                formatAgentContent(interaction.content, interaction.agent)
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Show current working status if this agent is active */}
                        {isProcessing && 
                         visibleInteractions.length > 0 && 
                         visibleInteractions[visibleInteractions.length - 1].agent === selectedAgent && (
                          <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                              <span className="font-medium text-blue-800">Working...</span>
                            </div>
                            <p className="text-sm text-blue-700">
                              {getCurrentWorkingDescription()}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {isProcessing ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span>Agents are collaborating...</span>
              </>
            ) : currentPhase === 'complete' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-green-700 font-medium">Perfect solution achieved!</span>
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                <span>Ready for agent collaboration</span>
              </>
            )}
          </div>
          
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              currentPhase === 'complete' 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}