# Spendly — Detailed Build Roadmap

### Step 1 — Repo Setup (~15 min)
```bash
mkdir spendly && cd spendly
git init
touch .gitignore .env.example README.md
```

Create `.gitignore`:
```
.env
.env.local
__pycache__/
.next/
node_modules/
.venv/
```

Create `.env.example` — document every key you'll need:
```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Gemini
GOOGLE_API_KEY=

# Plaid (optional)
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox

# Frontend
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

### Step 2 — Supabase Project (~15 min)
1. Go to supabase.com → New project → name it `spendly`
2. Copy your Project URL and publishable key into `.env.example`
3. Go to Settings → API → copy `service_role` key
4. Go to Authentication → Providers → confirm Email enabled
5. Go to Authentication → URL Configuration → add `http://localhost:3000/api/auth/callback` to Redirect URLs

---

### Step 3 — Backend Scaffold (~30 min)

```bash
mkdir backend && cd backend
uv init
uv python pin 3.12
```

Add dependencies to `pyproject.toml`:
```toml
[project]
name = "spendly-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "sqlalchemy[asyncio]>=2.0.0",
    "alembic>=1.13.0",
    "asyncpg>=0.29.0",
    "pydantic>=2.0.0",
    "pydantic-settings>=2.0.0",
    "python-dotenv>=1.0.0",
    "langchain>=0.3.0",
    "langchain-google-genai>=2.0.0",
    "langchain-core>=0.3.0",
    "plaid-python>=20.0.0",
    "python-jose[cryptography]>=3.3.0",
    "httpx>=0.27.0",
]

[tool.ruff]
line-length = 88
select = ["E", "F", "I"]
```

```bash
uv sync
```

Create folder structure:
```bash
mkdir -p app/routers app/services app/agent app/models app/schemas app/db tests
touch app/__init__.py app/routers/__init__.py app/services/__init__.py
touch app/agent/__init__.py app/models/__init__.py app/schemas/__init__.py
touch app/main.py app/config.py app/dependencies.py
touch app/db/session.py app/db/seed.py
touch app/models/base.py app/models/profile.py app/models/account.py
touch app/models/transaction.py app/models/chat_message.py
touch app/schemas/common.py app/schemas/transaction.py
touch app/schemas/account.py app/schemas/agent.py app/schemas/plaid.py
touch app/routers/auth.py app/routers/transactions.py
touch app/routers/plaid.py app/routers/agent.py
touch app/services/transaction_service.py app/services/plaid_service.py
touch app/services/insight_service.py
touch app/agent/executor.py app/agent/tools.py app/agent/prompts.py
```

**`app/config.py`:**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_publishable_key: str
    supabase_service_role_key: str
    google_api_key: str
    plaid_client_id: str = ""
    plaid_secret: str = ""
    plaid_env: str = "sandbox"
    database_url: str  # postgresql+asyncpg://...

    class Config:
        env_file = ".env"

settings = Settings()
```

**`app/main.py`:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, transactions, plaid, agent

app = FastAPI(title="Spendly API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
app.include_router(plaid.router, prefix="/plaid", tags=["plaid"])
app.include_router(agent.router, prefix="/agent", tags=["agent"])

@app.get("/health")
async def health():
    return {"status": "ok"}
```

**`app/db/session.py`:**
```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings

engine = create_async_engine(settings.database_url, echo=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

**`app/models/base.py`:**
```python
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import DateTime, func

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

Verify backend starts:
```bash
uv run uvicorn app.main:app --reload --port 8000
# GET http://localhost:8000/health → {"status": "ok"}
```

---

### Step 4 — Database Schema + Migrations (~30 min)

```bash
uv run alembic init alembic
```

Update `alembic/env.py` — import Base and all models:
```python
from app.models import Base  # triggers all model imports via __init__.py
from app.config import settings
config.set_main_option("sqlalchemy.url", settings.database_url)
target_metadata = Base.metadata
```

**`app/models/__init__.py`** — ensure all models imported:
```python
from app.models.base import Base
from app.models.profile import Profile
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.chat_message import ChatMessage
```

Write your 4 models (profile, account, transaction, chat_message) using SQLAlchemy 2.0 mapped column syntax, inheriting `TimestampMixin`.

```bash
uv run alembic revision --autogenerate -m "initial schema"
uv run alembic upgrade head
```

Verify tables exist in Supabase dashboard → Table Editor.

---

### Step 5 — Seed Mock Data (~20 min)

