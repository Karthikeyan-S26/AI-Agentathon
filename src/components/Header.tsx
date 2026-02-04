import { Phone, Zap, Shield } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative p-2 rounded-lg bg-primary/10 border border-primary/30">
              <img src="/logo.png" alt="Validex AI" className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Validex <span className="text-primary">AI</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Multi-Agent Validation Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/30">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-medium text-success">System Online</span>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Enterprise Ready</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
