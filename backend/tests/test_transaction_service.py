import uuid
from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.services.transaction_service import (
    _parse_month,
    compare_months,
    detect_subscriptions,
    get_anomalies,
    get_monthly_summary,
    get_spending_by_category,
    get_transactions,
)
from app.schemas.transaction import CategoryBreakdown, TransactionFilter
from tests.conftest import make_result


# ---------------------------------------------------------------------------
# _parse_month
# ---------------------------------------------------------------------------


def test_parse_month_normal_month():
    start, end = _parse_month("2024-03")
    assert start == date(2024, 3, 1)
    assert end == date(2024, 4, 1)


def test_parse_month_december_wraps_year():
    start, end = _parse_month("2023-12")
    assert start == date(2023, 12, 1)
    assert end == date(2024, 1, 1)


def test_parse_month_january():
    start, end = _parse_month("2024-01")
    assert start == date(2024, 1, 1)
    assert end == date(2024, 2, 1)


def test_parse_month_invalid_format_raises():
    with pytest.raises(ValueError):
        _parse_month("2024/03")


def test_parse_month_invalid_month_number_raises():
    with pytest.raises(ValueError):
        _parse_month("2024-13")


# ---------------------------------------------------------------------------
# get_transactions
# ---------------------------------------------------------------------------


async def test_get_transactions_returns_paginated_response(db_session, make_transaction):
    txns = [make_transaction() for _ in range(3)]
    db_session.execute = AsyncMock(
        side_effect=[
            make_result(scalar_one=3),
            make_result(scalars_all=txns),
        ]
    )
    result = await get_transactions(db_session, uuid.uuid4(), TransactionFilter())
    assert result.total == 3
    assert result.page == 1
    assert result.page_size == 20
    assert result.total_pages == 1
    assert len(result.items) == 3


async def test_get_transactions_empty_result(db_session):
    db_session.execute = AsyncMock(
        side_effect=[
            make_result(scalar_one=0),
            make_result(scalars_all=[]),
        ]
    )
    result = await get_transactions(db_session, uuid.uuid4(), TransactionFilter())
    assert result.total == 0
    assert result.items == []
    assert result.total_pages == 1


async def test_get_transactions_pagination_math(db_session, make_transaction):
    txns = [make_transaction() for _ in range(20)]
    db_session.execute = AsyncMock(
        side_effect=[
            make_result(scalar_one=25),
            make_result(scalars_all=txns),
        ]
    )
    result = await get_transactions(db_session, uuid.uuid4(), TransactionFilter(page=1, page_size=20))
    assert result.total_pages == 2


# ---------------------------------------------------------------------------
# get_monthly_summary
# ---------------------------------------------------------------------------


async def test_get_monthly_summary_normal_month(db_session, user_id):
    agg_row = SimpleNamespace(
        total_spent=Decimal("450.00"),
        total_income=Decimal("0.00"),
        transaction_count=5,
    )
    db_session.execute = AsyncMock(
        side_effect=[
            make_result(one=agg_row),
            make_result(first=("Food & Dining",)),
            make_result(scalar_one=Decimal("400.00")),
        ]
    )
    result = await get_monthly_summary(db_session, user_id, "2024-03")
    assert result.month == "2024-03"
    assert result.total_spent == Decimal("450.00")
    assert result.top_category == "Food & Dining"
    assert result.mom_change_pct == pytest.approx(12.5)


async def test_get_monthly_summary_no_prior_spending(db_session, user_id):
    agg_row = SimpleNamespace(
        total_spent=Decimal("300.00"),
        total_income=Decimal("0.00"),
        transaction_count=3,
    )
    db_session.execute = AsyncMock(
        side_effect=[
            make_result(one=agg_row),
            make_result(first=("Shopping",)),
            make_result(scalar_one=Decimal("0.00")),
        ]
    )
    result = await get_monthly_summary(db_session, user_id, "2024-03")
    assert result.mom_change_pct is None


