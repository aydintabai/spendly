# Spendly — Product Requirements Document

## 1. Overview

### 1.1 Product Summary
Spendly is an AI-powered personal finance dashboard that lets users connect their bank accounts and interact with their spending data through natural language. The core differentiator is a LangChain-powered agentic layer that can autonomously reason over financial data, chain multiple tool calls, and surface insights without explicit user prompting.

### 1.2 Problem Statement
Most personal finance tools show you data passively — charts and tables you have to interpret yourself. Spendly treats your financial data as something you can *converse with*, and an agent that can proactively surface what matters.

### 1.3 Target User
A single authenticated user (demo context: the developer). Built for a recruiter demo showcasing full-stack + AI engineering ability.

### 1.4 Success Criteria
- Clean, working demo deployable locally by Monday noon
- Agentic AI layer demonstrably chains 2+ tool calls autonomously
- Interviewer can understand the product in under 60 seconds without technical context
- Developer can confidently explain every architectural decision

---

## 2. Tech Stack

### 2.1 Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Component Library | shadcn/ui |
| Charts | Recharts |
| Auth Client | Supabase JS |
| HTTP Client | fetch / Axios |

### 2.2 Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI (Python) |
| Package Manager | uv |
| ORM | SQLAlchemy (async) |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Database | Supabase (PostgreSQL) |
| Bank Data | Plaid Python SDK (sandbox) |
| Server | Uvicorn |

### 2.3 AI / Agentic Layer
| Layer | Technology |
|---|---|
| LLM | Google Gemini (`gemini-3.1-flash` for speed, `gemini-3.1-pro-preview` for analysis) |
| Agent Framework | LangChain (`create_tool_calling_agent` + `AgentExecutor`) |
| LangChain Integration | `langchain-google-genai` |
| Tool Pattern | `@tool` decorator with Pydantic schemas |
| Streaming | LangChain streaming callbacks → FastAPI `StreamingResponse` |