Write `app/db/seed.py` — insert 1 mock user profile, 2 accounts, and 80-100 transactions spread across:
- Last 3 months of dates
- All 8 categories
- Mix of amounts ($3 coffee → $200 grocery run)
- 4-5 obvious recurring subscriptions (Netflix $15.99, Spotify $9.99, etc.)
- 1-2 obvious anomalies (a $450 charge in a normally low-spend category)

```bash
uv run python -m app.db.seed
```

---

### Step 6 — Frontend Scaffold (~30 min)

```bash
cd .. && npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir
cd frontend
npx shadcn@latest init
# Select: Default style, warm gray base color, yes CSS variables
```

Install dependencies:
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @tanstack/react-query
npm install recharts
npm install axios
```

Add shadcn components you'll need upfront:
```bash
npx shadcn@latest add card table badge input button select scroll-area skeleton separator tooltip
```

Create folder structure:
```bash
mkdir -p app/\(auth\)/login app/\(auth\)/signup app/\(app\)/dashboard
mkdir -p app/\(app\)/transactions app/\(app\)/chat
mkdir -p app/\(app\)/settings/profile app/\(app\)/settings/accounts
mkdir -p app/api/auth/callback
mkdir -p components/layout components/dashboard components/transactions
mkdir -p components/chat components/settings
mkdir -p lib/supabase hooks types constants
```

**`lib/supabase/client.ts`:**
```typescript
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
```

**`lib/supabase/server.ts`:**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
}
```

**`middleware.ts`** (root of frontend):
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Refresh session + protect /app routes
  // Redirect unauthenticated users to /login
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**`app/api/auth/callback/route.ts`:**
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Exchange code for session
  // Redirect to /dashboard
}
```

**`types/index.ts`** — define your core interfaces:
```typescript
export interface Transaction { id, merchant_name, amount, category, date, account_id }
export interface Account { id, name, type, institution, balance }
export interface ChatMessage { id, role, content, created_at }
export interface MonthlySummary { total_spent, transaction_count, top_category, mom_change }
```

**`constants/categories.ts`:**
```typescript
export const CATEGORY_CONFIG = {
  'Food & Dining':    { color: '#F97316', bg: 'bg-orange-100',  text: 'text-orange-700' },
  'Transportation':   { color: '#3B82F6', bg: 'bg-blue-100',    text: 'text-blue-700'   },
  'Shopping':         { color: '#8B5CF6', bg: 'bg-purple-100',  text: 'text-purple-700' },
  'Subscriptions':    { color: '#14B8A6', bg: 'bg-teal-100',    text: 'text-teal-700'   },
  'Entertainment':    { color: '#EC4899', bg: 'bg-pink-100',    text: 'text-pink-700'   },
  'Health':           { color: '#22C55E', bg: 'bg-green-100',   text: 'text-green-700'  },
  'Gas':              { color: '#EAB308', bg: 'bg-yellow-100',  text: 'text-yellow-700' },
  'Income':           { color: '#10B981', bg: 'bg-emerald-100', text: 'text-emerald-700'},
} as const
```

**`lib/utils.ts`:**
```typescript
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs) => twMerge(clsx(inputs))
export const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
export const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
```

Set up `QueryClientProvider` in `app/layout.tsx`.

Verify frontend starts:
```bash
npm run dev
# http://localhost:3000 → loads without errors
```

**✅ Phase 1 Complete — both servers running, DB seeded, end-to-end verified.**

---

## Phase 2 — Core Features

### Step 7 — Auth Pages (~30 min)

Build `(auth)/login/page.tsx` and `(auth)/signup/page.tsx`:
- Email + password inputs using shadcn `Input` and `Button`
- Call `supabase.auth.signInWithPassword()` / `supabase.auth.signUp()`
- On success → redirect to `/dashboard`
- On error → show inline error message
- Link between login ↔ signup pages
- Centered card layout via `(auth)/layout.tsx`

Build `hooks/useAuth.ts`:
```typescript
export function useAuth() {
  // Returns: user, session, signOut, loading
  // Listens to supabase.auth.onAuthStateChange
}
```

---

### Step 8 — Transaction API Endpoints (~45 min)

**`app/schemas/transaction.py`:**
```python
class TransactionRead(BaseModel):
    id: UUID
    merchant_name: str
    amount: Decimal
    category: str
    date: date
    account_id: UUID

class TransactionFilter(BaseModel):
    category: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 10

class MonthlySummary(BaseModel):
    total_spent: Decimal
    transaction_count: int
    top_category: str
    mom_change_pct: float
