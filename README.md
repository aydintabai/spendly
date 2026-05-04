# Spendly 💸

An AI-powered personal finance dashboard that lets you chat with your spending data in natural language. Built with a LangChain agentic layer that autonomously chains tool calls to reason over your real transaction data.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=flat&logo=next.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=flat&logo=langchain&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)

---

## Overview

Spendly connects to your bank accounts via Plaid and gives you an AI assistant that can answer questions like:

- *"How much did I spend on food last month?"*
- *"Compare my spending this month vs last month"*
- *"What are my recurring subscriptions?"*
- *"Any unusual transactions I should know about?"*

The AI agent doesn't just look up a single answer — it chains multiple database queries autonomously using LangChain's ReAct pattern, reasons over the results, and synthesizes a coherent response. It can also run a full autonomous financial analysis with zero prompting.

---

## Features

- **AI Chat** — Natural language interface over your real transaction data, powered by Google Gemini and LangChain tool-calling agents
- **Autonomous Analysis** — One-click full financial analysis: the agent independently scans transactions, detects subscriptions, flags anomalies, and generates recommendations
- **Dashboard** — Spending summary cards, monthly bar chart, category donut chart, and an AI-generated insight card that auto-populates on load
- **Transactions** — Full transaction history with category, date range, and merchant filtering
- **Plaid Integration** — Connect real bank accounts via Plaid Link (sandbox mode)
- **Streaming Responses** — Token-by-token streaming from the agent to the frontend via SSE
- **Auth** — Supabase email/password authentication with protected routes

---

## Tech Stack

### Frontend
| | |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Charts | Recharts |
| Data Fetching | TanStack Query |
| Auth Client | Supabase JS + SSR |

### Backend
| | |
|---|---|
| Framework | FastAPI |
| Language | Python 3.12 |
| Package Manager | uv |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Server | Uvicorn |

### AI / Agentic Layer
| | |
|---|---|
| LLM | Google Gemini (`gemini-3.1-flash` / `gemini-3.1-pro-preview`) |
| Agent Framework | LangChain (`create_tool_calling_agent` + `AgentExecutor`) |
| Pattern | ReAct (Reasoning + Acting) with 7 custom tools |
| Streaming | LangChain async streaming → FastAPI `StreamingResponse` |

### Infrastructure
| | |
|---|---|
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Bank Data | Plaid API (sandbox) |

---

## Project Structure

```
spendly/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entry, CORS, routers
│   │   ├── config.py               # Pydantic-settings config
│   │   ├── dependencies.py         # Shared FastAPI deps (auth, db)
│   │   ├── routers/                # HTTP layer — thin, delegates to services
│   │   ├── services/               # Business logic — queries, aggregations
│   │   ├── agent/                  # LangChain agent, tools, prompts
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   └── db/                     # Session factory
│   ├── alembic/                    # DB migrations
│   ├── tests/
│   └── pyproject.toml
├── frontend/
│   ├── app/
│   │   ├── (auth)/                 # Login, signup — centered layout
│   │   ├── (app)/                  # Protected routes — sidebar layout
│   │   │   ├── dashboard/
│   │   │   ├── transactions/
│   │   │   ├── chat/
│   │   │   └── settings/
│   │   └── api/auth/callback/      # Supabase OAuth callback
│   ├── components/                 # UI components by feature
│   ├── hooks/                      # useAuth, useTransactions, useChat
│   ├── lib/                        # API client, Supabase clients, utils
│   ├── types/                      # Shared TypeScript interfaces
│   ├── constants/                  # Category colors, labels
│   └── middleware.ts               # Route protection + session refresh
└── .env.example
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.12+
- [uv](https://docs.astral.sh/uv/) installed (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- Supabase account
- Google AI Studio API key
- Plaid account (required for transaction data — use sandbox credentials)

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/spendly.git
cd spendly
```

### 2. Environment variables
```bash
cp .env.example backend/.env
cp .env.example frontend/.env.local
```

Fill in the required values (see [Environment Variables](#environment-variables) below).

### 3. Backend setup
```bash
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

### 4. Frontend setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`

---

## Environment Variables

### Backend (`backend/.env`)
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key
DATABASE_URL=postgresql+asyncpg://postgres:password@db.your-project.supabase.co:5432/postgres

# Google Gemini
GOOGLE_API_KEY=your-google-ai-studio-key

# Plaid (optional)
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-sandbox-secret
PLAID_ENV=sandbox
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Agent Architecture

The LangChain agent follows the **ReAct (Reasoning + Acting)** pattern. On each user message, it:

1. Reasons about what data is needed to answer the question
2. Selects and calls one or more tools
3. Observes the result and decides whether to call more tools
4. Synthesizes a final response from all gathered data

### Available Tools

| Tool | Description |
|---|---|
| `get_spending_by_category` | Total spend for a category in a given month |
| `get_monthly_summary` | Total spend, transaction count, top merchants for a month |
| `compare_months` | Side-by-side spending comparison between two months |
| `get_top_merchants` | Top N merchants by spend for a given month |
| `detect_subscriptions` | Identify recurring charges across all transactions |
| `get_anomalies` | Flag transactions that are statistical outliers in their category |
| `get_recent_transactions` | Most recent transactions, optionally filtered by category |

### Model Strategy

- `gemini-3.1-flash` — used for chat and the dashboard insight card (low latency)
- `gemini-3.1-pro-preview` — used for the full autonomous analysis (deeper reasoning)

---

## API Endpoints

### Transactions
```
GET  /transactions              List transactions (category, date, search filters)
GET  /transactions/summary      Monthly summary stats
GET  /transactions/categories   Spending breakdown by category
GET  /transactions/monthly      Monthly totals for the last 6 months
```

### Agent
```
POST /agent/chat                Streaming SSE chat endpoint
GET  /agent/insight             Auto-generate dashboard insight card
POST /agent/analyze             Run full autonomous financial analysis
```

### Plaid
```
POST /plaid/create-link-token   Initialize Plaid Link
POST /plaid/exchange-token      Exchange public token for access token
POST /plaid/sync                Pull and sync transactions from Plaid
```

---

## Plaid Sandbox Testing

If you have Plaid configured, use these sandbox credentials in the Plaid Link UI:

```
Institution:  Chase (ins_109508)
Username:     user_good
Password:     pass_good
```

---

## What's Next

- [ ] Deploy to Vercel (frontend) + Railway (backend)
- [ ] Budget goal setting with AI-powered alerts
- [ ] Text-to-SQL natural language filter on transactions page
- [ ] Multi-account support
- [ ] Monthly email digest generated by agent
- [ ] Mobile responsive layout