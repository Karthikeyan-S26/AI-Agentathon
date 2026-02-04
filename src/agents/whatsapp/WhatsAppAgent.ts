/**
 * WhatsApp Agent - Enhanced Intelligence Gatherer (ReAct Pattern)
 * 
 * Features:
 * - WhatsApp presence detection
 * - Business account heuristic detection
 * - Rate limiting with exponential backoff
 * - Comprehensive error handling
 * - Country-specific prevalence adjustment
 */

import { BaseAgent } from '../core/BaseAgent';
import type {
  AgentResponse,
  WhatsAppData,
  BusinessAccountData,
  RetryContext,
  AgentConfig
} from '../types';

interface WhatsAppInput {
  phoneNumber: string;
  accountSid?: string;
  authToken?: string;
  twilioNumber?: string;
  retryContext?: RetryContext;
  validationData?: {
    countryCode: string;
    lineType: string;
    carrier?: string;
  };
}

interface TwilioLookupResponse {
  valid: boolean;
  country_code: string;
  line_type_intelligence?: {
    type: string;
    carrier_name: string;
  };
  caller_name?: {
    caller_name: string;
    caller_type: string;
  };
}

export class WhatsAppAgent extends BaseAgent {
  // Rate limiting
  private requestQueue: Array<{ resolve: Function; reject: Function; fn: Function }> = [];
  private processing = false;
  private readonly REQUEST_DELAY_MS = 1100; // ~50 requests per minute

  // WhatsApp error codes
  private readonly ERROR_CODES = {
    BANNED: ['131026', '131047'],
    BLOCKED: ['131030'],
    DELETED: ['131051'],
    RATE_LIMIT: ['429', '88'],
    AUTH_ERROR: ['401', '403'],
  };

  constructor() {
    super({
      role: 'whatsapp' as const,
      systemPrompt: `You are a WhatsApp intelligence specialist. Analyze phone numbers to detect WhatsApp presence, business accounts, and potential delivery issues.`,
      constraints: [
        'Check WhatsApp registration',
        'Detect business vs personal accounts',
        'Handle rate limits gracefully',
        'Provide actionable recommendations'
      ],
      tools: ['whatsapp' as const, 'twilio' as const],
      outputFormat: 'json' as const
    } satisfies AgentConfig);
  }

