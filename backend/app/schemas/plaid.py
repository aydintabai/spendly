import uuid
from pydantic import BaseModel, ConfigDict


class LinkTokenResponse(BaseModel):
    link_token: str
    expiration: str


class ExchangeTokenRequest(BaseModel):
    public_token: str
    institution_id: str | None = None
    institution_name: str | None = None


class PlaidItemRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    institution_id: str | None
    institution_name: str | None

    model_config = ConfigDict(from_attributes=True)
    # access_token is intentionally excluded from all read schemas


class SyncResponse(BaseModel):
    added: int
    modified: int
    removed: int
    has_more: bool
