import { useState, useRef, useEffect } from "react";
import { Send, FileUp, Sparkles, Bot, User, BrainCircuit, Mic, LogIn } from "lucide-react";
import { api } from "../services/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatCoachProps {
  username: string;
}

const AGENTS = [
  { id: "default",   name: "Saarthi Copilot",      desc: "General career planning & guidance",     color: "from-violet-600 to-fuchsia-600", text: "text-violet-400" },
  { id: "career",    name: "Resume & ATS Coach",    desc: "Keyword optimization & ATS checks",      color: "from-blue-600 to-cyan-500",      text: "text-blue-400" },
  { id: "interview", name: "Interview Simulator",   desc: "Mock questions & structural answers",    color: "from-emerald-600 to-teal-500",   text: "text-emerald-400" },
  { id: "learning",  name: "Roadmap Assistant",     desc: "Curate developer learning pathways",     color: "from-amber-600 to-orange-500",   text: "text-amber-400" },
];

const MODELS = [
  { id: "phi3",        name: "Phi-3 (Lightweight)" },
  { id: "qwen3",       name: "Qwen-3 (Recomm.)" },
  { id: "deepseek-r1", name: "DeepSeek-R1 (Reasoning)" },
  { id: "gemini",      name: "Gemini-1.5-Flash (Cloud)" },
];

