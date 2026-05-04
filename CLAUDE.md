# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Spendly is an AI-powered personal finance dashboard that lets users connect their bank accounts and chat with their spending data in natural language. It has two components:
- **Frontend**: Next.js 14 (App Router) + TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Supabase Auth
- **Backend**: FastAPI + PostgreSQL (Supabase) + SQLAlchemy (async), Supabase Auth, Plaid API, LangChain + Google Gemini

---

## Development Guidelines

You are a professional software engineer. All code must follow best practices: accurate, readable, clean, and efficient.

## Global Standards

- **Comments**: No inline comments unless logic is non-obvious. Document exported functions/types with JSDoc where helpful
- **Styling**: Never update global styles. Keep all styling local to components via Tailwind classes
- **Package Manager (frontend)**: Use `npm` and `npx`
- **Package Manager (backend)**: Use `uv`
- **No `any`**: Use proper types or `unknown` with type guards
- **Imports**: Always use absolute imports with the `@/` alias in the frontend. Never use relative imports

---

## Architecture

### Core Principles
1. **Single Responsibility**: Each component, hook, service, and utility has one clear purpose
2. **Type Safety First**: TypeScript interfaces for all props, state, and return types
3. **Separation of Concerns**: UI in components, API calls in `lib/api.ts`, server state in TanStack Query, local state in hooks
4. **Thin Routers**: FastAPI route handlers delegate immediately to services — no business logic in routers
5. **Don't Repeat Yourself**: Check `services/`, `hooks/`, and `lib/` before writing new utilities

### Root Structure
```
spendly/
├── backend/
│   └── app/
│       ├── main.py                 # FastAPI entry, CORS, lifespan, router registration
│       ├── config.py               # Pydantic-settings — single source of env vars
│       ├── dependencies.py         # Shared FastAPI deps: get_db(), get_current_user()
│       ├── routers/                # HTTP layer only — thin, delegates to services
│       ├── services/               # All business logic: queries, aggregations, Plaid, insights
│       ├── agent/                  # LangChain agent, tools, prompts — isolated module
│       │   ├── executor.py         # AgentExecutor + LLM factory
│       │   ├── tools.py            # @tool definitions → call services internally
│       │   └── prompts.py          # System prompt constants
│       ├── models/                 # SQLAlchemy ORM models (DB shape)
│       │   └── base.py             # DeclarativeBase + TimestampMixin
│       ├── schemas/                # Pydantic v2 schemas (API contracts — separate from models)
│       └── db/
│           └── session.py          # Async engine, SessionLocal, get_db()
├── frontend/
│   ├── app/
│   │   ├── (auth)/                 # Route group — centered layout, no sidebar
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (app)/                  # Route group — protected, sidebar shell
│   │   │   ├── dashboard/
│   │   │   ├── transactions/
│   │   │   ├── chat/
│   │   │   └── settings/
│   │   └── api/auth/callback/      # Supabase OAuth callback handler
│   ├── components/
│   │   ├── ui/                     # shadcn/ui — never edit directly
│   │   ├── layout/                 # Sidebar, Topbar
│   │   ├── dashboard/              # StatCard, SpendingChart, CategoryDonut, InsightCard
│   │   ├── transactions/           # TransactionTable, FilterBar
│   │   ├── chat/                   # ChatWindow, MessageBubble, SuggestedPrompts
│   │   └── settings/               # ProfileForm, ConnectedAccounts
│   ├── hooks/                      # useAuth, useTransactions, useChat
│   ├── lib/
│   │   ├── api.ts                  # Typed backend API client (fetch wrapper)
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser Supabase client (singleton)
│   │   │   └── server.ts           # Server Supabase client (middleware + RSC)
│   │   └── utils.ts                # cn(), formatCurrency(), formatDate()
│   ├── types/index.ts              # Shared TS interfaces (Transaction, Account, etc.)
│   ├── constants/categories.ts     # Category labels, colors, badge classes — single source of truth
│   └── middleware.ts               # Session refresh + route protection
└── .env.example
```

