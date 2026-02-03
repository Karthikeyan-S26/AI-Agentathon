/**
 * Confidence Scoring Agent - Quality Controller (Aggregator/Evaluator Pattern)
 * 
 * System Prompt:
 * "You are a forensic data analyst. Compare the JSON outputs from the Validation and 
 * WhatsApp agents.
 * 
 * Scoring Logic:
 * - Start at 100
 * - Subtract 20 if carrier data conflicts
 * - Subtract 10 for every retry performed
 * - Add 5 if WhatsApp verified
 * - Subtract 15 if validation failed
 * - Subtract 5 if WhatsApp check was skipped
 * 
 * Final Decision: Provide a score (0-100) and a single-sentence 'Reasoning Trace' 
 * explaining the score's basis (e.g., 'Score reduced due to API timeout and mismatched 
 * carrier data')."
 */

import { BaseAgent } from '../core/BaseAgent';
import type {
  AgentResponse,
  ConfidenceScore,
  ValidationData,
  WhatsAppData,
  RetryContext
} from '../types';

interface ConfidenceInput {
  validation: ValidationData;
  whatsapp?: WhatsAppData;
  retryContext?: RetryContext;
  executionPlan: {
    skipWhatsApp: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export class ConfidenceAgent extends BaseAgent {
  constructor() {
    super({
      role: 'confidence',
      systemPrompt: `You are a forensic data analyst. Compare the JSON outputs from the Validation and WhatsApp agents.

Scoring Logic:
- Start at 100
- Subtract 20 if carrier data conflicts
- Subtract 10 for every retry performed
- Add 5 if WhatsApp verified
- Subtract 15 if validation failed
- Subtract 5 if WhatsApp check was skipped

Final Decision: Provide a score (0-100) and a single-sentence 'Reasoning Trace' explaining the score's basis.`,
      constraints: [
        'Score range: 0-100',
        'Cross-check all data sources',
        'Identify and flag discrepancies',
        'Provide clear reasoning for score'
      ],
      tools: ['none'],
      outputFormat: 'structured'
    });
  }

  async execute(input: ConfidenceInput): Promise<AgentResponse<ConfidenceScore>> {
    this.startTime = Date.now();
    this.setStatus('thinking');

    try {
      this.think('Starting confidence analysis...');
      this.think(`Validation source: ${input.validation.source}`);
      this.think(`WhatsApp data available: ${!!input.whatsapp}`);
      
      this.setStatus('acting');
      
      // Initialize scoring breakdown
      let baseScore = 100;
      let carrierDeduction = 0;
      let retryDeduction = 0;
      let whatsappBonus = 0;
      
      const discrepancies: string[] = [];
      const recommendations: string[] = [];

      // === ANALYSIS 1: Validation Quality ===
      this.act('Analyzing validation data quality...');
      
      if (!input.validation.valid) {
        baseScore -= 15;
        discrepancies.push('Phone number failed validation');
        this.think('Deducted 15 points: validation failed');
      }

      if (input.validation.lineType === 'unknown') {
        baseScore -= 5;
        discrepancies.push('Line type could not be determined');
        this.think('Deducted 5 points: unknown line type');
      }

      // === ANALYSIS 2: Carrier Data Conflicts ===
      this.act('Checking for carrier data conflicts...');
      
      if (input.validation.source === 'both') {
        // When we have data from both APIs, check for conflicts
        const rawData = input.validation.rawData as any[];
        
        if (rawData && rawData.length === 2) {
          const conflicts = this.detectCarrierConflicts(rawData);
          
          if (conflicts.length > 0) {
            carrierDeduction = 20;
            discrepancies.push(...conflicts);
            this.think('Deducted 20 points: carrier data conflicts detected');
          } else {
            this.think('No conflicts detected - data sources agree');
            recommendations.push('Data validated across multiple sources');
          }
        }
      }

      // === ANALYSIS 3: Retry Analysis ===
      this.act('Analyzing retry attempts...');
      
      if (input.retryContext && input.retryContext.attempts > 0) {
        retryDeduction = input.retryContext.attempts * 10;
        discrepancies.push(
          `${input.retryContext.attempts} retry attempts required`
        );
        this.think(`Deducted ${retryDeduction} points: ${input.retryContext.attempts} retries`);
      }

      // === ANALYSIS 4: WhatsApp Cross-Validation ===
      this.act('Cross-validating with WhatsApp data...');
      
      if (input.whatsapp) {
        if (input.whatsapp.exists && input.whatsapp.verified) {
          whatsappBonus = 5;
          recommendations.push('WhatsApp account verified - increases confidence');
          this.think('Added 5 points: WhatsApp verified');
        }
        
        if (input.whatsapp.businessAccount) {
          whatsappBonus += 3;
          recommendations.push('Business account detected - professional use');
          this.think('Added 3 points: business account');
        }
        
        // Check for logical inconsistencies
        if (input.validation.lineType === 'landline' && input.whatsapp.exists) {
          discrepancies.push('Conflict: Landline with WhatsApp presence (possible VoIP)');
          baseScore -= 10;
          this.think('Deducted 10 points: landline/WhatsApp conflict');
        }
      } else if (input.executionPlan.skipWhatsApp) {
        baseScore -= 5;
        discrepancies.push('WhatsApp check was skipped');
        this.think('Deducted 5 points: WhatsApp check skipped');
        recommendations.push('Consider running WhatsApp check for mobile numbers');
      }

      // === ANALYSIS 5: Risk Level Assessment ===
      this.act('Assessing risk level...');
      
      if (input.executionPlan.riskLevel === 'high') {
        if (input.validation.source !== 'both') {
          discrepancies.push('High-risk country but only single-source validation');
          recommendations.push('Recommend dual-source validation for high-risk regions');
          baseScore -= 10;
          this.think('Deducted 10 points: insufficient validation for high-risk');
        } else {
          recommendations.push('Appropriate dual-validation used for high-risk region');
        }
      }

      // === FINAL SCORE CALCULATION ===
      const finalScore = Math.min(
        100,
        Math.max(
          0,
          baseScore - carrierDeduction - retryDeduction + whatsappBonus
        )
      );

      this.think(`Final score calculated: ${finalScore}/100`);
      
      // Generate reasoning trace
      const reasoning = this.generateReasoningTrace(
        finalScore,
        baseScore,
        carrierDeduction,
        retryDeduction,
        whatsappBonus,
        discrepancies
      );

      const confidenceScore: ConfidenceScore = {
        score: finalScore,
        reasoning,
        discrepancies,
        recommendations,
        breakdown: {
          baseScore,
          carrierDeduction,
          retryDeduction,
          whatsappBonus
        }
      };

      this.setStatus('complete');
      return this.createSuccessResponse(confidenceScore);

    } catch (error) {
      this.setStatus('error');
      return this.createErrorResponse(
        'CONFIDENCE_ERROR',
        error instanceof Error ? error.message : 'Unknown error in confidence scoring',
        false
      );
    }
  }

  /**
   * Detect conflicts between different data sources
   */
  private detectCarrierConflicts(rawData: any[]): string[] {
    const conflicts: string[] = [];

    try {
      const source1 = rawData.find(r => r.source === 'numverify')?.data;
      const source2 = rawData.find(r => r.source === 'abstract')?.data;

      if (source1 && source2) {
        // Check carrier name conflicts
        if (source1.carrier && source2.carrier) {
          if (source1.carrier !== source2.carrier) {
            conflicts.push(
              `Carrier mismatch: NumVerify="${source1.carrier}" vs Abstract="${source2.carrier}"`
            );
          }
        }

        // Check line type conflicts
        const type1 = source1.line_type?.toLowerCase();
        const type2 = source2.type?.toLowerCase();
        
        if (type1 && type2) {
          if (type1 !== type2 && !(type1 === 'fixed_line' && type2 === 'landline')) {
            conflicts.push(
              `Line type mismatch: NumVerify="${type1}" vs Abstract="${type2}"`
            );
          }
        }

        // Check validity conflicts
        if (source1.valid !== source2.valid) {
          conflicts.push(
            `Validity mismatch: One API validates, the other doesn't`
          );
        }
      }
    } catch (error) {
      this.think('Error during conflict detection - skipping');
    }

    return conflicts;
  }

  /**
   * Generate human-readable reasoning trace
   */
  private generateReasoningTrace(
    finalScore: number,
    baseScore: number,
    carrierDeduction: number,
    retryDeduction: number,
    whatsappBonus: number,
    discrepancies: string[]
  ): string {
    const parts: string[] = [];

    if (finalScore >= 90) {
      parts.push('High confidence validation');
    } else if (finalScore >= 70) {
      parts.push('Moderate confidence validation');
    } else if (finalScore >= 50) {
      parts.push('Low confidence validation');
    } else {
      parts.push('Very low confidence validation');
    }

    if (carrierDeduction > 0) {
      parts.push('carrier data conflicts detected');
    }

    if (retryDeduction > 0) {
      parts.push(`${retryDeduction / 10} API retries required`);
    }

    if (whatsappBonus > 0) {
      parts.push('WhatsApp verification adds confidence');
    }

    if (discrepancies.length > 0) {
      parts.push(`${discrepancies.length} discrepancies found`);
    }

    // Capitalize first letter
    const trace = parts.join(', ');
    return trace.charAt(0).toUpperCase() + trace.slice(1) + '.';
  }

  /**
   * Provide recommendation based on score
   */
  getRecommendation(score: number): string {
    if (score >= 90) {
      return 'PROCEED - High confidence in validation results';
    } else if (score >= 70) {
      return 'CAUTION - Moderate confidence, consider additional verification';
    } else if (score >= 50) {
      return 'REVIEW - Low confidence, manual review recommended';
    } else {
      return 'REJECT - Very low confidence, do not proceed';
    }
  }
}
