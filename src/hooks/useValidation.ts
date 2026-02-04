import { useState, useCallback } from "react";
import { AgentLog, AgentStatus, AgentType, ValidationResult } from "@/types/validation";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { createMultiAgentSystem } from "@/agents";
import type { ValidationResult as MASValidationResult } from "@/agents";

const initialAgentStatuses: AgentStatus[] = [
  { name: 'decision', displayName: 'Decision Agent', status: 'idle', icon: 'brain' },
  { name: 'validation', displayName: 'Validation Agent', status: 'idle', icon: 'check' },
  { name: 'whatsapp', displayName: 'WhatsApp Agent', status: 'idle', icon: 'message' },
  { name: 'retry', displayName: 'Retry Agent', status: 'idle', icon: 'refresh' },
  { name: 'confidence', displayName: 'Confidence Agent', status: 'idle', icon: 'chart' },
];

export function useValidation() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>(initialAgentStatuses);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [stats, setStats] = useState({
    totalValidations: 1247,
    successRate: 98.4,
    avgResponseTime: 342,
    totalSaved: 156.78,
  });

  const addLog = useCallback((agent: AgentType, message: string, status: AgentLog['status']) => {
    setLogs(prev => [...prev, {
      id: uuidv4(),
      timestamp: new Date(),
      agent,
      message,
      status,
    }]);
  }, []);

  const updateAgentStatus = useCallback((agent: AgentType, status: AgentStatus['status']) => {
    setAgentStatuses(prev => prev.map(a => 
      a.name === agent ? { ...a, status } : a
    ));
  }, []);

  const resetAgents = useCallback(() => {
    setAgentStatuses(initialAgentStatuses);
    setLogs([]);
  }, []);

  const processServerLogs = useCallback((serverLogs: Array<{ agent: string; message: string; status: string; timestamp: string }>) => {
    // Group logs by agent and process them with delays for visual effect
    const agentOrder: AgentType[] = ['orchestrator', 'validation', 'carrier', 'retry', 'decision', 'whatsapp', 'confidence'];
    
    serverLogs.forEach((log, index) => {
      setTimeout(() => {
        const agentName = log.agent as AgentType;
        
        // Update agent status based on log
        if (log.status === 'thinking') {
          updateAgentStatus(agentName, 'active');
        } else if (log.status === 'success' || log.status === 'error') {
          // Check if this is the last log for this agent
          const isLastLogForAgent = !serverLogs.slice(index + 1).some(l => l.agent === agentName);
          if (isLastLogForAgent) {
            updateAgentStatus(agentName, 'complete');
          }
        }
        
        addLog(agentName, log.message, log.status as AgentLog['status']);
      }, index * 150); // Stagger logs for visual effect
    });
  }, [addLog, updateAgentStatus]);

  const validate = useCallback(async (phoneNumber: string, countryCode: string) => {
    resetAgents();
    setIsProcessing(true);
    setResult(null);

    const startTime = Date.now();

    try {
      // Initialize Multi-Agent System
      addLog('decision', 'Initializing Multi-Agent System...', 'thinking');
      
      const supervisor = createMultiAgentSystem({
        numverifyKey: import.meta.env.VITE_NUMVERIFY_API_KEY,
        abstractKey: import.meta.env.VITE_ABSTRACT_API_KEY,
        whatsappKey: import.meta.env.VITE_WHATSAPP_API_KEY,
        twilioAccountSid: import.meta.env.VITE_TWILIO_ACCOUNT_SID,
        twilioAuthToken: import.meta.env.VITE_TWILIO_AUTH_TOKEN,
        twilioPhoneNumber: import.meta.env.VITE_TWILIO_PHONE_NUMBER,
        enableLogging: false // We'll handle logging ourselves
      });

      // Stream agent updates
      updateAgentStatus('decision', 'active');
      addLog('decision', `Analyzing phone number: ${phoneNumber}`, 'thinking');
      
      // Execute validation through MAS
      const masResult: MASValidationResult = await supervisor.validate({
        phoneNumber: `${countryCode}${phoneNumber}`,
        country: countryCode
      });

      // Debug logging
      console.log('🔍 MAS Result:', masResult);
      console.log('📱 WhatsApp Data:', {
        exists: masResult.whatsapp?.exists,
        skipWhatsApp: masResult.executionPlan.skipWhatsApp,
        lineType: masResult.validation.lineType,
        carrier: masResult.validation.carrier,
        countryCode: masResult.validation.countryCode
      });

      // Process Chain of Thought
      masResult.chainOfThought.forEach((thought, index) => {
        setTimeout(() => {
          const agentMatch = thought.match(/\[(\w+)\]/);
          const agent = (agentMatch?.[1]?.toLowerCase() || 'decision') as AgentType;
          const message = thought.replace(/\[\w+\]\s*/, '');
          addLog(agent, message, 'thinking');
          if (index === 0) updateAgentStatus(agent, 'active');
        }, index * 100);
      });

      // Process Chain of Execution
      masResult.chainOfExecution.forEach((action, index) => {
        setTimeout(() => {
          const agentMatch = action.match(/(\w+)\s+Agent:/);
          const agent = (agentMatch?.[1]?.toLowerCase() || 'decision') as AgentType;
          const message = action.replace(/\w+\s+Agent:\s*/, '');
          addLog(agent, message, 'success');
          updateAgentStatus(agent, 'complete');
        }, (masResult.chainOfThought.length + index) * 100);
      });

      // Calculate cost saved (mock calculation)
      const baseCost = 0.005; // Base API cost
      const actualCost = masResult.executionPlan.estimatedCost;
      const costSaved = Math.max(0, baseCost - actualCost);

      // Calculate WhatsApp status
      let whatsappStatus: ValidationResult['whatsappStatus'] = 'not_found';
      
      if (masResult.whatsapp) {
        // WhatsApp check was performed
        if (masResult.whatsapp.exists) {
          whatsappStatus = 'verified'; // Number exists on WhatsApp
        } else {
          whatsappStatus = 'not_found'; // Number checked but not on WhatsApp
        }
      } else if (masResult.executionPlan.skipWhatsApp || masResult.validation.lineType !== 'mobile') {
        // WhatsApp check was intentionally skipped
        whatsappStatus = 'unchecked';
      }
      
      console.log('📱 WhatsApp Status determined:', whatsappStatus);

      // Map MAS result to UI format
      const uiResult: ValidationResult = {
        phoneNumber: masResult.validation.phoneNumber,
        countryCode: masResult.validation.countryCode,
        countryName: masResult.validation.countryName,
        carrier: masResult.validation.carrier || 'Unknown',
        lineType: masResult.validation.lineType as ValidationResult['lineType'],
        isValid: masResult.validation.valid,
        whatsappStatus,
        confidenceScore: masResult.confidence.score,
        costSaved: costSaved,
        validationTime: masResult.totalExecutionTime,
        retryCount: masResult.chainOfExecution.filter(e => e.includes('Retry')).length
      };

      // Delay setting result to match log animation
      const totalDelay = (masResult.chainOfThought.length + masResult.chainOfExecution.length) * 100 + 500;
      
      setTimeout(() => {
        setResult(uiResult);

        // Update stats
        setStats(prev => ({
          totalValidations: prev.totalValidations + 1,
          successRate: Math.min(99.9, prev.successRate + (masResult.confidence.score > 70 ? 0.1 : -0.1)),
          avgResponseTime: Math.round((prev.avgResponseTime + masResult.totalExecutionTime) / 2),
          totalSaved: prev.totalSaved + costSaved,
        }));

        // Mark all active agents as complete
        setAgentStatuses(prev => prev.map(a => 
          a.status === 'active' ? { ...a, status: 'complete' as const } : a
        ));
        setIsProcessing(false);
      }, totalDelay);

    } catch (error) {
      console.error('Validation error:', error);
      addLog('decision', `Critical error in Multi-Agent System: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      updateAgentStatus('decision', 'complete');
      setAgentStatuses(prev => prev.map(a => ({ ...a, status: 'complete' as const })));
      setIsProcessing(false);
    }
  }, [addLog, updateAgentStatus, resetAgents]);

  return {
    logs,
    agentStatuses,
    isProcessing,
    result,
    stats,
    validate,
  };
}
