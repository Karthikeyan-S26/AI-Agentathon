/**
 * Inactive Account Detection Agent
 * 
 * Detects dormant WhatsApp accounts by analyzing:
 * 1. Last seen data (if available)
 * 2. Historical message delivery patterns
 * 3. Carrier status and line type
 * 4. Time-based inactivity signals
 */

import { BaseAgent } from '../core/BaseAgent';
import type {
  AgentResponse,
  InactivityStatus,
  RetryContext,
  AgentConfig
} from '../types';

interface InactiveAccountInput {
  phoneNumber: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  retryContext?: RetryContext;
}

interface DeliveryHistory {
  totalMessages: number;
  deliveredMessages: number;
  failedMessages: number;
  lastDeliveryAttempt?: Date;
  lastSuccessfulDelivery?: Date;
}

interface CarrierStatus {
  active: boolean;
  lineType: string;
  carrier: string;
}

export class InactiveAccountAgent extends BaseAgent {
  // Country-specific WhatsApp prevalence data
  private readonly WHATSAPP_PREVALENCE: Record<string, number> = {
    'IN': 0.90, // India - 90%
    'BR': 0.95, // Brazil - 95%
    'MX': 0.92, // Mexico - 92%
    'ES': 0.85, // Spain - 85%
    'IT': 0.80, // Italy - 80%
    'DE': 0.75, // Germany - 75%
    'GB': 0.70, // UK - 70%
    'FR': 0.68, // France - 68%
    'US': 0.30, // USA - 30%
    'CA': 0.35, // Canada - 35%
    'JP': 0.40, // Japan - 40%
    'CN': 0.05, // China - 5%
    'KR': 0.25, // South Korea - 25%
  };

  constructor() {
    super({
      role: 'inactive' as const,
      systemPrompt: `You are an inactive account detection specialist. Analyze message delivery patterns, carrier status, and historical data to determine if a WhatsApp account is dormant or abandoned.`,
      constraints: [
        'Check message delivery history',
        'Verify carrier status',
        'Calculate inactivity duration',
        'Provide delivery probability score'
      ],
      tools: ['twilio' as const, 'database' as const],
      outputFormat: 'json' as const
    } satisfies AgentConfig);
  }

  async execute(input: InactiveAccountInput): Promise<AgentResponse<InactivityStatus>> {
    this.startTime = Date.now();
    this.setStatus('thinking');

    try {
      this.think(`Analyzing inactivity patterns for: ${input.phoneNumber}`);
      
      this.setStatus('acting');
      
      // Run all checks in parallel
      const [deliveryHistory, carrierStatus] = await Promise.all([
        this.getDeliveryHistory(input.phoneNumber),
        this.checkCarrierStatus(input.phoneNumber, input.twilioAccountSid, input.twilioAuthToken)
      ]);
      
      // Analyze all data
      const analysis = this.analyzeInactivity({
        phoneNumber: input.phoneNumber,
        deliveryHistory,
        carrierStatus
      });
      
      this.setStatus('complete');
      
      return this.createSuccessResponse(
        analysis,
        ['database' as const, 'twilio' as const],
        input.retryContext?.attempts || 0
      );

    } catch (error) {
      this.setStatus('error');
      return this.createErrorResponse(
        'INACTIVE_CHECK_ERROR',
        error instanceof Error ? error.message : 'Unknown error checking inactivity',
        true,
        'Continue validation without inactivity data'
      );
    }
  }

