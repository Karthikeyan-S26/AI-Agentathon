/**
 * Retry & Recovery Agent - Resilience Engineer
 * 
 * System Prompt:
 * "You monitor system health. If any agent reports a rate limit (429) or timeout, you must:
 * 
 * 1. Implement a 2-second exponential backoff
 * 2. Switch from the primary API key to the secondary backup key
 * 3. Attempt the task exactly 3 times before declaring a final 'System Failure' status
 * 
 * Track all retry attempts and report them to the Confidence Scoring Agent."
 */

import { BaseAgent } from '../core/BaseAgent';
import type {
  AgentResponse,
  RetryContext,
  AgentError,
  ToolName,
  APIConfig
} from '../types';

interface RetryInput {
  originalError: AgentError;
  originalTask: () => Promise<AgentResponse>;
  apiConfig: APIConfig;
  failedTool: ToolName;
}

interface RetryResult {
  success: boolean;
  finalResponse: AgentResponse;
  context: RetryContext;
}

export class RetryAgent extends BaseAgent {
  private readonly MAX_ATTEMPTS = 3;
  private readonly BASE_BACKOFF_MS = 2000;

  constructor() {
    super({
      role: 'retry',
      systemPrompt: `You monitor system health. If any agent reports a rate limit (429) or timeout, you must:

1. Implement a 2-second exponential backoff
2. Switch from the primary API key to the secondary backup key
3. Attempt the task exactly 3 times before declaring a final 'System Failure' status

Track all retry attempts and report them to the Confidence Scoring Agent.`,
      constraints: [
        'Maximum 3 retry attempts',
        'Exponential backoff starting at 2 seconds',
        'Switch to backup keys after first failure',
        'Track and report all retry metadata'
      ],
      tools: ['none'],
      outputFormat: 'structured'
    });
  }

  async execute(input: RetryInput): Promise<AgentResponse<RetryResult>> {
    this.startTime = Date.now();
    this.setStatus('thinking');

    try {
      this.think(`Analyzing failure from ${input.originalError.code}`);
      
      // Determine if the error is retryable
      if (!input.originalError.recoverable) {
        this.think('Error is not recoverable - aborting retry');
        return this.createSuccessResponse({
          success: false,
          finalResponse: this.createErrorResponse(
            'NON_RECOVERABLE',
            'Original error is not recoverable',
            false
          ),
          context: {
            attempts: 0,
            maxAttempts: this.MAX_ATTEMPTS,
            lastError: input.originalError,
            backoffDelay: 0,
            useBackupKey: false,
            failedTools: [input.failedTool]
          }
        });
      }

      this.think('Error is recoverable - initiating retry sequence');
      this.setStatus('acting');

      // Initialize retry context
      const context: RetryContext = {
        attempts: 0,
        maxAttempts: this.MAX_ATTEMPTS,
        lastError: input.originalError,
        backoffDelay: this.BASE_BACKOFF_MS,
        useBackupKey: false,
        failedTools: [input.failedTool]
      };

      let finalResponse: AgentResponse | null = null;

      // Retry loop
      for (let attempt = 1; attempt <= this.MAX_ATTEMPTS; attempt++) {
        context.attempts = attempt;
        
        this.act(`Retry attempt ${attempt}/${this.MAX_ATTEMPTS}`);
        
        // Calculate exponential backoff
        const backoffDelay = this.BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
        context.backoffDelay = backoffDelay;
        
        this.think(`Waiting ${backoffDelay}ms before retry...`);
        await this.sleep(backoffDelay);

        // Switch to backup key after first failure
        if (attempt > 1 && !context.useBackupKey) {
          this.think('Switching to backup API key');
          context.useBackupKey = true;
          this.act('Activated backup API configuration');
        }

        // Attempt the original task
        try {
          this.act(`Executing retry attempt ${attempt}...`);
          finalResponse = await input.originalTask();

          if (finalResponse.success) {
            this.think(`Retry attempt ${attempt} succeeded!`);
            this.setStatus('complete');
            
            return this.createSuccessResponse({
              success: true,
              finalResponse,
              context
            });
          } else {
            this.think(`Retry attempt ${attempt} failed: ${finalResponse.error?.message}`);
            context.lastError = finalResponse.error;
          }

        } catch (error) {
          this.think(`Retry attempt ${attempt} threw exception: ${error}`);
          context.lastError = {
            code: 'EXCEPTION',
            message: error instanceof Error ? error.message : 'Unknown error',
            recoverable: attempt < this.MAX_ATTEMPTS
          };
        }
      }

      // All retries exhausted
      this.think('All retry attempts exhausted - declaring System Failure');
      this.setStatus('error');

      const systemFailureResponse = this.createErrorResponse(
        'SYSTEM_FAILURE',
        `Failed after ${this.MAX_ATTEMPTS} retry attempts`,
        false,
        'System is experiencing persistent issues. Try again later or contact support.'
      );

      return this.createSuccessResponse({
        success: false,
        finalResponse: finalResponse || systemFailureResponse,
        context
      });

    } catch (error) {
      this.setStatus('error');
      return this.createErrorResponse(
        'RETRY_AGENT_ERROR',
        error instanceof Error ? error.message : 'Unknown error in retry agent',
        false
      );
    }
  }

  /**
   * Get appropriate API key based on retry context
   */
  getAPIKey(
    apiConfig: APIConfig,
    tool: ToolName,
    useBackup: boolean
  ): string | undefined {
    const keySet = useBackup ? apiConfig.backup : apiConfig.primary;
    
    switch (tool) {
      case 'numverify':
        return keySet.numverify;
      case 'abstract':
        return keySet.abstract;
      case 'whatsapp':
        return keySet.whatsapp;
      default:
        return undefined;
    }
  }

  /**
   * Determine if error warrants a retry
   */
  shouldRetry(error: AgentError): boolean {
    const retryableCodes = [
      'RATE_LIMIT',
      'TIMEOUT',
      'NETWORK_ERROR',
      'AUTH_ERROR', // Can retry with backup key
      '429',
      '503',
      '504'
    ];

    return error.recoverable && retryableCodes.includes(error.code);
  }

  /**
   * Sleep utility for backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a wrapped task with backup key injection
   */
  static wrapTaskWithBackupKey(
    originalTask: (apiKey: string) => Promise<AgentResponse>,
    apiConfig: APIConfig,
    tool: ToolName,
    useBackup: boolean
  ): () => Promise<AgentResponse> {
    return async () => {
      const keySet = useBackup ? apiConfig.backup : apiConfig.primary;
      let apiKey: string | undefined;

      switch (tool) {
        case 'numverify':
          apiKey = keySet.numverify;
          break;
        case 'abstract':
          apiKey = keySet.abstract;
          break;
        case 'whatsapp':
          apiKey = keySet.whatsapp;
          break;
      }

      if (!apiKey) {
        throw new Error(`No ${useBackup ? 'backup' : 'primary'} API key for ${tool}`);
      }

      return originalTask(apiKey);
    };
  }
}
