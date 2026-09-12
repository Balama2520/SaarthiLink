import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Plus, Trash2, MessageSquare, Sparkles, Loader2,
  AlertCircle, PanelLeftClose, PanelLeft, Bot, User as UserIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../services/api";
import { localDB } from "../services/localDB";
import { useToast } from "../hooks/useToast";
import { useAppStore } from "../store/useAppStore";

interface ChatSession {
  id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  failed?: boolean;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function titleFromMessage(text: string) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed || "New conversation";
}

const SUGGESTED_PROMPTS = [
  "What should I focus on this week?",
  "Review my biggest skill gap for my target role",
  "Help me prep for an upcoming interview",
  "What's missing from my profile?",
];

export default function ChatCoach() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const username = useAppStore((s) => s.username);
  const { toast } = useToast();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(isAuthenticated);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const [sessionsError, setSessionsError] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ---- Load sessions (authenticated) or local history (guest) ----
  useEffect(() => {
    if (!isAuthenticated) {
      (async () => {
        const saved = await localDB.getChatHistory();
        if (Array.isArray(saved)) setMessages(saved as ChatMessage[]);
      })();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingSessions(true);
        const data = await api.getSessions();
        if (cancelled) return;
        setSessions(Array.isArray(data) ? data : []);
        setSessionsError("");
      } catch {
        if (!cancelled) setSessionsError("Couldn't load your conversations.");
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Persist guest history locally so it survives a refresh
  useEffect(() => {
    if (!isAuthenticated && messages.length > 0) {
      void localDB.saveChatHistory(messages);
    }
  }, [isAuthenticated, messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const selectSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setLoadingMessages(true);
    try {
      const data = await api.getSessionMessages(sessionId);
      const mapped: ChatMessage[] = (Array.isArray(data) ? data : []).map((m: { role: string; content: string; id?: string }) => ({
        id: m.id || makeId(),
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));
      setMessages(mapped);
    } catch {
      toast("Couldn't load that conversation.", "error");
    } finally {
      setLoadingMessages(false);
    }
  }, [toast]);

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    textareaRef.current?.focus();
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const prev = sessions;
    setSessions((s) => s.filter((sess) => sess.id !== sessionId));
    if (activeSessionId === sessionId) startNewChat();
    try {
      await api.deleteSession(sessionId);
    } catch {
      setSessions(prev);
      toast("Couldn't delete conversation.", "error");
    }
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || sending) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: ChatMessage = { id: makeId(), role: "user", content: text };
    const assistantMsg: ChatMessage = { id: makeId(), role: "assistant", content: "", pending: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setSending(true);

    const appendChunk = (chunk: string) => {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.id === assistantMsg.id) {
          next[next.length - 1] = { ...last, content: last.content + chunk };
        }
        return next;
      });
    };
    const finish = (failed = false) => {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.id === assistantMsg.id) {
          next[next.length - 1] = { ...last, pending: false, failed };
        }
        return next;
      });
      setSending(false);
    };

    if (isAuthenticated) {
      try {
        let sessionId = activeSessionId;
        if (!sessionId) {
          const created = await api.createSession(titleFromMessage(text));
          sessionId = created.id;
          setSessions((prev) => [created, ...prev]);
          setActiveSessionId(sessionId);
        }
        await api.chatStream(
          text,
          sessionId as string,
          "default",
          "phi3",
          appendChunk,
          () => finish(false),
          () => {
            appendChunk("Saarthi couldn't reach the AI service just now. Your message is saved — try again in a moment.");
            finish(true);
          }
        );
      } catch {
        appendChunk("Something went wrong starting this conversation. Please try again.");
        finish(true);
      }
      return;
    }

    // Guest fallback — no server-side sessions, local history only
    const localHistory = messages
      .filter((m) => m.content)
      .map((m) => ({ role: m.role, content: m.content }));
    await api.chatLocal(
      text,
      null,
      localHistory,
      "phi3",
      "default",
      appendChunk,
      () => finish(false),
      () => {
        appendChunk("Saarthi couldn't reach the AI service just now. Sign in to save this conversation and try again shortly.");
        finish(true);
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Sessions rail — authenticated users only */}
      {isAuthenticated && railOpen && (
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/40 md:flex">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Conversations</p>
            <button
              type="button"
              onClick={() => setRailOpen(false)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Collapse conversation list"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
          <div className="p-3">
            <button
              type="button"
              onClick={startNewChat}
              className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Plus className="h-4 w-4" /> New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-3 space-y-0.5">
            {loadingSessions && (
              <div className="space-y-2 px-2 py-2">
                {[0, 1, 2].map((i) => <div key={i} className="skeleton h-9 rounded-md" />)}
              </div>
            )}
            {!loadingSessions && sessionsError && (
              <p className="px-2 py-2 text-xs text-destructive">{sessionsError}</p>
            )}
            {!loadingSessions && !sessionsError && sessions.length === 0 && (
              <p className="px-2 py-4 text-xs text-muted-foreground">No conversations yet. Start one below.</p>
            )}
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSession(s.id)}
                className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  activeSessionId === s.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{s.title || "Conversation"}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => deleteSession(s.id, e)}
                  className="shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* Main thread */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          {isAuthenticated && !railOpen && (
            <button
              type="button"
              onClick={() => setRailOpen(true)}
              className="hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
              aria-label="Show conversation list"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground leading-none">AI OS Chat</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {isAuthenticated ? "Grounded in your profile, resume, skills and goals" : "Guest mode — sign in to save history"}
            </p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 md:px-8">
          {loadingMessages && (
            <div className="mx-auto max-w-2xl space-y-4">
              <div className="skeleton h-16 rounded-xl" />
              <div className="skeleton h-24 rounded-xl" />
            </div>
          )}

          {!loadingMessages && messages.length === 0 && (
            <div className="mx-auto flex max-w-lg flex-col items-center pt-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Bot className="h-6 w-6" />
              </div>
              <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
                {isAuthenticated ? `Hey ${username.split(" ")[0]}, what's next on your career?` : "Ask Saarthi anything about your career"}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {isAuthenticated
                  ? "I can see your profile, skills and goals — ask me anything, no need to repeat context."
                  : "You're browsing as a guest, so I won't have your profile context. Sign in for personalized answers."}
              </p>
              <div className="mt-6 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => void send(p)}
                    className="rounded-lg border border-border bg-card px-3 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loadingMessages && messages.length > 0 && (
            <div className="mx-auto max-w-2xl space-y-5">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      m.role === "user" ? "bg-secondary text-foreground" : "bg-primary/10 text-primary"
                    }`}>
                      {m.role === "user" ? <UserIcon className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </div>
                    <div className={`min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary/10 text-foreground"
                        : m.failed
                          ? "bg-destructive/10 text-destructive"
                          : "bg-card border border-border text-foreground"
                    } ${m.role === "user" ? "max-w-[85%]" : "max-w-[90%]"}`}>
                      {m.content ? (
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      ) : m.pending ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                        </span>
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
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoGrow(e.target); }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your resume, skills, jobs, or next step…"
              className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={!input.trim() || sending}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:bg-primary/80 disabled:opacity-40"
              aria-label="Send message"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          {!isAuthenticated && (
            <p className="mx-auto mt-2 flex max-w-2xl items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" /> Guest chat is stored on this device only.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