  /**
   * Get historical message delivery data
   */
  private async getDeliveryHistory(phoneNumber: string): Promise<DeliveryHistory> {
    try {
      // Mock implementation - replace with actual Supabase query
      // const { data: messages } = await supabase
      //   .from('message_logs')
      //   .select('*')
      //   .eq('phone_number', phoneNumber)
      //   .order('created_at', { ascending: false })
      //   .limit(100);

      // For now, return mock data
      const hash = phoneNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const hasHistory = hash % 10 > 3; // 60% have history

      if (!hasHistory) {
        return {
          totalMessages: 0,
          deliveredMessages: 0,
          failedMessages: 0
        };
      }

      const totalMessages = Math.floor(hash % 50) + 10;
      const failureRate = (hash % 100) / 100;
      const failedMessages = Math.floor(totalMessages * failureRate);
      const deliveredMessages = totalMessages - failedMessages;

      const daysSinceLastSuccess = hash % 730; // 0-2 years
      const lastSuccessDate = new Date();
      lastSuccessDate.setDate(lastSuccessDate.getDate() - daysSinceLastSuccess);

      return {
        totalMessages,
        deliveredMessages,
        failedMessages,
        lastDeliveryAttempt: new Date(),
        lastSuccessfulDelivery: deliveredMessages > 0 ? lastSuccessDate : undefined
      };
    } catch (error) {
      this.think(`Failed to get delivery history: ${error}`);
      return {
        totalMessages: 0,
        deliveredMessages: 0,
        failedMessages: 0
      };
    }
  }