export default function ChatCoach({ username }: ChatCoachProps) {
  const isGuest = !localStorage.getItem("access_token");

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Namaste ${username}! I am Saarthi, your career copilot. ${
        isGuest
          ? "You are in guest mode — sign in to save your conversation history."
          : "Choose a coach above or ask me anything."
      }`,
    },
  ]);
  const [input, setInput] = useState("");
  const [activeAgent, setActiveAgent] = useState("default");
  const [activeModel, setActiveModel] = useState("phi3");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const chatEndRef     = useRef<HTMLDivElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<BlobPart[]>([]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create a backend session for authenticated users
  useEffect(() => {
    if (isGuest) return;
    api.createSession("Saarthi Chat")
      .then((s) => setSessionId(s.id))
      .catch(() => setSessionError("Could not create a session. Please refresh."));
  }, [isGuest]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    // Guest mode / local chat: use local profile and stream from server without persisting
    if (isGuest || !sessionId) {
      const userMessage = input.trim();
      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
      setLoading(true);
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      // Ensure we have a simple local profile (name)
      let profileName = localStorage.getItem("profile_name");
      if (!profileName) {
        const name = window.prompt("Welcome — what's your name?");
        profileName = name && name.trim() ? name.trim() : "Guest";
        try {
          localStorage.setItem("profile_name", profileName);
        } catch (storageError) {
          console.warn("Unable to persist profile name", storageError);
        }
      }

      const localProfile = { name: profileName };

      try {
        let streamingResponse = "";
        await api.chatLocal(
          userMessage,
          localProfile,
          [],
          activeModel,
          activeAgent,
          (chunk) => {
            streamingResponse += chunk;
            setMessages((prev) => {
              const updated = [...prev];
              if (updated.length > 0) {
                updated[updated.length - 1] = { role: "assistant", content: streamingResponse };
              }
              return updated;
            });
          },
          () => {
            setLoading(false);
          },
          (err) => {
            setLoading(false);
            const message = err instanceof Error ? err.message : String(err);
            setMessages((prev) => {
              const updated = [...prev];
              if (updated.length > 0) {
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: `⚠️ Failed to get reply: ${message}`,
                };
              }
              return updated;
            });
          }
        );
      } catch (err) {
        setLoading(false);
        const message = err instanceof Error ? err.message : String(err);
        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              role: "assistant",
              content: `⚠️ Connection error: ${message}`,
            };
          }
          return updated;
        });
      }
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      let streamingResponse = "";
      await api.chatStream(
        userMessage,
        sessionId,
        activeAgent,
        activeModel,
        (chunk) => {
          streamingResponse += chunk;
          setMessages((prev) => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = { role: "assistant", content: streamingResponse };
            }
            return updated;
          });
        },
        () => {
          setLoading(false);
        },
        (err) => {
          const message = err instanceof Error ? err.message : String(err);
          setLoading(false);
          setMessages((prev) => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = {
                role: "assistant",
                content: `⚠️ Failed to get reply: ${message}`,
              };
            }
            return updated;
          });
        }
      );
    } catch (err) {
      setLoading(false);
      const message = err instanceof Error ? err.message : String(err);
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            role: "assistant",
            content: `⚠️ Connection error: ${message}`,
          };
        }
        return updated;
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isGuest) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Please sign in to upload files." },
      ]);
      e.target.value = "";
      return;
    }
    setMessages((prev) => [...prev, { role: "user", content: `[Uploaded File: ${file.name}]` }]);
    setLoading(true);
    try {
      await api.uploadFile(file);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `✅ File "${file.name}" uploaded and indexed! You can now ask questions about it.` },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ File upload failed: ${message}` }]);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const startRecording = async () => {
    if (isGuest) { alert("Sign in to use voice input."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        setLoading(true);
        try {
          const data = await api.voiceToText(audioBlob);
          if (data.text) setInput((prev) => prev + (prev ? " " : "") + data.text);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `❌ Voice Transcription Failed: ${message}` },
          ]);
        } finally { setLoading(false); }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 h-screen font-sans text-slate-50">
      {/* ── Header ── */}
      <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-violet-400" />
          <h2 className="font-semibold text-white">Saarthi Workspace</h2>
          {isGuest && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold">
              Guest Mode
            </span>
          )}
        </div>
        {/* Model Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Model:</span>
          <select
            value={activeModel}
            onChange={(e) => setActiveModel(e.target.value)}
            className="bg-slate-900/80 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </header>

      {/* ── Session error banner ── */}
      {sessionError && (
        <div className="px-6 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs text-center">
          {sessionError}
        </div>
      )}

      {/* ── Agent Selector ── */}
      <div className="px-6 py-4 border-b border-white/5 bg-slate-900/90 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        {AGENTS.map((agent) => {
          const isActive = activeAgent === agent.id;
          return (
            <button
              key={agent.id}
              onClick={() => setActiveAgent(agent.id)}
              className={`p-3 rounded-xl border text-left transition-all duration-300 relative overflow-hidden
                ${isActive
                  ? "border-violet-500/30 bg-violet-600/[0.04]"
                  : "border-white/10 bg-slate-900/80 hover:bg-slate-900/90 hover:border-white/20"
                }`}
            >
              <div className={`text-xs font-bold mb-0.5 flex items-center gap-1.5 ${isActive ? agent.text : "text-slate-400"}`}>
                <Sparkles className="w-3 h-3" />
                {agent.name}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight truncate">{agent.desc}</div>
              {isActive && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${agent.color}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.map((msg, index) => {
          const isAssistant = msg.role === "assistant";
          return (
            <div key={index} className={`flex gap-4 max-w-3xl ${isAssistant ? "" : "ml-auto flex-row-reverse"}`}>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0
                ${isAssistant
                  ? "bg-violet-600/10 border-violet-500/20 text-violet-400"
                  : "bg-slate-900/80 border-white/10 text-slate-300"}`}>
                {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed border
                ${isAssistant
                  ? "bg-slate-900/90 border-white/10 text-slate-200"
                  : "bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border-violet-500/10 text-white"}`}>
                {msg.content ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <span className="flex items-center gap-1.5 py-1">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* ── Guest CTA Banner ── */}
      {isGuest && (
        <div className="mx-6 mb-4 p-4 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center gap-4">
          <LogIn className="w-5 h-5 text-violet-400 shrink-0" />
          <p className="text-sm text-slate-300 flex-1">
            <span className="text-white font-semibold">Sign in</span> to unlock full AI chat, session history, and personalized coaching.
          </p>
        </div>
      )}

      {/* ── Input Form ── */}
      <div className="px-6 py-5 border-t border-white/5 bg-slate-900/40 shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-3 max-w-4xl mx-auto"
        >
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.docx,.txt" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-slate-900/80 border border-white/10 hover:border-violet-500/20 rounded-xl text-slate-400 hover:text-white transition-all duration-200 shrink-0"
            title="Upload Document for PDF Chat"
          >
            <FileUp className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
            placeholder={isGuest ? "Ask Saarthi anything (guest mode)..." : "Ask about resumes, roadmaps, interview prep..."}
          />

          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 border rounded-xl transition-all duration-200 shrink-0 ${
              isRecording
                ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse"
                : "bg-slate-900/80 border-white/10 hover:border-violet-500/20 text-slate-400 hover:text-white"
            }`}
            title="Voice to Text"
          >
            <Mic className="w-5 h-5" />
          </button>

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl transition-all duration-200 shadow-lg shadow-violet-600/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-[10px] text-slate-500 text-center mt-3">
          Saarthi AI can make mistakes. Double check critical resume & career guidelines.
        </p>
      </div>
    </div>
  );
}