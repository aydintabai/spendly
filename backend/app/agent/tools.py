import uuid
from typing import Any

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from app.db.session import AsyncSessionLocal
from app.services import transaction_service


class SpendingSummaryInput(BaseModel):
    month: str = Field(description="Month in YYYY-MM format, e.g. '2026-05'")


class CategoryInput(BaseModel):
    month: str = Field(description="Month in YYYY-MM format, e.g. '2026-05'")


class TopMerchantsInput(BaseModel):
    month: str = Field(description="Month in YYYY-MM format, e.g. '2026-05'")
    limit: int = Field(default=5, description="Number of top merchants to return (1–20)")


class CompareMonthsInput(BaseModel):
    month_a: str = Field(description="Earlier month in YYYY-MM format")
    month_b: str = Field(description="Later month in YYYY-MM format")


class MonthlyTrendsInput(BaseModel):
    months: int = Field(default=6, description="Number of past months to include (1–24)")


class AnomaliesInput(BaseModel):
    z_score_threshold: float = Field(
        default=2.0,
        description="Z-score cutoff; higher values return only more extreme outliers",
    )


class RecentTransactionsInput(BaseModel):
    limit: int = Field(default=10, description="Number of recent transactions to return (1–50)")
    category: str | None = Field(default=None, description="Optional category filter, e.g. 'Food & Dining'")


class EmptyInput(BaseModel):
    pass


def create_tools(user_id: uuid.UUID) -> list[StructuredTool]:
    async def _get_spending_summary(month: str) -> dict[str, Any]:
        try:
            async with AsyncSessionLocal() as db:
                result = await transaction_service.get_monthly_summary(db, user_id, month)
                return result.model_dump(mode="json")
        except (ValueError, Exception) as e:
            return {"error": str(e)}

    async def _get_spending_by_category(month: str) -> list[dict[str, Any]] | dict[str, Any]:
        try:
            async with AsyncSessionLocal() as db:
                results = await transaction_service.get_spending_by_category(db, user_id, month)
                return [r.model_dump(mode="json") for r in results]
        except (ValueError, Exception) as e:
            return {"error": str(e)}

    async def _get_top_merchants(month: str, limit: int = 5) -> list[dict[str, Any]] | dict[str, Any]:
        try:
            async with AsyncSessionLocal() as db:
                return await transaction_service.get_top_merchants(db, user_id, month, limit)
        except (ValueError, Exception) as e:
            return {"error": str(e)}

    async def _compare_months(month_a: str, month_b: str) -> dict[str, Any]:
        try:
            async with AsyncSessionLocal() as db:
                return await transaction_service.compare_months(db, user_id, month_a, month_b)
        except (ValueError, Exception) as e:
            return {"error": str(e)}

    async def _get_monthly_trends(months: int = 6) -> list[dict[str, Any]] | dict[str, Any]:
        try:
            async with AsyncSessionLocal() as db:
                return await transaction_service.get_monthly_totals(db, user_id, months)
        except (ValueError, Exception) as e:
            return {"error": str(e)}

    async def _detect_subscriptions() -> list[dict[str, Any]] | dict[str, Any]:
        try:
            async with AsyncSessionLocal() as db:
                return await transaction_service.detect_subscriptions(db, user_id)
        except Exception as e:
            return {"error": str(e)}

    async def _get_spending_anomalies(z_score_threshold: float = 2.0) -> list[dict[str, Any]] | dict[str, Any]:
        try:
            async with AsyncSessionLocal() as db:
                return await transaction_service.get_anomalies(db, user_id, z_score_threshold)
        except Exception as e:
            return {"error": str(e)}

    async def _get_recent_transactions(limit: int = 10, category: str | None = None) -> list[dict[str, Any]] | dict[str, Any]:
        try:
            async with AsyncSessionLocal() as db:
                return await transaction_service.get_recent_transactions(db, user_id, limit, category)
        except Exception as e:
            return {"error": str(e)}

    return [
        StructuredTool.from_function(
            coroutine=_get_spending_summary,
            name="get_spending_summary",
            description=(
                "Get a monthly spending summary: total spent, total income, transaction count, "
                "top spending category, and month-over-month change percentage. "
                "Use this to answer questions like 'how much did I spend in April?' or 'what was my income last month?'"
            ),
            args_schema=SpendingSummaryInput,
        ),
        StructuredTool.from_function(
            coroutine=_get_spending_by_category,
            name="get_spending_by_category",
            description=(
                "Get spending broken down by category for a given month. "
                "Returns each category with total amount, transaction count, and percentage of total spending. "
                "Use for questions like 'where did my money go?' or 'how much did I spend on food?'"
            ),
            args_schema=CategoryInput,
        ),
        StructuredTool.from_function(
            coroutine=_get_top_merchants,
            name="get_top_merchants",
            description=(
                "Get the top merchants by total spending for a given month. "
                "Use for questions like 'where did I spend the most?' or 'what stores did I shop at?'"
            ),
            args_schema=TopMerchantsInput,
        ),
        StructuredTool.from_function(
            coroutine=_compare_months,
            name="compare_months",
            description=(
                "Compare total spending and category breakdown between two months. "
                "Returns delta amounts and percentage change. "
                "Use for questions like 'did I spend more this month than last?' or 'how has my spending changed?'"
            ),
            args_schema=CompareMonthsInput,
        ),
        StructuredTool.from_function(
            coroutine=_get_monthly_trends,
            name="get_monthly_trends",
            description=(
                "Get monthly spending and income totals over the past N months. "
                "Use for trend questions like 'show me my spending over the last 6 months' or 'am I spending more over time?'"
            ),
            args_schema=MonthlyTrendsInput,
        ),
        StructuredTool.from_function(
            coroutine=_detect_subscriptions,
            name="detect_subscriptions",
            description=(
                "Detect recurring charges that appear across 3 or more consecutive months with similar amounts. "
                "Returns merchant name, estimated monthly cost, and last seen date. "
                "Use for questions about subscriptions, recurring payments, or monthly charges."
            ),
            args_schema=EmptyInput,
        ),
        StructuredTool.from_function(
            coroutine=_get_spending_anomalies,
            name="get_spending_anomalies",
            description=(
                "Find unusually large transactions using statistical z-score analysis per spending category. "
                "Returns flagged transactions with their z-score (higher = more unusual). "
                "Use for questions about unexpected charges, outliers, or suspicious spending."
            ),
            args_schema=AnomaliesInput,
        ),
        StructuredTool.from_function(
            coroutine=_get_recent_transactions,
            name="get_recent_transactions",
            description=(
                "Get the most recent transactions, optionally filtered by category. "
                "Use for questions like 'what did I buy recently?' or 'show me my last food purchases.'"
            ),
            args_schema=RecentTransactionsInput,
        ),
    ]
