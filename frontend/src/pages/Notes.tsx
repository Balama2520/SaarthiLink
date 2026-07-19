import { useState, useCallback, useEffect } from "react";
import { StickyNote, Sparkles, Trash2, Loader2, Tag, BookMarked, ChevronRight } from "lucide-react";
import { api } from "../services/api";

interface GeneratedNote {
  id?: number;
  title: string;
  summary: string;
  key_points: string[];
  details: string;
  flashcards: { q: string; a: string }[];
  tags: string;
}

interface NoteListItem {
  id: number;
  title: string;
  tags: string;
  created_at: string;
}

export default function Notes() {
  const isGuest = !localStorage.getItem("access_token");
  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState("detailed");
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<GeneratedNote | null>(null);
  const [savedNotes, setSavedNotes] = useState<NoteListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<number | null>(null);

  const fetchSavedNotes = useCallback(async () => {
    if (isGuest) {
      setSavedNotes([]);
      return;
    }

    try {
      const data = await api.listNotes();
      setSavedNotes(data);
    } catch (err) {
      console.error(err);
    }
  }, [isGuest]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchSavedNotes();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchSavedNotes]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    if (isGuest) {
      setError("Please sign in to generate notes");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.generateNote(topic, depth);
      setNote(data);
      fetchSavedNotes();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to generate notes");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (isGuest) return;
    try {
      await api.deleteNote(id);
      setSavedNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 overflow-y-auto px-8 py-10 font-sans text-slate-100">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2.5">
          <StickyNote className="w-8 h-8 text-amber-300" /> AI Study Notes
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Generate beautifully structured notes with flashcards on any topic instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Generate + Saved */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 bg-slate-900/90 border border-white/10 rounded-2xl space-y-4 shadow-lg shadow-black/20">
            <h3 className="font-semibold text-white">Generate Notes</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Topic</label>
              <input
                type="text"
                placeholder="e.g. React Hooks, SQL Joins..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500/60"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Depth</label>
              <select
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500/60"
              >
                <option value="brief">Brief</option>
                <option value="detailed">Detailed</option>
                <option value="comprehensive">Comprehensive</option>
              </select>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-semibold text-sm rounded-xl transition-all shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Generating..." : "Generate"}
            </button>
            {error && <p className="text-red-400 text-xs">{error}</p>}
          </div>

          {/* Saved Notes List */}
          {savedNotes.length > 0 && (
            <div className="p-4 bg-slate-900/90 border border-white/10 rounded-2xl">
              <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-yellow-400" /> Saved Notes
              </h3>
              <ul className="space-y-2">
                {savedNotes.map((n) => (
                  <li key={n.id} className="flex items-center justify-between group p-2 rounded-lg hover:bg-slate-900/80 transition-colors">
                    <div className="overflow-hidden">
                      <p className="text-xs font-medium text-slate-300 truncate">{n.title}</p>
                      <p className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => handleDelete(n.id)} className="text-slate-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-2">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Main Note Display */}
        <div className="lg:col-span-3">
          {note ? (
            <div className="space-y-6 animate-fade-in">
              {/* Header */}
              <div className="p-6 bg-violet-500/10 border border-violet-500/20 rounded-2xl">
                <h2 className="text-2xl font-bold text-violet-300 mb-2">{note.title}</h2>
                <p className="text-slate-100/80 text-sm leading-relaxed">{note.summary}</p>
                {note.tags && (
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Tag className="w-3.5 h-3.5 text-yellow-500" />
                    {note.tags.split(",").map((tag, i) => (
                      <span key={i} className="text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Key Points */}
                <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-yellow-400" /> Key Points
                  </h3>
                  <ul className="space-y-2.5">
                    {note.key_points.map((point, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-yellow-500/15 text-yellow-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Details */}
                <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6">
                  <h3 className="font-semibold text-white mb-3">Full Notes</h3>
                  <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{note.details}</p>
                </div>
              </div>

              {/* Flashcards */}
              {note.flashcards?.length > 0 && (
                <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6">
                  <h3 className="font-semibold text-white mb-4">⚡ Flashcards</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {note.flashcards.map((card, i) => (
                      <div
                        key={i}
                        onClick={() => setFlipped(flipped === i ? null : i)}
                        className="cursor-pointer p-4 rounded-xl border border-white/5 bg-[#0a0a0f] hover:border-yellow-500/30 transition-all min-h-[80px] flex flex-col justify-center"
                      >
                        {flipped === i ? (
                          <p className="text-sm text-yellow-300 font-medium animate-fade-in">💡 {card.a}</p>
                        ) : (
                          <p className="text-sm text-gray-300">{card.q}</p>
                        )}
                        <p className="text-[10px] text-gray-600 mt-2">{flipped === i ? "Click to hide answer" : "Click to reveal answer"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[400px] border border-white/10 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-slate-900/70">
              <StickyNote className="w-12 h-12 text-amber-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-100 mb-2">No Notes Yet</h3>
              <p className="text-sm text-slate-400 max-w-sm">
                Enter any topic and generate fully structured study notes with flashcards.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}