```

**`app/services/transaction_service.py`** — implement:
- `get_transactions(db, user_id, filters)` → paginated list
- `get_monthly_summary(db, user_id, month)` → MonthlySummary
- `get_spending_by_category(db, user_id, month)` → dict
- `get_monthly_totals(db, user_id, months=6)` → list for bar chart
- `get_top_merchants(db, user_id, month, limit)` → list
- `compare_months(db, user_id, month_a, month_b)` → delta dict
- `detect_subscriptions(db, user_id)` → list
- `get_anomalies(db, user_id, z_score_threshold)` → list

**`app/routers/transactions.py`** — wire up:
```
GET  /transactions          → get_transactions (with filter query params)
GET  /transactions/summary  → get_monthly_summary
GET  /transactions/categories → get_spending_by_category
GET  /transactions/monthly  → get_monthly_totals (for chart)
```

**`app/dependencies.py`** — implement `get_current_user()`:
```python
async def get_current_user(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db)
) -> Profile:
    # Verify Supabase JWT
    # Return profile or raise 401
```

Test all endpoints with a REST client before moving to frontend.

---

### Step 9 — Dashboard Page (~1.5 hrs)

**`lib/api.ts`** — typed fetch wrapper:
```typescript
const api = {
  transactions: {
    list: (filters?) => fetch('/transactions', ...),
    summary: (month?) => fetch('/transactions/summary', ...),
    categories: (month?) => fetch('/transactions/categories', ...),
    monthly: () => fetch('/transactions/monthly', ...),
  }
}
```

**`hooks/useTransactions.ts`** — TanStack Query:
```typescript
export function useMonthlySummary(month: string) {
  return useQuery({ queryKey: ['summary', month], queryFn: () => api.transactions.summary(month) })
}
// similar hooks for categories, monthly totals, transaction list
```

Build components in this order:
1. `StatCard.tsx` — accepts `title`, `value`, `subtitle`, optional `trend` prop
2. `SpendingChart.tsx` — Recharts `BarChart` from monthly totals
3. `CategoryDonut.tsx` — Recharts `PieChart` with category colors from constants
4. `RecentTransactions.tsx` — table of last 10 transactions with `Badge` per category
5. `InsightCard.tsx` — skeleton state → fetches `/agent/insight` on mount → renders text

Wire up `(app)/dashboard/page.tsx` — compose all components, handle loading states with `Skeleton`.

---

### Step 10 — Transactions Page (~45 min)

Build `FilterBar.tsx`:
- Category `Select` dropdown from `CATEGORY_CONFIG` keys
- Date range — two `Input type="date"` fields (shadcn DateRangePicker if time allows)
- Merchant search `Input` with 300ms debounce

Build `TransactionTable.tsx`:
- Full transaction list from `useTransactions` hook
- Apply filters as query params
- Amount column: green for income, red/muted for expenses
- Category `Badge` using colors from `CATEGORY_CONFIG`
- Simple pagination controls (prev/next, page X of Y)

Wire up `(app)/transactions/page.tsx`.

---

### Step 11 — LangChain Agent Setup (~1 hr)

**`app/agent/prompts.py`:**
```python
SYSTEM_PROMPT = """
You are Spendly's financial AI assistant. You have access to tools that query
the user's real transaction data. When answering questions:
- Always use tools to fetch real data rather than guessing
- Chain multiple tools when a question requires it
- Be concise and specific — include actual numbers
- Flag anything unusual proactively
- Format dollar amounts clearly

Current date: {current_date}
User: {user_name}
"""
```

**`app/agent/tools.py`** — implement all 7 tools, each calling the corresponding `transaction_service` function. Each tool must have:
- Clear docstring (this is what the LLM reads to decide when to use it)
- Pydantic input schema via `args_schema`
- Type hints on all parameters and return value
- Error handling that returns a descriptive string on failure

**`app/agent/executor.py`:**
```python
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from app.agent.tools import get_all_tools
from app.agent.prompts import SYSTEM_PROMPT

def create_executor(model: str = "gemini-3.1-flash") -> AgentExecutor:
    llm = ChatGoogleGenerativeAI(
        model=model,
        temperature=0,
        streaming=True,
        google_api_key=settings.google_api_key
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])
    tools = get_all_tools()
    agent = create_tool_calling_agent(llm, tools, prompt)
    return AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=True,        # logs reasoning steps — great for demo
        max_iterations=8,
        handle_parsing_errors=True
    )
```

Test the executor directly in a Python shell before wiring to FastAPI:
```python
executor = create_executor()
result = executor.invoke({"input": "How much did I spend on food last month?"})
print(result["output"])
# Verify it calls 1-2 tools and returns a real answer
```

**✅ Phase 2 Complete — dashboard live, transactions page live, agent working in Python.**

---

## Phase 3 — Agentic Layer + Polish

### Step 12 — Chat API + Streaming (~1 hr)

**`app/routers/agent.py`** — three endpoints:

`POST /agent/chat` — streaming SSE:
```python
from fastapi.responses import StreamingResponse

