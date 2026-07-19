# 05 — Goal Engine

## The Heart of Saarthi

The Goal Engine is not a simple task tracker. It is the central domain model that connects **every other system** in Saarthi.

---

## What Is a Goal?

A Goal is the highest-level object in Saarthi's domain model. Everything else belongs to a Goal.

```
Goal
├── Metadata
│   ├── title
│   ├── description
│   ├── category         (Career, Learning, Research, Health, Business, etc.)
│   ├── status           (pending, in_progress, on_hold, completed, abandoned)
│   ├── priority         (low, medium, high, critical)
│   ├── progress         (0-100%)
│   └── due_date
│
├── Planner (AI-generated)
│   ├── strategy
│   ├── estimated_weeks
│   └── suggested_habits
│
├── Milestones[]
│   ├── title
│   ├── description
│   ├── target_date
│   ├── status
│   └── tasks[]
│       ├── title
│       ├── is_done
│       └── due_date
│
├── Workspace (linked)
│   ├── documents[]
│   ├── notes[]
│   └── resumes[]
│
├── AI Sessions[]        (chat history tagged to this goal)
│
├── Memory              (goal-specific AI memory context)
│
├── Projects[]          (code/work projects toward this goal)
│
├── Reflections[]       (weekly AI-prompted reflection entries)
│
└── Progress Log[]      (timestamped progress events)
```

---

## Goal Engine Database Schema

```sql
-- Core goal record
goals (
  id          UUID PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id),
  title       VARCHAR NOT NULL,
  description TEXT,
  category    VARCHAR DEFAULT 'General',
  status      VARCHAR DEFAULT 'pending',
  priority    VARCHAR DEFAULT 'medium',
  progress    INTEGER DEFAULT 0,      -- 0-100
  due_date    VARCHAR,
  created_at  TIMESTAMP,
  updated_at  TIMESTAMP
)

-- Milestones under a goal
goal_milestones (
  id          UUID PRIMARY KEY,
  goal_id     UUID REFERENCES goals(id) ON DELETE CASCADE,
  title       VARCHAR NOT NULL,
  description TEXT,
  target_date VARCHAR,
  status      VARCHAR DEFAULT 'pending',
  order_index INTEGER DEFAULT 0,
  created_at  TIMESTAMP
)

-- Atomic tasks under a milestone
goal_tasks (
  id            UUID PRIMARY KEY,
  milestone_id  UUID REFERENCES goal_milestones(id) ON DELETE CASCADE,
  title         VARCHAR NOT NULL,
  is_done       BOOLEAN DEFAULT FALSE,
  due_date      VARCHAR,
  created_at    TIMESTAMP
)

-- Progress events (append-only audit log)
goal_progress_log (
  id          UUID PRIMARY KEY,
  goal_id     UUID REFERENCES goals(id) ON DELETE CASCADE,
  old_progress INTEGER,
  new_progress INTEGER,
  note        TEXT,
  created_at  TIMESTAMP
)
```

---

## Goal Engine APIs

| Method | Endpoint                              | Description                      |
|--------|---------------------------------------|----------------------------------|
| POST   | /api/goals/                           | Create goal                      |
| GET    | /api/goals/                           | List user's goals                |
| GET    | /api/goals/{id}                       | Get goal detail                  |
| PUT    | /api/goals/{id}                       | Update goal                      |
| DELETE | /api/goals/{id}                       | Delete goal                      |
| POST   | /api/goals/{id}/plan                  | AI-generate plan for goal        |
| GET    | /api/goals/{id}/milestones            | List milestones                  |
| POST   | /api/goals/{id}/milestones            | Create milestone                 |
| PUT    | /api/goals/{id}/milestones/{mid}      | Update milestone                 |
| POST   | /api/goals/{id}/milestones/{mid}/tasks| Create task under milestone      |
| PATCH  | /api/goals/{id}/milestones/{mid}/tasks/{tid} | Toggle task done          |
| GET    | /api/goals/{id}/progress              | Get progress history             |

---

## How Other Modules Connect to Goals

| Module      | Connection                                         |
|-------------|---------------------------------------------------|
| AI Chat     | Every chat session optionally tagged to a goal     |
| Workspace   | Documents can be linked to goals                   |
| Career      | Job applications tracked under "Get a Job" goal    |
| Research    | Papers linked to "Complete Research" goal          |
| Learning    | Roadmaps linked to "Learn X" goal                  |
| Memory      | Goal-specific memory context in AI calls           |
| Notes       | Notes can be tagged to a goal                      |

---

## AI Planning Flow

When user clicks "Generate Plan" for a goal:

1. Backend builds context: goal title, category, any milestones already added
2. Goal memory is fetched from Memory Engine
3. AI Gateway is called with a Planner prompt
4. Response is parsed into milestones and tasks
5. Milestones and tasks saved to database
6. Progress auto-set to 0

This is the ONLY place AI is used for goal planning. All CRUD operations are plain database logic.
