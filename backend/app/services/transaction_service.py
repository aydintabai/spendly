import math
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.schemas.common import PaginatedResponse
from app.schemas.transaction import (
    CategoryBreakdown,
    MonthlySummary,
    TransactionFilter,
    TransactionRead,
)


def _parse_month(month: str) -> tuple[date, date]:
    """Return (first_day, exclusive_last_day) for a 'YYYY-MM' string.

    Raises ValueError on malformed input — callers (routers) convert to HTTP 422.
    The returned interval is half-open: [first_day, last_day).
    """
    dt = datetime.strptime(month, "%Y-%m")
    first_day = dt.date().replace(day=1)
    if first_day.month == 12:
        last_day = first_day.replace(year=first_day.year + 1, month=1)
    else:
        last_day = first_day.replace(month=first_day.month + 1)
    return first_day, last_day


def _months_ago(n: int) -> date:
    today = date.today()
    month = today.month - n
    year = today.year
    while month <= 0:
        month += 12
        year -= 1
    return date(year, month, 1)


async def get_transactions(
    db: AsyncSession,
    user_id: uuid.UUID,
    filters: TransactionFilter,
) -> PaginatedResponse[TransactionRead]:
    conditions: list = [Transaction.user_id == user_id]

    if filters.category is not None:
        conditions.append(Transaction.category == filters.category)
    if filters.start_date is not None:
        conditions.append(Transaction.date >= filters.start_date)
    if filters.end_date is not None:
        conditions.append(Transaction.date <= filters.end_date)
    if filters.search is not None:
        conditions.append(Transaction.merchant_name.ilike(f"%{filters.search}%"))
    if filters.account_id is not None:
        conditions.append(Transaction.account_id == filters.account_id)
    if filters.pending is not None:
        conditions.append(Transaction.pending == filters.pending)

    where = and_(*conditions)

    count_stmt = select(func.count()).select_from(Transaction).where(where)
    total: int = (await db.execute(count_stmt)).scalar_one()

    offset = (filters.page - 1) * filters.page_size
    data_stmt = (
        select(Transaction)
        .where(where)
        .order_by(Transaction.date.desc(), Transaction.created_at.desc())
        .offset(offset)
        .limit(filters.page_size)
    )
    rows = (await db.execute(data_stmt)).scalars().all()

    return PaginatedResponse(
        items=[TransactionRead.model_validate(r) for r in rows],
        total=total,
        page=filters.page,
        page_size=filters.page_size,
        total_pages=math.ceil(total / filters.page_size) if total > 0 else 1,
    )


async def get_monthly_summary(
    db: AsyncSession,
    user_id: uuid.UUID,
    month: str,
) -> MonthlySummary:
    first_day, last_day = _parse_month(month)

    month_filter = and_(
        Transaction.user_id == user_id,
        Transaction.date >= first_day,
        Transaction.date < last_day,
    )

    # Positive amount = expense, negative amount = income (Plaid convention)
    agg_stmt = select(
        func.coalesce(
            func.sum(Transaction.amount).filter(Transaction.amount > 0),
            Decimal("0.00"),
        ).label("total_spent"),
        func.coalesce(
            func.abs(func.sum(Transaction.amount).filter(Transaction.amount < 0)),
            Decimal("0.00"),
        ).label("total_income"),
        func.count(Transaction.id).label("transaction_count"),
    ).where(month_filter)
    agg_row = (await db.execute(agg_stmt)).one()

    top_cat_stmt = (
        select(Transaction.category)
        .where(
            and_(
                month_filter,
                Transaction.amount > 0,
                Transaction.category != "Income",
            )
        )
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(1)
    )
    top_cat_row = (await db.execute(top_cat_stmt)).first()
    top_category: str | None = top_cat_row[0] if top_cat_row else None

    # Compute prior month with year-rollover
    if first_day.month == 1:
        prior_first = first_day.replace(year=first_day.year - 1, month=12)
    else:
        prior_first = first_day.replace(month=first_day.month - 1)
    _, prior_last = _parse_month(prior_first.strftime("%Y-%m"))

    prior_stmt = select(
        func.coalesce(
            func.sum(Transaction.amount).filter(Transaction.amount > 0),
            Decimal("0.00"),
        )
    ).where(
        and_(
            Transaction.user_id == user_id,
            Transaction.date >= prior_first,
            Transaction.date < prior_last,
        )
    )
    prior_spent: Decimal = (await db.execute(prior_stmt)).scalar_one()

    if prior_spent == 0:
        mom_change_pct: float | None = None
    else:
        mom_change_pct = float((agg_row.total_spent - prior_spent) / prior_spent * 100)

    return MonthlySummary(
        month=month,
        total_spent=agg_row.total_spent,
        total_income=agg_row.total_income,
        transaction_count=agg_row.transaction_count,
        top_category=top_category,
        mom_change_pct=mom_change_pct,
    )