### Naming Conventions
- **Components**: PascalCase (`StatCard`, `ChatWindow`)
- **Hooks**: `use` prefix (`useAuth`, `useChat`)
- **Component files**: PascalCase (`TransactionTable.tsx`)
- **Service files**: snake_case with `_service` suffix (`transaction_service.py`)
- **Utility/lib files**: camelCase (`utils.ts`, `api.ts`)
- **Constants**: SCREAMING_SNAKE_CASE
- **Interfaces/Types**: PascalCase with descriptive suffix (`TransactionRead`, `ChatRequest`)
- **Python schemas**: Pydantic class names describe direction (`TransactionCreate`, `TransactionRead`, `TransactionFilter`)

---

## Frontend

### Imports

Always use absolute imports with the `@/` alias.

```typescript
// ✓ Good
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { CATEGORY_CONFIG } from '@/constants/categories'

// ✗ Bad
import { cn } from '../../../lib/utils'
```

Use barrel exports (`index.ts`) when a folder has 3+ exports. Use `import type { X }` for type-only imports.

### Import Order
1. React core
2. External libraries (`next/navigation`, `@tanstack/react-query`, etc.)
3. UI components (`@/components/ui`)
4. Shared components (`@/components`)
5. API client (`@/lib/api`)
6. Utilities and lib (`@/lib`)
7. Hooks (`@/hooks`)
8. Types and constants
9. Assets / CSS

### TypeScript

- No `any` — use proper types or `unknown` with type guards
- Always define a props interface for every component
- Use `as const` for constant objects and arrays
- Explicit ref types: `useRef<HTMLDivElement>(null)`
- Prefer `interface` for object shapes, `type` for unions and aliases

### Components

```typescript
interface ComponentProps {
  requiredProp: string
  optionalProp?: boolean
}

export function Component({ requiredProp, optionalProp = false }: ComponentProps) {
  // Order: refs → external hooks → custom hooks → state → useMemo → useCallback → useEffect → return
}
```

Extract when: 50+ lines, used in 2+ files, or has its own state/logic.
Keep inline when: <10 lines, single use, purely presentational.

### Hooks

```typescript
interface UseFeatureOptions {
  month: string
}

export function useFeature({ month }: UseFeatureOptions) {
  const [data, setData] = useState<Data | null>(null)
  const fetchData = useCallback(async () => { /* ... */ }, [month])
  return { data, fetchData }
}
```

### TanStack Query

Query key factories live alongside their hooks:

```typescript
export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters?: TransactionFilter) => [...transactionKeys.all, 'list', filters ?? {}] as const,
  summary: (month: string) => [...transactionKeys.all, 'summary', month] as const,
}
```

Configure `QueryClient` in root layout with sensible defaults: `staleTime`, `retry`, `gcTime`.

### API Client

All backend calls go through `lib/api.ts`. Never call the backend directly from components or pages.

```typescript
// lib/api.ts
export const api = {
  transactions: {
    list: (filters?: TransactionFilter) => fetch(`/transactions?${qs(filters)}`).then(r => r.json()),
    summary: (month: string) => fetch(`/transactions/summary?month=${month}`).then(r => r.json()),
    categories: (month: string) => fetch(`/transactions/categories?month=${month}`).then(r => r.json()),
  },
  agent: {
    chat: (message: string) => fetch('/agent/chat', { method: 'POST', body: JSON.stringify({ message }) }),
    insight: () => fetch('/agent/insight').then(r => r.json()),
    analyze: () => fetch('/agent/analyze', { method: 'POST' }).then(r => r.json()),
  },
}
```

### Supabase Auth

- Use `lib/supabase/client.ts` for browser contexts (client components, hooks)
- Use `lib/supabase/server.ts` for server contexts (middleware, Server Components, route handlers)
- Never mix browser and server clients — they initialize differently and cause subtle SSR bugs
- Never access Supabase directly in components — always go through `useAuth` hook or server client

