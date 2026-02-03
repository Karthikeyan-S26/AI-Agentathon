import { AgentStatus, AgentType } from "@/types/validation";
import { cn } from "@/lib/utils";
import {
  Network,
  CheckCircle2,
  Brain,
  RefreshCw,
  MessageSquare,
  BarChart3,
  Radio,
  Loader2
} from "lucide-react";

const agentIcons: Record<AgentType, typeof Network> = {
  orchestrator: Network,
  validation: CheckCircle2,
  carrier: Radio,
  decision: Brain,
  retry: RefreshCw,
  whatsapp: MessageSquare,
  confidence: BarChart3,
};

interface AgentStatusPanelProps {
  agents: AgentStatus[];
}

export function AgentStatusPanel({ agents }: AgentStatusPanelProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
      {agents.map((agent) => {
        const Icon = agentIcons[agent.name];
        
        return (
          <div
            key={agent.name}
            className={cn(
              "relative flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-300",
              agent.status === 'idle' && "border-border bg-card/50 opacity-60",
              agent.status === 'active' && "border-primary bg-primary/10 shadow-glow-sm",
              agent.status === 'complete' && "border-success bg-success/10",
              agent.status === 'error' && "border-destructive bg-destructive/10"
            )}
          >
            <div className={cn(
              "relative p-2 rounded-full",
              agent.status === 'active' && "animate-pulse-glow"
            )}>
              {agent.status === 'active' ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <Icon className={cn(
                  "w-5 h-5",
                  agent.status === 'idle' && "text-muted-foreground",
                  agent.status === 'complete' && "text-success",
                  agent.status === 'error' && "text-destructive"
                )} />
              )}
            </div>
            
            <span className="text-xs font-medium text-center leading-tight">
              {agent.displayName}
            </span>
            
            <div className={cn(
              "absolute top-2 right-2 w-2 h-2 rounded-full",
              agent.status === 'idle' && "bg-muted-foreground",
              agent.status === 'active' && "bg-primary animate-pulse",
              agent.status === 'complete' && "bg-success",
              agent.status === 'error' && "bg-destructive"
            )} />
          </div>
        );
      })}
    </div>
  );
}
