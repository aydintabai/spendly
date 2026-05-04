from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.db.session import engine
from app.routers.accounts import router as accounts_router
from app.routers.agent import router as agent_router
from app.routers.auth import router as auth_router
from app.routers.plaid import router as plaid_router
from app.routers.transactions import router as transactions_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    yield
    await engine.dispose()


app = FastAPI(title="Spendly API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(accounts_router)
app.include_router(plaid_router)
app.include_router(transactions_router)
app.include_router(agent_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
