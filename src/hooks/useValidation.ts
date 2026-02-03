import { useState, useCallback } from "react";
import { AgentLog, AgentStatus, AgentType, ValidationResult } from "@/types/validation";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

const initialAgentStatuses: AgentStatus[] = [
  { name: 'orchestrator', displayName: 'Orchestrator', status: 'idle', icon: 'network' },
  { name: 'validation', displayName: 'Validation', status: 'idle', icon: 'check' },
  { name: 'decision', displayName: 'Decision', status: 'idle', icon: 'brain' },
  { name: 'retry', displayName: 'Retry', status: 'idle', icon: 'refresh' },
  { name: 'whatsapp', displayName: 'WhatsApp', status: 'idle', icon: 'message' },
  { name: 'confidence', displayName: 'Confidence', status: 'idle', icon: 'chart' },
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
    const agentOrder: AgentType[] = ['orchestrator', 'validation', 'retry', 'decision', 'whatsapp', 'confidence'];
    
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
      // Show initial processing state
      updateAgentStatus('orchestrator', 'active');
      addLog('orchestrator', `Initiating validation for ${countryCode} ${phoneNumber}`, 'thinking');

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('validate-phone', {
        body: { phoneNumber, countryCode }
      });

      if (error) {
        console.error('Edge function error:', error);
        addLog('orchestrator', `Error: ${error.message}`, 'error');
        updateAgentStatus('orchestrator', 'complete');
        setIsProcessing(false);
        return;
      }

      // Process the server logs with visual delays
      if (data.logs && Array.isArray(data.logs)) {
        // Clear initial log and process server logs
        setLogs([]);
        processServerLogs(data.logs);
      }

      // Set result after a delay to match log processing
      const logProcessingTime = (data.logs?.length || 0) * 150 + 500;
      
      setTimeout(() => {
        setResult({
          phoneNumber: data.phoneNumber,
          countryCode: data.countryCode,
          countryName: data.countryName,
          carrier: data.carrier,
          lineType: data.lineType as ValidationResult['lineType'],
          isValid: data.isValid,
          whatsappStatus: data.whatsappStatus as ValidationResult['whatsappStatus'],
          confidenceScore: data.confidenceScore,
          costSaved: data.costSaved,
          validationTime: data.validationTime,
          retryCount: data.retryCount,
        });

        // Update stats
        setStats(prev => ({
          totalValidations: prev.totalValidations + 1,
          successRate: Math.min(99.9, prev.successRate + 0.01),
          avgResponseTime: Math.round((prev.avgResponseTime + data.validationTime) / 2),
          totalSaved: prev.totalSaved + data.costSaved,
        }));

        // Mark all agents as complete
        setAgentStatuses(prev => prev.map(a => ({ ...a, status: 'complete' as const })));
        setIsProcessing(false);
      }, logProcessingTime);

    } catch (error) {
      console.error('Validation error:', error);
      addLog('orchestrator', `Critical error in validation pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      updateAgentStatus('orchestrator', 'complete');
      setIsProcessing(false);
    }
  }, [addLog, updateAgentStatus, resetAgents, processServerLogs]);

  return {
    logs,
    agentStatuses,
    isProcessing,
    result,
    stats,
    validate,
  };
}