async def get_spending_by_category(
    db: AsyncSession,
    user_id: uuid.UUID,
    month: str,
) -> list[CategoryBreakdown]:
    first_day, last_day = _parse_month(month)

    stmt = (
        select(
            Transaction.category,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("transaction_count"),
        )
        .where(
            and_(
                Transaction.user_id == user_id,
                Transaction.date >= first_day,
                Transaction.date < last_day,
                Transaction.amount > 0,  # expenses only
            )
        )
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
    )
    rows = (await db.execute(stmt)).all()

    total_sum: Decimal = sum((row.total for row in rows), Decimal("0.00"))

    return [
        CategoryBreakdown(
            category=row.category,
            total=row.total,
            transaction_count=row.transaction_count,
            percentage=float(row.total / total_sum * 100) if total_sum > 0 else 0.0,
        )
        for row in rows
    ]


async def get_monthly_totals(
    db: AsyncSession,
    user_id: uuid.UUID,
    months: int = 6,
) -> list[dict[str, Any]]:
    # Returns only months that have data — sparse months are not padded with zeros
    month_label = func.to_char(func.date_trunc("month", Transaction.date), "YYYY-MM")
    month_trunc = func.date_trunc("month", Transaction.date)

    stmt = (
        select(
            month_label.label("month"),
            func.coalesce(
                func.sum(Transaction.amount).filter(Transaction.amount > 0),
                Decimal("0.00"),
            ).label("total_spent"),
            func.coalesce(
                func.abs(func.sum(Transaction.amount).filter(Transaction.amount < 0)),
                Decimal("0.00"),
            ).label("total_income"),
        )
        .where(
            and_(
                Transaction.user_id == user_id,
                Transaction.date >= _months_ago(months),
            )
        )
        .group_by(month_trunc)
        .order_by(month_trunc.asc())
    )
    rows = (await db.execute(stmt)).all()

    return [
        {
            "month": row.month,
            "total_spent": float(row.total_spent),
            "total_income": float(row.total_income),
        }
        for row in rows
    ]


async def get_top_merchants(
    db: AsyncSession,
    user_id: uuid.UUID,
    month: str,
    limit: int = 5,
) -> list[dict[str, Any]]:
    first_day, last_day = _parse_month(month)

    stmt = (
        select(
            Transaction.merchant_name,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("transaction_count"),
        )
        .where(
            and_(
                Transaction.user_id == user_id,
                Transaction.date >= first_day,
                Transaction.date < last_day,
                Transaction.amount > 0,  # expenses only
            )
        )
        .group_by(Transaction.merchant_name)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()

    return [
        {
            "merchant_name": row.merchant_name,
            "total": float(row.total),
            "transaction_count": row.transaction_count,
        }
        for row in rows
    ]


async def compare_months(
    db: AsyncSession,
    user_id: uuid.UUID,
    month_a: str,
    month_b: str,
) -> dict[str, Any]:
    """Compare spending between two months. delta = month_b - month_a (positive = month_b spent more)."""
    breakdown_a = await get_spending_by_category(db, user_id, month_a)
    breakdown_b = await get_spending_by_category(db, user_id, month_b)

    total_a: Decimal = sum((b.total for b in breakdown_a), Decimal("0.00"))
    total_b: Decimal = sum((b.total for b in breakdown_b), Decimal("0.00"))
    delta_amount: Decimal = total_b - total_a

    delta_pct: float | None = (
        float(delta_amount / total_a * 100) if total_a != 0 else None
    )

    return {
        "month_a": month_a,
        "month_b": month_b,
        "total_a": float(total_a),
        "total_b": float(total_b),
        "delta_amount": float(delta_amount),
        "delta_pct": delta_pct,
        "breakdown_a": [b.model_dump() for b in breakdown_a],
        "breakdown_b": [b.model_dump() for b in breakdown_b],
    }