@router.post("/chat")
async def chat(req: ChatRequest, user = Depends(get_current_user)):
    async def stream():
        executor = create_executor("gemini-3.1-flash")
        async for chunk in executor.astream({"input": req.message}):
            if "output" in chunk:
                yield f"data: {chunk['output']}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(stream(), media_type="text/event-stream")
```

`GET /agent/insight` — auto dashboard insight:
```python
@router.get("/insight")
async def get_insight(user = Depends(get_current_user)):
    # Single LLM call (no agent needed) — summarize this month in 3-4 sentences
    # Use gemini-3.1-flash, inject pre-fetched summary data as context
```

`POST /agent/analyze` — full autonomous analysis:
```python
@router.post("/analyze")
async def analyze(user = Depends(get_current_user)):
    executor = create_executor("gemini-3.1-pro-preview")  # use Pro for full analysis
    result = await executor.ainvoke({"input": FULL_ANALYSIS_PROMPT})
    # Parse structured report from result["output"]
    return result
```

---

### Step 13 — Chat Frontend (~45 min)

**`hooks/useChat.ts`** — SSE stream handler:
```typescript
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)

  const sendMessage = async (content: string) => {
    // Add user message immediately
    // Open EventSource to /agent/chat
    // Append tokens to last assistant message as they arrive
    // On [DONE] → set streaming false
  }

  return { messages, streaming, sendMessage }
}
```

Build `ChatWindow.tsx` — composes `MessageBubble` + `SuggestedPrompts` + input bar. Key details:
- Input bar pinned to bottom with `position: sticky`
- Auto-scroll to bottom on new message
- Disable input while streaming
- Animated "thinking" indicator (3 pulsing dots) while `streaming === true`

Build `MessageBubble.tsx`:
- User: right-aligned, indigo background
- Assistant: left-aligned, warm gray card
- Streaming assistant message: render tokens as they arrive with a blinking cursor

Wire up `(app)/chat/page.tsx` — left context panel + right chat panel.

---

### Step 14 — Full Analysis Feature (~30 min)

Add "Run AI Analysis" button to dashboard — triggers `POST /agent/analyze`.

Build `AnalysisReport.tsx` — renders the structured report as a modal or expandable card with sections:
- Monthly Summary
- Top Categories
- Month-over-Month Changes
- Subscriptions Detected
- Anomalies Flagged
- Recommendations

Show loading state while analysis runs (this takes 10-20 seconds — add a progress message like "Analyzing your transactions...").

---

### Step 15 — Settings Pages (~20 min)

`settings/profile/page.tsx` — `ProfileForm.tsx`:
- Name and email fields (pre-populated from Supabase user)
- Save button calls `supabase.auth.updateUser()`
- Success toast on save

`settings/accounts/page.tsx` — `ConnectedAccounts.tsx`:
- List connected accounts with institution name, type, balance
- "Connect Bank Account" button → triggers Plaid Link (or shows "coming soon" if Plaid skipped)

---

### Step 16 — Polish (~30 min)

Global polish pass in this order:
- Add `Skeleton` to every component that fetches data
- Add `toast` notifications for: sign in, sign out, analysis complete, any errors
- Add empty states: no transactions → friendly message + icon
- Verify sidebar active state highlights current route
- Check all pages on a 13" laptop viewport — nothing overflowing
- Verify auth redirect works: `/dashboard` without session → `/login`

---

### Step 17 — Plaid Integration (~3 hrs)

1. Create Plaid account at dashboard.plaid.com → get sandbox keys
2. Add keys to `.env`
3. Implement `app/services/plaid_service.py`:
   - `create_link_token(user_id)` → Plaid `link_token_create`
   - `exchange_token(public_token)` → `item_public_token_exchange` → store `access_token`
   - `sync_transactions(access_token, user_id)` → `transactions_get` → upsert to DB
4. Wire up `app/routers/plaid.py`
5. Add Plaid Link UI to `ConnectedAccounts.tsx`:
   - Call `/plaid/create-link-token` on button click
   - Initialize `PlaidLink` with the token
   - On success send `public_token` to `/plaid/exchange-token`
   - Call `/plaid/sync` → refresh dashboard data

Sandbox test credentials:
- Institution: Chase (`ins_109508`)
- Username: `user_good` / Password: `pass_good`

---
