/**
 * Decision Agent - Strategic Orchestrator (Plan-and-Execute Pattern)
 * 
 * System Prompt:
 * "You are the Brain of a phone validation system. Your goal is to optimize for accuracy 
 * while minimizing API costs. Analyze the input phone number for country and format. 
 * If the number is a landline, immediately skip the WhatsApp check and inform the user. 
 * If the country has a high risk of fraud, trigger both NumVerify and Abstract API for 
 * cross-validation. Plan the sequence of agent handoffs and output a structured plan for execution."
 */

import { BaseAgent } from '../core/BaseAgent';
import type {
  AgentResponse,
  ExecutionPlan,
  PlanStep,
  AgentRole
} from '../types';

interface DecisionInput {
  phoneNumber: string;
  country?: string;
  userPreferences?: {
    maxCost?: number;
    prioritizeSpeed?: boolean;
  };
}

// High-risk countries that require dual validation
const HIGH_RISK_COUNTRIES = [
  'NG', 'PK', 'IN', 'BD', 'ID', 'GH', 'KE', 'UG', 'ZA'
];

// Countries with high landline usage
const LANDLINE_COMMON_COUNTRIES = [
  'DE', 'FR', 'IT', 'ES', 'JP', 'KR', 'CN'
];

export class DecisionAgent extends BaseAgent {
  constructor() {
    super({
      role: 'decision',
      systemPrompt: `You are the Brain of a phone validation system. Your goal is to optimize for accuracy while minimizing API costs.

Analyze the input phone number for country and format.
If the number is a landline, immediately skip the WhatsApp check and inform the user.
If the country has a high risk of fraud, trigger both NumVerify and Abstract API for cross-validation.
Plan the sequence of agent handoffs and output a structured plan for execution.`,
      constraints: [
        'Minimize API costs while maximizing accuracy',
        'Skip WhatsApp check for landlines',
        'Use dual validation for high-risk countries',
        'Create deterministic execution plans'
      ],
      tools: ['none'],
      outputFormat: 'structured'
    });
  }

  async execute(input: DecisionInput): Promise<AgentResponse<ExecutionPlan>> {
    this.startTime = Date.now();
    this.setStatus('thinking');

    try {
      this.think('Analyzing phone number input...');
      
      const { phoneNumber, country, userPreferences } = input;
      
      // Extract country code from phone number
      const detectedCountry = this.detectCountryCode(phoneNumber);
      const finalCountry = country || detectedCountry;

      this.think(`Detected country: ${finalCountry}`);

      // Check if country is high-risk
      const isHighRisk = HIGH_RISK_COUNTRIES.includes(finalCountry);
      this.think(`Risk level: ${isHighRisk ? 'HIGH' : 'LOW'}`);

      // Check if landline is likely
      const isLandlineLikely = this.isLandlineLikely(phoneNumber, finalCountry);
      this.think(`Landline probability: ${isLandlineLikely ? 'HIGH' : 'LOW'}`);

      // Build execution plan
      this.setStatus('acting');
      this.act('Creating execution plan...');

      const plan = this.createExecutionPlan(
        phoneNumber,
        finalCountry,
        isHighRisk,
        isLandlineLikely,
        userPreferences
      );

      this.act(`Plan created with ${plan.steps.length} steps`);
      this.setStatus('complete');

      return this.createSuccessResponse(plan);

    } catch (error) {
      this.setStatus('error');
      return this.createErrorResponse(
        'DECISION_ERROR',
        error instanceof Error ? error.message : 'Unknown error in decision agent',
        false,
        'Retry with simplified input'
      );
    }
  }

  /**
   * Detect country code from phone number
   */
  private detectCountryCode(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Simple country code detection (first 1-3 digits)
    if (cleaned.startsWith('1')) return 'US';
    if (cleaned.startsWith('44')) return 'GB';
    if (cleaned.startsWith('91')) return 'IN';
    if (cleaned.startsWith('234')) return 'NG';
    if (cleaned.startsWith('86')) return 'CN';
    if (cleaned.startsWith('81')) return 'JP';
    if (cleaned.startsWith('49')) return 'DE';
    if (cleaned.startsWith('33')) return 'FR';
    if (cleaned.startsWith('92')) return 'PK';
    if (cleaned.startsWith('62')) return 'ID';
    
    return 'UNKNOWN';
  }

  /**
   * Check if number is likely a landline
   */
  private isLandlineLikely(phoneNumber: string, country: string): boolean {
    // Landline patterns vary by country
    // This is a simplified heuristic
    
    if (LANDLINE_COMMON_COUNTRIES.includes(country)) {
      // In these countries, check for typical landline patterns
      const cleaned = phoneNumber.replace(/\D/g, '');
      
      // US landlines often don't start with certain prefixes
      if (country === 'US') {
        const areaCode = cleaned.substring(1, 4);
        // Mobile prefixes in US often start with 2-9
        return false; // Most US numbers are mobile now
      }
      
      // Germany landlines start with specific codes
      if (country === 'DE') {
        return !cleaned.startsWith('491'); // 491 is mobile
      }
    }
    
    return false;
  }

  /**
   * Create detailed execution plan
   */
  private createExecutionPlan(
    phoneNumber: string,
    country: string,
    isHighRisk: boolean,
    isLandlineLikely: boolean,
    userPreferences?: DecisionInput['userPreferences']
  ): ExecutionPlan {
    const steps: PlanStep[] = [];
    let estimatedCost = 0;
    const reasoning: string[] = [];

    // Step 1: Always validate the phone number
    if (isHighRisk) {
      // Use both APIs for cross-validation
      steps.push({
        id: 1,
        agent: 'validation',
        action: 'validate_with_numverify',
        tool: 'numverify'
      });
      
      steps.push({
        id: 2,
        agent: 'validation',
        action: 'validate_with_abstract',
        tool: 'abstract'
      });
      
      estimatedCost += 0.002; // Both APIs
      reasoning.push('High-risk country detected: using dual validation');
    } else {
      // Use primary API only
      steps.push({
        id: 1,
        agent: 'validation',
        action: 'validate_with_numverify',
        tool: 'numverify'
      });
      
      estimatedCost += 0.001;
      reasoning.push('Standard validation with primary API');
    }

    // Step 2: WhatsApp check (conditional)
    const skipWhatsApp = isLandlineLikely || userPreferences?.prioritizeSpeed;
    
    if (!skipWhatsApp) {
      steps.push({
        id: steps.length + 1,
        agent: 'whatsapp',
        action: 'check_whatsapp_existence',
        tool: 'whatsapp',
        condition: 'IF line_type == "mobile"',
        dependsOn: [1]
      });
      
      estimatedCost += 0.0015;
      reasoning.push('WhatsApp check included for mobile numbers');
    } else {
      reasoning.push(
        isLandlineLikely 
          ? 'Skipping WhatsApp check: likely landline'
          : 'Skipping WhatsApp check: speed prioritized'
      );
    }

    // Step 3: Confidence scoring (always last)
    steps.push({
      id: steps.length + 1,
      agent: 'confidence',
      action: 'calculate_confidence_score',
      dependsOn: steps.map(s => s.id)
    });

    reasoning.push(`Total estimated cost: $${estimatedCost.toFixed(4)}`);

    return {
      id: `plan_${Date.now()}`,
      steps,
      estimatedCost,
      riskLevel: isHighRisk ? 'high' : 'low',
      skipWhatsApp,
      reasoning
    };
  }
}
