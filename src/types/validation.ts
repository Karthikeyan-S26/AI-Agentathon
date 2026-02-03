export interface AgentLog {
  id: string;
  timestamp: Date;
  agent: AgentType;
  message: string;
  status: 'info' | 'success' | 'warning' | 'error' | 'thinking';
}

export type AgentType = 
  | 'orchestrator' 
  | 'validation' 
  | 'carrier'
  | 'decision' 
  | 'retry' 
  | 'whatsapp' 
  | 'confidence';

export interface AgentStatus {
  name: AgentType;
  displayName: string;
  status: 'idle' | 'active' | 'complete' | 'error';
  icon: string;
}

export interface ValidationResult {
  phoneNumber: string;
  countryCode: string;
  countryName: string;
  carrier: string;
  lineType: 'mobile' | 'landline' | 'voip' | 'unknown';
  isValid: boolean;
  whatsappStatus: 'verified' | 'not_found' | 'unchecked' | 'checking';
  confidenceScore: number;
  costSaved: number;
  validationTime: number;
  retryCount: number;
}

export interface ValidationRequest {
  phoneNumber: string;
  countryCode: string;
}
