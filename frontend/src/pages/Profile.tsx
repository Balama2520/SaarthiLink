import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Phone, GraduationCap,
  GitBranch, Link2, ExternalLink, AlertCircle,
  Briefcase, Activity, Edit3, Check, X,
  MapPin, DollarSign, Calendar, BookOpen, Star, Zap, ChevronRight
} from "lucide-react";
import { useProfile, useProfileCompleteness, useUpdateProfile } from "../hooks/useProfile";
import { useToast } from "../hooks/useToast";
import { getStoredUsername } from "../lib/auth";

// ─── Inline Edit Field ─────────────────────────────────────────────────────
function InlineField({
  label, value, field, placeholder, type = "text", icon: Icon, multiline = false, onSave
}: {
  label: string; value: string | number | null | undefined; field: string;
  placeholder?: string; type?: string; icon?: React.ElementType;
  multiline?: boolean; onSave: (field: string, value: string | number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>((value as string) || "");
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const commit = () => {
    const parsed = type === "number" ? (parseFloat(draft) || null) : (draft.trim() || null);
    onSave(field, parsed);
    setEditing(false);
  };

  const cancel = () => {
    setDraft((value as string) || "");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="group relative z-10">
        <label className="block text-[10px] font-bold text-accent uppercase tracking-widest mb-2">{label}</label>
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2">
          {multiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={4}
              className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-all"
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              autoFocus
              type={type}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
              className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          )}
          <button onClick={commit} className="p-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground transition-colors shrink-0">
            <Check className="h-4 w-4" />
          </button>
          <button onClick={cancel} className="p-2 rounded-md bg-transparent hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="group cursor-pointer relative"
      onClick={() => { setDraft((value as string) || ""); setEditing(true); }}
    >
      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 group-hover:text-foreground transition-colors">{label}</label>
      <div className="relative flex items-center gap-3 bg-card hover:bg-muted/50 border border-border rounded-md px-3 py-2 transition-colors duration-200">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />}
        <span className={`flex-1 text-sm font-medium ${value ? "text-foreground" : "text-muted-foreground italic"}`}>
          {value || placeholder || "Click to add..."}
        </span>
        <Edit3 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

// ─── Skill Tag ──────────────────────────────────────────────────────────────
function SkillTag({ name, proficiency }: { name: string; proficiency?: string }) {
  const colorMap: Record<string, string> = {
    expert: "bg-accent/15 border-accent/30 text-accent",
    advanced: "bg-primary/15 border-primary/30 text-primary",
    intermediate: "bg-success/15 border-success/30 text-success",
    beginner: "bg-muted-foreground/15 border-muted-foreground/30 text-foreground",
  };
  const color = colorMap[(proficiency || "").toLowerCase()] || colorMap.beginner;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm ${color}`}>
      {name}
      {proficiency && <span className="opacity-40">•</span>}
      {proficiency && <span className="opacity-80 uppercase tracking-wider text-[10px]">{proficiency}</span>}
    </span>
  );
}

// ─── Section Card ──────────────────────────────────────────────────────────
function SectionCard({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-card p-6 ${className}`}>
      {title && <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>}
      <div>{children}</div>
    </div>
  );
}

