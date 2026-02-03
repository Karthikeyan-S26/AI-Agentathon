/**
 * Multi-Agent System Types
 * Defines the structure for agent communication, execution plans, and observability
 */

export type AgentRole = 
  | 'decision'      // Strategic Orchestrator
  | 'validation'    // Technical Data Extractor
  | 'whatsapp'      // WhatsApp Intelligence
  | 'retry'         // Resilience Engineer
  | 'confidence';   // Quality Controller

export type AgentStatus = 
  | 'idle'
  | 'thinking'
  | 'acting'
  | 'waiting'
  | 'complete'
  | 'error';

export type ToolName = 
  | 'numverify'
  | 'abstract'
  | 'whatsapp'
  | 'none';

/**
 * Agent Message - Communication between agents
 */
export interface AgentMessage {
  id: string;
  from: AgentRole;
  to: AgentRole | 'supervisor';
  timestamp: number;
  type: 'task' | 'result' | 'error' | 'query';
  content: any;
  reasoning?: string; // Chain of Thought
}

/**
 * Execution Plan - Created by Decision Agent
 */
export interface ExecutionPlan {
  id: string;
  steps: PlanStep[];
  estimatedCost: number;
  riskLevel: 'low' | 'medium' | 'high';
  skipWhatsApp: boolean;
  reasoning: string[];
}

export interface PlanStep {
  id: number;
  agent: AgentRole;
  action: string;
  tool?: ToolName;
  condition?: string;
  dependsOn?: number[];
}

/**
 * Agent Response - Standardized output format
 */
export interface AgentResponse<T = any> {
  success: boolean;
  agent: AgentRole;
  data?: T;
  error?: AgentError;
  metadata: {
    executionTime: number;
    retriesAttempted: number;
    toolsUsed: ToolName[];
    reasoning: string[];
  };
}

export interface AgentError {
  code: string;
  message: string;
  recoverable: boolean;
  suggestedAction?: string;
}

/**
 * Validation Data - Output from Validation Agent
 */
export interface ValidationData {
  phoneNumber: string;
  countryCode: string;
  countryName: string;
  carrier?: string;
  lineType: 'mobile' | 'landline' | 'voip' | 'unknown';
  valid: boolean;
  formatted?: string;
  source: 'numverify' | 'abstract' | 'both';
  rawData: any;
}

/**
 * WhatsApp Data - Output from WhatsApp Agent
 */
export interface WhatsAppData {
  exists: boolean;
  verified: boolean;
  businessAccount: boolean;
  lastSeen?: string;
  profilePicture?: boolean;
  about?: string;
}

/**
 * Confidence Score - Output from Confidence Agent
 */
export interface ConfidenceScore {
  score: number; // 0-100
  reasoning: string;
  discrepancies: string[];
  recommendations: string[];
  breakdown: {
    baseScore: number;
    carrierDeduction: number;
    retryDeduction: number;
    whatsappBonus: number;
  };
}

/**
 * Retry Context - Used by Retry Agent
 */
export interface RetryContext {
  attempts: number;
  maxAttempts: number;
  lastError?: AgentError;
  backoffDelay: number;
  useBackupKey: boolean;
  failedTools: ToolName[];
}

/**
 * Agent State - For observability
 */
export interface AgentState {
  role: AgentRole;
  status: AgentStatus;
  currentTask?: string;
  thoughtProcess: string[];
  actionsPerformed: string[];
  startTime?: number;
  endTime?: number;
}

/**
 * System Prompt Configuration
 */
export interface AgentConfig {
  role: AgentRole;
  systemPrompt: string;
  constraints: string[];
  tools: ToolName[];
  outputFormat: 'json' | 'text' | 'structured';
}

/**
 * Supervisor State - Overall system state
 */
export interface SupervisorState {
  sessionId: string;
  startTime: number;
  currentPlan?: ExecutionPlan;
  agents: Map<AgentRole, AgentState>;
  messageQueue: AgentMessage[];
  finalResult?: ValidationResult;
}

/**
 * Final Validation Result - Combined output
 */
export interface ValidationResult {
  phoneNumber: string;
  validation: ValidationData;
  whatsapp?: WhatsAppData;
  confidence: ConfidenceScore;
  executionPlan: ExecutionPlan;
  totalExecutionTime: number;
  chainOfThought: string[];
  chainOfExecution: string[];
}

/**
 * API Configuration
 */
export interface APIConfig {
  primary: {
    numverify?: string;
    abstract?: string;
    whatsapp?: string;
  };
  backup: {
    numverify?: string;
    abstract?: string;
    whatsapp?: string;
  };
}
