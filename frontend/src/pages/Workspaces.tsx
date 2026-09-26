import { useState, useEffect, useRef, useCallback } from "react";
import {
  FolderKanban, Plus, Trash2, Loader2, Send, Bot, User as UserIcon,
  Link2, X, PanelLeftClose, PanelLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../services/api";
import { useToast } from "../hooks/useToast";
import { CTOGuideBanner } from "../components/CTOGuideBanner";

interface Workspace {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

interface WorkspaceItem {
  id: string;
  item_type?: string;
  type?: string;
  title?: string;
  name?: string;
}

interface WsMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  failed?: boolean;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function itemLabel(item: WorkspaceItem) {
  return item.title || item.name || `${item.item_type || item.type || "Item"} ${item.id.slice(0, 6)}`;
}

export default function Workspaces() {
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [unlinked, setUnlinked] = useState<WorkspaceItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showLinker, setShowLinker] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const [messages, setMessages] = useState<WsMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const active = workspaces.find((w) => w.id === activeId) || null;

  const loadWorkspaces = useCallback(async () => {
    setLoadingWorkspaces(true);
    try {
      const data = await api.getWorkspaces();
      setWorkspaces(Array.isArray(data) ? data : []);
    } catch {
      toast("Couldn't load workspaces.", "error");
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadWorkspaces(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkspaces]);

  const loadItems = useCallback(async (workspaceId: string) => {
    setLoadingItems(true);
    const [linked, unlinkedItems] = await Promise.all([
      api.getWorkspaceItems(workspaceId).catch(() => []),
      api.getUnlinkedItems(workspaceId).catch(() => []),
    ]);
    const flatten = (payload: unknown): WorkspaceItem[] => {
      if (Array.isArray(payload)) return payload;
      if (!payload || typeof payload !== "object") return [];
      return Object.entries(payload as Record<string, Array<Record<string, unknown>>>).flatMap(([itemType, values]) =>
        Array.isArray(values) ? values.map((item) => ({ id: String(item.id), item_type: itemType === "docs" ? "document" : itemType.slice(0, -1), title: String(item.title ?? item.filename ?? item.job_title ?? "Item") })) : []
      );
    };
    setItems(flatten(linked));
    setUnlinked(flatten(unlinkedItems));
    setLoadingItems(false);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const timer = window.setTimeout(() => {
      setMessages([]);
      void loadItems(activeId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeId, loadItems]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await api.createWorkspace(newName.trim(), newDesc.trim() || undefined);
      setWorkspaces((prev) => [created, ...prev]);
      setActiveId(created.id);
      setNewName(""); setNewDesc("");
    } catch {
      toast("Couldn't create workspace.", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const prev = workspaces;
    setWorkspaces((w) => w.filter((x) => x.id !== id));
    if (activeId === id) { setActiveId(null); setItems([]); setUnlinked([]); setMessages([]); }
    try {
      await api.deleteWorkspace(id);
    } catch {
      setWorkspaces(prev);
      toast("Couldn't delete workspace.", "error");
    }
  };

  const handleLink = async (item: WorkspaceItem) => {
    if (!activeId) return;
    setLinkingId(item.id);
    try {
      await api.linkToWorkspace(activeId, item.item_type || item.type || "item", item.id);
      setUnlinked((prev) => prev.filter((u) => u.id !== item.id));
      setItems((prev) => [...prev, item]);
    } catch {
      toast("Couldn't link that item.", "error");
    } finally {
      setLinkingId(null);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !activeId) return;
    setInput("");

    const userMsg: WsMessage = { id: makeId(), role: "user", content: text };
    const assistantMsg: WsMessage = { id: makeId(), role: "assistant", content: "", pending: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setSending(true);

    const appendChunk = (chunk: string) => {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.id === assistantMsg.id) next[next.length - 1] = { ...last, content: last.content + chunk };
        return next;
      });
    };
    const finish = (failed = false) => {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.id === assistantMsg.id) next[next.length - 1] = { ...last, pending: false, failed };
        return next;
      });
      setSending(false);
    };

    await api.chatWorkspace(
      activeId,
      text,
      appendChunk,
      () => finish(false),
      () => {
        appendChunk("Saarthi couldn't reach the AI service just now. Try again in a moment.");
        finish(true);
      }
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-1">
      {railOpen && (
        <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-card/40 md:flex">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Workspaces</p>
            <button onClick={() => setRailOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Collapse">
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-2 border-b border-border p-3">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Workspace name"
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm" />
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)"
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm" />
            <button type="submit" disabled={creating || !newName.trim()}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-40">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} New workspace
            </button>
          </form>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2 space-y-0.5">
            {loadingWorkspaces && [0, 1, 2].map((i) => <div key={i} className="skeleton mx-2 my-1 h-10 rounded-md" />)}
            {!loadingWorkspaces && workspaces.length === 0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground">No workspaces yet — create one above to group notes, resume versions, and goals into one AI-aware context.</p>
            )}
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => setActiveId(w.id)}
                className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  activeId === w.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{w.name}</span>
                <span role="button" tabIndex={0} onClick={(e) => handleDelete(w.id, e)}
                  className="shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100">
                  <Trash2 className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          {!railOpen && (
            <button onClick={() => setRailOpen(true)} className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:flex" aria-label="Show workspaces">
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderKanban className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-none text-foreground">{active ? active.name : "AI Workspaces"}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {active ? (active.description || "Persistent, item-aware AI context") : "Select or create a workspace to begin"}
            </p>
          </div>
          {active && (
            <button
              onClick={() => setShowLinker((v) => !v)}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Link2 className="h-3.5 w-3.5" /> {items.length} linked
            </button>
          )}
        </div>

        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="w-full max-w-xl text-left mb-6">
              <CTOGuideBanner
                title="AI Workspaces & Project Context Guide"
                subtitle="Group notes, resume versions, target jobs, and goals into focused, AI-aware project drawers."
                steps={[
                  { title: "New Workspace", desc: "Type a workspace name (e.g. 'Google SWE Application') in the left panel and click 'New Workspace'." },
                  { title: "Link Items", desc: "Click 'Link Item' at the top right to attach resume versions or notes into this workspace." },
                  { title: "Ask Workspace AI", desc: "Chat with the AI assistant below — it reads all linked items as its memory context." },
                  { title: "Switch Contexts", desc: "Switch between different company or role workspaces anytime from the left rail." },
                ]}
                ctoTip="Use a dedicated workspace for each major company application to keep interview prep organized!"
              />
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Workspaces group related career items — resume versions, goals, notes — behind one focused AI chat.
              Pick one from the list or create a new one to get started.
            </p>
          </div>
        ) : (
          <>
            {showLinker && (
              <div className="border-b border-border bg-card/40 px-5 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Link an item</p>
                  <button onClick={() => setShowLinker(false)} className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
                </div>
                {loadingItems ? (
                  <div className="flex gap-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-7 w-28 rounded-full" />)}</div>
                ) : unlinked.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nothing left to link — everything available is already in this workspace.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {unlinked.map((it) => (
                      <button
                        key={it.id}
                        onClick={() => handleLink(it)}
                        disabled={linkingId === it.id}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground hover:border-primary/40 disabled:opacity-50"
                      >
                        {linkingId === it.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        {itemLabel(it)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 md:px-8">
              {messages.length === 0 ? (
                <div className="mx-auto flex max-w-md flex-col items-center pt-8 text-center">
                  <Bot className="h-6 w-6 text-primary" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Ask about anything linked to this workspace{items.length > 0 ? ` — ${items.length} item${items.length === 1 ? "" : "s"} in context.` : ". Link items above for grounded answers."}
                  </p>
                </div>
              ) : (
                <div className="mx-auto max-w-2xl space-y-5">
                  <AnimatePresence initial={false}>
                    {messages.map((m) => (
                      <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-secondary text-foreground" : "bg-primary/10 text-primary"}`}>
                          {m.role === "user" ? <UserIcon className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                        </div>
                        <div className={`min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                          m.role === "user" ? "bg-primary/10 text-foreground max-w-[85%]" : m.failed ? "bg-destructive/10 text-destructive max-w-[90%]" : "bg-card border border-border text-foreground max-w-[90%]"
                        }`}>
                          {m.content ? <span className="whitespace-pre-wrap">{m.content}</span> : m.pending ? (
                            <span className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…</span>
                          ) : null}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className="border-t border-border p-4 md:px-8">
              <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-xl border border-border bg-card px-3 py-2 focus-within:border-primary/40">
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                  placeholder={`Ask about ${active.name}…`}
                  className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  onClick={() => void send()}
                  disabled={!input.trim() || sending}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 disabled:opacity-40"
                  aria-label="Send"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
