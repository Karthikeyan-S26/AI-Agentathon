/**
 * Observability Logger - Chain of Thought & Chain of Execution Tracker
 * 
 * Provides structured logging and monitoring for the Multi-Agent System
 */

import type {
  AgentRole,
  AgentState,
  SupervisorState,
  ValidationResult
} from '../types';

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'debug' | 'warn' | 'error';
  agent?: AgentRole;
  type: 'thought' | 'action' | 'system' | 'metric';
  message: string;
  metadata?: Record<string, any>;
}

export interface MetricEntry {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  agent?: AgentRole;
}

export class ObservabilityLogger {
  private logs: LogEntry[] = [];
  private metrics: MetricEntry[] = [];
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Log a thought from an agent (Chain of Thought)
   */
  logThought(agent: AgentRole, thought: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level: 'debug',
      agent,
      type: 'thought',
      message: thought,
      metadata
    };
    
    this.logs.push(entry);
    console.log(`🧠 [${agent.toUpperCase()}] ${thought}`);
  }

  /**
   * Log an action from an agent (Chain of Execution)
   */
  logAction(agent: AgentRole, action: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level: 'info',
      agent,
      type: 'action',
      message: action,
      metadata
    };
    
    this.logs.push(entry);
    console.log(`⚡ [${agent.toUpperCase()}] ${action}`);
  }

  /**
   * Log a system event
   */
  logSystem(message: string, level: 'info' | 'warn' | 'error' = 'info', metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      type: 'system',
      message,
      metadata
    };
    
    this.logs.push(entry);
    
    const icon = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [SYSTEM] ${message}`);
  }

  /**
   * Record a metric
   */
  recordMetric(name: string, value: number, unit: string, agent?: AgentRole): void {
    const metric: MetricEntry = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      agent
    };
    
    this.metrics.push(metric);
  }

  /**
   * Get Chain of Thought - All reasoning steps
   */
  getChainOfThought(): string[] {
    return this.logs
      .filter(log => log.type === 'thought')
      .map(log => `[${log.agent}] ${log.message}`);
  }

  /**
   * Get Chain of Execution - All actions performed
   */
  getChainOfExecution(): string[] {
    return this.logs
      .filter(log => log.type === 'action')
      .map(log => `[${log.agent}] ${log.message}`);
  }

  /**
   * Get all logs for a specific agent
   */
  getAgentLogs(agent: AgentRole): LogEntry[] {
    return this.logs.filter(log => log.agent === agent);
  }

  /**
   * Get all metrics for a specific agent
   */
  getAgentMetrics(agent: AgentRole): MetricEntry[] {
    return this.metrics.filter(metric => metric.agent === agent);
  }

  /**
   * Generate execution summary
   */
  generateSummary(result: ValidationResult): ExecutionSummary {
    const totalTime = result.totalExecutionTime;
    const agentMetrics = this.calculateAgentMetrics();
    
    return {
      sessionId: this.sessionId,
      duration: totalTime,
      success: result.confidence.score >= 50,
      confidenceScore: result.confidence.score,
      agentExecutions: agentMetrics,
      totalLogs: this.logs.length,
      totalMetrics: this.metrics.length,
      chainOfThought: result.chainOfThought,
      chainOfExecution: result.chainOfExecution,
      apiCallsMade: this.countAPICalls(),
      retriesPerformed: this.countRetries()
    };
  }

  /**
   * Calculate metrics per agent
   */
  private calculateAgentMetrics(): Record<AgentRole, AgentExecutionMetrics> {
    const agents: AgentRole[] = ['decision', 'validation', 'whatsapp', 'retry', 'confidence'];
    const metrics: Record<string, AgentExecutionMetrics> = {};

    for (const agent of agents) {
      const agentLogs = this.getAgentLogs(agent);
      const actions = agentLogs.filter(l => l.type === 'action');
      const thoughts = agentLogs.filter(l => l.type === 'thought');
      
      const startTime = agentLogs[0]?.timestamp || 0;
      const endTime = agentLogs[agentLogs.length - 1]?.timestamp || 0;
      
      metrics[agent] = {
        executionTime: endTime - startTime,
        thoughtsRecorded: thoughts.length,
        actionsPerformed: actions.length,
        errorsEncountered: agentLogs.filter(l => l.level === 'error').length
      };
    }

    return metrics as Record<AgentRole, AgentExecutionMetrics>;
  }

  /**
   * Count total API calls made
   */
  private countAPICalls(): number {
    return this.logs.filter(log => 
      log.message.includes('Calling') || 
      log.message.includes('API')
    ).length;
  }

  /**
   * Count retry attempts
   */
  private countRetries(): number {
    return this.logs.filter(log => 
      log.agent === 'retry' && 
      log.message.includes('attempt')
    ).length;
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      logs: this.logs,
      metrics: this.metrics,
      exportedAt: Date.now()
    }, null, 2);
  }

  /**
   * Print formatted execution timeline
   */
  printTimeline(): void {
    console.log('\n' + '='.repeat(80));
    console.log('EXECUTION TIMELINE');
    console.log('='.repeat(80));

    const startTime = this.logs[0]?.timestamp || Date.now();

    this.logs.forEach(log => {
      const elapsed = log.timestamp - startTime;
      const icon = this.getLogIcon(log);
      const agent = log.agent ? `[${log.agent.toUpperCase()}]` : '[SYSTEM]';
      
      console.log(`${elapsed.toString().padStart(6, ' ')}ms ${icon} ${agent} ${log.message}`);
    });

    console.log('='.repeat(80) + '\n');
  }

  /**
   * Get appropriate icon for log type
   */
  private getLogIcon(log: LogEntry): string {
    if (log.level === 'error') return '❌';
    if (log.level === 'warn') return '⚠️';
    if (log.type === 'thought') return '🧠';
    if (log.type === 'action') return '⚡';
    if (log.type === 'metric') return '📊';
    return 'ℹ️';
  }

  /**
   * Clear all logs and metrics
   */
  clear(): void {
    this.logs = [];
    this.metrics = [];
  }
}

/**
 * Supporting Types
 */
export interface ExecutionSummary {
  sessionId: string;
  duration: number;
  success: boolean;
  confidenceScore: number;
  agentExecutions: Record<AgentRole, AgentExecutionMetrics>;
  totalLogs: number;
  totalMetrics: number;
  chainOfThought: string[];
  chainOfExecution: string[];
  apiCallsMade: number;
  retriesPerformed: number;
}

export interface AgentExecutionMetrics {
  executionTime: number;
  thoughtsRecorded: number;
  actionsPerformed: number;
  errorsEncountered: number;
}

/**
 * Create a logger instance for a validation session
 */
export function createLogger(sessionId: string): ObservabilityLogger {
  return new ObservabilityLogger(sessionId);
}
