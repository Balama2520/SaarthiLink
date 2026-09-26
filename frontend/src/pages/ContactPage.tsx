import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Mail, Send, CheckCircle2, AlertCircle, Building2, User, UserCheck,
  Code2, Sparkles, MessageSquare, ShieldCheck, ExternalLink, HelpCircle, ChevronDown,
  Lock, Zap, Globe
} from "lucide-react";
import { api } from "../services/api";

interface ContactInfoData {
  platform_name?: string;
  contact_email?: string;
  lead_architect?: string;
  github?: string;
  huggingface_space?: string;
  support_status?: string;
}

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfoData | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [form, setForm] = useState({
    name: "",
    email: "",
    role_type: "student",
    reason: "feedback",
    message: "",
    consent_given: true,
  });

  useEffect(() => {
    async function loadInfo() {
      try {
        const info = await api.getContactInfo();
        if (info) setContactInfo(info);
      } catch (err) {
        console.error("Failed to load contact info:", err);
      }
    }
    loadInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.message.trim().length < 10) {
      setErrorMsg("Please provide a message of at least 10 characters so we can assist you effectively.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.submitContactForm({
        name: form.name,
        email: form.email,
        role_type: form.role_type,
        reason: form.reason,
        message: form.message,
        consent_given: form.consent_given,
        target_email: contactInfo?.contact_email || "saarthi.ai.team@gmail.com",
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit contact message. Please check your internet connection.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const contactEmail = contactInfo?.contact_email || "saarthi.ai.team@gmail.com";
  const teamLabel = contactInfo?.lead_architect || "Bala Maneesh Ayanala (Founder & Chief Architect)";
  const githubRepo = contactInfo?.github || "https://github.com/Balama2520/SaarthiLink";
  const hfSpace = contactInfo?.huggingface_space || "Saarthi AI Brain";

  if (submitted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background text-center space-y-6 max-w-3xl mx-auto">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-inner"
        >
          <CheckCircle2 className="h-10 w-10" />
        </motion.div>
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">Direct Message Dispatched</span>
          <h2 className="text-3xl font-extrabold text-foreground font-display">Message Sent to Saarthi AI!</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Your inquiry has been logged for review by <span className="font-mono text-primary font-bold">{contactEmail}</span> and the <span className="font-semibold text-foreground">{teamLabel}</span> support team.
          </p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-6 text-left space-y-3 w-full max-w-md">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Submission Summary</div>
          <div className="text-xs space-y-1.5 text-foreground">
            <div><span className="text-muted-foreground">Sender:</span> {form.name} ({form.email})</div>
            <div><span className="text-muted-foreground">Role Persona:</span> {form.role_type.replace(/_/g, " ").toUpperCase()}</div>
            <div><span className="text-muted-foreground">Reason:</span> {form.reason.replace(/_/g, " ").toUpperCase()}</div>
          </div>
        </div>
        <button
          onClick={() => {
            setSubmitted(false);
            setForm({ name: "", email: "", role_type: "student", reason: "feedback", message: "", consent_given: true });
          }}
          className="rounded-xl bg-primary px-8 py-3.5 font-bold text-primary-foreground text-sm transition-all hover:bg-primary/90 shadow-md"
        >
          Send Another Inquiry
        </button>
      </div>
    );
  }

  const charCount = form.message.trim().length;

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-10 space-y-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
          <Mail className="h-3.5 w-3.5" />
          <span>Official Saarthi AI Communication Channel</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground font-display tracking-tight">
          Connect & Collaborate with Saarthi AI
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
          Whether you are a job seeker, HR recruiter, company founder, or placement officer — share your feedback, present job opportunities, feature requests, or partnership inquiries directly with our team.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Form Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span>Send Direct Inquiry</span>
            </h2>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
              ● Active SLA (&lt;24h response)
            </span>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-xs text-destructive flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Full Name *</label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name"
                    className="w-full pl-9 rounded-xl border border-border bg-background/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Email Address *</label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="your.name@example.com"
                    className="w-full pl-9 rounded-xl border border-border bg-background/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Your Role / Persona</label>
                <div className="relative mt-1.5">
                  <UserCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <select
                    value={form.role_type}
                    onChange={e => setForm({ ...form, role_type: e.target.value })}
                    className="w-full pl-9 rounded-xl border border-border bg-background/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="student">Student (College / Placement)</option>
                    <option value="job_seeker">Job Seeker (Actively Looking)</option>
                    <option value="working_professional">Working Professional</option>
                    <option value="recruiter">Recruiter / HR Manager</option>
                    <option value="company">Company / Founder</option>
                    <option value="agency">Placement Agency / Partner</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Inquiry Category</label>
                <div className="relative mt-1.5">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <select
                    value={form.reason}
                    onChange={e => setForm({ ...form, reason: e.target.value })}
                    className="w-full pl-9 rounded-xl border border-border bg-background/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="feedback">Website & AI Feedback</option>
                    <option value="hiring">Recruitment / Job Posting</option>
                    <option value="partnership">Collaboration / Partnership</option>
                    <option value="feature_request">Feature Request / Suggestion</option>
                    <option value="general">General Support Inquiry</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1.5">
                <label>Message Content *</label>
                <span className={`font-mono text-[11px] ${charCount >= 10 ? "text-emerald-400" : "text-amber-400"}`}>
                  {charCount} / 10 min characters
                </span>
              </div>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="Share your feedback, feature suggestions (what to add/remove), hiring requirements, or partnership details with the Saarthi AI team..."
                className="w-full rounded-xl border border-border bg-background/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none leading-relaxed"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-4">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consent_given}
                  onChange={e => setForm({ ...form, consent_given: e.target.checked })}
                  className="rounded border-border"
                />
                <span>Allow Saarthi team to reply to this email address.</span>
              </label>

              <button
                type="submit"
                disabled={submitting || charCount < 10}
                className="flex items-center gap-2 rounded-xl bg-primary px-7 py-3 font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 disabled:opacity-50 text-xs"
              >
                <Send className="h-4 w-4" />
                <span>{submitting ? "Sending..." : "Send Message"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Direct Channel Trust & Guarantee Highlights */}
        <div className="rounded-2xl border border-border/80 bg-card/60 p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-foreground font-display flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <span>Saarthi Communication Guarantees</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-border/50 bg-background/50 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Lock className="h-3.5 w-3.5 text-emerald-400" />
                <span>Private & Encrypted</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your email and message details are kept strictly confidential and never shared with advertisers.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/50 bg-background/50 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>Direct Architect Desk</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Inquiries route directly to the Saarthi AI product and support team for rapid follow-up.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/50 bg-background/50 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Globe className="h-3.5 w-3.5 text-cyan-400" />
                <span>Campus & HR Fast-Track</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Special priority channels for university placement officers, company HRs, and agency partners.
              </p>
            </div>
          </div>
        </div>
      </div>

        {/* Contact Info Card & Links */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm">
            <h3 className="text-base font-bold text-foreground font-display flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Official Saarthi Credentials</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <div className="font-semibold text-muted-foreground">Official Contact Email</div>
                <a
                  href={`mailto:${contactEmail}`}
                  className="mt-1 inline-flex items-center gap-1.5 font-mono font-bold text-primary hover:underline"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>{contactEmail}</span>
                </a>
              </div>

              <div>
                <div className="font-semibold text-muted-foreground">Support Team</div>
                <div className="mt-1 font-bold text-foreground">{teamLabel}</div>
                <div className="text-[11px] text-muted-foreground">Product, engineering, and operations follow-up</div>
              </div>

              <div>
                <div className="font-semibold text-muted-foreground">GitHub Organization / Repo</div>
                <a
                  href={githubRepo.startsWith("http") ? githubRepo : `https://github.com/${githubRepo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-foreground hover:text-primary transition-colors"
                >
                  <Code2 className="h-3.5 w-3.5 text-primary" />
                  <span>github.com/Balama2520/SaarthiLink</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              </div>

              <div>
                <div className="font-semibold text-muted-foreground">HuggingFace Brain Model</div>
                <div className="mt-1 font-mono text-xs text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>{hfSpace}</span>
                </div>
              </div>

              <div>
                <div className="font-semibold text-muted-foreground">Response SLA</div>
                <div className="mt-1 text-muted-foreground">
                  Within 24 hours for hiring inquiries, product feedback & enterprise requests.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <HelpCircle className="h-4 w-4" />
              <span>Need Immediate Assistance?</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Explore our <span className="font-semibold text-foreground">Discover Page</span> to submit live job postings or rate core features for our AI engine.
            </p>
            <button
              onClick={() => { window.location.hash = "#/discover"; }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline pt-1"
            >
              <span>Go to Discovery Wizard</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          {/* Interactive FAQ Accordion */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-foreground font-display flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span>Frequently Asked Questions</span>
            </h3>

            <div className="space-y-2 text-xs">
              {[
                {
                  q: "How fast will the Saarthi team reply?",
                  a: "Our core engineering & hiring team reviews all contact submissions within 24 hours. Emergency recruitment signals are prioritized."
                },
                {
                  q: "Can recruiters post present job openings?",
                  a: "Yes! Recruiters, HR managers, and founders can submit active job openings directly on the Discover Page under Step 4 (Hiring Portal)."
                },
                {
                  q: "Is Saarthi free for students & job seekers?",
                  a: "Yes, Saarthi AI is 100% free for candidates to discover jobs, analyze ATS resume scores, practice mock interviews, and build roadmaps."
                },
                {
                  q: "How do I suggest new features or report issues?",
                  a: "Use the contact form above with category 'Website & AI Feedback' or fill out the 31-feature survey on the Discovery Page."
                }
              ].map((faq, idx) => (
                <div key={idx} className="rounded-xl border border-border/60 bg-background/40 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="flex w-full items-center justify-between p-3 text-left font-semibold text-foreground hover:bg-muted/50 transition-colors gap-2"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${openFaq === idx ? "rotate-180 text-primary" : "text-muted-foreground"}`} />
                  </button>
                  {openFaq === idx && (
                    <div className="p-3 pt-0 text-muted-foreground leading-relaxed text-[11px] border-t border-border/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
