import { Header } from "@/components/Header";
import { PhoneInput } from "@/components/PhoneInput";
import { AgentTerminal } from "@/components/AgentTerminal";
import { AgentStatusPanel } from "@/components/AgentStatusPanel";
import { ValidationResults } from "@/components/ValidationResults";
import { StatsBar } from "@/components/StatsBar";
import { useValidation } from "@/hooks/useValidation";
import { GlowCard } from "@/components/ui/GlowCard";
import { Cpu, Sparkles } from "lucide-react";

const Index = () => {
  const { logs, agentStatuses, isProcessing, result, stats, validate } = useValidation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Powered by Multi-Agent AI</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Real-Time Phone Validation
            <br />
            <span className="text-primary">& WhatsApp Intelligence</span>
          </h2>
          
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Watch our autonomous AI agents validate phone numbers, detect WhatsApp presence, 
            and calculate confidence scores in real-time with full reasoning transparency.
          </p>
        </section>

        {/* Stats Bar */}
        <StatsBar {...stats} />

        {/* Input Section */}
        <GlowCard className="max-w-3xl mx-auto" variant="gradient">
          <div className="flex items-center gap-2 mb-6">
            <Cpu className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Validation Input</h3>
          </div>
          <PhoneInput onValidate={validate} isLoading={isProcessing} />
        </GlowCard>

        {/* Agent Status Panel */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Agent Pipeline Status
          </h3>
          <AgentStatusPanel agents={agentStatuses} />
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agent Terminal */}
          <section className="lg:row-span-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Agent Reasoning Trace
            </h3>
            <div className="h-[500px]">
              <AgentTerminal logs={logs} isProcessing={isProcessing} />
            </div>
          </section>

          {/* Results Section */}
          <section>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Validation Results
            </h3>
            <ValidationResults result={result} />
          </section>
        </div>


        {/* Footer */}
        <footer className="text-center py-8 text-muted-foreground text-sm border-t border-border mt-12">
          <p>PhoneVerifyAI — Multi-Agent Orchestration Engine</p>
          <p className="text-xs mt-2">
            Built with autonomous reasoning and self-healing capabilities
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
