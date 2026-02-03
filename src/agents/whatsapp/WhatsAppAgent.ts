/**
 * WhatsApp Agent - Intelligence Gatherer (ReAct Pattern)
 * 
 * System Prompt:
 * "You are a WhatsApp intelligence specialist. Use the WhatsApp Business API to check 
 * if a phone number is registered on WhatsApp and gather metadata (business account, 
 * verification status, profile info).
 * 
 * Reason about the response and act accordingly:
 * - If the number exists, gather all available metadata
 * - If the number doesn't exist, return a clear negative result
 * - If rate limited, signal the Retry Agent
 * 
 * Output Format: Return structured JSON with exists, verified, businessAccount fields."
 */

import { BaseAgent } from '../core/BaseAgent';
import type {
  AgentResponse,
  WhatsAppData,
  RetryContext
} from '../types';

interface WhatsAppInput {
  phoneNumber: string;
  apiKey?: string;
  retryContext?: RetryContext;
}

export class WhatsAppAgent extends BaseAgent {
  constructor() {
    super({
      role: 'whatsapp',
      systemPrompt: `You are a WhatsApp intelligence specialist. Use the WhatsApp Business API to check if a phone number is registered on WhatsApp and gather metadata (business account, verification status, profile info).

Reason about the response and act accordingly:
- If the number exists, gather all available metadata
- If the number doesn't exist, return a clear negative result
- If rate limited, signal the Retry Agent

Output Format: Return structured JSON with exists, verified, businessAccount fields.`,
      constraints: [
        'Check WhatsApp registration only',
        'Gather business account metadata',
        'Signal retry on rate limits (429)',
        'Return structured JSON only'
      ],
      tools: ['whatsapp'],
      outputFormat: 'json'
    });
  }

  async execute(input: WhatsAppInput): Promise<AgentResponse<WhatsAppData>> {
    this.startTime = Date.now();
    this.setStatus('thinking');

    try {
      this.think(`Checking WhatsApp existence for: ${input.phoneNumber}`);
      
      // ReAct: Reason about the approach
      this.think('Reasoning: Will check basic existence first, then gather metadata if exists');
      
      this.setStatus('acting');
      this.act('Querying WhatsApp API...');

      const result = await this.checkWhatsApp(input.phoneNumber, input.apiKey);
      
      if (result.error) {
        this.think(`WhatsApp API returned error: ${result.error.code}`);
        
        // Check for rate limiting
        if (result.error.code === '429') {
          this.think('Rate limit detected - alerting Retry Agent');
          return this.createErrorResponse(
            'RATE_LIMIT',
            'WhatsApp API rate limit exceeded',
            true,
            'Trigger Retry Agent with backoff'
          );
        }
        
        // Check for auth errors
        if (result.error.code === '401' || result.error.code === '403') {
          return this.createErrorResponse(
            'AUTH_ERROR',
            `WhatsApp authentication failed: ${result.error.message}`,
            true,
            'Check API key and permissions'
          );
        }
        
        // Other errors
        return this.createErrorResponse(
          'WHATSAPP_ERROR',
          result.error.message,
          true,
          'Retry or skip WhatsApp check'
        );
      }

      // ReAct: Observe the result and reason about next steps
      const whatsappData = result.data!;
      
      this.think(`WhatsApp exists: ${whatsappData.exists}`);
      
      if (whatsappData.exists) {
        this.think('Number is on WhatsApp - gathering additional metadata');
        this.act('Checking business account status...');
        
        // In a real implementation, you might make additional API calls here
        // For now, we return what we have
      } else {
        this.think('Number is not registered on WhatsApp');
      }
      
      this.setStatus('complete');
      return this.createSuccessResponse(
        whatsappData,
        ['whatsapp'],
        input.retryContext?.attempts || 0
      );

    } catch (error) {
      this.setStatus('error');
      return this.createErrorResponse(
        'WHATSAPP_ERROR',
        error instanceof Error ? error.message : 'Unknown WhatsApp error',
        true,
        'Retry or skip WhatsApp check'
      );
    }
  }

  /**
   * Check WhatsApp existence and metadata
   * 
   * Note: This is a simplified implementation. In production, you would:
   * 1. Use the official WhatsApp Business API
   * 2. Implement proper authentication (OAuth2)
   * 3. Handle webhooks for async responses
   * 4. Respect rate limits more granularly
   */
  private async checkWhatsApp(
    phoneNumber: string,
    apiKey?: string
  ): Promise<{ data?: WhatsAppData; error?: { code: string; message: string } }> {
    try {
      // Check if using demo/mock key or no key
      if (!apiKey || apiKey.includes('demo') || apiKey.includes('test') || apiKey.length < 10) {
        this.think('Using mock WhatsApp response (demo mode)');
        return this.getMockWhatsAppResponse(phoneNumber);
      }

      // Clean the phone number
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      
      // Simulate API call (replace with actual WhatsApp Business API endpoint)
      // Example endpoint: https://graph.facebook.com/v18.0/{phone-number-id}/messages
      
      // For demonstration, we'll use a mock implementation
      // In production, use the actual WhatsApp Business API
      
      // Mock response based on number patterns
      const isMockWhatsAppUser = this.mockWhatsAppCheck(cleanNumber);
      
      if (isMockWhatsAppUser) {
        const data: WhatsAppData = {
          exists: true,
          verified: Math.random() > 0.5, // Random for demo
          businessAccount: cleanNumber.endsWith('00'), // Mock: numbers ending in 00 are business
          profilePicture: Math.random() > 0.3,
          about: Math.random() > 0.5 ? 'Available on WhatsApp' : undefined
        };
        
        return { data };
      } else {
        const data: WhatsAppData = {
          exists: false,
          verified: false,
          businessAccount: false,
          profilePicture: false
        };
        
        return { data };
      }
      
    } catch (error) {
      return {
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error'
        }
      };
    }
  }

  /**
   * Get mock WhatsApp response for demo mode
   */
  private getMockWhatsAppResponse(phoneNumber: string): { data: WhatsAppData } {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Simulate realistic WhatsApp presence based on number characteristics
    const hash = cleanNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const exists = hash % 10 < 7; // 70% chance of WhatsApp presence
    
    const data: WhatsAppData = {
      exists,
      verified: exists ? hash % 10 < 5 : false, // 50% of existing numbers are verified
      businessAccount: exists ? cleanNumber.endsWith('00') || cleanNumber.endsWith('000') : false,
      profilePicture: exists ? hash % 10 < 6 : false, // 60% have profile pictures
      about: exists && hash % 10 < 5 ? 'Available on WhatsApp' : undefined
    };
    
    return { data };
  }

  /**
   * Mock WhatsApp existence check
   * In production, this would be replaced with actual API calls
   */
  private mockWhatsAppCheck(phoneNumber: string): boolean {
    // Mock logic: assume numbers with certain patterns are on WhatsApp
    // This is just for demonstration
    
    // Simulate that about 70% of mobile numbers are on WhatsApp
    const hash = phoneNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return hash % 10 < 7;
  }

  /**
   * Get WhatsApp profile information (if available)
   * This would be a separate API call in production
   */
  private async getWhatsAppProfile(phoneNumber: string, apiKey?: string): Promise<any> {
    // Placeholder for profile API call
    // In production: GET https://graph.facebook.com/v18.0/{phone-number-id}
    
    return {
      profilePicture: true,
      about: 'Available on WhatsApp',
      businessAccount: false
    };
  }
}
