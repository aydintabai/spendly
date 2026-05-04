import uuid
from datetime import date
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.transaction import (
    VALID_CATEGORIES,
    CategoryBreakdown,
    MonthlySummary,
    TransactionCreate,
    TransactionFilter,
)


# ---------------------------------------------------------------------------
# TransactionCreate — category validation
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("category", sorted(VALID_CATEGORIES))
def test_transaction_create_valid_categories(category):
    txn = TransactionCreate(
        merchant_name="Test",
        amount=Decimal("10.00"),
        category=category,
        date=date(2024, 3, 1),
    )
    assert txn.category == category


def test_transaction_create_invalid_category_raises():
    with pytest.raises(ValidationError) as exc_info:
        TransactionCreate(
            merchant_name="Test",
            amount=Decimal("10.00"),
            category="Groceries",
            date=date(2024, 3, 1),
        )
    assert "category" in str(exc_info.value).lower() or "Groceries" in str(exc_info.value)


def test_transaction_create_empty_category_raises():
    with pytest.raises(ValidationError):
        TransactionCreate(
            merchant_name="Test",
            amount=Decimal("10.00"),
            category="",
            date=date(2024, 3, 1),
        )


def test_transaction_create_defaults():
    txn = TransactionCreate(
        merchant_name="Test",
        amount=Decimal("10.00"),
        category="Other",
        date=date(2024, 3, 1),
    )
    assert txn.pending is False
    assert txn.currency_code == "USD"
    assert txn.note is None
    assert txn.account_id is None


def test_transaction_create_missing_merchant_name_raises():
    with pytest.raises(ValidationError):
        TransactionCreate(
            amount=Decimal("10.00"),
            category="Other",
            date=date(2024, 3, 1),
        )


def test_transaction_create_missing_amount_raises():
    with pytest.raises(ValidationError):
        TransactionCreate(
            merchant_name="Test",
            category="Other",
            date=date(2024, 3, 1),
        )


def test_transaction_create_missing_date_raises():
    with pytest.raises(ValidationError):
        TransactionCreate(
            merchant_name="Test",
            amount=Decimal("10.00"),
            category="Other",
        )


def test_transaction_create_missing_category_raises():
    with pytest.raises(ValidationError):
        TransactionCreate(
            merchant_name="Test",
            amount=Decimal("10.00"),
            date=date(2024, 3, 1),
        )


# ---------------------------------------------------------------------------
# TransactionFilter — defaults and pagination
# ---------------------------------------------------------------------------


def test_transaction_filter_defaults():
    f = TransactionFilter()
    assert f.page == 1
    assert f.page_size == 20
    assert f.category is None
    assert f.start_date is None
    assert f.end_date is None
    assert f.search is None
    assert f.account_id is None
    assert f.pending is None


def test_transaction_filter_custom_pagination():
    f = TransactionFilter(page=3, page_size=50)
    assert f.page == 3
    assert f.page_size == 50


def test_transaction_filter_partial_dates():
    f = TransactionFilter(start_date=date(2024, 1, 1))
    assert f.start_date == date(2024, 1, 1)
    assert f.end_date is None


# ---------------------------------------------------------------------------
# MonthlySummary — optional fields allowed
# ---------------------------------------------------------------------------


def test_monthly_summary_none_fields_allowed():
    s = MonthlySummary(
        month="2024-03",
        total_spent=Decimal("0"),
        total_income=Decimal("0"),
        transaction_count=0,
        top_category=None,
        mom_change_pct=None,
    )
    assert s.top_category is None
    assert s.mom_change_pct is None


# ---------------------------------------------------------------------------
# CategoryBreakdown — field correctness
# ---------------------------------------------------------------------------


def test_category_breakdown_fields():
    b = CategoryBreakdown(
        category="Shopping",
        total=Decimal("150.00"),
        transaction_count=5,
        percentage=37.5,
    )
    assert b.category == "Shopping"
    assert b.total == Decimal("150.00")
    assert b.transaction_count == 5
    assert b.percentage == pytest.approx(37.5)
