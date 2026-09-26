import { useState, useEffect, useRef } from "react";
import {
  FlaskConical, Hammer, FileSearch, StickyNote, Loader2, Upload,
  Plus, Trash2, Sparkles, X,
} from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../services/api";
import { localDB } from "../services/localDB";
import { useToast } from "../hooks/useToast";
import { JsonResult } from "../components/ui/JsonResult";
import { GearRecommendCard } from "../components/GearRecommendCard";
import { CTOGuideBanner } from "../components/CTOGuideBanner";

type LabTab = "forge" | "research" | "notes";

interface StudyNote {
  id: number;
  topic: string;
  depth?: string;
  content?: string;
  created_at?: string;
}

export default function GrowthLab() {
  const { toast } = useToast();
  const [tab, setTab] = useState<LabTab>("forge");

  // --- Skill Forge ---
  const [targetRole, setTargetRole] = useState("");
  const [currentSkills, setCurrentSkills] = useState("");
  const [pipeline, setPipeline] = useState<unknown>(null);
  const [forgeLoading, setForgeLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const cached = await localDB.getPipeline();
      if (cached) setPipeline(cached);
    })();
  }, []);

  const generatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole.trim() || !currentSkills.trim()) return;
    setForgeLoading(true);
    try {
      const result = await api.generateSkillForgePipeline(targetRole.trim(), currentSkills.trim());
      setPipeline(result);
      void localDB.savePipeline(result);
    } catch {
      toast("Couldn't generate a project pipeline right now.", "error");
    } finally {
      setForgeLoading(false);
    }
  };

  // --- Research Hub ---
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [paperAnalysis, setPaperAnalysis] = useState<unknown>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzePaper = async () => {
    if (!paperFile) return;
    setResearchLoading(true);
    try {
      const result = await api.analyzePaper(paperFile);
      setPaperAnalysis(result);
    } catch {
      toast("Couldn't analyze that paper. Make sure it's a readable PDF.", "error");
    } finally {
      setResearchLoading(false);
    }
  };

  // --- Study Notes ---
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteTopic, setNoteTopic] = useState("");
  const [noteDepth, setNoteDepth] = useState("detailed");
  const [generatingNote, setGeneratingNote] = useState(false);
  const [openNoteId, setOpenNoteId] = useState<number | null>(null);

  const loadNotes = async () => {
    setNotesLoading(true);
    try {
      const data = await api.listNotes();
      setNotes(Array.isArray(data) ? data : []);
    } finally {
      setNotesLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "notes") return;
    const timer = window.setTimeout(() => { void loadNotes(); }, 0);
    return () => window.clearTimeout(timer);
  }, [tab]);

  const generateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTopic.trim()) return;
    setGeneratingNote(true);
    try {
      const created = await api.generateNote(noteTopic.trim(), noteDepth);
      setNotes((prev) => [created, ...prev]);
      setOpenNoteId(created.id);
      setNoteTopic("");
    } catch {
      toast("Couldn't generate notes for that topic.", "error");
    } finally {
      setGeneratingNote(false);
    }
  };

  const deleteNote = async (id: number) => {
    const prev = notes;
    setNotes((n) => n.filter((x) => x.id !== id));
    try {
      await api.deleteNote(id);
    } catch {
      setNotes(prev);
      toast("Couldn't delete that note.", "error");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background px-4 py-8 sm:px-6 lg:px-10 text-foreground custom-scrollbar">
      <div className="mx-auto mb-8 max-w-6xl">
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
            <FlaskConical className="h-4 w-4 text-primary" />
          </div>
          Growth Lab
        </h1>
        <p className="ml-11 mt-1.5 text-sm text-muted-foreground">
          Build project pipelines, break down research papers, and generate study notes.
        </p>
      </div>

      <div className="mx-auto mb-6 max-w-6xl">
        <CTOGuideBanner
          title="Growth Lab & Skill Forge Guide"
          subtitle="Turn technical skill gaps into production build plans, summarize research papers, and generate AI study notes."
          steps={[
            { title: "Skill Forge", desc: "Enter your target role & current skills to generate a 3-project portfolio build plan." },
            { title: "Research Hub", desc: "Enter an arXiv ID or technical topic to get instant key takeaway summaries." },
            { title: "Study Notes", desc: "Generate structured study notes on any complex computer science or system design topic." },
            { title: "Build Projects", desc: "Use generated project specs as resume highlights to demonstrate practical experience." },
          ]}
          ctoTip="Building 1 complete portfolio project from Skill Forge boosts recruiter response rates by 40%!"
        />
      </div>

      <div className="mx-auto mb-6 max-w-6xl">
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {[
            { id: "forge", label: "Skill Forge", icon: Hammer },
            { id: "research", label: "Research Hub", icon: FileSearch },
            { id: "notes", label: "Study Notes", icon: StickyNote },
          ].map((t) => {
            const isActive = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as LabTab)}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-6xl">
        {tab === "forge" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <form onSubmit={generatePipeline} className="glass-card space-y-3 p-5">
              <p className="text-sm font-medium text-foreground">Turn a skill gap into a build plan</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} required
                  placeholder="Target role, e.g. Backend Engineer"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
                <input value={currentSkills} onChange={(e) => setCurrentSkills(e.target.value)} required
                  placeholder="Current skills, comma separated"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <button type="submit" disabled={forgeLoading}
                className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50">
                {forgeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {forgeLoading ? "Building pipeline…" : "Generate pipeline"}
              </button>
            </form>

            {pipeline ? (
              <div className="glass-card p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your project pipeline</p>
                <JsonResult data={pipeline} />
              </div>
            ) : !forgeLoading && (
              <div className="glass-card p-8 text-center text-sm text-muted-foreground">
                No pipeline yet — describe your target role and current skills above.
              </div>
            )}
          </motion.div>
        )}

        {tab === "research" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="glass-card space-y-3 p-5">
              <p className="text-sm font-medium text-foreground">Upload a paper for a structured breakdown</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground"
                >
                  <Upload className="h-4 w-4" /> {paperFile ? paperFile.name : "Choose PDF"}
                </button>
                <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
                  onChange={(e) => setPaperFile(e.target.files?.[0] || null)} />
                <button
                  onClick={analyzePaper}
                  disabled={!paperFile || researchLoading}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
                >
                  {researchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
                  {researchLoading ? "Analyzing…" : "Analyze paper"}
                </button>
                {paperFile && (
                  <button onClick={() => setPaperFile(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {paperAnalysis ? (
              <div className="glass-card p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Analysis</p>
                <JsonResult data={paperAnalysis} />
              </div>
            ) : !researchLoading && (
              <div className="glass-card p-8 text-center text-sm text-muted-foreground">
                Upload a research paper to get a structured summary, key findings, and methodology breakdown.
              </div>
            )}
          </motion.div>
        )}

        {tab === "notes" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <form onSubmit={generateNote} className="glass-card flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Topic</label>
                <input value={noteTopic} onChange={(e) => setNoteTopic(e.target.value)} required
                  placeholder="e.g. Normalization in SQL databases"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Depth</label>
                <select value={noteDepth} onChange={(e) => setNoteDepth(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="quick">Quick</option>
                  <option value="detailed">Detailed</option>
                  <option value="deep">Deep dive</option>
                </select>
              </div>
              <button type="submit" disabled={generatingNote}
                className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50">
                {generatingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Generate
              </button>
            </form>

            {notesLoading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 rounded-lg" />)}</div>
            ) : notes.length === 0 ? (
              <div className="glass-card p-8 text-center text-sm text-muted-foreground">No notes yet — generate your first one above.</div>
            ) : (
              <div className="space-y-2">
                {notes.map((n) => {
                  const open = openNoteId === n.id;
                  return (
                    <div key={n.id} className="glass-card overflow-hidden">
                      <button
                        onClick={() => setOpenNoteId(open ? null : n.id)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{n.topic}</p>
                          {n.depth && <p className="mt-0.5 text-xs capitalize text-muted-foreground">{n.depth}</p>}
                        </div>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); void deleteNote(n.id); }}
                          className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </span>
                      </button>
                      {open && n.content && (
                        <div className="border-t border-border px-4 py-3">
                          <JsonResult data={n.content} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Contextual gear recommendation */}
      <div className="mx-auto max-w-5xl px-4 pb-8 md:px-6">
        <GearRecommendCard
          variant="study"
          dismissKey="growthlab-gear"
          tip="The right study gadgets and accessories can seriously level up how you build and learn."
        />
      </div>
    </div>
  );
}