async def test_get_monthly_summary_no_top_category(db_session, user_id):
    agg_row = SimpleNamespace(
        total_spent=Decimal("0.00"),
        total_income=Decimal("0.00"),
        transaction_count=0,
    )
    db_session.execute = AsyncMock(
        side_effect=[
            make_result(one=agg_row),
            make_result(first=None),
            make_result(scalar_one=Decimal("0.00")),
        ]
    )
    result = await get_monthly_summary(db_session, user_id, "2024-03")
    assert result.top_category is None


async def test_get_monthly_summary_january_rolls_to_december(db_session, user_id):
    agg_row = SimpleNamespace(
        total_spent=Decimal("200.00"),
        total_income=Decimal("0.00"),
        transaction_count=2,
    )
    db_session.execute = AsyncMock(
        side_effect=[
            make_result(one=agg_row),
            make_result(first=("Food & Dining",)),
            make_result(scalar_one=Decimal("180.00")),
        ]
    )
    result = await get_monthly_summary(db_session, user_id, "2024-01")
    assert result.month == "2024-01"
    assert db_session.execute.call_count == 3


# ---------------------------------------------------------------------------
# get_spending_by_category
# ---------------------------------------------------------------------------


async def test_get_spending_by_category_returns_breakdowns(db_session, user_id):
    rows = [
        SimpleNamespace(category="Food & Dining", total=Decimal("300.00"), transaction_count=4),
        SimpleNamespace(category="Transportation", total=Decimal("100.00"), transaction_count=2),
    ]
    db_session.execute = AsyncMock(return_value=make_result(all_rows=rows))
    result = await get_spending_by_category(db_session, user_id, "2024-03")
    assert len(result) == 2
    food = next(b for b in result if b.category == "Food & Dining")
    transport = next(b for b in result if b.category == "Transportation")
    assert food.percentage == pytest.approx(75.0)
    assert transport.percentage == pytest.approx(25.0)


async def test_get_spending_by_category_single_category_100pct(db_session, user_id):
    rows = [SimpleNamespace(category="Shopping", total=Decimal("200.00"), transaction_count=3)]
    db_session.execute = AsyncMock(return_value=make_result(all_rows=rows))
    result = await get_spending_by_category(db_session, user_id, "2024-03")
    assert len(result) == 1
    assert result[0].percentage == pytest.approx(100.0)


async def test_get_spending_by_category_empty(db_session, user_id):
    db_session.execute = AsyncMock(return_value=make_result(all_rows=[]))
    result = await get_spending_by_category(db_session, user_id, "2024-03")
    assert result == []


# ---------------------------------------------------------------------------
# detect_subscriptions
# ---------------------------------------------------------------------------


async def test_detect_subscriptions_three_consecutive_months(db_session, user_id):
    rows = [
        SimpleNamespace(merchant_name="Netflix", month_trunc=date(2024, 1, 1), avg_amount=15.99, last_seen=date(2024, 1, 31)),
        SimpleNamespace(merchant_name="Netflix", month_trunc=date(2024, 2, 1), avg_amount=15.99, last_seen=date(2024, 2, 29)),
        SimpleNamespace(merchant_name="Netflix", month_trunc=date(2024, 3, 1), avg_amount=15.99, last_seen=date(2024, 3, 31)),
    ]
    db_session.execute = AsyncMock(return_value=make_result(all_rows=rows))
    result = await detect_subscriptions(db_session, user_id)
    assert len(result) == 1
    assert result[0]["merchant_name"] == "Netflix"
    assert result[0]["months_detected"] == 3
    assert result[0]["estimated_monthly_cost"] == pytest.approx(15.99)


async def test_detect_subscriptions_only_two_months_not_returned(db_session, user_id):
    rows = [
        SimpleNamespace(merchant_name="Hulu", month_trunc=date(2024, 1, 1), avg_amount=12.99, last_seen=date(2024, 1, 31)),
        SimpleNamespace(merchant_name="Hulu", month_trunc=date(2024, 2, 1), avg_amount=12.99, last_seen=date(2024, 2, 29)),
    ]
    db_session.execute = AsyncMock(return_value=make_result(all_rows=rows))
    result = await detect_subscriptions(db_session, user_id)
    assert result == []


