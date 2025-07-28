import { 
  Problem, 
  LearningSession, 
  SolutionAttempt, 
  ImprovementLog,
  CodeGenerationResponse,
  TestExecutionResponse,
  ReinforcementResponse,
  StreamingChunk,
  ProblemFilters,
  AnalyticsData,
  APIError
} from '@/types/backend';
import { supabase } from './supabase';

class APIService {
  private baseURL = 'https://mbuiluhrtlgyawlqchaq.supabase.co/functions/v1'
  
  // ============ PROBLEM MANAGEMENT ============
  
  /**
   * Get all problems with optional filtering
   */
  async getProblems(filters?: ProblemFilters): Promise<Problem[]> {
    let query = supabase
      .from('problems')
      .select('*')
      .order('id', { ascending: true });
    
    if (filters?.difficulty && filters.difficulty.length > 0) {
      query = query.in('difficulty', filters.difficulty);
    }
    
    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new APIError('Failed to fetch problems', 500, error);
    }
    
    return data || [];
  }
  
  /**
   * Get single problem by ID
   */
  async getProblem(id: number): Promise<Problem> {
    const { data, error } = await supabase
      .from('problems')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      throw new APIError('Failed to fetch problem', 404, error);
    }
    
    return data;
  }
  
  // ============ AI CODE GENERATION ============
  
  /**
   * Generate code with streaming (non-streaming fallback)
   */
  async generateCode(params: {
    problem_id: number
    language?: string
    stream?: boolean
    context?: string
    attempt_number?: number
  }): Promise<CodeGenerationResponse> {
    const response = await fetch(`${this.baseURL}/code-generator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problem_id: params.problem_id,
        language: params.language || 'python',
        stream: false, // Non-streaming for direct API calls
        context: params.context || '',
        attempt_number: params.attempt_number || 1
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        `Code generation failed: ${response.status}`,
        response.status,
        errorData
      );
    }
    
    return response.json();
  }
  
  /**
   * Stream AI code generation (for real-time UI)
   */
  async streamCodeGeneration(params: {
    problem_id: number
    language?: string
    context?: string
    attempt_number?: number
    auto_mode?: boolean  // NEW: Auto-mode toggle
  }): Promise<ReadableStream<StreamingChunk>> {
    const response = await fetch(`${this.baseURL}/code-generator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problem_id: params.problem_id,
        language: params.language || 'python',
        stream: true,
        include_reasoning: true,
        context: params.context || '',
        attempt_number: params.attempt_number || 1,
        auto_mode: params.auto_mode || false  // NEW: Pass auto-mode to backend
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        `Streaming failed: ${response.status}`,
        response.status,
        errorData
      );
    }
    
    return this.parseEventStream(response.body!);
  }
  
  // ============ CODE TESTING ============
  
  /**
   * Test generated code against problem test cases
   */
  async testCode(params: {
    problem_id: number
    solution_code: string
    language?: string
  }): Promise<TestExecutionResponse> {
    const response = await fetch(`${this.baseURL}/smart-handler`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problem_id: params.problem_id,
        solution_code: params.solution_code,
        language: params.language || 'python'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        `Code testing failed: ${response.status}`,
        response.status,
        errorData
      );
    }
    
    return response.json();
  }
  
  // ============ SELF-REINFORCEMENT LEARNING ============
  
  /**
   * Start AI learning session (multiple attempts with improvement)
   */
  async startLearningSession(params: {
    problem_id: number
    language?: string
    max_attempts?: number
    session_id?: string
  }): Promise<ReinforcementResponse> {
    const response = await fetch(`${this.baseURL}/reinforcement-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problem_id: params.problem_id,
        language: params.language || 'python',
        max_attempts: params.max_attempts || 5,
        session_id: params.session_id
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        `Learning session failed: ${response.status}`,
        response.status,
        errorData
      );
    }
    
    return response.json();
  }
  
  // ============ CODE MANAGEMENT ============
  
  /**
   * Save/update code for a problem
   */
  async saveCode(params: {
    problem_id: number
    code: string
    language?: string
  }): Promise<{ success: boolean; message: string }> {
    const { data, error } = await supabase
      .from('problems')
      .update({ 
        code: params.code,
        // Optionally update a last_modified timestamp if you have one
        // last_modified: new Date().toISOString()
      })
      .eq('id', params.problem_id)
      .select();
    
    if (error) {
      throw new APIError('Failed to save code', 500, error);
    }
    
    return {
      success: true,
      message: 'Code saved successfully'
    };
  }
  
  // ============ LEARNING ANALYTICS ============
  
  /**
   * Get learning session details
   */
  async getLearningSession(sessionId: string): Promise<{
    session: LearningSession
    attempts: SolutionAttempt[]
    improvements: ImprovementLog[]
  }> {
    const [sessionData, attemptsData, improvementsData] = await Promise.all([
      supabase
        .from('reinforcement_sessions')
        .select('*')
        .eq('id', sessionId)
        .single(),
      supabase
        .from('solution_attempts')
        .select('*')
        .eq('session_id', sessionId)
        .order('attempt_number'),
      supabase
        .from('improvement_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at')
    ]);
    
    if (sessionData.error) {
      throw new APIError('Failed to fetch session', 404, sessionData.error);
    }
    
    return {
      session: sessionData.data,
      attempts: attemptsData.data || [],
      improvements: improvementsData.data || []
    };
  }
  
  /**
   * Get recent learning sessions
   */
  async getRecentSessions(limit: number = 10): Promise<LearningSession[]> {
    const { data, error } = await supabase
      .from('reinforcement_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new APIError('Failed to fetch sessions', 500, error);
    }
    
    return data || [];
  }
  
  /**
   * Get analytics data for dashboard
   */
  async getAnalytics(timeRange?: {
    start: string
    end: string
  }): Promise<AnalyticsData> {
    let query = supabase
      .from('reinforcement_sessions')
      .select(`
        *,
        solution_attempts(*)
      `)
      .order('started_at', { ascending: false });
    
    if (timeRange) {
      query = query
        .gte('started_at', timeRange.start)
        .lte('started_at', timeRange.end);
    }
    
    const { data: sessions, error } = await query;
    
    if (error) {
      throw new APIError('Failed to fetch analytics', 500, error);
    }
    
    return this.processAnalyticsData(sessions || []);
  }
  
  // ============ HELPER METHODS ============
  
  /**
   * Parse Server-Sent Events stream
   */
  private parseEventStream(stream: ReadableStream): ReadableStream<StreamingChunk> {
    const decoder = new TextDecoder();
    
    return new ReadableStream({
      start(controller) {
        const reader = stream.getReader();
        let buffer = '';
        
        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  controller.enqueue(data);
                } catch (e) {
                  console.error('Failed to parse streaming data:', e);
                }
              }
            }
            
            return pump();
          });
        }
        
        return pump();
      }
    });
  }
  
  /**
   * Process analytics data
   */
  private processAnalyticsData(sessions: any[]): AnalyticsData {
    const totalSessions = sessions.length;
    const solvedSessions = sessions.filter(s => s.status === 'solved').length;
    const successRate = totalSessions > 0 ? (solvedSessions / totalSessions) * 100 : 0;
    
    // Calculate average attempts
    const totalAttempts = sessions.reduce((sum, s) => sum + (s.total_attempts || 0), 0);
    const avgAttempts = totalSessions > 0 ? totalAttempts / totalSessions : 0;
    
    // Difficulty breakdown
    const difficultyMap = new Map<string, { count: number; solved: number }>();
    sessions.forEach(session => {
      // We would need to join with problems table to get difficulty
      // For now, using placeholder logic
      const difficulty = 'Medium'; // This would come from joining with problems
      const current = difficultyMap.get(difficulty) || { count: 0, solved: 0 };
      current.count += 1;
      if (session.status === 'solved') current.solved += 1;
      difficultyMap.set(difficulty, current);
    });
    
    const difficultyBreakdown = Array.from(difficultyMap.entries()).map(([difficulty, stats]) => ({
      difficulty,
      count: stats.count,
      success_rate: stats.count > 0 ? (stats.solved / stats.count) * 100 : 0
    }));
    
    // Progress over time (last 30 days)
    const progressOverTime = this.calculateProgressOverTime(sessions);
    
    // Topic mastery (placeholder)
    const topicMastery = [
      { topic: 'Arrays', mastery: 85 },
      { topic: 'Strings', mastery: 92 },
      { topic: 'Dynamic Programming', mastery: 67 },
      { topic: 'Trees', mastery: 78 }
    ];
    
    return {
      totalProblems: totalSessions,
      successRate: Math.round(successRate),
      totalSessions,
      avgAttempts: Math.round(avgAttempts * 10) / 10,
      difficultyBreakdown,
      progressOverTime,
      topicMastery
    };
  }
  
  /**
   * Calculate progress over time
   */
  private calculateProgressOverTime(sessions: any[]): { date: string; success_rate: number }[] {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const dailyStats = new Map<string, { total: number; solved: number }>();
    
    sessions.forEach(session => {
      const date = new Date(session.started_at);
      if (date >= thirtyDaysAgo) {
        const dateStr = date.toISOString().split('T')[0];
        const current = dailyStats.get(dateStr) || { total: 0, solved: 0 };
        current.total += 1;
        if (session.status === 'solved') current.solved += 1;
        dailyStats.set(dateStr, current);
      }
    });
    
    const result: { date: string; success_rate: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const stats = dailyStats.get(dateStr) || { total: 0, solved: 0 };
      const success_rate = stats.total > 0 ? (stats.solved / stats.total) * 100 : 0;
      result.push({ date: dateStr, success_rate: Math.round(success_rate) });
    }
    
    return result;
  }
}

export const apiService = new APIService(); 