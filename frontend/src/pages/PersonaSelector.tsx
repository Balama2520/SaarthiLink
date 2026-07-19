import React, { useState, useEffect, useRef } from 'react';
import { usePersona, type PersonaType } from '../context/PersonaContext';
import {
  GraduationCap, FlaskConical, Globe, Briefcase, BookOpen,
  ArrowRight, Sparkles, Zap, Brain
} from 'lucide-react';

interface PersonaConfig {
  id: PersonaType;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  features: string[];
  gradient: string;
  glowColor: string;
  badge: string;
}

const personas: PersonaConfig[] = [
  {
    id: 'undergrad',
    title: 'Undergraduate',
    subtitle: 'B.Tech / B.E / BCA / BSc',
    description: 'Land your dream placement or internship. Master DSA, build projects, ace interviews, and track your career journey.',
    icon: GraduationCap,
    features: ['Job Command Center', 'AI Interview Coach', 'SkillForge & DSA', 'ATS Resume Builder'],
    gradient: 'from-violet-600/20 via-fuchsia-600/10 to-transparent',
    glowColor: 'rgba(139, 92, 246, 0.3)',
    badge: 'Most Popular',
  },
  {
    id: 'mtech',
    title: 'M.Tech / Integrated',
    subtitle: 'PG Engineering Programs',
    description: 'Balance research and placements. Track coursework, manage GATE prep, publish papers, and build your thesis.',
    icon: BookOpen,
    features: ['Research Hub', 'Experiment Studio', 'GPA Tracker', 'Publication Manager'],
    gradient: 'from-cyan-600/20 via-blue-600/10 to-transparent',
    glowColor: 'rgba(6, 182, 212, 0.3)',
    badge: 'Research-Focused',
  },
  {
    id: 'ms_abroad',
    title: 'MS Abroad',
    subtitle: 'International Applications',
    description: 'Navigate the complex MS admission journey. SOPs, LORs, university ranking, scholarships, and visa guidance.',
    icon: Globe,
    features: ['Admissions Navigator', 'SOP Builder', 'University Matcher', 'Scholarship Finder'],
    gradient: 'from-emerald-600/20 via-teal-600/10 to-transparent',
    glowColor: 'rgba(16, 185, 129, 0.3)',
    badge: 'Global Path',
  },
  {
    id: 'phd',
    title: 'PhD Researcher',
    subtitle: 'Doctoral Programs',
    description: 'Accelerate your research pipeline. Literature reviews, gap analysis, paper writing, conference tracking, and collaborations.',
    icon: FlaskConical,
    features: ['Paper Analyzer', 'Research Gap Finder', 'Conference Tracker', 'Citation Manager'],
    gradient: 'from-amber-600/20 via-orange-600/10 to-transparent',
    glowColor: 'rgba(245, 158, 11, 0.3)',
    badge: 'Deep Research',
  },
  {
    id: 'professional',
    title: 'Working Professional',
    subtitle: 'Industry & Corporate',
    description: 'Level up your career. Negotiate raises, transition roles, build your network, earn certifications, and crack FAANG.',
    icon: Briefcase,
    features: ['Job & Network Hub', 'Salary Negotiator', 'Career Transition', 'Executive Interview'],
    gradient: 'from-rose-600/20 via-pink-600/10 to-transparent',
    glowColor: 'rgba(244, 63, 94, 0.3)',
    badge: 'Career Growth',
  },
];

const PersonaSelector: React.FC = () => {
  const { setPersona } = usePersona();
  const [hovered, setHovered] = useState<PersonaType | null>(null);
  const [selected, setSelected] = useState<PersonaType | null>(null);
  const selectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (selectTimeoutRef.current) clearTimeout(selectTimeoutRef.current);
    };
  }, []);

  const handleSelect = (id: PersonaType) => {
    setSelected(id);
    // Short delay for the click animation before transitioning
    selectTimeoutRef.current = setTimeout(() => setPersona(id), 350);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 overflow-hidden flex flex-col items-center justify-center p-6">

      {/* ── Ambient background ────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-600/8 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,oklch(0.09_0.005_265)_100%)]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* ── Header ───────────────────────────────────────── */}
      <div className="relative mb-12 text-center fade-in-up">
        {/* Brand mark */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-2xl shadow-violet-500/30 pulse-glow">
          <Brain className="h-10 w-10 text-white" />
        </div>

        <div className="mb-3 flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-400">
            AI Career Copilot
          </span>
          <Sparkles className="h-4 w-4 text-violet-400" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
          Welcome to{' '}
          <span className="text-gradient">Saarthi</span>
        </h1>
        <p className="max-w-lg text-slate-400 text-base leading-relaxed mx-auto">
          I adapt everything — tools, AI agents, and recommendations — around your specific journey.
          <br />
          <span className="text-slate-300 font-medium">Who are you today?</span>
        </p>
      </div>

      {/* ── Persona Cards ─────────────────────────────────── */}
      <div className="relative w-full max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {personas.map((p, i) => {
            const Icon = p.icon;
            const isHovered = hovered === p.id;
            const isSelected = selected === p.id;

            return (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
                className={`
                  fade-in-up stagger-${Math.min(i + 1, 6)}
                  group relative flex flex-col text-left rounded-2xl p-5
                  border transition-all duration-300 cursor-pointer overflow-hidden
                  ${isSelected
                    ? 'border-violet-400/60 bg-violet-600/10 scale-[0.97]'
                    : isHovered
                      ? 'border-white/20 bg-white/5 -translate-y-1'
                      : 'border-white/8 bg-white/[0.03] hover:bg-white/5'
                  }
                `}
                style={{
                  boxShadow: isHovered
                    ? `0 20px 60px -10px ${p.glowColor}, 0 0 0 1px rgba(255,255,255,0.06)`
                    : isSelected
                      ? `0 0 0 2px rgba(139, 92, 246, 0.5)`
                      : 'none',
                }}
              >
                {/* Background gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${p.gradient} opacity-0 transition-opacity duration-300 ${isHovered || isSelected ? 'opacity-100' : ''}`}
                />

                {/* Badge */}
                <div className="relative mb-4 flex items-start justify-between">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
                    style={{ background: `${p.glowColor.replace('0.3', '0.15')}`, border: `1px solid ${p.glowColor}` }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                    style={{
                      background: `${p.glowColor.replace('0.3', '0.12')}`,
                      border: `1px solid ${p.glowColor}`,
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {p.badge}
                  </span>
                </div>

                {/* Title */}
                <div className="relative mb-1">
                  <h2 className="text-base font-bold text-white leading-tight">{p.title}</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">{p.subtitle}</p>
                </div>

                {/* Description */}
                <p className="relative mt-2 text-[12px] text-slate-400 leading-relaxed flex-1">
                  {p.description}
                </p>

                {/* Features */}
                <div className="relative mt-4 space-y-1.5">
                  {p.features.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <Zap className="h-2.5 w-2.5 shrink-0 text-violet-400/70" />
                      <span className="text-[11px] text-slate-400">{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA arrow */}
                <div className={`relative mt-4 flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 ${isHovered ? 'text-white translate-x-1' : 'text-slate-500'}`}>
                  <span>Get Started</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <p className="relative mt-10 text-center text-xs text-slate-600 fade-in">
        You can switch your persona anytime from settings &nbsp;·&nbsp; Built by{' '}
        <span className="text-slate-500">Bala Maneesh Ayanala</span>
      </p>
    </div>
  );
};

export default PersonaSelector;
