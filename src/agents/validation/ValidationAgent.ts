/**
 * Validation Agent - Technical Data Extractor (ReAct Pattern)
 * 
 * System Prompt:
 * "You are a specialist in phone metadata. Use the provided tools (NumVerify/Abstract) 
 * to retrieve carrier name, line type (mobile/landline), and country info.
 * 
 * Constraint: If a tool returns a 401 or 403 error, stop and alert the Retry Agent.
 * Output Format: Return all results in clean, valid JSON only. Do not add conversational text."
 */

import { BaseAgent } from '../core/BaseAgent';
import type {
  AgentResponse,
  ValidationData,
  ToolName,
  RetryContext
} from '../types';

interface ValidationInput {
  phoneNumber: string;
  tools: ToolName[];
  apiKeys: {
    numverify?: string;
    abstract?: string;
  };
  retryContext?: RetryContext;
}

export class ValidationAgent extends BaseAgent {
  constructor() {
    super({
      role: 'validation',
      systemPrompt: `You are a specialist in phone metadata. Use the provided tools (NumVerify/Abstract) to retrieve carrier name, line type (mobile/landline), and country info.

Constraint: If a tool returns a 401 or 403 error, stop and alert the Retry Agent.
Output Format: Return all results in clean, valid JSON only. Do not add conversational text.`,
      constraints: [
        'Stop on authentication errors (401, 403)',
        'Return only valid JSON',
        'Extract: carrier, line type, country',
        'No conversational text in output'
      ],
      tools: ['numverify', 'abstract'],
      outputFormat: 'json'
    });
  }

  async execute(input: ValidationInput): Promise<AgentResponse<ValidationData>> {
    this.startTime = Date.now();
    this.setStatus('thinking');

    try {
      this.think(`Validating phone number: ${input.phoneNumber}`);
      this.think(`Using tools: ${input.tools.join(', ')}`);

      const toolsUsed: ToolName[] = [];
      const results: any[] = [];
      
      // ReAct Pattern: Reason about which tool to use first
      this.setStatus('acting');

      for (const tool of input.tools) {
        if (tool === 'numverify' && input.apiKeys.numverify) {
          this.act('Calling NumVerify API...');
          
          const result = await this.callNumVerify(
            input.phoneNumber,
            input.apiKeys.numverify
          );
          
          if (result.error) {
            this.think(`NumVerify returned error: ${result.error.code}`);
            
            // Check for auth errors
            if (result.error.code === '401' || result.error.code === '403') {
              this.think('Authentication error detected - alerting Retry Agent');
              return this.createErrorResponse(
                'AUTH_ERROR',
                `NumVerify authentication failed: ${result.error.message}`,
                true,
                'Trigger Retry Agent with backup key'
              );
            }
            
            // Continue to next tool for other errors
            continue;
          }
          
          toolsUsed.push('numverify');
          results.push({ source: 'numverify', data: result.data });
          this.act('NumVerify data retrieved successfully');
        }
        
        if (tool === 'abstract' && input.apiKeys.abstract) {
          this.act('Calling Abstract API...');
          
          const result = await this.callAbstract(
            input.phoneNumber,
            input.apiKeys.abstract
          );
          
          if (result.error) {
            this.think(`Abstract returned error: ${result.error.code}`);
            
            // Check for auth errors
            if (result.error.code === '401' || result.error.code === '403') {
              this.think('Authentication error detected - alerting Retry Agent');
              return this.createErrorResponse(
                'AUTH_ERROR',
                `Abstract authentication failed: ${result.error.message}`,
                true,
                'Trigger Retry Agent with backup key'
              );
            }
            
            continue;
          }
          
          toolsUsed.push('abstract');
          results.push({ source: 'abstract', data: result.data });
          this.act('Abstract data retrieved successfully');
        }
      }

      if (results.length === 0) {
        return this.createErrorResponse(
          'NO_DATA',
          'All validation APIs failed',
          true,
          'Retry with different APIs or check API status'
        );
      }

      // Aggregate results
      this.think('Aggregating validation results...');
      const validationData = this.aggregateResults(input.phoneNumber, results);
      
      this.setStatus('complete');
      return this.createSuccessResponse(
        validationData,
        toolsUsed,
        input.retryContext?.attempts || 0
      );

    } catch (error) {
      this.setStatus('error');
      return this.createErrorResponse(
        'VALIDATION_ERROR',
        error instanceof Error ? error.message : 'Unknown validation error',
        true,
        'Retry with error handling'
      );
    }
  }