### Styling

Use Tailwind only — no inline styles or CSS modules. Use `cn()` from `@/lib/utils` for conditional classes.

```typescript
<div className={cn('base-classes', isActive && 'active-classes')} />
```

shadcn/ui components live in `components/ui/` — never edit them directly. Add new components with:
```bash
npx shadcn@latest add <component>
```

Category colors and badge classes always come from `constants/categories.ts` — never hardcode hex values or Tailwind color classes for categories inline.

### SSE Streaming (Chat)

The chat endpoint returns a `text/event-stream` response. Handle it in `hooks/useChat.ts` using the browser `EventSource` API or `fetch` with a `ReadableStream`. Append tokens to the last assistant message as they arrive. Emit `[DONE]` from the backend to signal end of stream.

---

## Backend

### Structure
- **Entry**: `app/main.py` — FastAPI app setup, CORS, lifespan, router registration
- **Config**: `app/config.py` — all env vars via `pydantic-settings`. Import `settings` from here everywhere
- **Dependencies**: `app/dependencies.py` — `get_db()` and `get_current_user()` as FastAPI `Depends`
- **Routes**: `app/routers/` — one module per resource (`transactions`, `agent`, `plaid`, `auth`)
- **Services**: `app/services/` — all business logic. Routers and agent tools both call services
- **Agent**: `app/agent/` — isolated module. Tools call services; executor is invoked by agent router
- **Schemas**: `app/schemas/` — Pydantic v2 request/response models. Separate from SQLAlchemy models
- **Models**: `app/models/` — SQLAlchemy 2.0 ORM models using `Mapped` / `mapped_column` syntax

### Patterns

**Routers are thin:**
```python
@router.get("/summary", response_model=MonthlySummary)
async def get_summary(
    month: str,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_user),
):
    return await transaction_service.get_monthly_summary(db, user.id, month)
```

**Services own business logic:**
```python
# services/transaction_service.py
async def get_monthly_summary(db: AsyncSession, user_id: UUID, month: str) -> MonthlySummary:
    # All query logic here
```

**Agent tools delegate to services — never query DB directly:**
```python
# agent/tools.py
@tool
async def get_monthly_summary(month: str) -> dict:
    """Get total spend, transaction count, and top merchants for a given month (YYYY-MM)."""
    async with AsyncSessionLocal() as db:
        return await transaction_service.get_monthly_summary(db, current_user_id, month)
```

**Models use SQLAlchemy 2.0 mapped syntax + TimestampMixin:**
```python
class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    merchant_name: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
```

**Schemas are separate from models:**
```python
# schemas/transaction.py
class TransactionRead(BaseModel):
    id: UUID
    merchant_name: str
    amount: Decimal
    category: str
    date: date

    model_config = ConfigDict(from_attributes=True)
```

### Agent

- `executor.py` exposes a `create_executor(model)` factory — call with `"gemini-3.1-flash"` for chat, `"gemini-3.1-pro-preview"` for full analysis
- All tools must have clear docstrings (the LLM reads these to decide when to call them), Pydantic `args_schema`, and type hints
- Always run `AgentExecutor` with `verbose=True` during development — logs the full ReAct chain
- Set `max_iterations=8` and `handle_parsing_errors=True` on all executors

### Database Migrations

```bash
cd backend
uv run alembic revision --autogenerate -m "description"
uv run alembic upgrade head
```

Ensure all models are imported in `app/models/__init__.py` so Alembic can auto-discover them.

---

## Commands

### Backend
```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
uv run alembic upgrade head
uv run pytest
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # localhost:3000
npm run build
npm run lint
```

---

## Environment Variables

### Backend (`backend/.env`)
```
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
DATABASE_URL=postgresql+asyncpg://...
GOOGLE_API_KEY=
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Service URLs
- Backend API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
- Frontend: `http://localhost:3000`