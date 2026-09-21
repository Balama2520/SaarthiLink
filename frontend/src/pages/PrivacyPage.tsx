import { ShieldCheck, Lock, Mail, FileText, CheckCircle2 } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-10 space-y-8 text-foreground custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Saarthi AI Privacy Policy</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-display">
          Privacy Policy & Data Principles
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated: September 14, 2026. This policy describes exactly how Saarthi AI handles user data and privacy.
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <section className="rounded-2xl border border-border/70 bg-card p-6 md:p-8 space-y-4">
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            1. Information We Collect
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Saarthi AI collects only the information necessary to provide career guidance, ATS resume matching, and feature prioritization:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Account Credentials:</strong> Usernames and password hashes (stored securely; raw passwords are never logged or stored).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Career & Skill Data:</strong> Target roles, years of experience, skill lists, and career goals provided in your profile.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Discovery & Feedback Inputs:</strong> Responses to our feature prioritization survey (34 modules) and contact/opportunity submissions.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Uploaded Resumes:</strong> PDF/Text resumes uploaded for ATS evaluation are processed on the server and used strictly for skill extraction.</span>
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-6 md:p-8 space-y-4">
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            2. Data Security & Storage
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All user data is persisted in standard relational databases (SQLite for local development, PostgreSQL for production deployments).
            API credentials (such as Google Gemini API keys) are kept strictly server-side and are never exposed to browser bundles or logged in application logs.
          </p>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-6 md:p-8 space-y-4">
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            3. Data Retention & Deletion Requests
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You may request deletion of your account and all associated discovery records at any time by contacting our engineering team at:
          </p>
          <div className="p-4 rounded-xl border border-border bg-muted/30 font-mono text-sm font-semibold text-primary">
            saarthi.ai.team@gmail.com
          </div>
        </section>
      </div>
    </div>
  );
}