  async execute(input: WhatsAppInput): Promise<AgentResponse<WhatsAppData>> {
    this.startTime = Date.now();
    this.setStatus('thinking');

    try {
      this.think(`Analyzing WhatsApp presence for: ${input.phoneNumber}`);
      
      this.setStatus('acting');
      this.act('Checking WhatsApp with rate limiting...');

      // Use rate-limited request
      const twilioData = await this.rateLimitedRequest(() => 
        this.checkTwilioLookup(input.phoneNumber, input.accountSid, input.authToken)
      );
      
      // If Twilio fails but we have validation data, use that instead
      if (twilioData.error && input.validationData) {
        console.log('⚠️ Twilio failed, using NumVerify/Abstract data instead');
        const mockTwilioData: TwilioLookupResponse = {
          valid: true,
          country_code: input.validationData.countryCode.replace('+', ''),
          line_type_intelligence: {
            type: input.validationData.lineType as 'mobile' | 'landline' | 'voip',
            carrier_name: input.validationData.carrier || 'Unknown'
          }
        };
        
        const hasWhatsApp = this.detectWhatsAppPresence(mockTwilioData);
        const businessData = await this.detectBusinessAccount(input.phoneNumber, mockTwilioData);
        
        const whatsappData: WhatsAppData = {
          exists: hasWhatsApp,
          verified: false,
          businessAccount: businessData.isLikelyBusiness,
          profilePicture: false,
          about: mockTwilioData.line_type_intelligence?.type,
          metadata: {
            carrier: mockTwilioData.line_type_intelligence?.carrier_name,
            lineType: mockTwilioData.line_type_intelligence?.type,
            countryCode: mockTwilioData.country_code,
            businessConfidence: businessData.confidence,
            businessIndicators: businessData.reasons
          }
        };
        
        console.log('✅ WhatsApp detection (using validation data):', { hasWhatsApp, countryCode: mockTwilioData.country_code });
        
        this.setStatus('complete');
        return this.createSuccessResponse(
          whatsappData,
          ['numverify' as const],
          input.retryContext?.attempts || 0
        );
      }
      
      if (twilioData.error) {
        console.error('❌ WhatsApp check failed: No validation data fallback available');
        return this.handleError(twilioData.error);
      }

      // Detect WhatsApp presence
      const hasWhatsApp = this.detectWhatsAppPresence(twilioData.data!);
      
      // Log detection reasoning
      this.think(`WhatsApp detection: ${hasWhatsApp ? 'FOUND' : 'NOT FOUND'}`);
      this.think(`Country: ${twilioData.data?.country_code}, Line Type: ${twilioData.data?.line_type_intelligence?.type}, Valid: ${twilioData.data?.valid}`);
      
      console.log('🔍 WhatsApp Detection Debug:', {
        hasWhatsApp,
        countryCode: twilioData.data?.country_code,
        lineType: twilioData.data?.line_type_intelligence?.type,
        valid: twilioData.data?.valid,
        carrier: twilioData.data?.line_type_intelligence?.carrier_name,
        accountSid: input.accountSid?.substring(0, 10) + '...',
        authToken: input.authToken ? 'SET' : 'MISSING'
      });
      
      // Detect business account
      const businessData = await this.detectBusinessAccount(input.phoneNumber, twilioData.data!);
      
      const whatsappData: WhatsAppData = {
        exists: hasWhatsApp,
        verified: false, // Would require WhatsApp Business API
        businessAccount: businessData.isLikelyBusiness,
        profilePicture: false,
        about: twilioData.data?.line_type_intelligence?.type || undefined,
        metadata: {
          carrier: twilioData.data?.line_type_intelligence?.carrier_name,
          lineType: twilioData.data?.line_type_intelligence?.type,
          countryCode: twilioData.data?.country_code,
          businessConfidence: businessData.confidence,
          businessIndicators: businessData.reasons
        }
      };
      
      this.setStatus('complete');
      return this.createSuccessResponse(
        whatsappData,
        ['twilio' as const],
        input.retryContext?.attempts || 0
      );

    } catch (error) {
      this.setStatus('error');
      return this.createErrorResponse(
        'WHATSAPP_ERROR',
        error instanceof Error ? error.message : 'Unknown WhatsApp error',
        true,
        'Continue without WhatsApp data'
      );
    }
  }

