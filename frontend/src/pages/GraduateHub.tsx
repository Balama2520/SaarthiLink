import { useState, useEffect, useCallback } from "react";
import {
  GraduationCap, Plus, Trash2, Loader2, BookOpen, Award, X,
} from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../services/api";
import { useToast } from "../hooks/useToast";

interface DegreeCourse {
  id: string;
  semester: number;
  course_name: string;
  credits: number;
  gpa?: string;
  status?: string;
}

interface Certification {
  id: string;
  name: string;
  provider: string;
  target_date?: string;
  status?: string;
}

type GradTab = "degree" | "certs";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-success/15 text-success",
  in_progress: "bg-primary/15 text-primary",
  planned: "bg-muted text-muted-foreground",
};

function StatusPill({ status }: { status?: string }) {
  const key = (status || "planned").toLowerCase();
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[key] || STATUS_STYLES.planned}`}>
      {key.replace("_", " ")}
    </span>
  );
}

export default function GraduateHub() {
  const { toast } = useToast();
  const [tab, setTab] = useState<GradTab>("degree");

  const [courses, setCourses] = useState<DegreeCourse[]>([]);
  const [certs, setCerts] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [semester, setSemester] = useState(1);
  const [courseName, setCourseName] = useState("");
  const [credits, setCredits] = useState(3);
  const [gpa, setGpa] = useState("");
  const [courseStatus, setCourseStatus] = useState("planned");
  const [savingCourse, setSavingCourse] = useState(false);

  const [showCertForm, setShowCertForm] = useState(false);
  const [certName, setCertName] = useState("");
  const [certProvider, setCertProvider] = useState("");
  const [certDate, setCertDate] = useState("");
  const [certStatus, setCertStatus] = useState("planned");
  const [savingCert, setSavingCert] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [c, k] = await Promise.all([
      api.getDegreeCourses().catch(() => []),
      api.getCerts().catch(() => []),
    ]);
    setCourses(Array.isArray(c) ? c : []);
    setCerts(Array.isArray(k) ? k : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAll(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAll]);

  const resetCourseForm = () => {
    setSemester(1); setCourseName(""); setCredits(3); setGpa(""); setCourseStatus("planned");
  };
  const resetCertForm = () => {
    setCertName(""); setCertProvider(""); setCertDate(""); setCertStatus("planned");
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;
    setSavingCourse(true);
    try {
      const created = await api.addDegreeCourse(semester, courseName.trim(), credits, gpa || undefined, courseStatus);
      setCourses((prev) => [created, ...prev]);
      resetCourseForm();
      setShowCourseForm(false);
    } catch {
      toast("Failed to add course.", "error");
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    const prev = courses;
    setCourses((c) => c.filter((x) => x.id !== id));
    try {
      await api.deleteDegreeCourse(id);
    } catch {
      setCourses(prev);
      toast("Failed to remove course.", "error");
    }
  };

  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certName.trim() || !certProvider.trim()) return;
    setSavingCert(true);
    try {
      const created = await api.addCert(certName.trim(), certProvider.trim(), certDate || undefined, certStatus);
      setCerts((prev) => [created, ...prev]);
      resetCertForm();
      setShowCertForm(false);
    } catch {
      toast("Failed to add certification.", "error");
    } finally {
      setSavingCert(false);
    }
  };

  const handleDeleteCert = async (id: string) => {
    const prev = certs;
    setCerts((c) => c.filter((x) => x.id !== id));
    try {
      await api.deleteCert(id);
    } catch {
      setCerts(prev);
      toast("Failed to remove certification.", "error");
    }
  };

  const totalCredits = courses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
  const completedCourses = courses.filter((c) => (c.status || "").toLowerCase() === "completed").length;

  return (
    <div className="flex-1 overflow-y-auto bg-background px-4 py-8 sm:px-6 lg:px-10 text-foreground custom-scrollbar">
      <div className="mx-auto mb-8 max-w-6xl">
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          Graduate Hub
        </h1>
        <p className="ml-11 mt-1.5 text-sm text-muted-foreground">
          Track your degree progress and certifications in one place.
        </p>
      </div>

      <div className="mx-auto mb-6 max-w-6xl">
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {[
            { id: "degree", label: "Degree Courses", icon: BookOpen },
            { id: "certs", label: "Certifications", icon: Award },
          ].map((t) => {
            const isActive = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as GradTab)}
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
        {tab === "degree" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="glass-card p-4">
                <p className="text-xs text-muted-foreground">Courses</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{courses.length}</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{completedCourses}</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-xs text-muted-foreground">Total credits</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{totalCredits}</p>
              </div>
              <div className="glass-card flex items-center justify-center p-4">
                <button
                  onClick={() => setShowCourseForm((v) => !v)}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80"
                >
                  {showCourseForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {showCourseForm ? "Cancel" : "Add course"}
                </button>
              </div>
            </div>

            {showCourseForm && (
              <form onSubmit={handleAddCourse} className="glass-card grid grid-cols-1 gap-3 p-4 sm:grid-cols-5">
                <input type="number" min={1} value={semester} onChange={(e) => setSemester(Number(e.target.value))}
                  placeholder="Semester" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
                <input value={courseName} onChange={(e) => setCourseName(e.target.value)} required
                  placeholder="Course name" className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-2" />
                <input type="number" min={0} value={credits} onChange={(e) => setCredits(Number(e.target.value))}
                  placeholder="Credits" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
                <input value={gpa} onChange={(e) => setGpa(e.target.value)}
                  placeholder="GPA (optional)" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
                <select value={courseStatus} onChange={(e) => setCourseStatus(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="planned">Planned</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
                <button type="submit" disabled={savingCourse}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50 sm:col-span-3">
                  {savingCourse ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save course
                </button>
              </form>
            )}

            {loading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
            ) : courses.length === 0 ? (
              <div className="glass-card p-8 text-center text-sm text-muted-foreground">
                No courses logged yet. Add your first one above.
              </div>
            ) : (
              <div className="glass-card divide-y divide-border">
                {courses
                  .slice()
                  .sort((a, b) => a.semester - b.semester)
                  .map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{c.course_name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Semester {c.semester} · {c.credits} credits{c.gpa ? ` · GPA ${c.gpa}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusPill status={c.status} />
                        <button onClick={() => handleDeleteCourse(c.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === "certs" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex justify-end">
              <button
                onClick={() => setShowCertForm((v) => !v)}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                {showCertForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showCertForm ? "Cancel" : "Add certification"}
              </button>
            </div>

            {showCertForm && (
              <form onSubmit={handleAddCert} className="glass-card grid grid-cols-1 gap-3 p-4 sm:grid-cols-4">
                <input value={certName} onChange={(e) => setCertName(e.target.value)} required
                  placeholder="Certification name" className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-2" />
                <input value={certProvider} onChange={(e) => setCertProvider(e.target.value)} required
                  placeholder="Provider (e.g. AWS)" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
                <input type="date" value={certDate} onChange={(e) => setCertDate(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
                <select value={certStatus} onChange={(e) => setCertStatus(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="planned">Planned</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
                <button type="submit" disabled={savingCert}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50 sm:col-span-3">
                  {savingCert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save certification
                </button>
              </form>
            )}

            {loading ? (
              <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
            ) : certs.length === 0 ? (
              <div className="glass-card p-8 text-center text-sm text-muted-foreground">
                No certifications tracked yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {certs.map((c) => (
                  <div key={c.id} className="glass-card flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{c.provider}{c.target_date ? ` · Target ${c.target_date}` : ""}</p>
                      <div className="mt-2"><StatusPill status={c.status} /></div>
                    </div>
                    <button onClick={() => handleDeleteCert(c.id)} className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
