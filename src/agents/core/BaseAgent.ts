/**
 * Base Agent Class
 * All agents extend this to inherit common functionality
 */

import type {
  AgentRole,
  AgentStatus,
  AgentMessage,
  AgentResponse,
  AgentState,
  AgentConfig,
  ToolName
} from '../types';

export abstract class BaseAgent {
  protected role: AgentRole;
  protected status: AgentStatus = 'idle';
  protected thoughtProcess: string[] = [];
  protected actionsPerformed: string[] = [];
  protected startTime?: number;
  protected config: AgentConfig;

  constructor(config: AgentConfig) {
    this.role = config.role;
    this.config = config;
  }

  /**
   * Main execution method - must be implemented by each agent
   */
  abstract execute(input: any, context?: any): Promise<AgentResponse>;

  /**
   * Record a thought in the Chain of Thought
   */
  protected think(thought: string): void {
    this.thoughtProcess.push(`[${new Date().toISOString()}] ${thought}`);
    console.log(`🧠 ${this.role.toUpperCase()}: ${thought}`);
  }

  /**
   * Record an action in the Chain of Execution
   */
  protected act(action: string): void {
    this.actionsPerformed.push(`[${new Date().toISOString()}] ${action}`);
    console.log(`⚡ ${this.role.toUpperCase()}: ${action}`);
  }

  /**
   * Update agent status
   */
  protected setStatus(status: AgentStatus): void {
    this.status = status;
    console.log(`📊 ${this.role.toUpperCase()}: Status changed to ${status}`);
  }

  /**
   * Get current agent state for observability
   */
  getState(): AgentState {
    return {
      role: this.role,
      status: this.status,
      thoughtProcess: [...this.thoughtProcess],
      actionsPerformed: [...this.actionsPerformed],
      startTime: this.startTime,
      endTime: this.status === 'complete' ? Date.now() : undefined
    };
  }

  /**
   * Reset agent state for new task
   */
  reset(): void {
    this.status = 'idle';
    this.thoughtProcess = [];
    this.actionsPerformed = [];
    this.startTime = undefined;
  }

  /**
   * Create a standardized success response
   */
  protected createSuccessResponse<T>(
    data: T,
    toolsUsed: ToolName[] = [],
    retriesAttempted: number = 0
  ): AgentResponse<T> {
    const executionTime = this.startTime ? Date.now() - this.startTime : 0;
    
    return {
      success: true,
      agent: this.role,
      data,
      metadata: {
        executionTime,
        retriesAttempted,
        toolsUsed,
        reasoning: [...this.thoughtProcess]
      }
    };
  }

  /**
   * Create a standardized error response
   */
  protected createErrorResponse(
    code: string,
    message: string,
    recoverable: boolean = true,
    suggestedAction?: string
  ): AgentResponse {
    const executionTime = this.startTime ? Date.now() - this.startTime : 0;
    
    return {
      success: false,
      agent: this.role,
      error: {
        code,
        message,
        recoverable,
        suggestedAction
      },
      metadata: {
        executionTime,
        retriesAttempted: 0,
        toolsUsed: [],
        reasoning: [...this.thoughtProcess]
      }
    };
  }

  /**
   * Validate tool availability
   */
  protected canUseTool(tool: ToolName): boolean {
    return this.config.tools.includes(tool);
  }

  /**
   * Get system prompt
   */
  getSystemPrompt(): string {
    return this.config.systemPrompt;
  }

  /**
   * Get role
   */
  getRole(): AgentRole {
    return this.role;
  }
}