async def test_detect_subscriptions_non_consecutive_gap_not_counted(db_session, user_id):
    rows = [
        SimpleNamespace(merchant_name="Spotify", month_trunc=date(2024, 1, 1), avg_amount=9.99, last_seen=date(2024, 1, 31)),
        SimpleNamespace(merchant_name="Spotify", month_trunc=date(2024, 2, 1), avg_amount=9.99, last_seen=date(2024, 2, 29)),
        # gap: March missing
        SimpleNamespace(merchant_name="Spotify", month_trunc=date(2024, 4, 1), avg_amount=9.99, last_seen=date(2024, 4, 30)),
    ]
    db_session.execute = AsyncMock(return_value=make_result(all_rows=rows))
    result = await detect_subscriptions(db_session, user_id)
    assert result == []


async def test_detect_subscriptions_sorted_by_cost_desc(db_session, user_id):
    rows = [
        SimpleNamespace(merchant_name="Cheap", month_trunc=date(2024, 1, 1), avg_amount=5.00, last_seen=date(2024, 1, 31)),
        SimpleNamespace(merchant_name="Cheap", month_trunc=date(2024, 2, 1), avg_amount=5.00, last_seen=date(2024, 2, 29)),
        SimpleNamespace(merchant_name="Cheap", month_trunc=date(2024, 3, 1), avg_amount=5.00, last_seen=date(2024, 3, 31)),
        SimpleNamespace(merchant_name="Expensive", month_trunc=date(2024, 1, 1), avg_amount=50.00, last_seen=date(2024, 1, 31)),
        SimpleNamespace(merchant_name="Expensive", month_trunc=date(2024, 2, 1), avg_amount=50.00, last_seen=date(2024, 2, 29)),
        SimpleNamespace(merchant_name="Expensive", month_trunc=date(2024, 3, 1), avg_amount=50.00, last_seen=date(2024, 3, 31)),
    ]
    db_session.execute = AsyncMock(return_value=make_result(all_rows=rows))
    result = await detect_subscriptions(db_session, user_id)
    assert len(result) == 2
    assert result[0]["estimated_monthly_cost"] > result[1]["estimated_monthly_cost"]


async def test_detect_subscriptions_year_boundary(db_session, user_id):
    rows = [
        SimpleNamespace(merchant_name="Adobe", month_trunc=date(2023, 11, 1), avg_amount=54.99, last_seen=date(2023, 11, 30)),
        SimpleNamespace(merchant_name="Adobe", month_trunc=date(2023, 12, 1), avg_amount=54.99, last_seen=date(2023, 12, 31)),
        SimpleNamespace(merchant_name="Adobe", month_trunc=date(2024, 1, 1), avg_amount=54.99, last_seen=date(2024, 1, 31)),
    ]
    db_session.execute = AsyncMock(return_value=make_result(all_rows=rows))
    result = await detect_subscriptions(db_session, user_id)
    assert len(result) == 1
    assert result[0]["merchant_name"] == "Adobe"
    assert result[0]["months_detected"] == 3


# ---------------------------------------------------------------------------
# get_anomalies
# ---------------------------------------------------------------------------


async def test_get_anomalies_high_zscore_returned(db_session, user_id, make_transaction):
    stats_rows = [
        SimpleNamespace(category="Food & Dining", mean_amount=50.0, stddev_amount=10.0),
    ]
    txn = make_transaction(amount=Decimal("80.00"), category="Food & Dining")
    db_session.execute = AsyncMock(
        side_effect=[
            make_result(all_rows=stats_rows),
            make_result(scalars_all=[txn]),
        ]
    )
    result = await get_anomalies(db_session, user_id, z_score_threshold=2.0)
    assert len(result) == 1
    assert result[0]["z_score"] == pytest.approx(3.0)
    assert result[0]["merchant_name"] == txn.merchant_name


