import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail, Send, CheckCircle2, AlertCircle
} from "lucide-react";
import { api } from "../services/api";

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    role_type: "student",
    reason: "feedback",
    message: "",
    consent_given: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.message.trim().length < 5) {
      setErrorMsg("Message must be at least 5 characters long.");
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
        target_email: "saarthi.ai.team@gmail.com",
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit contact request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background text-center space-y-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
        >
          <CheckCircle2 className="h-10 w-10" />
        </motion.div>
        <h2 className="text-3xl font-bold text-foreground font-display">Message Sent to Saarthi AI!</h2>
        <p className="text-muted-foreground max-w-md">
          Your message has been logged for review by <span className="font-mono text-primary font-semibold">saarthi.ai.team@gmail.com</span>.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setForm({ name: "", email: "", role_type: "student", reason: "feedback", message: "", consent_given: true });
          }}
          className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-10 space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
          <Mail className="h-3.5 w-3.5" />
          <span>Contact Saarthi AI Team</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground font-display">
          Get in Touch
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Have feedback, partnership ideas, hiring opportunities, or feature requests? Send us a direct message below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
          {errorMsg && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Bala Maneesh"
                  className="w-full mt-1.5 rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Email Address *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="your.name@example.com"
                  className="w-full mt-1.5 rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Role / Organization Type</label>
                <select
                  value={form.role_type}
                  onChange={e => setForm({ ...form, role_type: e.target.value })}
                  className="w-full mt-1.5 rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="student">Student</option>
                  <option value="job_seeker">Job Seeker</option>
                  <option value="working_professional">Working Professional</option>
                  <option value="recruiter">Recruiter / HR</option>
                  <option value="company">Company / Employer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Reason for Contact</label>
                <select
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="w-full mt-1.5 rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="feedback">Product Feedback</option>
                  <option value="hiring">Hiring / Job Posting</option>
                  <option value="partnership">Collaboration / Partnership</option>
                  <option value="feature_request">Feature Request</option>
                  <option value="general">General Inquiry</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Message *</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="Share your thoughts, suggestions, or inquiry with the Saarthi AI team..."
                className="w-full mt-1.5 rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
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
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>{submitting ? "Sending..." : "Send Message"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Contact Info Card */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h3 className="text-lg font-bold text-foreground font-display">Official Channels</h3>

            <div className="space-y-4 text-sm">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Target Email</div>
                <div className="mt-1 font-mono font-bold text-primary">saarthi.ai.team@gmail.com</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-muted-foreground">Lead Architect</div>
                <div className="mt-1 font-semibold text-foreground">Bala Maneesh Ayanala</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-muted-foreground">Response SLA</div>
                <div className="mt-1 text-muted-foreground">Within 24 hours for feedback & hiring inquiries</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
