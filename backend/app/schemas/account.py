import uuid
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class AccountRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    plaid_account_id: str | None
    name: str
    official_name: str | None
    type: str
    subtype: str | None
    institution_name: str | None
    current_balance: Decimal | None
    available_balance: Decimal | None
    currency_code: str
    mask: str | None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class AccountCreate(BaseModel):
    name: str
    type: str
    subtype: str | None = None
    institution_name: str | None = None
    current_balance: Decimal | None = None
    currency_code: str = "USD"