async def test_get_anomalies_below_threshold_excluded(db_session, user_id, make_transaction):
    stats_rows = [
        SimpleNamespace(category="Food & Dining", mean_amount=50.0, stddev_amount=10.0),
    ]
    txn = make_transaction(amount=Decimal("60.00"), category="Food & Dining")
    db_session.execute = AsyncMock(
        side_effect=[
            make_result(all_rows=stats_rows),
            make_result(scalars_all=[txn]),
        ]
    )
    result = await get_anomalies(db_session, user_id, z_score_threshold=2.0)
    assert result == []


async def test_get_anomalies_at_threshold_excluded(db_session, user_id, make_transaction):
    stats_rows = [
        SimpleNamespace(category="Food & Dining", mean_amount=50.0, stddev_amount=10.0),
    ]
    txn = make_transaction(amount=Decimal("70.00"), category="Food & Dining")
    db_session.execute = AsyncMock(
        side_effect=[
            make_result(all_rows=stats_rows),
            make_result(scalars_all=[txn]),
        ]
    )
    result = await get_anomalies(db_session, user_id, z_score_threshold=2.0)
    assert result == []


async def test_get_anomalies_none_stddev_skips_category(db_session, user_id, make_transaction):
    stats_rows = [
        SimpleNamespace(category="Health", mean_amount=100.0, stddev_amount=None),
    ]
    txn = make_transaction(amount=Decimal("999.00"), category="Health")
    db_session.execute = AsyncMock(
        side_effect=[
            make_result(all_rows=stats_rows),
            make_result(scalars_all=[]),
        ]
    )
    result = await get_anomalies(db_session, user_id)
    assert result == []


async def test_get_anomalies_sorted_by_zscore_desc(db_session, user_id, make_transaction):
    stats_rows = [
        SimpleNamespace(category="Food & Dining", mean_amount=50.0, stddev_amount=10.0),
    ]
    txn_high = make_transaction(amount=Decimal("90.00"), category="Food & Dining")  # z=4.0
    txn_low = make_transaction(amount=Decimal("75.00"), category="Food & Dining")   # z=2.5
    db_session.execute = AsyncMock(
        side_effect=[
            make_result(all_rows=stats_rows),
            make_result(scalars_all=[txn_low, txn_high]),
        ]
    )
    result = await get_anomalies(db_session, user_id, z_score_threshold=2.0)
    assert len(result) == 2
    assert result[0]["z_score"] > result[1]["z_score"]


# ---------------------------------------------------------------------------
# compare_months
# ---------------------------------------------------------------------------


async def test_compare_months_returns_correct_delta(db_session, user_id):
    breakdown_a = [CategoryBreakdown(category="Food & Dining", total=Decimal("300"), transaction_count=3, percentage=100.0)]
    breakdown_b = [CategoryBreakdown(category="Food & Dining", total=Decimal("360"), transaction_count=4, percentage=100.0)]

    with patch(
        "app.services.transaction_service.get_spending_by_category",
        new=AsyncMock(side_effect=[breakdown_a, breakdown_b]),
    ):
        result = await compare_months(db_session, user_id, "2024-02", "2024-03")

    assert result["total_a"] == pytest.approx(300.0)
    assert result["total_b"] == pytest.approx(360.0)
    assert result["delta_amount"] == pytest.approx(60.0)
    assert result["delta_pct"] == pytest.approx(20.0)


async def test_compare_months_zero_total_a_gives_none_delta_pct(db_session, user_id):
    with patch(
        "app.services.transaction_service.get_spending_by_category",
        new=AsyncMock(side_effect=[[], []]),
    ):
        result = await compare_months(db_session, user_id, "2024-02", "2024-03")

    assert result["delta_pct"] is None


async def test_compare_months_all_keys_present(db_session, user_id):
    breakdown = [CategoryBreakdown(category="Shopping", total=Decimal("100"), transaction_count=1, percentage=100.0)]
    with patch(
        "app.services.transaction_service.get_spending_by_category",
        new=AsyncMock(side_effect=[breakdown, breakdown]),
    ):
        result = await compare_months(db_session, user_id, "2024-02", "2024-03")

    expected_keys = {"month_a", "month_b", "total_a", "total_b", "delta_amount", "delta_pct", "breakdown_a", "breakdown_b"}
    assert expected_keys == set(result.keys())
