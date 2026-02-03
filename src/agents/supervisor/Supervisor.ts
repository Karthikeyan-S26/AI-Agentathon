/**
 * Supervisor - Multi-Agent System Orchestrator (Supervisor Pattern)
 * 
 * Coordinates all agents in the system, manages the execution plan,
 * handles agent handoffs, and implements the Chain of Thought/Execution logging.
 */

import { DecisionAgent } from '../decision/DecisionAgent';
import { ValidationAgent } from '../validation/ValidationAgent';
import { WhatsAppAgent } from '../whatsapp/WhatsAppAgent';
import { RetryAgent } from '../retry/RetryAgent';
import { ConfidenceAgent } from '../confidence/ConfidenceAgent';
import type {
  ValidationResult,
  ExecutionPlan,
  SupervisorState,
  AgentMessage,
  AgentRole,
  AgentState,
  APIConfig,
  ValidationData,
  WhatsAppData,
  ConfidenceScore,
  RetryContext,
  AgentResponse
} from '../types';

interface SupervisorConfig {
  apiConfig: APIConfig;
  enableLogging?: boolean;
  maxExecutionTime?: number;
}

interface ValidationRequest {
  phoneNumber: string;
  country?: string;
  userPreferences?: {
    maxCost?: number;
    prioritizeSpeed?: boolean;
  };
}

export class Supervisor {
  private decisionAgent: DecisionAgent;
  private validationAgent: ValidationAgent;
  private whatsappAgent: WhatsAppAgent;
  private retryAgent: RetryAgent;
  private confidenceAgent: ConfidenceAgent;
  
  private state: SupervisorState;
  private config: SupervisorConfig;

  constructor(config: SupervisorConfig) {
    this.config = {
      enableLogging: true,
      maxExecutionTime: 30000, // 30 seconds
      ...config
    };

    // Initialize all agents
    this.decisionAgent = new DecisionAgent();
    this.validationAgent = new ValidationAgent();
    this.whatsappAgent = new WhatsAppAgent();
    this.retryAgent = new RetryAgent();
    this.confidenceAgent = new ConfidenceAgent();

    // Initialize state
    this.state = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      agents: new Map<AgentRole, AgentState>(),
      messageQueue: []
    };

