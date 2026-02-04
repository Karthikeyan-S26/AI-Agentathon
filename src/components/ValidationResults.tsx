import { ValidationResult } from "@/types/validation";
import { GlowCard } from "@/components/ui/GlowCard";
import { ConfidenceGauge } from "@/components/ConfidenceGauge";
import { cn } from "@/lib/utils";
import {
  Phone,
  MapPin,
  Radio,
  MessageSquare,
  Clock,
  DollarSign,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  PhoneCall,
  Mailbox,
  Calendar
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ValidationResultsProps {
  result: ValidationResult | null;
}

export function ValidationResults({ result }: ValidationResultsProps) {
  if (!result) {
    return (
      <GlowCard className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Phone className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No validation results yet</p>
          <p className="text-xs mt-1">Enter a phone number to begin</p>
        </div>
      </GlowCard>
    );
  }

  const getWhatsAppStatusConfig = () => {
    switch (result.whatsappStatus) {
      case 'verified':
        return { icon: CheckCircle2, color: 'text-success', label: 'WhatsApp Verified', bg: 'bg-success/10' };
      case 'not_found':
        return { icon: XCircle, color: 'text-destructive', label: 'Not on WhatsApp', bg: 'bg-destructive/10' };
      case 'unchecked':
        return { icon: AlertTriangle, color: 'text-warning', label: 'Check Skipped', bg: 'bg-warning/10' };
      default:
        return { icon: Clock, color: 'text-muted-foreground', label: 'Checking...', bg: 'bg-muted/10' };
    }
  };

  const whatsAppConfig = getWhatsAppStatusConfig();
  const WhatsAppIcon = whatsAppConfig.icon;

  const getInactivitySeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { color: 'destructive', label: 'Critical', bgClass: 'bg-destructive/10 border-destructive/30' };
      case 'high':
        return { color: 'destructive', label: 'High Risk', bgClass: 'bg-destructive/10 border-destructive/30' };
      case 'moderate':
        return { color: 'warning', label: 'Moderate Risk', bgClass: 'bg-warning/10 border-warning/30' };
      case 'low':
        return { color: 'default', label: 'Low Risk', bgClass: 'bg-muted border-muted' };
      default:
        return { color: 'default', label: 'Active', bgClass: 'bg-success/10 border-success/30' };
    }
  };

  const getAlternativeChannelIcon = (channel: string) => {
    switch (channel) {
      case 'SMS': return PhoneCall;
      case 'Email': return Mail;
      case 'Voice Call': return Phone;
      case 'Postal Mail': return Mailbox;
      default: return MessageSquare;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Result Card */}
      <GlowCard className="lg:col-span-2" glowColor={result.isValid ? 'success' : 'warning'}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Validation Result</h3>
            <p className="font-mono text-2xl text-primary">
              {result.countryCode} {result.phoneNumber}
            </p>
          </div>
          <div className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium",
            result.isValid ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
          )}>
            {result.isValid ? 'Valid Number' : 'Invalid'}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <MapPin className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Country</span>
            </div>
            <p className="font-medium">{result.countryName}</p>
          </div>

          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Radio className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Carrier</span>
            </div>
            <p className="font-medium">{result.carrier}</p>
          </div>

          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Phone className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Line Type</span>
            </div>
            <p className={cn(
              "font-medium capitalize",
              result.lineType === 'mobile' && "text-success",
              result.lineType === 'landline' && "text-warning"
            )}>
              {result.lineType}
            </p>
          </div>

          <div className={cn("p-4 rounded-lg", whatsAppConfig.bg)}>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">WhatsApp</span>
            </div>
            <div className="flex items-center gap-2">
              <WhatsAppIcon className={cn("w-4 h-4", whatsAppConfig.color)} />
              <p className={cn("font-medium", whatsAppConfig.color)}>
                {whatsAppConfig.label}
              </p>
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Confidence Score */}
      <GlowCard className="flex flex-col items-center justify-center" glowColor="primary">
        <ConfidenceGauge score={result.confidenceScore} />
      </GlowCard>

      {/* Inactivity Warning */}
      {result.inactivityStatus && result.inactivityStatus.isInactive && (
        <div className="lg:col-span-3">
          <Alert className={cn("border-2", getInactivitySeverityConfig(result.inactivityStatus.severity).bgClass)}>
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="flex items-center gap-2 mb-3">
              <span>Inactive WhatsApp Account Detected</span>
              <Badge variant={getInactivitySeverityConfig(result.inactivityStatus.severity).color as any}>
                {getInactivitySeverityConfig(result.inactivityStatus.severity).label}
              </Badge>
            </AlertTitle>
            <AlertDescription>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Last Active</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-warning" />
                      <span className="font-medium">{result.inactivityStatus.daysSinceActive} days ago</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Delivery Probability</span>
                    <span className="font-medium mt-1 text-destructive">
                      {result.inactivityStatus.deliveryProbability}%
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Inactivity Score</span>
                    <span className="font-medium mt-1">
                      {result.inactivityStatus.inactivityScore}/100
                    </span>
                  </div>
                </div>

                {result.inactivityStatus.recommendations.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium mb-2">Recommendations:</p>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                      {result.inactivityStatus.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.inactivityStatus.alternativeChannels.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Try Alternative Channels:</p>
                    <div className="flex flex-wrap gap-2">
                      {result.inactivityStatus.alternativeChannels.map((channel, idx) => {
                        const Icon = getAlternativeChannelIcon(channel);
                        return (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Icon className="w-4 h-4" />
                            {channel}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Business Account Badge */}
      {result.whatsappData?.metadata?.businessConfidence && 
       result.whatsappData.metadata.businessConfidence > 0.6 && (
        <div className="lg:col-span-3">
          <Alert className="border-2 bg-blue-50/50 border-blue-200/50 dark:bg-blue-950/20 dark:border-blue-800/30">
            <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="flex items-center gap-2">
              <span>Business WhatsApp Account</span>
              <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300">
                {Math.round(result.whatsappData.metadata.businessConfidence * 100)}% Confidence
              </Badge>
            </AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <p className="text-sm">
                  This appears to be a business or professional WhatsApp account based on:
                </p>
                {result.whatsappData.metadata.businessIndicators && (
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    {result.whatsappData.metadata.businessIndicators.map((indicator, idx) => (
                      <li key={idx}>{indicator}</li>
                    ))}
                  </ul>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Metrics Row */}
      <div className="lg:col-span-3 grid grid-cols-3 gap-4">
        <GlowCard className="text-center" variant="gradient">
          <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold font-mono">{result.validationTime}ms</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Processing Time</p>
        </GlowCard>

        <GlowCard className="text-center" variant="gradient" glowColor="success">
          <DollarSign className="w-6 h-6 text-success mx-auto mb-2" />
          <p className="text-2xl font-bold font-mono text-success">${result.costSaved.toFixed(3)}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Cost Saved</p>
        </GlowCard>

        <GlowCard className="text-center" variant="gradient" glowColor="warning">
          <RefreshCw className="w-6 h-6 text-warning mx-auto mb-2" />
          <p className="text-2xl font-bold font-mono">{result.retryCount}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Retries</p>
        </GlowCard>
      </div>
    </div>
  );
}
