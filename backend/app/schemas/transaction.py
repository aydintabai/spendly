import uuid
from datetime import date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, field_validator

VALID_CATEGORIES = frozenset({
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Subscriptions",
    "Entertainment",
    "Health",
    "Gas",
    "Income",
    "Other",
})


class TransactionRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    account_id: uuid.UUID | None
    merchant_name: str
    amount: Decimal
    category: str
    date: date
    pending: bool
    currency_code: str
    note: str | None

    model_config = ConfigDict(from_attributes=True)


class TransactionCreate(BaseModel):
    account_id: uuid.UUID | None = None
    merchant_name: str
    amount: Decimal
    category: str
    date: date
    pending: bool = False
    currency_code: str = "USD"
    note: str | None = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in VALID_CATEGORIES:
            raise ValueError(f"category must be one of {sorted(VALID_CATEGORIES)}")
        return v


class TransactionFilter(BaseModel):
    category: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    search: str | None = None
    account_id: uuid.UUID | None = None
    pending: bool | None = None
    page: int = 1
    page_size: int = 20


class MonthlySummary(BaseModel):
    month: str
    total_spent: Decimal
    total_income: Decimal
    transaction_count: int
    top_category: str | None
    mom_change_pct: float | None

    model_config = ConfigDict(from_attributes=True)


class CategoryBreakdown(BaseModel):
    category: str
    total: Decimal
    transaction_count: int
    percentage: float

    model_config = ConfigDict(from_attributes=True)