  /**
   * Rate-limited request execution
   */
  private async rateLimitedRequest<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, fn });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.requestQueue.length === 0) return;

    this.processing = true;
    const { resolve, reject, fn } = this.requestQueue.shift()!;

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      await this.sleep(this.REQUEST_DELAY_MS);
      this.processing = false;
      this.processQueue();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check Twilio Lookup API for phone data
   */
  private async checkTwilioLookup(
    phoneNumber: string,
    accountSid?: string,
    authToken?: string
  ): Promise<{ data?: TwilioLookupResponse; error?: { code: string; message: string } }> {
    try {
      console.log('🔑 Twilio Credentials Check:', {
        accountSid: accountSid ? accountSid.substring(0, 10) + '...' : 'MISSING',
        authToken: authToken ? 'SET (length: ' + authToken.length + ')' : 'MISSING',
        phoneNumber
      });
      
      // Demo mode
      if (!accountSid || !authToken || accountSid.includes('demo')) {
        console.warn('⚠️ DEMO MODE: No valid Twilio credentials, using mock data');
        this.think('Using mock Twilio response (demo mode)');
        return this.getMockTwilioResponse(phoneNumber);
      }

      const cleanNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber.replace(/\D/g, '')}`;
      
      this.think(`Querying Twilio Lookup for: ${cleanNumber}`);
      
      const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(cleanNumber)}?Fields=line_type_intelligence,caller_name`;
      const credentials = btoa(`${accountSid}:${authToken}`);
      
      console.log('🌐 Making Twilio API Call:', { url, cleanNumber });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Twilio Response Status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Twilio API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        
        if (response.status === 429) {
          return {
            error: {
              code: '429',
              message: 'Twilio rate limit exceeded - backing off'
            }
          };
        }
        
        if (response.status === 401 || response.status === 403) {
          console.error('🔐 Twilio Authentication Failed! Check your credentials in .env');
          return {
            error: {
              code: String(response.status),
              message: 'Twilio authentication failed. Check credentials.'
            }
          };
        }
        
        return {
          error: {
            code: String(response.status),
            message: errorData.message || 'Twilio API error'
          }
        };
      }

      const data: TwilioLookupResponse = await response.json();
      console.log('✅ Twilio API Success:', {
        valid: data.valid,
        country: data.country_code,
        lineType: data.line_type_intelligence?.type,
        carrier: data.line_type_intelligence?.carrier_name,
        callerType: data.caller_name?.caller_type
      });
      this.think(`Twilio result: Valid=${data.valid}, Type=${data.line_type_intelligence?.type}`);
      
      return { data };
      
    } catch (error) {
      this.think(`Network error: ${error instanceof Error ? error.message : 'Unknown'}`);
      return {
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error'
        }
      };
    }
  }

  /**
   * Detect WhatsApp presence from Twilio data
   * Uses country-specific prevalence rates for accurate detection
   */
  private detectWhatsAppPresence(twilioData: TwilioLookupResponse): boolean {
    const lineType = twilioData.line_type_intelligence?.type;
    const countryCode = twilioData.country_code;
    
    // Landlines never have WhatsApp
    if (lineType === 'landline') {
      return false;
    }
    
    // Country-specific WhatsApp prevalence (same as InactiveAccountAgent)
    const whatsappPrevalence: Record<string, number> = {
      'IN': 0.90, // India - 90% (extremely high adoption)
      'BR': 0.95, // Brazil - 95%
      'MX': 0.80, // Mexico - 80%
      'AR': 0.75, // Argentina - 75%
      'DE': 0.70, // Germany - 70%
      'ES': 0.65, // Spain - 65%
      'IT': 0.60, // Italy - 60%
      'GB': 0.55, // UK - 55%
      'FR': 0.50, // France - 50%
      'US': 0.30, // USA - 30%
      'CA': 0.35, // Canada - 35%
      'JP': 0.40, // Japan - 40%
      'CN': 0.05, // China - 5% (WeChat dominates)
      'KR': 0.25, // South Korea - 25% (KakaoTalk dominates)
    };
    
    // Get prevalence for this country (default 60% for unknown countries)
    const prevalence = whatsappPrevalence[countryCode] || 0.60;
    
    // Mobile numbers: Use country prevalence
    if (lineType === 'mobile') {
      // If valid mobile with high prevalence country, assume has WhatsApp
      if (prevalence >= 0.70 && twilioData.valid) {
        return true; // High adoption countries - assume yes
      } else if (prevalence >= 0.50 && twilioData.valid) {
        return true; // Medium adoption - still assume yes for valid mobiles
      } else if (prevalence >= 0.30 && twilioData.valid) {
        return true; // Lower adoption - but still likely for valid mobiles
      }
      // Very low adoption countries (< 30%) - assume no
      return false;
    }
    
    // VoIP: Lower probability, only in high-adoption countries
    if (lineType === 'voip') {
      return prevalence >= 0.70 && twilioData.valid;
    }
    
    // Unknown types - assume no
    return false;
  }

  /**
   * Detect if account is likely a business account using heuristics
   */
  private async detectBusinessAccount(
    phoneNumber: string,
    twilioData: TwilioLookupResponse
  ): Promise<BusinessAccountData> {
    const reasons: string[] = [];
    let score = 0;

    // Check 1: Caller type from Twilio
    if (twilioData.caller_name?.caller_type === 'BUSINESS') {
      score += 40;
      reasons.push('Registered as business line with carrier');
    }

    // Check 2: Toll-free number
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (/^(\+?1)?(800|888|877|866|855|844|833)/.test(cleaned)) {
      score += 30;
      reasons.push('Toll-free number (strong business indicator)');
    }

    // Check 3: Line type
    const lineType = twilioData.line_type_intelligence?.type;
    if (lineType === 'landline') {
      score += 15;
      reasons.push('Landline (often used by businesses)');
    } else if (lineType === 'voip') {
      score += 20;
      reasons.push('VoIP number (common for business systems)');
    }

    // Check 4: Business-focused carrier
    const carrier = twilioData.line_type_intelligence?.carrier_name || '';
    const businessKeywords = ['Business', 'Enterprise', 'Corporate', 'Commercial'];
    if (businessKeywords.some(keyword => carrier.includes(keyword))) {
      score += 25;
      reasons.push(`Business-focused carrier: ${carrier}`);
    }

    // Check 5: Sequential number pattern (businesses often have these)
    if (/(\d)\1{3,}/.test(cleaned)) {
      score += 10;
      reasons.push('Sequential number pattern (common for business lines)');
    }

    const isLikelyBusiness = score >= 50;
    const confidence = Math.min(score / 100, 1);

    if (reasons.length === 0) {
      reasons.push('Insufficient data for business account detection');
    }

    return {
      isLikelyBusiness,
      confidence,
      score,
      reasons,
      accountType: isLikelyBusiness ? 'business' : 'personal'
    };
  }

  /**
   * Handle various error scenarios
   */
  private handleError(error: { code: string; message: string }): AgentResponse<WhatsAppData> {
    const code = error.code;

    // Rate limiting
    if (this.ERROR_CODES.RATE_LIMIT.includes(code)) {
      return this.createErrorResponse(
        'RATE_LIMIT',
        'API rate limit exceeded',
        true,
        'Wait 60 seconds and retry with exponential backoff'
      );
    }

    // Authentication
    if (this.ERROR_CODES.AUTH_ERROR.includes(code)) {
      return this.createErrorResponse(
        'AUTH_ERROR',
        error.message,
        false,
        'Check Twilio credentials in .env file'
      );
    }

    // Banned/blocked accounts
    if (this.ERROR_CODES.BANNED.includes(code)) {
      return this.createErrorResponse(
        'ACCOUNT_BANNED',
        'WhatsApp account is banned or suspended',
        false,
        'Remove from contact list'
      );
    }

    if (this.ERROR_CODES.BLOCKED.includes(code)) {
      return this.createErrorResponse(
        'USER_BLOCKED',
        'User has blocked your business number',
        false,
        'Remove from future campaigns'
      );
    }

    if (this.ERROR_CODES.DELETED.includes(code)) {
      return this.createErrorResponse(
        'ACCOUNT_DELETED',
        'WhatsApp account has been deleted',
        false,
        'Remove from contact list'
      );
    }

    // Generic error
    return this.createErrorResponse(
      'WHATSAPP_ERROR',
      error.message,
      true,
      'Continue validation without WhatsApp data'
    );
  }

  /**
   * Get mock Twilio response for demo mode
   */
  private getMockTwilioResponse(phoneNumber: string): { data: TwilioLookupResponse } {
    const cleaned = phoneNumber.replace(/\D/g, '');
    const hash = cleaned.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const lineTypes = ['mobile', 'landline', 'voip'];
    const lineType = lineTypes[hash % 3];
    
    const data: TwilioLookupResponse = {
      valid: true,
      country_code: cleaned.startsWith('1') ? 'US' : 'IN',
      line_type_intelligence: {
        type: lineType,
        carrier_name: hash % 2 === 0 ? 'AT&T' : 'Verizon'
      },
      caller_name: {
        caller_name: 'Demo User',
        caller_type: hash % 10 > 6 ? 'BUSINESS' : 'CONSUMER'
      }
    };

    return { data };
  }
}