    this.log('🎯 Supervisor initialized with all agents');
  }

  /**
   * Main entry point - Orchestrate the complete validation workflow
   */
  async validate(request: ValidationRequest): Promise<ValidationResult> {
    this.log('\n' + '='.repeat(60));
    this.log(`🚀 Starting validation for: ${request.phoneNumber}`);
    this.log('='.repeat(60));

    this.state.startTime = Date.now();
    const chainOfThought: string[] = [];
    const chainOfExecution: string[] = [];

    try {
      // === PHASE 1: DECISION & PLANNING ===
      this.logPhase('PHASE 1: STRATEGIC PLANNING');
      
      const planResponse = await this.decisionAgent.execute({
        phoneNumber: request.phoneNumber,
        country: request.country,
        userPreferences: request.userPreferences
      });

      if (!planResponse.success || !planResponse.data) {
        throw new Error('Decision agent failed to create execution plan');
      }

      const plan = planResponse.data;
      this.state.currentPlan = plan;
      
      chainOfThought.push(...planResponse.metadata.reasoning);
      chainOfExecution.push(`Decision Agent: Created ${plan.steps.length}-step plan`);
      
      this.log(`📋 Execution Plan:`);
      plan.steps.forEach(step => {
        this.log(`   ${step.id}. ${step.agent} → ${step.action}`);
      });
      this.log(`   Risk Level: ${plan.riskLevel.toUpperCase()}`);
      this.log(`   Estimated Cost: $${plan.estimatedCost.toFixed(4)}`);

      // === PHASE 2: VALIDATION ===
      this.logPhase('PHASE 2: PHONE VALIDATION');
      
      const validationSteps = plan.steps.filter(s => s.agent === 'validation');
      const validationTools = validationSteps.map(s => s.tool!);
      
      let validationData: ValidationData | null = null;
      let retryContext: RetryContext | undefined;

      const validationResponse = await this.executeWithRetry(
        () => this.validationAgent.execute({
          phoneNumber: request.phoneNumber,
          tools: validationTools,
          apiKeys: this.config.apiConfig.primary,
          retryContext
        }),
        'validation',
        validationTools[0]
      );

      if (validationResponse.success && validationResponse.data) {
        validationData = validationResponse.data as ValidationData;
        retryContext = {
          attempts: validationResponse.metadata.retriesAttempted,
          maxAttempts: 3,
          backoffDelay: 2000,
          useBackupKey: validationResponse.metadata.retriesAttempted > 0,
          failedTools: []
        };
        
        chainOfThought.push(...validationResponse.metadata.reasoning);
        chainOfExecution.push(`Validation Agent: Retrieved data from ${validationData.source}`);
        
        this.log(`✅ Validation complete: ${validationData.valid ? 'VALID' : 'INVALID'}`);
        this.log(`   Country: ${validationData.countryName} (${validationData.countryCode})`);
        this.log(`   Carrier: ${validationData.carrier || 'Unknown'}`);
        this.log(`   Line Type: ${validationData.lineType}`);
      } else {
        throw new Error(`Validation failed: ${validationResponse.error?.message}`);
      }

      // === PHASE 3: WHATSAPP CHECK ===
      let whatsappData: WhatsAppData | undefined;
      
      if (!plan.skipWhatsApp && validationData.lineType === 'mobile') {
        this.logPhase('PHASE 3: WHATSAPP INTELLIGENCE');
        
        const whatsappResponse = await this.executeWithRetry(
          () => this.whatsappAgent.execute({
            phoneNumber: request.phoneNumber,
            apiKey: this.config.apiConfig.primary.whatsapp,
            retryContext
          }),
          'whatsapp',
          'whatsapp'
        );

        if (whatsappResponse.success && whatsappResponse.data) {
          whatsappData = whatsappResponse.data as WhatsAppData;
          chainOfThought.push(...whatsappResponse.metadata.reasoning);
          chainOfExecution.push(`WhatsApp Agent: ${whatsappData.exists ? 'Found' : 'Not found'}`);
          
          this.log(`✅ WhatsApp check: ${whatsappData.exists ? 'EXISTS' : 'NOT FOUND'}`);
          if (whatsappData.exists) {
            this.log(`   Verified: ${whatsappData.verified ? 'Yes' : 'No'}`);
            this.log(`   Business: ${whatsappData.businessAccount ? 'Yes' : 'No'}`);
          }
        }
      } else {
        this.logPhase('PHASE 3: WHATSAPP CHECK SKIPPED');
        this.log(`   Reason: ${plan.skipWhatsApp ? 'Planned skip' : 'Non-mobile number'}`);
        chainOfExecution.push('WhatsApp Agent: Skipped');
      }

      // === PHASE 4: CONFIDENCE SCORING ===
      this.logPhase('PHASE 4: CONFIDENCE ANALYSIS');
      
      const confidenceResponse = await this.confidenceAgent.execute({
        validation: validationData,
        whatsapp: whatsappData,
        retryContext,
        executionPlan: {
          skipWhatsApp: plan.skipWhatsApp,
          riskLevel: plan.riskLevel
        }
      });

      if (!confidenceResponse.success || !confidenceResponse.data) {
        throw new Error('Confidence scoring failed');
      }

      const confidence = confidenceResponse.data as ConfidenceScore;
      chainOfThought.push(...confidenceResponse.metadata.reasoning);
      chainOfExecution.push(`Confidence Agent: Score ${confidence.score}/100`);

      this.log(`✅ Confidence Score: ${confidence.score}/100`);
      this.log(`   Reasoning: ${confidence.reasoning}`);
      
      if (confidence.discrepancies.length > 0) {
        this.log(`   ⚠️  Discrepancies:`);
        confidence.discrepancies.forEach(d => this.log(`      - ${d}`));
      }
      
      if (confidence.recommendations.length > 0) {
        this.log(`   💡 Recommendations:`);
        confidence.recommendations.forEach(r => this.log(`      - ${r}`));
      }

      // === FINAL RESULT ===
      const totalExecutionTime = Date.now() - this.state.startTime;
      
      const result: ValidationResult = {
        phoneNumber: request.phoneNumber,
        validation: validationData,
        whatsapp: whatsappData,
        confidence,
        executionPlan: plan,
        totalExecutionTime,
        chainOfThought,
        chainOfExecution
      };

      this.state.finalResult = result;

      this.log('\n' + '='.repeat(60));
      this.log(`✅ VALIDATION COMPLETE in ${totalExecutionTime}ms`);
      this.log(`   Final Score: ${confidence.score}/100`);
      this.log(`   Recommendation: ${this.confidenceAgent.getRecommendation(confidence.score)}`);
      this.log('='.repeat(60) + '\n');

      return result;

    } catch (error) {
      this.log(`❌ SYSTEM ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      throw error;
    }
  }

  /**
   * Execute an agent task with automatic retry on failure
   */
  private async executeWithRetry(
    task: () => Promise<AgentResponse>,
    agentRole: AgentRole,
    tool: any
  ): Promise<AgentResponse> {
    const response = await task();

    // If failed and recoverable, trigger retry agent
    if (!response.success && response.error?.recoverable) {
      this.log(`⚠️  ${agentRole} failed - triggering Retry Agent...`);
      
      const retryResponse = await this.retryAgent.execute({
        originalError: response.error,
        originalTask: task,
        apiConfig: this.config.apiConfig,
        failedTool: tool
      });

      if (retryResponse.success && retryResponse.data) {
        const retryResult = retryResponse.data as any;
        this.log(`✅ Retry Agent ${retryResult.success ? 'succeeded' : 'exhausted'}`);
        return retryResult.finalResponse;
      }
    }

    return response;
  }

  /**
   * Get current system state for observability
   */
  getState(): SupervisorState {
    return {
      ...this.state,
      agents: new Map([
        ['decision', this.decisionAgent.getState()],
        ['validation', this.validationAgent.getState()],
        ['whatsapp', this.whatsappAgent.getState()],
        ['retry', this.retryAgent.getState()],
        ['confidence', this.confidenceAgent.getState()]
      ])
    };
  }

  /**
   * Get Chain of Thought log
   */
  getChainOfThought(): string[] {
    return this.state.finalResult?.chainOfThought || [];
  }

  /**
   * Get Chain of Execution log
   */
  getChainOfExecution(): string[] {
    return this.state.finalResult?.chainOfExecution || [];
  }

  /**
   * Logging utilities
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(message);
    }
  }

  private logPhase(phase: string): void {
    this.log(`\n${'─'.repeat(60)}`);
    this.log(`  ${phase}`);
    this.log('─'.repeat(60));
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset supervisor for new validation
   */
  reset(): void {
    this.state = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      agents: new Map<AgentRole, AgentState>(),
      messageQueue: []
    };

    // Reset all agents
    this.decisionAgent.reset();
    this.validationAgent.reset();
    this.whatsappAgent.reset();
    this.retryAgent.reset();
    this.confidenceAgent.reset();

    this.log('🔄 Supervisor reset for new validation');
  }
}