### 2.4 Infrastructure
| Layer | Technology |
|---|---|
| Database | Supabase (hosted PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Environment | python-dotenv / Next.js `.env.local` |
| Dev Server | Uvicorn (backend) + Next.js dev (frontend) |
| DB Connection | Session Pooler (IPv4 compatible) via `postgresql+asyncpg://` |

---

## 3. Architecture

### 3.1 High-Level Architecture
```
┌─────────────────────────────────────────┐
│           Next.js Frontend              │
│  Dashboard | Transactions | AI Chat     │
└──────────────┬──────────────────────────┘
               │ REST + SSE (streaming)
┌──────────────▼──────────────────────────┐
│           FastAPI Backend               │
│                                         │
│  ┌─────────────┐   ┌─────────────────┐  │
│  │   Routers   │   │   LangChain     │  │
│  │ /auth       │   │   Agent Layer   │  │
│  │ /transactions│  │                 │  │
│  │ /plaid      │   │  AgentExecutor  │  │
│  │ /agent      │   │  + Tools        │  │
│  └──────┬──────┘   └────────┬────────┘  │
│         │                   │           │
└─────────┼───────────────────┼───────────┘
          │                   │
┌─────────▼───────┐   ┌───────▼──────────┐
│  Supabase       │   │  Gemini API      │
│  PostgreSQL     │   │  gemini-3.1-flash│
│  + Auth         │   └──────────────────┘
└─────────────────┘
          ▲
┌─────────┴───────┐
│  Plaid API      │
│  (Sandbox)      │
└─────────────────┘
```

### 3.2 Agent Architecture
The LangChain agent follows the **ReAct (Reasoning + Acting)** pattern. On each invocation, it reasons about the user's request, decides which tools to call (and in what order), observes results, and chains further calls if needed before synthesizing a final response.

```
User Message
     │
     ▼
AgentExecutor
     │
     ├── Reasoning: "What does the user need?"
     │
     ├── Tool Call 1: get_spending_by_category(...)
     │        └── Returns: category breakdown
     │
     ├── Reasoning: "Should I dig deeper?"
     │
     ├── Tool Call 2: compare_months(...) [if needed]
     │        └── Returns: month-over-month delta
     │
     └── Synthesize → Stream response to frontend
```

### 3.3 Monorepo Structure
```
spendly/
├── backend/
│   ├── app/
│   │   ├── main.py                          # FastAPI app entry, middleware, CORS, lifespan
│   │   ├── config.py                        # Pydantic-settings — single source of env vars
│   │   ├── dependencies.py                  # Shared FastAPI deps: get_db(), get_current_user()
│   │   ├── routers/                         # HTTP layer only — no business logic
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── transactions.py
│   │   │   ├── plaid.py
│   │   │   └── agent.py
│   │   ├── services/                        # All business logic lives here
│   │   │   ├── __init__.py
│   │   │   ├── transaction_service.py       # Queries, aggregations, filters
│   │   │   ├── plaid_service.py             # Plaid API calls, token exchange, sync
│   │   │   └── insight_service.py           # Dashboard auto-insight generation
│   │   ├── agent/                           # Agentic layer — isolated from rest of app
│   │   │   ├── __init__.py
│   │   │   ├── executor.py                  # AgentExecutor + LLM factory
│   │   │   ├── tools.py                     # @tool definitions → delegate to services
│   │   │   └── prompts.py                   # System prompt constants
│   │   ├── models/                          # SQLAlchemy ORM models (DB shape)
│   │   │   ├── __init__.py                  # Re-export all models for Alembic discovery
│   │   │   ├── base.py                      # DeclarativeBase + shared TimestampMixin
│   │   │   ├── transaction.py
│   │   │   ├── account.py
│   │   │   ├── profile.py
│   │   │   └── chat_message.py
│   │   ├── schemas/                         # Pydantic v2 schemas (API contracts)
│   │   │   ├── __init__.py
│   │   │   ├── transaction.py               # TransactionCreate, TransactionRead, TransactionFilter
│   │   │   ├── account.py                   # AccountRead
│   │   │   ├── agent.py                     # ChatRequest, ChatResponse, AnalysisReport
│   │   │   ├── plaid.py                     # LinkTokenResponse, ExchangeTokenRequest
│   │   │   └── common.py                    # PaginatedResponse, ErrorResponse
│   │   └── db/
│   │       └── session.py                   # Async engine, SessionLocal, get_db()
│   ├── alembic/
│   │   ├── versions/
│   │   └── env.py
│   ├── tests/                               # Pytest — at minimum test agent tools
│   │   ├── test_transaction_service.py
│   │   └── test_tools.py
│   ├── pyproject.toml                       # uv managed — includes [tool.ruff] config
│   ├── .python-version                      # Pin Python version for uv
│   └── .env
├── frontend/
│   ├── app/
│   │   ├── (auth)/                          # Route group — centered card layout, no sidebar
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (app)/                           # Route group — protected, sidebar shell
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── transactions/page.tsx
│   │   │   ├── chat/page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx                 # Redirects → /settings/profile
│   │   │   │   ├── profile/page.tsx
│   │   │   │   └── accounts/page.tsx        # Plaid connect + connected accounts
│   │   │   └── layout.tsx                   # Sidebar + topbar shell
│   │   ├── api/                             # Next.js Route Handlers (API routes)
│   │   │   └── auth/
│   │   │       └── callback/route.ts        # Supabase OAuth callback handler
│   │   ├── layout.tsx                       # Root layout — fonts, QueryClientProvider
│   │   └── page.tsx                         # Root → redirect /dashboard or /login
│   ├── components/
│   │   ├── ui/                              # shadcn/ui — never edit directly
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Topbar.tsx
│   │   ├── dashboard/
│   │   │   ├── StatCard.tsx
│   │   │   ├── SpendingChart.tsx
│   │   │   ├── CategoryDonut.tsx
│   │   │   ├── RecentTransactions.tsx
│   │   │   └── InsightCard.tsx
│   │   ├── transactions/
│   │   │   ├── TransactionTable.tsx
│   │   │   └── FilterBar.tsx
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   └── SuggestedPrompts.tsx
│   │   └── settings/
│   │       ├── ProfileForm.tsx
│   │       └── ConnectedAccounts.tsx
│   ├── lib/
│   │   ├── api.ts                           # Typed backend API client (fetch wrapper)
│   │   ├── supabase/
│   │   │   ├── client.ts                    # Browser Supabase client (singleton)
│   │   │   └── server.ts                    # Server Supabase client (for middleware/RSC)
│   │   └── utils.ts                         # cn(), formatCurrency(), formatDate()
│   ├── hooks/
│   │   ├── useTransactions.ts               # TanStack Query — fetch + filter state
│   │   ├── useAuth.ts                       # Session, user, signOut
│   │   └── useChat.ts                       # SSE stream handler + message state
│   ├── types/
│   │   └── index.ts                         # Shared TS interfaces (Transaction, Account, etc.)
│   ├── constants/
│   │   └── categories.ts                    # Category labels, colors, icons — single source
│   ├── middleware.ts                         # Supabase session refresh + route protection
│   └── .env.local
├── .gitignore
├── .env.example                             # Committed — documents required env vars
└── README.md
```

---

## 4. Database Schema

### 4.1 Tables

**users** (managed by Supabase Auth — extend with profile table)
```sql
profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users,
  email       TEXT,
  full_name   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
)
```

**accounts**
```sql
accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id),
  plaid_account_id TEXT,
  name            TEXT NOT NULL,          -- e.g. "Chase Checking"
  type            TEXT NOT NULL,          -- checking, savings, credit
  institution     TEXT,
  balance         NUMERIC(12,2),
  created_at      TIMESTAMPTZ DEFAULT NOW()
)
```

**transactions**
```sql
transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id),
  account_id      UUID REFERENCES accounts(id),
  plaid_txn_id    TEXT UNIQUE,            -- populated after Plaid sync
  merchant_name   TEXT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL, -- negative = expense
  category        TEXT NOT NULL,
  date            DATE NOT NULL,
  pending         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
)
```

**chat_messages**
```sql
chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id),
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
)
```

### 4.2 Categories (Enum)
`Food & Dining`, `Transportation`, `Shopping`, `Subscriptions`, `Entertainment`, `Health`, `Gas`, `Income`, `Other`

---

## 5. Feature Specifications

### 5.1 Authentication
- Supabase email/password auth
- Protected routes via middleware in Next.js
- JWT passed as Bearer token to FastAPI
- FastAPI validates JWT against Supabase public key

**Acceptance Criteria:**
- [ ] User can sign up and log in
- [ ] Unauthenticated users redirected to `/login`
- [ ] All API endpoints require valid JWT

---

### 5.2 Dashboard Page (`/dashboard`)

**Summary Stat Cards (4x)**
- Total Spent This Month
- Biggest Spending Category
- Transaction Count This Month
- Month-over-Month Change (% with color indicator)

**Charts**
- Bar chart: Monthly spending last 6 months (Recharts `BarChart`)
- Donut chart: Spending by category this month (Recharts `PieChart`)

**Recent Transactions**
- Last 10 transactions as a table
- Columns: Date, Merchant, Category (Badge), Amount

**AI Insight Card**
- Auto-generated on page load via `GET /agent/insight`
- 3-4 sentence narrative summary of this month's spending patterns
- Uses `gemini-3.1-flash` for speed
- Shows skeleton while loading

**Acceptance Criteria:**
- [ ] All cards populated from real DB data
- [ ] Charts render correctly with Plaid sandbox data
- [ ] AI insight card generates on load without user prompt
- [ ] Skeleton states shown during data fetch

---

### 5.3 Transactions Page (`/transactions`)

**Filter Bar**
- Date range picker (shadcn `DateRangePicker`)
- Category dropdown (shadcn `Select`)
- Merchant search (text input with debounce)
- Natural language filter input → text-to-query via agent (bonus)

**Transaction Table**
- Sortable columns: Date, Merchant, Amount
- Category badge with distinct color per category
- Positive amounts (income) in green, negative (expenses) in red/muted
- Pagination (10 per page)

**Acceptance Criteria:**
- [ ] Filters correctly narrow results
- [ ] Table handles 100+ rows without performance issues
- [ ] Empty state shown when no results match

---

### 5.4 AI Chat Page (`/chat`)

**Layout: Two-Panel**

*Left Panel — Context*
- Active account name and date range being analyzed
- 4 suggested prompt chips:
  - "How much did I spend on food last month?"
  - "What's my biggest recurring expense?"
  - "Compare this month vs last month"
  - "Any unusual transactions I should know about?"

*Right Panel — Chat Interface*
- User messages: right-aligned, accent color bubble
- Assistant messages: left-aligned, dark card with optional inline data tables
- Streaming token-by-token response (SSE)
- "Spendly is thinking..." indicator with animated dots
- Input bar pinned to bottom with send button + Enter to submit
- Chat history persisted to `chat_messages` table

**Acceptance Criteria:**
- [ ] Agent chains at least 2 tool calls for complex questions
- [ ] Responses stream in real time
- [ ] Suggested prompts populate input on click
- [ ] Chat history persists across page refreshes

---

### 5.5 Plaid Integration (Conditional — build if time permits)

**Flow:**
1. User clicks "Connect Bank" on dashboard
2. Frontend calls `POST /plaid/create-link-token` → receives `link_token`
3. Plaid Link UI opens in browser
4. On success, frontend sends `public_token` to `POST /plaid/exchange-token`
5. Backend exchanges for `access_token`, stores securely
6. `POST /plaid/sync` pulls transactions, normalizes, upserts to `transactions` table

**Plaid Sandbox Credentials:**
- Institution: `ins_109508` (Chase)
- Username: `user_good`
- Password: `pass_good`

**Acceptance Criteria:**
- [ ] Full OAuth flow completes without error
- [ ] Transactions appear in dashboard after sync
- [ ] Graceful empty state if Plaid not yet connected

---

### 5.6 Agentic Analysis Feature ("Run Full Analysis")

**Trigger:** Button on dashboard — "Run AI Analysis"

**Agent Behavior (autonomous, no further user input):**
1. Pull all transactions for current month
2. Calculate category breakdown
3. Compare to last month
4. Detect recurring subscriptions (same merchant, similar amount, recurring dates)
5. Flag anomalies (transactions > 2 standard deviations from category average)
6. Generate structured report

**Output Report Sections:**
- Monthly Summary
- Top Spending Categories
- Month-over-Month Changes
- Recurring Subscriptions Detected
- Anomalies / Flagged Transactions
- Recommendations (3 bullet points)

**Acceptance Criteria:**
- [ ] Agent autonomously chains all steps without user prompting
- [ ] Each reasoning step visible in backend logs (`verbose=True`)
- [ ] Report renders as formatted card on frontend
- [ ] Uses `gemini-3.1-pro-preview` for deeper reasoning quality

---

## 6. LangChain Agent — Tool Definitions

All tools defined with `@tool` decorator, Pydantic input schemas, and type hints.

```python
# tools.py

@tool
def get_spending_by_category(category: str, month: str) -> dict:
    """Get total spending for a specific category in a given month (YYYY-MM)."""

@tool
def get_monthly_summary(month: str) -> dict:
    """Get total spend, transaction count, and top merchants for a month (YYYY-MM)."""

@tool
def compare_months(month_a: str, month_b: str) -> dict:
    """Compare spending totals and category breakdown between two months."""

@tool
def get_top_merchants(limit: int, month: str) -> list:
    """Get the top N merchants by spend for a given month."""

@tool
def detect_subscriptions() -> list:
    """Scan all transactions and identify likely recurring subscriptions."""

@tool
def get_anomalies(z_score_threshold: float = 2.0) -> list:
    """Detect transactions that are statistical outliers within their category."""

@tool
def get_recent_transactions(limit: int = 10, category: str = None) -> list:
    """Get the most recent transactions, optionally filtered by category."""
```

### Agent Setup
```python
# executor.py
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash",       # swap to gemini-3.1-pro-preview for full analysis
    temperature=0,
    streaming=True
)

prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True, max_iterations=8)
```

---

## 7. API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/verify` | Verify Supabase JWT |

### Transactions
| Method | Endpoint | Description |
|---|---|---|
| GET | `/transactions` | List transactions (filterable) |
| GET | `/transactions/summary` | Monthly summary stats |
| GET | `/transactions/categories` | Spending by category |

### Plaid
| Method | Endpoint | Description |
|---|---|---|
| POST | `/plaid/create-link-token` | Init Plaid Link |
| POST | `/plaid/exchange-token` | Exchange public token |
| POST | `/plaid/sync` | Pull + upsert transactions |

### Agent
| Method | Endpoint | Description |
|---|---|---|
| POST | `/agent/chat` | Streaming chat (SSE) |
| GET | `/agent/insight` | Auto-generate dashboard insight |
| POST | `/agent/analyze` | Run full autonomous analysis |

---

## 8. UI/UX Specifications

### Color Palette

| Token | Value | Usage |
|---|---|---|
| `--bg-base` | `#faf9f6` | Page background |
| `--bg-surface` | `#f2ede6` | Sidebar background |
| `--bg-card` | `#ffffff` | Card backgrounds |
| `--bg-hover` | `#f0ebe3` | Hover states, context panels |
| `--border` | `rgba(28,28,30,0.08)` | Default card/table borders |
| `--border-md` | `rgba(28,28,30,0.14)` | Hover border states |
| `--text-1` | `#1c1c1e` | Primary text |
| `--text-2` | `#6b6560` | Secondary text, labels |
| `--text-3` | `#a09890` | Muted text, timestamps, monospace values |
| `--accent` | `#65a380` | Primary accent — buttons, active nav, links |
| `--accent-dim` | `rgba(101,163,128,0.1)` | Accent backgrounds, focus rings |
| `--accent-2` | `#a8a29e` | Secondary accent |
| `--green` | `#16a34a` | Income, positive trends |
| `--red` | `#dc2626` | Expenses, negative trends |
| `--radius` | `12px` | Card border radius |
| `--radius-sm` | `8px` | Input, button, badge border radius |

### Typography
- **Primary font**: DM Sans (weights: 300, 400, 500, 600, 700)
- **Monospace font**: DM Mono (weights: 400, 500) — used for all currency values, dates, percentages

### Category Badge Colors
| Category | Color | Background |
|---|---|---|
| Food & Dining | `#f97316` | `rgba(249,115,22,0.12)` |
| Transportation | `#3b82f6` | `rgba(59,130,246,0.12)` |
| Shopping | `#8b5cf6` | `rgba(139,92,246,0.12)` |
| Subscriptions | `#14b8a6` | `rgba(20,184,166,0.12)` |
| Entertainment | `#ec4899` | `rgba(236,72,153,0.12)` |
| Health | `#22c55e` | `rgba(34,197,94,0.12)` |
| Gas | `#eab308` | `rgba(234,179,8,0.12)` |
| Income | `#16a34a` | `rgba(22,163,74,0.12)` |

> All category colors are defined in `frontend/constants/categories.ts` — never hardcode inline.

### Component Library
shadcn/ui components: `Card`, `Table`, `Badge`, `Input`, `Button`, `Select`, `ScrollArea`, `Skeleton`, `Separator`, `Tooltip`

---

## 9. Build Roadmap

### Phase 1 — Skeleton
- [ ] Monorepo setup with uv + Next.js
- [ ] Supabase project + schema migration
- [ ] FastAPI scaffold with `/health`
- [ ] Next.js auth pages + Supabase client
- [ ] Verify end-to-end connectivity

### Phase 2 — Core Features
- [ ] Transaction API endpoints
- [ ] Dashboard page with stat cards + charts
- [ ] Transactions page with filters
- [ ] LangChain agent setup with 3 core tools
- [ ] Basic chat endpoint (non-streaming first)

### Phase 3 — Agentic Layer + Polish
- [ ] Streaming SSE from agent to frontend
- [ ] All 7 tools implemented
- [ ] "Run Full Analysis" feature
- [ ] AI Insight card on dashboard
- [ ] UI polish: skeletons, toasts, empty states

---

## 10. AI Usage Documentation
*(For interview — document as you build)*

| Area | AI Used For | What Was Accepted | What Was Changed |
|---|---|---|---|
| DB Schema | Generated initial schema | accounts/transactions structure | Added plaid_txn_id, adjusted types |
| Tool Definitions | Generated @tool stubs | Function signatures | Wrote actual query logic manually |
| Frontend Components | Generated StatCard, ChatWindow | Layout and Tailwind classes | Color tokens, streaming logic |

---

## 11. Out of Scope (v1)
- Deployment / hosting
- Testing suite
- Multi-user support
- Budget alerts / push notifications
- Mobile responsive (nice to have, not required)
- Docker / containerization