  /**
   * Check phone number status with carrier
   */
  private async checkCarrierStatus(
    phoneNumber: string,
    accountSid?: string,
    authToken?: string
  ): Promise<CarrierStatus> {
    try {
      if (!accountSid || !authToken || accountSid.includes('demo')) {
        // Mock response
        const hash = phoneNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return {
          active: hash % 10 > 1, // 90% active
          lineType: hash % 10 > 3 ? 'mobile' : 'landline',
          carrier: 'AT&T'
        };
      }

      const cleanNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber.replace(/\D/g, '')}`;
      
      const response = await fetch(
        `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(cleanNumber)}?Fields=line_type_intelligence`,
        {
          headers: {
            'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Twilio API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        active: data.valid === true,
        lineType: data.line_type_intelligence?.type || 'unknown',
        carrier: data.line_type_intelligence?.carrier_name || 'unknown'
      };
    } catch (error) {
      this.think(`Carrier check failed: ${error}`);
      return { active: true, lineType: 'mobile', carrier: 'unknown' };
    }
  }

  /**
   * Analyze all data to determine inactivity
   */
  private analyzeInactivity(data: {
    phoneNumber: string;
    deliveryHistory: DeliveryHistory;
    carrierStatus: CarrierStatus;
  }): InactivityStatus {
    const now = Date.now();
    let score = 0;
    const reasons: string[] = [];
    let daysSinceActive = 0;

    // Get country code for prevalence adjustment
    const countryCode = this.extractCountryCode(data.phoneNumber);
    const whatsappPrevalence = this.WHATSAPP_PREVALENCE[countryCode] || 0.50;

    // Check 1: Delivery History Analysis
    const { deliveredMessages, failedMessages, totalMessages, lastSuccessfulDelivery } = data.deliveryHistory;
    
    if (totalMessages > 0) {
      const failureRate = failedMessages / totalMessages;
      
      if (failureRate > 0.8) {
        score += 35;
        reasons.push(`${Math.round(failureRate * 100)}% message delivery failure rate`);
      } else if (failureRate > 0.5) {
        score += 20;
        reasons.push(`${Math.round(failureRate * 100)}% message delivery failure rate`);
      }

      if (lastSuccessfulDelivery) {
        const daysSinceSuccess = Math.floor((now - lastSuccessfulDelivery.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceSuccess > 730) { // 2+ years
          score += 40;
          reasons.push(`No successful delivery for ${Math.floor(daysSinceSuccess / 365)} years`);
          daysSinceActive = daysSinceSuccess;
        } else if (daysSinceSuccess > 365) { // 1+ year
          score += 30;
          reasons.push(`No successful delivery for ${Math.floor(daysSinceSuccess / 365)} year`);
          daysSinceActive = daysSinceSuccess;
        } else if (daysSinceSuccess > 180) { // 6+ months
          score += 20;
          reasons.push(`No successful delivery for ${Math.floor(daysSinceSuccess / 30)} months`);
          daysSinceActive = daysSinceSuccess;
        } else if (daysSinceSuccess > 30) { // 1+ month
          score += 10;
          reasons.push(`No successful delivery for ${daysSinceSuccess} days`);
          daysSinceActive = daysSinceSuccess;
        }
      }
    } else {
      // No history - neutral, don't penalize
      reasons.push('No delivery history available for analysis');
    }

    // Check 2: Carrier Status
    if (!data.carrierStatus.active) {
      score += 30;
      reasons.push('Phone number is no longer active with carrier');
    } else if (data.carrierStatus.lineType === 'landline') {
      score += 25;
      reasons.push('Landline number (unlikely to have active WhatsApp)');
    } else if (data.carrierStatus.lineType === 'voip') {
      score += 10;
      reasons.push('VoIP number (moderate WhatsApp usage)');
    }

    // Check 3: Country-specific prevalence
    if (whatsappPrevalence < 0.4) {
      score += 15;
      reasons.push(`Low WhatsApp adoption in ${countryCode} (${Math.round(whatsappPrevalence * 100)}% prevalence)`);
    }

    // Determine final status
    const isInactive = score >= 50;
    const deliveryChance = Math.max(0, Math.min(100, 100 - score));
    const confidence = Math.min(1, score / 100);

    // Generate recommendation
    let recommendation: string;
    let severity: 'critical' | 'high' | 'moderate' | 'low' | 'none';
    
    if (score >= 80) {
      recommendation = '🔴 CRITICAL: Account likely abandoned. Consider removing from contact list or using alternative channels.';
      severity = 'critical';
    } else if (score >= 60) {
      recommendation = '🟠 HIGH RISK: Low chance of delivery. Try alternative contact methods (SMS, Email) first.';
      severity = 'high';
    } else if (score >= 40) {
      recommendation = '🟡 MODERATE RISK: May be inactive. Monitor delivery status closely.';
      severity = 'moderate';
    } else if (score >= 20) {
      recommendation = '🟢 LOW RISK: Account appears active. Safe to send messages.';
      severity = 'low';
    } else {
      recommendation = '✅ ACTIVE: High probability of message delivery.';
      severity = 'none';
    }

    return {
      isInactive,
      daysSinceActive,
      inactivityScore: score,
      deliveryProbability: deliveryChance,
      confidence,
      severity,
      reasons,
      recommendation,
      alternativeChannels: this.suggestAlternatives(score, data.carrierStatus),
      countryPrevalence: {
        country: countryCode,
        whatsappUsage: whatsappPrevalence
      }
    };
  }

  /**
   * Suggest alternative contact channels based on inactivity score
   */
  private suggestAlternatives(score: number, carrierStatus: CarrierStatus): string[] {
    const alternatives: string[] = [];

    if (score >= 50) {
      // High inactivity - suggest all alternatives
      if (carrierStatus.lineType === 'mobile') {
        alternatives.push('SMS');
        alternatives.push('Voice Call');
      }
      if (carrierStatus.lineType === 'landline') {
        alternatives.push('Voice Call');
      }
      alternatives.push('Email');
      alternatives.push('Postal Mail');
    } else if (score >= 30) {
      // Moderate inactivity - suggest SMS
      if (carrierStatus.lineType === 'mobile') {
        alternatives.push('SMS');
      }
      alternatives.push('Email');
    }

    return alternatives;
  }

  /**
   * Extract country code from phone number
   */
  private extractCountryCode(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Simple country code extraction (first 1-3 digits)
    if (cleaned.startsWith('1')) return 'US';
    if (cleaned.startsWith('91')) return 'IN';
    if (cleaned.startsWith('55')) return 'BR';
    if (cleaned.startsWith('52')) return 'MX';
    if (cleaned.startsWith('44')) return 'GB';
    if (cleaned.startsWith('49')) return 'DE';
    if (cleaned.startsWith('33')) return 'FR';
    if (cleaned.startsWith('39')) return 'IT';
    if (cleaned.startsWith('34')) return 'ES';
    if (cleaned.startsWith('81')) return 'JP';
    if (cleaned.startsWith('82')) return 'KR';
    if (cleaned.startsWith('86')) return 'CN';
    
    return 'UNKNOWN';
  }
}