// ─── Tag list (editable comma-sep) ────────────────────────────────────────
function TagListField({ label, values, field, placeholder, onSave }: {
  label: string; values: string[] | null | undefined;
  field: string; placeholder?: string;
  onSave: (field: string, value: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState((values || []).join(", "));

  const commit = () => {
    const arr = draft.split(",").map(s => s.trim()).filter(Boolean);
    onSave(field, arr);
    setEditing(false);
  };

  return (
    <div className="relative z-10">
      <label className="block text-xs font-semibold text-muted-foreground mb-2 group-hover:text-foreground">{label}</label>
      {editing ? (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
            placeholder={placeholder}
            className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
          <button onClick={commit} className="p-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"><Check className="h-4 w-4" /></button>
          <button onClick={() => setEditing(false)} className="p-2 rounded-md bg-transparent border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
        </motion.div>
      ) : (
        <div
          onClick={() => { setDraft((values || []).join(", ")); setEditing(true); }}
          className="cursor-pointer flex flex-wrap gap-2 min-h-[40px] bg-card hover:bg-muted/50 border border-border rounded-md px-3 py-2 transition-colors duration-200"
        >
          {values && values.length > 0 ? (
            values.map((v, i) => (
              <span key={i} className="bg-muted text-foreground text-xs font-medium px-2.5 py-1 rounded-md">{v}</span>
            ))
          ) : (
            <span className="text-muted-foreground italic text-sm font-medium">{placeholder || "Click to add..."}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stat Pill ─────────────────────────────────────────────────────────────
function StatBar({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: React.ElementType }) {
  return (
    <div className="relative z-10 group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
          <Icon className="h-4 w-4" />{label}
        </span>
        <span className="text-lg font-bold text-foreground">{value}%</span>
      </div>
      <div className="h-2 bg-card/80 rounded-full overflow-hidden border border-border">
        <motion.div
          className={`h-full rounded-full ${color} relative`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-border w-full h-full animate-[shimmer_2s_infinite]" />
        </motion.div>
      </div>
    </div>
  );
}

// ─── Main Profile Component ────────────────────────────────────────────────
export function Profile() {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  const { data: profile, isLoading, isError } = useProfile();
  const { data: completeness } = useProfileCompleteness();
  const updateMutation = useUpdateProfile();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
            <div className="absolute inset-0 rounded-full border-2 border-t-accent animate-spin" />
          </div>
          <p className="text-accent/80 text-sm font-bold uppercase tracking-widest animate-pulse">Loading Profile…</p>
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <p className="text-foreground font-bold text-lg">Could not load your profile.</p>
          <p className="text-muted-foreground text-sm font-medium">Make sure you are signed in and try again.</p>
        </div>
      </div>
    );
  }

  const defaultUsername = getStoredUsername() || "Anonymous User";
  const displayName = profile.full_name || defaultUsername;

  const handleUpdate = (field: string, value: string | number | string[] | null) => {
    if (JSON.stringify(profile[field]) === JSON.stringify(value)) return;
    updateMutation.mutate(
      { [field]: value },
      {
        onSuccess: () => toast(`Profile updated successfully!`, "success"),
        onError: () => toast(`Failed to update profile.`, "error"),
      }
    );
  };

  const careerReadiness = completeness ? Math.floor((completeness.sections.Career + completeness.sections.Portfolio) / 2) : 0;
  const jobMatching = completeness ? Math.floor((completeness.sections["Technical Skills"] + completeness.sections.Preferences) / 2) : 0;
  const atsScore = profile.resume_ats_score || 0;
  const tabs = ["overview", "career", "education", "portfolio"];

  return (
    <div className="relative h-full w-full overflow-y-auto bg-background text-foreground custom-scrollbar">
      <div className="relative max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-10 space-y-8 z-10">
        
        {/* ── Hero Banner ──────────────────────────────────────── */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative rounded-xl overflow-hidden border border-border bg-card shadow-sm"
        >
          <div className="relative p-8 sm:p-10 flex flex-col sm:flex-row gap-8 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full">
              {/* Avatar */}
              <div className="relative shrink-0 group">
                <div className="relative h-20 w-20 rounded-full bg-muted flex items-center justify-center text-foreground text-2xl font-bold overflow-hidden border border-border">
                  {profile.profile_photo_url ? (
                    <img src={profile.profile_photo_url} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="bg-clip-text text-transparent bg-gradient-to-br from-accent to-primary">
                      {displayName[0].toUpperCase()}
                    </span>
                  )}
                </div>
                {completeness && completeness.overall_percentage >= 80 && (
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-primary-foreground stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  {displayName}
                </h1>
                <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
                  {profile.headline || profile.target_role || "Complete your profile to unlock insights"}
                </p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-xs font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{profile.email || "Add Email Address"}</span>
                  <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{profile.phone || "Add Phone Number"}</span>
                  {profile.preferred_locations?.length > 0 && (
                    <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{profile.preferred_locations[0]}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Completion Ring */}
            {completeness && (
              <div className="flex flex-col items-center justify-center bg-muted/30 border border-border rounded-lg p-5 shrink-0">
                <div className="relative h-16 w-16 mb-2">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-border" strokeWidth="3" stroke="currentColor" fill="none" strokeLinecap="round"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <motion.path className="text-primary" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${completeness.overall_percentage}, 100`}
                      initial={{ pathLength: 0 }} animate={{ pathLength: completeness.overall_percentage / 100 }} transition={{ duration: 1.5, ease: "easeOut" }}
                      stroke="currentColor" fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-foreground">{completeness.overall_percentage}%</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-foreground">Profile</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Stat Bars Row ────────────────────────────────────── */}
        {completeness && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <SectionCard className="!p-5 hover:border-primary/50 transition-colors group">
              <StatBar label="Career Readiness" value={careerReadiness} color="bg-primary" icon={Briefcase} />
            </SectionCard>
            <SectionCard className="!p-5 hover:border-primary/50 transition-colors group">
              <StatBar label="Job Match Score" value={jobMatching} color="bg-primary" icon={Activity} />
            </SectionCard>
            <SectionCard className="!p-5 hover:border-primary/50 transition-colors group">
              <StatBar label="ATS Readiness" value={atsScore} color="bg-primary" icon={Zap} />
            </SectionCard>
          </motion.div>
        )}

        {/* ── Tab Navigation ───────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }} className="relative flex p-1 bg-muted rounded-lg w-full max-w-2xl mx-auto">
          {tabs.map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex-1 py-2 text-sm font-medium capitalize rounded-md transition-all duration-200 ${
                  isActive ? "text-foreground bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="relative z-10">{tab}</span>
              </button>
            );
          })}
        </motion.div>

        {/* ── Tab Content ──────────────────────────────────────── */}
        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {/* OVERVIEW */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SectionCard title="Personal Details">
                    <div className="space-y-5">
                      <InlineField onSave={handleUpdate} label="Full Name" value={profile.full_name} field="full_name" placeholder="Your full name" icon={User} />
                      <InlineField onSave={handleUpdate} label="Headline" value={profile.headline} field="headline" placeholder="e.g. Full-Stack Engineer @ OpenAI" />
                      <InlineField onSave={handleUpdate} label="Phone" value={profile.phone} field="phone" placeholder="+91 98765 43210" icon={Phone} />
                      <InlineField onSave={handleUpdate} label="Profile Photo URL" value={profile.profile_photo_url} field="profile_photo_url" placeholder="https://…" icon={ExternalLink} />
                    </div>
                  </SectionCard>
                  <SectionCard title="About Me">
                    <InlineField onSave={handleUpdate} label="Professional Summary" value={profile.background_summary} field="background_summary"
                      placeholder="Describe your professional journey, expertise, and goals…" multiline />
                    
                    {completeness && completeness.suggestions.length > 0 && (
                      <div className="mt-8 space-y-3 p-5 rounded-lg bg-muted border border-border">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" /> Recommended Actions
                        </p>
                        <div className="space-y-2">
                          {completeness.suggestions.slice(0, 3).map((s: string, i: number) => (
                            <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground bg-card rounded-md px-3 py-2 border border-border">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                              {s}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </SectionCard>
                </div>
              )}

              {/* CAREER */}
              {activeTab === "career" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SectionCard title="Career Targets">
                    <div className="space-y-5">
                      <InlineField onSave={handleUpdate} label="Career Stage" value={profile.career_stage} field="career_stage" placeholder="Entry / Mid / Senior" icon={Star} />
                      <InlineField onSave={handleUpdate} label="Target Role" value={profile.target_role} field="target_role" placeholder="Frontend Developer" icon={Briefcase} />
                      <InlineField onSave={handleUpdate} label="Salary Expectations" value={profile.salary_expectations} field="salary_expectations" placeholder="₹12 LPA – ₹18 LPA" icon={DollarSign} />
                    </div>
                  </SectionCard>
                  <SectionCard title="Work Preferences">
                    <div className="space-y-5">
                      <TagListField onSave={handleUpdate} label="Work Models" values={profile.work_preferences} field="work_preferences" placeholder="Remote, Hybrid, On-site" />
                      <TagListField onSave={handleUpdate} label="Preferred Locations" values={profile.preferred_locations} field="preferred_locations" placeholder="Bangalore, Remote" />
                    </div>
                  </SectionCard>
                  {profile.technical_skills?.length > 0 && (
                    <div className="md:col-span-2">
                      <SectionCard title="Technical Arsenal">
                        <div className="flex flex-wrap gap-2.5">
                          {profile.technical_skills.map((skill: { skill_name: string; proficiency: string }, i: number) => (
                            <SkillTag key={i} name={skill.skill_name} proficiency={skill.proficiency} />
                          ))}
                        </div>
                        <div className="mt-6 inline-flex items-center gap-2 bg-muted border border-border rounded-md px-3 py-2">
                          <Zap className="h-3.5 w-3.5 text-primary" />
                          <p className="text-xs font-medium text-muted-foreground">Skills are automatically synced and graded by AI from your resume.</p>
                        </div>
                      </SectionCard>
                    </div>
                  )}
                </div>
              )}

              {/* EDUCATION */}
              {activeTab === "education" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SectionCard title="Institution">
                    <div className="space-y-5">
                      <InlineField onSave={handleUpdate} label="University / College" value={profile.university || profile.college} field="university" placeholder="IIT Delhi / NIT Trichy" icon={GraduationCap} />
                      <InlineField onSave={handleUpdate} label="Degree" value={profile.degree} field="degree" placeholder="B.Tech / M.Sc" icon={BookOpen} />
                      <InlineField onSave={handleUpdate} label="Branch / Major" value={profile.branch} field="branch" placeholder="Computer Science & Engineering" />
                    </div>
                  </SectionCard>
                  <SectionCard title="Academic Details">
                    <div className="space-y-5">
                      <InlineField onSave={handleUpdate} label="Graduation Year" value={profile.graduation_year} field="graduation_year" type="number" placeholder="2025" icon={Calendar} />
                      <InlineField onSave={handleUpdate} label="CGPA / GPA" value={profile.cgpa} field="cgpa" type="number" placeholder="8.5" icon={Star} />
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* PORTFOLIO */}
              {activeTab === "portfolio" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SectionCard title="Developer Profiles">
                    <div className="space-y-5">
                      <InlineField onSave={handleUpdate} label="GitHub URL" value={profile.github_url} field="github_url" placeholder="https://github.com/username" icon={GitBranch} />
                      <InlineField onSave={handleUpdate} label="LinkedIn URL" value={profile.linkedin_url} field="linkedin_url" placeholder="https://linkedin.com/in/username" icon={Link2} />
                      <InlineField onSave={handleUpdate} label="LeetCode URL" value={profile.leetcode_url} field="leetcode_url" placeholder="https://leetcode.com/u/username" icon={ExternalLink} />
                    </div>
                  </SectionCard>
                  <SectionCard title="Web Presence">
                    <div className="space-y-5 mb-8">
                      <InlineField onSave={handleUpdate} label="Personal Portfolio Website" value={profile.portfolio_url} field="portfolio_url" placeholder="https://yourportfolio.com" icon={ExternalLink} />
                    </div>
                    {/* Quick links */}
                    {(profile.github_url || profile.linkedin_url || profile.portfolio_url) && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 border-t border-border pt-6">Quick Links</p>
                        {[
                          { url: profile.github_url, icon: GitBranch, label: "GitHub" },
                          { url: profile.linkedin_url, icon: Link2, label: "LinkedIn" },
                          { url: profile.portfolio_url, icon: ExternalLink, label: "Portfolio" },
                        ].filter(x => x.url).map((item, idx) => (
                          <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-4 bg-muted/50 hover:bg-muted border border-border rounded-lg px-4 py-3 transition-colors group">
                            <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground flex-1 truncate transition-colors">{item.url}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-transform" />
                          </a>
                        ))}
                      </div>
                    )}
                  </SectionCard>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
