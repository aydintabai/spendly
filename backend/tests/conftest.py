import uuid
from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction


def make_result(
    *,
    scalar_one=None,
    scalar_one_or_none=None,
    one=None,
    first=None,
    all_rows=None,
    scalars_all=None,
):
    result = MagicMock()
    result.scalar_one.return_value = scalar_one
    result.scalar_one_or_none.return_value = scalar_one_or_none
    result.one.return_value = one
    result.first.return_value = first
    result.all.return_value = all_rows if all_rows is not None else []
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = scalars_all if scalars_all is not None else []
    result.scalars.return_value = scalars_mock
    return result


@pytest.fixture
def db_session():
    session = MagicMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.add = MagicMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def user_id():
    return uuid.UUID("12345678-1234-5678-1234-567812345678")


@pytest.fixture
def make_transaction(user_id):
    def _factory(**kwargs):
        defaults = {
            "id": uuid.uuid4(),
            "user_id": user_id,
            "account_id": uuid.uuid4(),
            "merchant_name": "Test Merchant",
            "amount": Decimal("50.00"),
            "category": "Food & Dining",
            "date": date(2024, 3, 15),
            "pending": False,
            "currency_code": "USD",
            "note": None,
            "created_at": datetime(2024, 3, 15, 12, 0, 0),
            "updated_at": datetime(2024, 3, 15, 12, 0, 0),
        }
        defaults.update(kwargs)
        txn = MagicMock(spec=Transaction)
        for k, v in defaults.items():
            setattr(txn, k, v)
        return txn

    return _factory
