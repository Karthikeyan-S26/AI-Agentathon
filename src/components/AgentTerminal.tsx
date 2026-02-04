import { useEffect, useRef } from "react";
import { AgentLog, AgentType } from "@/types/validation";
import { cn } from "@/lib/utils";
import { 
  Bot, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  Brain,
  RefreshCw,
  MessageSquare,
  BarChart3,
  Network
} from "lucide-react";

interface AgentTerminalProps {
  logs: AgentLog[];
  isProcessing: boolean;
}

const agentConfig: Record<AgentType, { color: string; icon: typeof Bot }> = {
  orchestrator: { color: 'text-primary', icon: Network },
  validation: { color: 'text-success', icon: CheckCircle2 },
  decision: { color: 'text-accent', icon: Brain },
  retry: { color: 'text-warning', icon: RefreshCw },
  whatsapp: { color: 'text-green-400', icon: MessageSquare },
  carrier: { color: 'text-blue-400', icon: Network },
  confidence: { color: 'text-primary', icon: BarChart3 },
};

export function AgentTerminal({ logs, isProcessing }: AgentTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  };

  const getStatusIcon = (status: AgentLog['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-3 h-3 text-success" />;
      case 'warning':
        return <AlertTriangle className="w-3 h-3 text-warning" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-destructive" />;
      case 'thinking':
        return <Loader2 className="w-3 h-3 text-accent animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background/50 rounded-lg border border-border overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/80" />
          <div className="w-3 h-3 rounded-full bg-warning/80" />
          <div className="w-3 h-3 rounded-full bg-success/80" />
        </div>
        <span className="text-xs font-mono text-muted-foreground ml-2">
          agent-terminal — reasoning trace
        </span>
        {isProcessing && (
          <Loader2 className="w-3 h-3 text-primary animate-spin ml-auto" />
        )}
      </div>

      {/* Terminal Content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Bot className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">Awaiting validation request...</p>
          </div>
        ) : (
          logs.map((log, index) => {
            const config = agentConfig[log.agent] || { color: 'text-muted-foreground', icon: Bot };
            const AgentIcon = config.icon;
            
            return (
              <div 
                key={log.id} 
                className={cn(
                  "flex items-start gap-2 slide-in",
                  log.status === 'thinking' && "opacity-80"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="text-muted-foreground text-xs shrink-0 mt-0.5">
                  [{formatTime(log.timestamp)}]
                </span>
                <AgentIcon className={cn("w-4 h-4 shrink-0 mt-0.5", config.color)} />
                <span className={cn("font-semibold shrink-0", config.color)}>
                  {log.agent.toUpperCase()}:
                </span>
                <span className="text-foreground/90">{log.message}</span>
                {getStatusIcon(log.status)}
              </div>
            );
          })
        )}
        
        {isProcessing && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="typing-cursor">▊</span>
          </div>
        )}
      </div>
    </div>
  );
}