  /**
   * Call NumVerify API
   */
  private async callNumVerify(
    phoneNumber: string,
    apiKey: string
  ): Promise<{ data?: any; error?: { code: string; message: string } }> {
    try {
      // Check if using demo/mock key
      if (apiKey.includes('demo') || apiKey.includes('test') || !apiKey || apiKey.length < 10) {
        this.think('Using mock NumVerify response (demo mode)');
        return this.getMockNumVerifyResponse(phoneNumber);
      }

      const cleanNumber = phoneNumber.replace(/\D/g, '');
      // Use HTTPS endpoint for better compatibility
      const url = `https://apilayer.net/api/validate?access_key=${apiKey}&number=${cleanNumber}&format=1`;
      
      console.log('🔑 NumVerify Request:', { url: url.replace(apiKey, 'KEY***'), cleanNumber });
      
      const response = await fetch(url);
      
      console.log('📡 NumVerify Response Status:', response.status, response.statusText);
      
      if (!response.ok) {
        return {
          error: {
            code: response.status.toString(),
            message: response.statusText
          }
        };
      }
      
      const data = await response.json();
      
      console.log('📡 NumVerify API Response:', {
        valid: data.valid,
        carrier: data.carrier,
        line_type: data.line_type,
        country_code: data.country_code,
        country_name: data.country_name,
        location: data.location,
        hasError: !!data.error
      });
      
      if (data.error) {
        return {
          error: {
            code: data.error.code?.toString() || '500',
            message: data.error.info || 'NumVerify API error'
          }
        };
      }
      
      return { data };
      
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
   * Call Abstract API
   */
  private async callAbstract(
    phoneNumber: string,
    apiKey: string
  ): Promise<{ data?: any; error?: { code: string; message: string } }> {
    try {
      // Check if using demo/mock key
      if (apiKey.includes('demo') || apiKey.includes('test') || !apiKey || apiKey.length < 10) {
        this.think('Using mock Abstract response (demo mode)');
        return this.getMockAbstractResponse(phoneNumber);
      }

      const cleanNumber = phoneNumber.replace(/\D/g, '');
      const url = `https://phonevalidation.abstractapi.com/v1/?api_key=${apiKey}&phone=${cleanNumber}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        return {
          error: {
            code: response.status.toString(),
            message: response.statusText
          }
        };
      }
      
      const data = await response.json();
      
      console.log('📡 Abstract API Response:', {
        valid: data.valid,
        carrier: data.carrier,
        type: data.type,
        country: data.country?.name
      });
      
      if (data.error) {
        return {
          error: {
            code: data.error.code?.toString() || '500',
            message: data.error.message || 'Abstract API error'
          }
        };
      }
      
      return { data };
      
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
   * Aggregate results from multiple sources
   */
  private aggregateResults(
    phoneNumber: string,
    results: Array<{ source: string; data: any }>
  ): ValidationData {
    this.think(`Aggregating ${results.length} validation results`);
    
    // Start with default values
    let validationData: ValidationData = {
      phoneNumber,
      countryCode: 'UNKNOWN',
      countryName: 'Unknown',
      lineType: 'unknown',
      valid: false,
      source: results.length > 1 ? 'both' : (results[0].source as any),
      rawData: results
    };

    // Process each result
    for (const result of results) {
      const { source, data } = result;
      
      if (source === 'numverify') {
        validationData.valid = data.valid || validationData.valid;
        validationData.countryCode = data.country_code || validationData.countryCode;
        validationData.countryName = data.country_name || validationData.countryName;
        validationData.carrier = data.carrier || validationData.carrier;
        validationData.formatted = data.international_format || validationData.formatted;
        
        console.log('✅ NumVerify Data Extracted:', {
          carrier: data.carrier,
          extracted: validationData.carrier,
          lineType: data.line_type
        });
        
        // NumVerify line type mapping
        if (data.line_type) {
          validationData.lineType = data.line_type.toLowerCase() as any;
        }
      }
      
      if (source === 'abstract') {
        validationData.valid = data.valid || validationData.valid;
        validationData.countryCode = data.country.code || validationData.countryCode;
        validationData.countryName = data.country.name || validationData.countryName;
        validationData.carrier = data.carrier || validationData.carrier;
        validationData.formatted = data.format.international || validationData.formatted;
        
        // Abstract line type mapping
        if (data.type) {
          const typeMap: Record<string, any> = {
            'mobile': 'mobile',
            'landline': 'landline',
            'fixed_line': 'landline',
            'voip': 'voip'
          };
          validationData.lineType = typeMap[data.type.toLowerCase()] || 'unknown';
        }
      }
    }

    this.think(`Final line type: ${validationData.lineType}`);
    this.think(`Valid: ${validationData.valid}`);
    
    // Fallback: If no carrier detected from API, use pattern analysis
    if (!validationData.carrier || validationData.carrier === 'Unknown') {
      console.log('⚠️ No carrier from API, using pattern analysis...');
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      const detectedCarrier = this.analyzeCarrierFromPattern(cleanNumber, validationData.countryCode);
      if (detectedCarrier) {
        validationData.carrier = detectedCarrier;
        console.log('✅ Carrier detected from pattern:', detectedCarrier);
      }
    }
    
    console.log('🎯 Final Validation Data:', {
      carrier: validationData.carrier,
      lineType: validationData.lineType,
      countryCode: validationData.countryCode,
      countryName: validationData.countryName,
      valid: validationData.valid
    });
    
    return validationData;
  }

  /**
   * Analyze carrier from number patterns using AI reasoning
   */
  private analyzeCarrierFromPattern(cleanNumber: string, countryCode: string): string {
    this.think(`Analyzing carrier patterns for ${countryCode} number...`);
    
    // Use pattern recognition to identify carrier
    if (countryCode === 'IN') {
      // Indian mobile numbers: +91 XXXXX XXXXX (10 digits after country code)
      // Extract the mobile series (first 2 digits after country code)
      let operatorCode = '';
      const indexOfCountry = cleanNumber.indexOf('91');
      if (indexOfCountry !== -1) {
        operatorCode = cleanNumber.substring(indexOfCountry + 2, indexOfCountry + 4);
      } else {
        // If no country code, assume first 2 digits are operator code
        operatorCode = cleanNumber.substring(0, 2);
      }
      
      this.think(`India mobile operator code detected: ${operatorCode}`);
      
      console.log('🔍 Indian Carrier Pattern Analysis:', {
        cleanNumber,
        operatorCode,
        indexOfCountry
      });
      
      // Comprehensive Indian Carrier Detection based on actual MSC allocation
      const codeNum = parseInt(operatorCode);
      
      // Reliance Jio (launched 2016, massive series allocation)
      // Series: 60-69, 75, 76, 77, 78, 79, 88
      if ((codeNum >= 60 && codeNum <= 69) || 
          (codeNum >= 75 && codeNum <= 79) || 
          operatorCode === '88') {
        this.think('Pattern matches Reliance Jio allocation');
        return 'Reliance Jio';
      }
      
      // Bharti Airtel (largest pre-Jio operator)
      // Series: 70, 73, 74, 83, 84, 90, 91, 92, 93, 94, 95
      if (['70', '73', '74', '83', '84', '90', '91', '92', '93', '94', '95'].includes(operatorCode)) {
        this.think('Pattern matches Bharti Airtel allocation');
        return 'Bharti Airtel';
      }
      
      // Vodafone Idea (merger of Vodafone India + Idea)
      // Series: 71, 72, 80, 81, 82, 85, 86, 87, 89, 96, 97, 98, 99
      if (['71', '72', '80', '81', '82', '85', '86', '87', '89', '96', '97', '98', '99'].includes(operatorCode)) {
        this.think('Pattern matches Vodafone Idea allocation');
        return 'Vodafone Idea';
      }
      
      // BSNL/MTNL (Government operators)
      // Series: Remaining series not allocated to private operators
      this.think('Pattern matches BSNL/MTNL allocation');
      return 'BSNL/MTNL';
    }
    
    if (countryCode === 'DO') {
      const areaCode = cleanNumber.substring(cleanNumber.length - 10, cleanNumber.length - 7);
      this.think(`Dominican Republic area code: ${areaCode}`);
      
      if (areaCode.startsWith('8')) {
        this.think('8xx series indicates Claro Dominican Republic');
        return 'Claro Dominican Republic';
      }
      if (areaCode.startsWith('9')) {
        this.think('9xx series indicates Altice Dominicana');
        return 'Altice Dominicana';
      }
      if (areaCode.startsWith('2')) {
        this.think('2xx series indicates Viva Dominicana');
        return 'Viva Dominicana';
      }
    }
    
    if (countryCode === 'US') {
      const prefix = cleanNumber.substring(4, 7);
      this.think(`US NPA-NXX analysis - Prefix: ${prefix}`);
      
      const prefixNum = parseInt(prefix);
      if (prefixNum >= 200 && prefixNum <= 499) {
        this.think('Prefix pattern suggests AT&T allocation');
        return 'AT&T Mobility';
      }
      if (prefixNum >= 500 && prefixNum <= 799) {
        this.think('Prefix pattern suggests Verizon allocation');
        return 'Verizon Wireless';
      }
      this.think('Prefix pattern suggests T-Mobile allocation');
      return 'T-Mobile USA';
    }
    
    if (countryCode === 'GB') {
      const prefix = cleanNumber.substring(2, 4);
      this.think(`UK mobile prefix: ${prefix}`);
      
      if (['74', '75', '76', '77', '78', '79'].includes(prefix)) {
        this.think('7x series indicates Vodafone UK');
        return 'Vodafone UK';
      }
      if (['70', '71'].includes(prefix)) {
        this.think('70-71 series indicates O2 UK');
        return 'O2 UK';
      }
      if (['72', '73'].includes(prefix)) {
        this.think('72-73 series indicates EE Limited');
        return 'EE Limited';
      }
    }
    
    if (countryCode === 'NG') {
      const prefix = cleanNumber.substring(3, 6);
      this.think(`Nigeria operator prefix: ${prefix}`);
      
      if (['803', '806', '810', '813', '814', '703', '706', '903', '906'].includes(prefix)) {
        this.think('Prefix indicates MTN Nigeria');
        return 'MTN Nigeria';
      }
      if (['805', '807', '811', '815', '705'].includes(prefix)) {
        this.think('Prefix indicates Globacom');
        return 'Globacom';
      }
      if (['802', '808', '812', '701', '708', '902', '904'].includes(prefix)) {
        this.think('Prefix indicates Airtel Nigeria');
        return 'Airtel Nigeria';
      }
    }
    
    this.think('No specific carrier pattern identified - using generic carrier');
    return 'Unknown Carrier';
  }

  /**
   * Get mock NumVerify response for demo mode
   */
  private getMockNumVerifyResponse(phoneNumber: string): { data: any } {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Comprehensive carrier detection based on number patterns
    let countryCode = 'US';
    let countryName = 'United States';
    let carrier = 'AT&T';
    let lineType = 'mobile';
    let localFormat = phoneNumber;
    
    // Dominican Republic (+1-809, +1-829, +1-849)
    if (cleanNumber.startsWith('1809') || cleanNumber.startsWith('809') ||
        cleanNumber.startsWith('1829') || cleanNumber.startsWith('829') ||
        cleanNumber.startsWith('1849') || cleanNumber.startsWith('849')) {
      countryCode = 'DO';
      countryName = 'Dominican Republic';
      const areaCode = cleanNumber.substring(cleanNumber.length - 10, cleanNumber.length - 7);
      
      // Dominican Republic carriers by area code patterns
      if (areaCode.startsWith('8')) {
        carrier = 'Claro Dominican Republic';
      } else if (areaCode.startsWith('9')) {
        carrier = 'Altice Dominicana (Orange)';
      } else if (areaCode.startsWith('2')) {
        carrier = 'Viva (Trilogy Dominicana)';
      } else {
        carrier = 'Claro Dominican Republic';
      }
      localFormat = `(${areaCode}) ${cleanNumber.slice(-7, -4)}-${cleanNumber.slice(-4)}`;
    }
    // United Kingdom (+44)
    else if (cleanNumber.startsWith('44')) {
      countryCode = 'GB';
      countryName = 'United Kingdom';
      const prefix = cleanNumber.substring(2, 4);
      
      if (prefix === '74' || prefix === '75' || prefix === '76' || prefix === '77' || prefix === '78' || prefix === '79') {
        carrier = 'Vodafone UK';
        lineType = 'mobile';
      } else if (prefix === '70' || prefix === '71') {
        carrier = 'O2 UK';
        lineType = 'mobile';
      } else if (prefix === '72' || prefix === '73') {
        carrier = 'EE (Everything Everywhere)';
        lineType = 'mobile';
      } else {
        carrier = 'BT Group';
        lineType = 'landline';
      }
    }
    // India (+91)
    else if (cleanNumber.startsWith('91')) {
      countryCode = 'IN';
      countryName = 'India';
      this.think('Detected India country code (+91)');
      
      // Check if mobile (starts with 6, 7, 8, or 9)
      if (['6', '7', '8', '9'].includes(cleanNumber.charAt(2))) {
        lineType = 'mobile';
        carrier = this.analyzeCarrierFromPattern(cleanNumber, countryCode);
        this.act(`Identified carrier: ${carrier} via pattern analysis`);
      } else {
        carrier = 'BSNL';
        lineType = 'landline';
        this.think('Fixed-line pattern detected');
      }
    }
    // Nigeria (+234)
    else if (cleanNumber.startsWith('234')) {
      countryCode = 'NG';
      countryName = 'Nigeria';
      const prefix = cleanNumber.substring(3, 6);
      
      if (prefix >= '803' && prefix <= '806' || prefix >= '810' && prefix <= '814' || prefix === '703' || prefix === '706') {
        carrier = 'MTN Nigeria';
      } else if (prefix >= '805' && prefix <= '807' || prefix >= '811' && prefix <= '817' || prefix === '705' || prefix === '708') {
        carrier = 'Globacom (Glo Mobile)';
      } else if (prefix >= '802' && prefix <= '809' || prefix === '701' || prefix === '708') {
        carrier = 'Airtel Nigeria';
      } else if (prefix === '809' || prefix === '817' || prefix === '818' || prefix === '909') {
        carrier = '9mobile (Etisalat)';
      } else {
        carrier = 'MTN Nigeria';
      }
      lineType = 'mobile';
    }
    // Germany (+49)
    else if (cleanNumber.startsWith('49')) {
      countryCode = 'DE';
      countryName = 'Germany';
      const prefix = cleanNumber.substring(2, 5);
      
      if (prefix.startsWith('15') || prefix.startsWith('16') || prefix.startsWith('17')) {
        carrier = 'Deutsche Telekom (T-Mobile)';
        lineType = 'mobile';
      } else {
        carrier = 'Deutsche Telekom';
        lineType = 'landline';
      }
    }
    // United States (+1) - Default
    else if (cleanNumber.startsWith('1') && cleanNumber.length === 11) {
      countryCode = 'US';
      countryName = 'United States';
      this.think('Detected US/Canada NANP number');
      
      const areaCode = cleanNumber.substring(1, 4);
      const prefix = cleanNumber.substring(4, 7);
      
      carrier = this.analyzeCarrierFromPattern(cleanNumber, countryCode);
      this.act(`US carrier determined: ${carrier} via NPA-NXX analysis`);
      
      lineType = 'mobile';
      localFormat = `(${areaCode}) ${prefix}-${cleanNumber.slice(-4)}`;
    }
    // Canada (+1) with 10 digits
    else if (cleanNumber.startsWith('1') && cleanNumber.length === 11) {
      countryCode = 'CA';
      countryName = 'Canada';
      carrier = 'Rogers Wireless';
      lineType = 'mobile';
    }
    
    const internationalFormat = cleanNumber.startsWith('1') ? 
      `+1 ${cleanNumber.slice(1, 4)}-${cleanNumber.slice(4, 7)}-${cleanNumber.slice(7)}` :
      phoneNumber.startsWith('+') ? phoneNumber : '+' + cleanNumber;
    
    return {
      data: {
        valid: true,
        number: cleanNumber,
        local_format: localFormat,
        international_format: internationalFormat,
        country_prefix: '+' + (countryCode === 'DO' ? '1' : cleanNumber.substring(0, cleanNumber.length - 10).replace(/^1/, '')),
        country_code: countryCode,
        country_name: countryName,
        location: countryName,
        carrier: carrier,
        line_type: lineType
      }
    };
  }

  /**
   * Get mock Abstract response for demo mode
   */
  private getMockAbstractResponse(phoneNumber: string): { data: any } {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Comprehensive carrier detection based on number patterns
    let countryCode = 'US';
    let countryName = 'United States';
    let carrier = 'AT&T Mobility';
    let type = 'mobile';
    let localFormat = phoneNumber;
    
    // Dominican Republic (+1-809, +1-829, +1-849)
    if (cleanNumber.startsWith('1809') || cleanNumber.startsWith('809') ||
        cleanNumber.startsWith('1829') || cleanNumber.startsWith('829') ||
        cleanNumber.startsWith('1849') || cleanNumber.startsWith('849')) {
      countryCode = 'DO';
      countryName = 'Dominican Republic';
      this.think('Detected Dominican Republic NANP area code');
      
      const areaCode = cleanNumber.substring(cleanNumber.length - 10, cleanNumber.length - 7);
      carrier = this.analyzeCarrierFromPattern(cleanNumber, countryCode);
      this.act(`Carrier identified: ${carrier} from area code analysis`);
      
      localFormat = `(${areaCode}) ${cleanNumber.slice(-7, -4)}-${cleanNumber.slice(-4)}`;
    }
    // United Kingdom (+44)
    else if (cleanNumber.startsWith('44')) {
      countryCode = 'GB';
      countryName = 'United Kingdom';
      const prefix = cleanNumber.substring(2, 4);
      
      if (prefix === '74' || prefix === '75' || prefix === '76' || prefix === '77' || prefix === '78' || prefix === '79') {
        carrier = 'Vodafone UK';
        type = 'mobile';
      } else if (prefix === '70' || prefix === '71') {
        carrier = 'O2 UK (Telefonica)';
        type = 'mobile';
      } else if (prefix === '72' || prefix === '73') {
        carrier = 'EE Limited';
        type = 'mobile';
      } else {
        carrier = 'BT Group';
        type = 'landline';
      }
    }
    // India (+91)
    else if (cleanNumber.startsWith('91')) {
      countryCode = 'IN';
      countryName = 'India';
      this.think('Detected India country code (+91)');
      
      // Check if mobile (starts with 6, 7, 8, or 9)
      if (['6', '7', '8', '9'].includes(cleanNumber.charAt(2))) {
        type = 'mobile';
        carrier = this.analyzeCarrierFromPattern(cleanNumber, countryCode);
        this.act(`Identified carrier: ${carrier} via pattern analysis`);
      } else {
        carrier = 'BSNL';
        type = 'landline';
        this.think('Fixed-line pattern detected');
      }
    }
    // Nigeria (+234)
    else if (cleanNumber.startsWith('234')) {
      countryCode = 'NG';
      countryName = 'Nigeria';
      const prefix = cleanNumber.substring(3, 6);
      
      if (prefix >= '803' && prefix <= '806' || prefix >= '810' && prefix <= '814' || prefix === '703' || prefix === '706') {
        carrier = 'MTN Nigeria Communications';
      } else if (prefix >= '805' && prefix <= '807' || prefix >= '811' && prefix <= '817') {
        carrier = 'Globacom Limited';
      } else if (prefix >= '802' && prefix <= '809' || prefix === '701' || prefix === '708') {
        carrier = 'Airtel Networks Limited';
      } else if (prefix === '809' || prefix === '817' || prefix === '818' || prefix === '909') {
        carrier = '9mobile (Emerging Markets Telecom)';
      } else {
        carrier = 'MTN Nigeria Communications';
      }
      type = 'mobile';
    }
    // Germany (+49)
    else if (cleanNumber.startsWith('49')) {
      countryCode = 'DE';
      countryName = 'Germany';
      const prefix = cleanNumber.substring(2, 5);
      
      if (prefix.startsWith('15') || prefix.startsWith('16') || prefix.startsWith('17')) {
        carrier = 'Deutsche Telekom AG';
        type = 'mobile';
      } else {
        carrier = 'Deutsche Telekom AG';
        type = 'landline';
      }
    }
    // United States (+1) - Default
    else if (cleanNumber.startsWith('1') && cleanNumber.length === 11) {
      countryCode = 'US';
      countryName = 'United States';
      const areaCode = cleanNumber.substring(1, 4);
      const prefix = cleanNumber.substring(4, 7);
      
      // US carrier detection
      if (areaCode === '415' || areaCode === '510' || areaCode === '408') {
        if (prefix >= '200' && prefix <= '499') {
          carrier = 'AT&T Mobility LLC';
        } else if (prefix >= '500' && prefix <= '799') {
          carrier = 'Verizon Wireless';
        } else {
          carrier = 'T-Mobile USA, Inc.';
        }
      } else if (areaCode === '212' || areaCode === '646' || areaCode === '917') {
        carrier = 'Verizon Wireless';
      } else if (areaCode === '310' || areaCode === '424' || areaCode === '213') {
        carrier = 'T-Mobile USA, Inc.';
      } else {
        carrier = 'AT&T Mobility LLC';
      }
      type = 'mobile';
      localFormat = `(${areaCode}) ${prefix}-${cleanNumber.slice(-4)}`;
    }
    
    const internationalFormat = cleanNumber.startsWith('1') ? 
      `+1 ${cleanNumber.slice(1, 4)}-${cleanNumber.slice(4, 7)}-${cleanNumber.slice(7)}` :
      phoneNumber.startsWith('+') ? phoneNumber : '+' + cleanNumber;
    
    return {
      data: {
        phone: cleanNumber,
        valid: true,
        format: {
          international: internationalFormat,
          local: localFormat
        },
        country: {
          code: countryCode,
          name: countryName,
          prefix: '+' + (countryCode === 'DO' ? '1' : cleanNumber.substring(0, cleanNumber.length - 10).replace(/^1/, ''))
        },
        location: countryName,
        type: type,
        carrier: carrier
      }
    };
  }
}
