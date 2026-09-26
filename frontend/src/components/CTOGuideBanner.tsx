import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";

interface CTOGuideBannerProps {
  title: string;
  subtitle: string;
  steps: { title: string; desc: string }[];
  ctoTip?: string;
  defaultExpanded?: boolean;
}

export const CTOGuideBanner: React.FC<CTOGuideBannerProps> = ({
  title,
  subtitle,
  steps,
  ctoTip,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-background p-4 md:p-5 shadow-sm transition-all duration-200">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                CTO User Guide
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">Founder: Bala Maneesh Ayanala</span>
            </div>
            <h3 className="text-base font-bold text-foreground font-display leading-tight">{title}</h3>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all shrink-0"
          aria-expanded={isExpanded}
        >
          <span>{isExpanded ? "Hide Guide" : "How to Use"}</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-border/50 space-y-4 animate-in fade-in duration-150">
          <p className="text-xs text-muted-foreground leading-relaxed">{subtitle}</p>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border/60 bg-card/60 p-3 space-y-1.5 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary font-mono">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-foreground truncate">{step.title}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal pl-7">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* CTO Pro-Tip Banner */}
          {ctoTip && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-400 font-mono text-[11px] uppercase mr-1.5">CTO Pro-Tip:</span>
                <span className="text-amber-100/90">{ctoTip}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
