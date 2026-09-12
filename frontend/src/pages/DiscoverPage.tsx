import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Compass, CheckCircle2, Send, AlertCircle
} from "lucide-react";
import { api } from "../services/api";

interface FeatureItem {
  id: number;
  key: string;
  label: string;
  group: string;
}

export default function DiscoverPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [userType, setUserType] = useState("student");
  const [consentGiven, setConsentGiven] = useState(true);
  const [selectedIntents, setSelectedIntents] = useState<string[]>(["find_first_job"]);
  const [challenges] = useState({
    finding_relevant_jobs: 3,
    resume_improvement: 4,
    biggest_difficulty: ""
  });
  const [featureRatings, setFeatureRatings] = useState<Record<number, { rating: string; comment?: string; is_want_next?: boolean }>>({});
  const [productFeedback, setProductFeedback] = useState({
    what_you_like: "",
    wish_saarthi_could: ""
  });
  const [opportunitySignal, setOpportunitySignal] = useState({
    company: "",
    role: "",
    public_job_url: "",
    skills: ""
  });

  const [features, setFeatures] = useState<FeatureItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await api.getFeedbackFeatures();
        if (data.features) {
          setFeatures(data.features);
        }
      } catch (err: any) {
        console.error("Failed to load discovery options:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleRatingChange = (featureId: number, rating: string) => {
    setFeatureRatings(prev => ({
      ...prev,
      [featureId]: { ...prev[featureId], rating }
    }));
  };

  const handleToggleIntent = (key: string) => {
    setSelectedIntents(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const featureFeedbacks = Object.entries(featureRatings).map(([fid, val]) => {
        const feat = features.find(f => f.id === Number(fid));
        return {
          feature_id: Number(fid),
          feature_key: feat?.key || `feature_${fid}`,
          feature_label: feat?.label || `Feature ${fid}`,
          rating: val.rating,
          comment: val.comment,
          is_want_next: val.is_want_next || false,
        };
      });

      const payload = {
        user_type: userType,
        consent_given: consentGiven,
        intents: selectedIntents.map((k, idx) => ({
          intent_key: k,
          intent_label: k.replace(/_/g, " "),
          is_primary: idx === 0
        })),
        challenges,
        feature_feedbacks: featureFeedbacks,
        product_feedback: productFeedback.what_you_like || productFeedback.wish_saarthi_could ? productFeedback : undefined,
        opportunity_signal: opportunitySignal.company || opportunitySignal.public_job_url ? opportunitySignal : undefined
      };

      await api.submitDiscovery(payload);
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit discovery feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background text-center space-y-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
        >
          <CheckCircle2 className="h-10 w-10" />
        </motion.div>
        <h2 className="text-3xl font-bold text-foreground font-display">Discovery Feedback Submitted!</h2>
        <p className="text-muted-foreground max-w-md">
          Thank you for helping shape Saarthi AI. Your feedback directly trains our intelligence models and prioritizes feature development.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90"
        >
          Submit Another Response
        </button>
      </div>
    );
  }

  // Group features by group
  const groupedFeatures: Record<string, FeatureItem[]> = {};
  features.forEach(f => {
    if (!groupedFeatures[f.group]) groupedFeatures[f.group] = [];
    groupedFeatures[f.group].push(f);
  });

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-10 space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-400">
          <Compass className="h-3.5 w-3.5" />
          <span>Saarthi Discovery & Feature Rating Engine</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground font-display">
          Help Us Build Your Ideal Career Intelligence Platform
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Rate our 34 core features, share your career pain points, or submit public opportunity signals to improve Saarthi AI.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Step 1: User Persona */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary">1</span>
            Select Your Role & Persona
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: "student", label: "Student" },
              { id: "job_seeker", label: "Job Seeker" },
              { id: "working_professional", label: "Working Professional" },
              { id: "recruiter", label: "Recruiter" },
              { id: "hr_team", label: "HR Team" },
              { id: "company", label: "Company" },
              { id: "hiring_team", label: "Hiring Team" },
              { id: "other", label: "Other / Partner" },
            ].map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setUserType(type.id)}
                className={`rounded-xl border p-4 text-left transition-all text-sm font-semibold ${
                  userType === type.id
                    ? "border-primary bg-primary/10 text-primary shadow-md"
                    : "border-border/60 bg-background/50 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Intent & Goals */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary">2</span>
            What Are Your Primary Career / Hiring Goals?
          </h2>

          <div className="flex flex-wrap gap-3">
            {[
              { key: "find_first_job", label: "Find First Job / Internship" },
              { key: "ats_resume_boost", label: "Boost Resume ATS Score" },
              { key: "interview_prep", label: "Ace Technical & Mock Interviews" },
              { key: "career_switch", label: "Career Pivot or Skill Upgrade" },
              { key: "hire_top_talent", label: "Discover Qualified Candidates" },
              { key: "higher_studies", label: "GRE / GATE / Higher Studies Prep" },
            ].map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleToggleIntent(item.key)}
                className={`rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                  selectedIntents.includes(item.key)
                    ? "border-primary bg-primary/20 text-primary font-semibold"
                    : "border-border/60 bg-background/50 text-muted-foreground hover:border-border"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: 34-Feature Intelligence Rating Grid */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-8">
          <div>
            <h2 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary">3</span>
              Rate Saarthi's 34 Core Features
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Select how valuable each feature is for your career or hiring workflow.
            </p>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground animate-pulse py-8 text-center">
              Loading 34 feature intelligence items...
            </div>
          ) : (
            Object.entries(groupedFeatures).map(([groupName, groupFeats]) => (
              <div key={groupName} className="space-y-4">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-border/50 pb-2">
                  {groupName}
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {groupFeats.map(feat => (
                    <div key={feat.id} className="flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-xl border border-border/50 bg-background/40 gap-3">
                      <div>
                        <span className="text-xs font-mono text-muted-foreground mr-2">#{feat.id}</span>
                        <span className="text-sm font-semibold text-foreground">{feat.label}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          { key: "extremely_valuable", label: "Must Have" },
                          { key: "very_useful", label: "High Priority" },
                          { key: "useful", label: "Useful" },
                          { key: "somewhat_useful", label: "Low Priority" },
                          { key: "not_useful", label: "Not Needed" },
                        ].map(opt => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleRatingChange(feat.id, opt.key)}
                            className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                              featureRatings[feat.id]?.rating === opt.key
                                ? "border-primary bg-primary text-primary-foreground font-semibold"
                                : "border-border/50 bg-card text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Step 4: General Product Feedback */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary">4</span>
            Product Feedback & Feature Wishes
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">What do you like most about Saarthi AI?</label>
              <textarea
                rows={2}
                value={productFeedback.what_you_like}
                onChange={e => setProductFeedback({ ...productFeedback, what_you_like: e.target.value })}
                placeholder="e.g. ATS score feedback, interview practice..."
                className="w-full mt-1.5 rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">What wish or feature should Saarthi build next?</label>
              <textarea
                rows={2}
                value={productFeedback.wish_saarthi_could}
                onChange={e => setProductFeedback({ ...productFeedback, wish_saarthi_could: e.target.value })}
                placeholder="e.g. Automated job applications, recruiter direct chat..."
                className="w-full mt-1.5 rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Step 5: Opportunity Submission (Optional) */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary">5</span>
            Submit a Public Job Opportunity Signal (Optional)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Company Name</label>
              <input
                type="text"
                value={opportunitySignal.company}
                onChange={e => setOpportunitySignal({ ...opportunitySignal, company: e.target.value })}
                placeholder="Acme Corp"
                className="w-full mt-1 rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Role Title</label>
              <input
                type="text"
                value={opportunitySignal.role}
                onChange={e => setOpportunitySignal({ ...opportunitySignal, role: e.target.value })}
                placeholder="Software Engineer Intern"
                className="w-full mt-1 rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Public Job / Careers URL</label>
              <input
                type="url"
                value={opportunitySignal.public_job_url}
                onChange={e => setOpportunitySignal({ ...opportunitySignal, public_job_url: e.target.value })}
                placeholder="https://example.com/careers/job-123"
                className="w-full mt-1 rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={e => setConsentGiven(e.target.checked)}
              className="rounded border-border"
            />
            <span>I consent to contributing anonymized feedback to Saarthi AI Intelligence.</span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>{submitting ? "Submitting..." : "Submit Intelligence Feedback"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
