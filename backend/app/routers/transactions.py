from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies import CurrentUser, DBSession
from app.schemas.common import PaginatedResponse
from app.schemas.transaction import (
    CategoryBreakdown,
    MonthlySummary,
    TransactionFilter,
    TransactionRead,
)
from app.services import transaction_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _current_month() -> str:
    return date.today().strftime("%Y-%m")


@router.get("", response_model=PaginatedResponse[TransactionRead])
async def list_transactions(
    db: DBSession,
    user: CurrentUser,
    filters: TransactionFilter = Depends(),
) -> PaginatedResponse[TransactionRead]:
    return await transaction_service.get_transactions(db, user.id, filters)


@router.get("/summary", response_model=MonthlySummary)
async def get_summary(
    db: DBSession,
    user: CurrentUser,
    month: str = Query(default_factory=_current_month),
) -> MonthlySummary:
    try:
        return await transaction_service.get_monthly_summary(db, user.id, month)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid month format. Expected YYYY-MM.",
        )


@router.get("/categories", response_model=list[CategoryBreakdown])
async def get_categories(
    db: DBSession,
    user: CurrentUser,
    month: str = Query(default_factory=_current_month),
) -> list[CategoryBreakdown]:
    try:
        return await transaction_service.get_spending_by_category(db, user.id, month)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid month format. Expected YYYY-MM.",
        )


@router.get("/monthly")
async def get_monthly_totals(
    db: DBSession,
    user: CurrentUser,
    months: int = Query(default=6, ge=1, le=24),
) -> list[dict[str, Any]]:
    return await transaction_service.get_monthly_totals(db, user.id, months)


@router.get("/top-merchants")
async def get_top_merchants(
    db: DBSession,
    user: CurrentUser,
    month: str = Query(default_factory=_current_month),
    limit: int = Query(default=5, ge=1, le=20),
) -> list[dict[str, Any]]:
    try:
        return await transaction_service.get_top_merchants(db, user.id, month, limit)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid month format. Expected YYYY-MM.",
        )


@router.get("/compare")
async def compare_months(
    db: DBSession,
    user: CurrentUser,
    month_a: str = Query(...),
    month_b: str = Query(...),
) -> dict[str, Any]:
    try:
        return await transaction_service.compare_months(db, user.id, month_a, month_b)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid month format. Expected YYYY-MM.",
        )
