# 02 — Product Requirements

## Modules Overview

Saarthi AI is a modular AI Operating System. Each module is an independent feature that connects back to the Goal Engine.

---

## Module 1: Goal Engine (Core) 🎯

**Purpose**: Central hub. Every other module feeds into this.

### Features
- Create, edit, delete goals
- Assign category: Career, Learning, Research, Health, Business, Personal
- Assign priority: Low, Medium, High, Critical
- Set due date
- Track progress (0–100%)
- AI-generated plan: auto-creates milestones and tasks from a natural-language goal
- Milestone management: create, update, reorder, mark complete
- Task management under each milestone
- Progress log: audit trail of all progress updates
- Link workspaces, chat sessions, and documents to a goal

---

## Module 2: AI OS Chat 💬

**Purpose**: The primary interface for talking to Saarthi. Context-aware, goal-aware, memory-enabled.

### Features
- Create named sessions ("Job Hunt Strategy", "React Learning")
- Tag a session to a specific goal
- Streaming responses from AI (typewriter effect)
- Persistent message history in PostgreSQL
- Model selection: user can pick which LLM to use
- Image input (vision model support)
- Code block rendering with syntax highlighting
- Copy, regenerate, delete message actions
- Export session as markdown

---

## Module 3: AI Workspace 📂

**Purpose**: Upload documents, research papers, project notes and chat with them in context.

### Features
- Create named workspaces (e.g., "MTech Application Docs")
- Upload PDFs, TXT, DOCX files
- Automatic text extraction and indexing (RAG)
- Chat with documents in the workspace context
- Link workspace to a goal
- View uploaded document list with processing status
- Notes within workspace (markdown-enabled)

---

## Module 4: Career Module 💼

**Purpose**: All career-related tools under one roof.

### Sub-features

#### 4.1 Graduate Hub (Student)
- ATS Resume Analyzer: score resume against job description
- Resume improvement suggestions (AI)
- Keyword extraction from JD
- Missing skills analysis

#### 4.2 Job Finder (Professional)
- Paste job description → AI match score
- Match percentage vs user's resume
- Missing skills recommendations
- Application status tracker (Saved, Applied, Interview, Offered, Rejected)

#### 4.3 Interview Coach
- Role-specific question sets (DSA, System Design, Behavioral)
- AI evaluates user's answer
- Score + detailed feedback
- Transcript saved to session

#### 4.4 Admissions Hub (Higher Studies)
- SOP review and AI feedback
- University comparison tool
- Checklist for application documents
- Deadline tracker

---

## Module 5: Learning Hub 📚

**Purpose**: Build and follow structured learning roadmaps toward a skill goal.

### Features
- Create a learning goal ("Learn System Design in 8 weeks")
- AI generates a week-by-week roadmap
- Mark chapters/topics as done
- Track progress % per roadmap
- Link roadmap to a Learning goal
- Resource recommendations (YouTube, docs, books)
- Daily task suggestions from the roadmap

---

## Module 6: Research Hub 🔬

**Purpose**: Manage academic and professional research projects.

### Features
- Create a research workspace
- Upload papers as PDFs
- Chat with paper ("What is the methodology in this paper?")
- Citation management (manual or AI-extracted)
- Literature review assistant
- Hypothesis tracker
- Export research summary as markdown

---

## Module 7: Memory Engine 🧠

**Purpose**: Saarthi remembers everything the user tells it. No need to re-introduce yourself.

### Features
- Automatic memory creation from significant conversations
- Goal-specific memory (stored per goal)
- User profile memory (name, background, preferences)
- Memory viewer: see all stored memories
- Memory management: edit or delete specific memories
- Memory is injected into AI prompts automatically

---

## Module 8: Daily HQ (Dashboard) 🏠

**Purpose**: The homepage. Shows what matters today.

### Features
- Active goals with progress bars
- Today's milestones and tasks due
- Quick-create goal
- Recent AI chat sessions
- Daily insight: AI-generated one-liner based on recent activity
- Streak tracker (days using Saarthi)

---

## Module 9: Notes (Global) 📝

**Purpose**: Capture quick thoughts without creating a workspace.

### Features
- Create, edit, delete notes
- Optional: tag note to a goal or workspace
- Search notes by title/content
- Markdown rendering
- AI: "Expand this note", "Summarize this note" actions

---

## Module 10: Settings ⚙️

### Features
- Account settings (name, email, password change)
- AI preferences (default model, provider)
- Notification preferences
- Privacy: export all data, delete account
- API key management (user can supply their own Gemini/OpenAI key)
- Theme: Dark/Light (future)

---

## User Flows

### New User Onboarding
1. Register
2. "What's your primary goal right now?" (Goal creation wizard)
3. AI generates a plan
4. Lands on Goal Detail page with milestones ready

### Power User Daily Loop
1. Open Daily HQ (Dashboard)
2. See today's tasks and due milestones
3. Complete tasks → progress updates automatically
4. Chat with AI in context of active goal
5. End of week → Reflection prompt from AI

---

## MVP Scope

For the first deployable version, include:
- [x] Auth (register, login, JWT)
- [x] Goal CRUD
- [ ] Milestone + Task management
- [ ] Goal AI Plan generation
- [x] AI Chat (multi-session)
- [x] AI Workspace (document upload + RAG)
- [x] Career: Resume Analyzer
- [ ] Career: Job Finder tracker
- [ ] Dashboard with live goal data
- [ ] Settings (basic)

Everything else is Post-MVP.
