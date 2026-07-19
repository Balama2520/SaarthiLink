# 15 — Coding Standards

## Language Rules

### Python (Backend)
- Python 3.11+
- Type hints on **all** function signatures
- Pydantic v2 models for all request/response schemas
- `async def` for all I/O operations (DB, HTTP, file)
- Black formatter + isort (line length: 100)
- Never use `print()` — use `logging.getLogger(__name__)`

### TypeScript (Frontend)
- TypeScript strict mode enabled
- No `any` types except unavoidable API responses (document with comment)
- Named exports for everything (no default export for stores/services)
- Props interfaces declared above the component
- `const` over `let` wherever possible

---

## Architecture Rules

### Route Handlers (FastAPI)
```python
# ✅ Route handler: thin, no business logic
@router.get("/goals/", response_model=list[GoalResponse])
async def list_goals(
    current_user: User = Depends(get_current_user),
    service: GoalService = Depends(get_goal_service)
):
    return service.get_user_goals(current_user.id)

# ❌ Never: business logic or DB queries in routes
@router.get("/goals/")
async def list_goals(db: Session = Depends(get_db)):
    goals = db.query(Goal).filter(Goal.user_id == ...).all()
    return goals
```

### Service Layer
```python
# ✅ Service: orchestrates repos, validates business rules
class GoalService:
    def __init__(self, repo: GoalRepository):
        self.repo = repo

    def get_user_goals(self, user_id: int) -> list[Goal]:
        return self.repo.find_by_user(user_id)

    def update_progress(self, goal_id: str, user_id: int, progress: int) -> Goal:
        goal = self.repo.find_by_id_and_user(goal_id, user_id)
        if not goal:
            raise NotFoundException("Goal not found")
        goal.progress = progress
        if progress == 100:
            goal.status = "completed"
        return self.repo.save(goal)
```

### Repository Layer
```python
# ✅ Repository: ONLY database queries
class GoalRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_by_user(self, user_id: int) -> list[Goal]:
        return self.db.query(Goal).filter(Goal.user_id == user_id).all()

    def save(self, goal: Goal) -> Goal:
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        return goal
```

---

## Frontend Rules

### Component Structure
```tsx
// ✅ Correct component structure
interface GoalCardProps {
  goal: Goal;
  onDelete: (id: string) => void;
}

export function GoalCard({ goal, onDelete }: GoalCardProps) {
  return (
    <div>...</div>
  );
}
```

### Data Fetching
```tsx
// ✅ TanStack Query for all server data
const { data: goals, isLoading } = useQuery({
  queryKey: ['goals'],
  queryFn: goalsApi.getAll,
});

// ❌ Never: direct fetch inside useEffect for server data
useEffect(() => {
  fetch('/api/goals').then(r => r.json()).then(setGoals);
}, []);
```

### API Service Files
```ts
// ✅ Feature-scoped API file
// services/goals.api.ts
export const goalsApi = {
  getAll: (): Promise<Goal[]> =>
    apiClient.get('/goals/'),
  create: (data: GoalCreate): Promise<Goal> =>
    apiClient.post('/goals/', data),
  update: (id: string, data: GoalUpdate): Promise<Goal> =>
    apiClient.put(`/goals/${id}`, data),
  delete: (id: string): Promise<void> =>
    apiClient.delete(`/goals/${id}`),
};
```

---

## Naming Conventions

| Item                        | Convention              | Example                    |
|-----------------------------|-------------------------|----------------------------|
| Python files                | snake_case              | `goal_service.py`          |
| Python classes              | PascalCase              | `GoalService`              |
| Python functions            | snake_case              | `get_user_goals()`         |
| TypeScript files            | PascalCase (components) | `GoalCard.tsx`             |
| TypeScript files (utils)    | camelCase               | `useGoals.ts`              |
| TypeScript interfaces       | PascalCase              | `interface GoalCardProps`  |
| React components            | PascalCase              | `export function GoalCard` |
| CSS classes (Tailwind)      | kebab-case (in strings) | `"rounded-xl bg-slate-900"`|
| API endpoints               | kebab-case plural nouns | `/api/goal-milestones/`    |
| Database tables             | snake_case plural       | `goal_milestones`          |
| Database columns            | snake_case              | `user_id`, `created_at`    |

---

## Git Commit Standards

```
type(scope): short description

Types: feat, fix, refactor, docs, test, chore, style
Scope: goals, chat, career, auth, ui, backend, db

Examples:
feat(goals): add AI plan generation endpoint
fix(chat): resolve session context not persisting
refactor(backend): extract GoalRepository from routes
docs(arch): update system architecture diagram
```

---

## What Never to Do

1. ❌ Never call AI directly from a route handler
2. ❌ Never put API keys in frontend code
3. ❌ Never duplicate a component that already exists
4. ❌ Never add business logic to route handlers
5. ❌ Never add DB queries to service layer (use repository)
6. ❌ Never use `any` in TypeScript without a comment explaining why
7. ❌ Never skip type annotations in Python functions
8. ❌ Never add a feature that doesn't connect to a Goal
9. ❌ Never create a new API if an existing one can be extended
10. ❌ Never modify production DB schema manually — always use Alembic
