/**
 * Multi-Agent System - Main Entry Point
 * 
 * Exports all agents, types, and utilities for the phone validation MAS
 */

// Core Types
export type {
  AgentRole,
  AgentStatus,
  AgentMessage,
  AgentResponse,
  AgentError,
  AgentState,
  AgentConfig,
  ExecutionPlan,
  PlanStep,
  ValidationData,
  WhatsAppData,
  ConfidenceScore,
  RetryContext,
  ValidationResult,
  SupervisorState,
  APIConfig,
  ToolName
} from './types';

// Base Agent
export { BaseAgent } from './core/BaseAgent';

// Individual Agents
export { DecisionAgent } from './decision/DecisionAgent';
export { ValidationAgent } from './validation/ValidationAgent';
export { WhatsAppAgent } from './whatsapp/WhatsAppAgent';
export { RetryAgent } from './retry/RetryAgent';
export { ConfidenceAgent } from './confidence/ConfidenceAgent';

// Supervisor
export { Supervisor } from './supervisor/Supervisor';

// Observability
export { 
  ObservabilityLogger,
  createLogger,
  type LogEntry,
  type MetricEntry,
  type ExecutionSummary,
  type AgentExecutionMetrics
} from './observability/Logger';

// Import Supervisor for internal use
import { Supervisor } from './supervisor/Supervisor';

/**
 * Quick Start Factory Function
 * 
 * Creates a ready-to-use Supervisor with API configuration
 */
export function createMultiAgentSystem(config: {
  numverifyKey?: string;
  abstractKey?: string;
  whatsappKey?: string;
  numverifyBackupKey?: string;
  abstractBackupKey?: string;
  whatsappBackupKey?: string;
  enableLogging?: boolean;
  maxExecutionTime?: number;
}) {
  const supervisor = new Supervisor({
    apiConfig: {
      primary: {
        numverify: config.numverifyKey,
        abstract: config.abstractKey,
        whatsapp: config.whatsappKey
      },
      backup: {
        numverify: config.numverifyBackupKey,
        abstract: config.abstractBackupKey,
        whatsapp: config.whatsappBackupKey
      }
    },
    enableLogging: config.enableLogging ?? true,
    maxExecutionTime: config.maxExecutionTime
  });

  return supervisor;
}

/**
 * Validate Phone Number - Simplified API
 * 
 * One-liner validation with automatic agent orchestration
 */
export async function validatePhoneNumber(
  phoneNumber: string,
  options?: {
    country?: string;
    prioritizeSpeed?: boolean;
    maxCost?: number;
    apiKeys?: {
      numverify?: string;
      abstract?: string;
      whatsapp?: string;
    };
  }
) {
  const supervisor = createMultiAgentSystem({
    numverifyKey: options?.apiKeys?.numverify || process.env.NUMVERIFY_API_KEY,
    abstractKey: options?.apiKeys?.abstract || process.env.ABSTRACT_API_KEY,
    whatsappKey: options?.apiKeys?.whatsapp || process.env.WHATSAPP_API_KEY,
    enableLogging: true
  });

  return await supervisor.validate({
    phoneNumber,
    country: options?.country,
    userPreferences: {
      prioritizeSpeed: options?.prioritizeSpeed,
      maxCost: options?.maxCost
    }
  });
}
