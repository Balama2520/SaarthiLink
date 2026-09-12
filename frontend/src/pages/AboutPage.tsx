import {
  Sparkles, Cpu, Database, CheckCircle2
} from "lucide-react";

export default function AboutPage() {
  const techStack = [
    { category: "Backend Engine", items: ["Python 3.14 / FastAPI", "SQLAlchemy 2.0 ORM", "Alembic Migrations", "Event Outbox Pattern"] },
    { category: "AI Architecture", items: ["Hugging Face Saarthi Brain", "Google Gemini AI", "LangChain & RAG Pipeline", "Dual Provider Router"] },
    { category: "Job Seeding System", items: ["Google Sheets API v4", "14-Tab Control Center", "Automated Deduplication", "Multi-Source Staging"] },
    { category: "Frontend Interface", items: ["React 18 & TypeScript", "Tailwind CSS & Framer Motion", "TanStack React Query", "Lucide Icon Suite"] },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-10 space-y-12">
      {/* Header Banner */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1 text-xs font-semibold text-purple-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Saarthi AI Architecture & Product Intelligence</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-foreground font-display">
          About Saarthi AI
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-3xl leading-relaxed">
          Saarthi AI is built to turn fragmented job postings, resume checks, and interview prep into a cohesive, intelligence-driven career ecosystem for candidates and hiring teams alike.
        </p>
      </div>

      {/* Product Vision & Mission */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-7 space-y-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Cpu className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-foreground font-display">The Vision</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Standard job platforms suffer from static listings, high noise ratios, and one-size-fits-all recommendations. Saarthi AI bridges candidate aspirations with real employer requirements using active feedback loops, AI ATS scoring, and automated opportunity validation.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-7 space-y-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <Database className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-foreground font-display">Job Seeding Architecture</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our 14-tab Google Sheets Control Center seamlessly synchronizes sources, company rules, role patterns, and staging logs. Public job submissions pass through automated validation before entering production feeds.
          </p>
        </div>
      </div>

      {/* Tech Stack Grid */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground font-display">Production Stack</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {techStack.map((sec) => (
            <div key={sec.category} className="rounded-2xl border border-border/70 bg-card p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">{sec.category}</h3>
              <ul className="space-y-2">
                {sec.items.map(item => (
                  <li key={item} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Team / Architect Info */}
      <div className="rounded-3xl border border-border bg-gradient-to-r from-card via-card to-background p-8 md:p-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-primary">Principal Architect & Lead Engineer</div>
            <h3 className="text-2xl font-bold text-foreground font-display">Bala Maneesh Ayanala</h3>
            <p className="text-sm text-muted-foreground max-w-xl">
              Lead full-stack developer and AI systems architect responsible for Saarthi AI's career copilot, Google Sheets job seeding, and dual AI provider integration.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-border bg-background/80 px-4 py-3 text-center">
              <div className="text-lg font-bold text-foreground">185+</div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Passing Tests</div>
            </div>
            <div className="rounded-2xl border border-border bg-background/80 px-4 py-3 text-center">
              <div className="text-lg font-bold text-emerald-400">34</div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Core Features</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
