import uuid

from fastapi import APIRouter, Query

from app.dependencies import CurrentUser, DBSession
from app.schemas.plaid import ExchangeTokenRequest, LinkTokenResponse, PlaidItemRead, SyncResponse
from app.services import plaid_service

router = APIRouter(prefix="/plaid", tags=["plaid"])


@router.post("/create-link-token", response_model=LinkTokenResponse)
async def create_link_token(user: CurrentUser) -> LinkTokenResponse:
    return await plaid_service.create_link_token(user.id)


@router.post("/exchange-token", response_model=PlaidItemRead)
async def exchange_token(
    db: DBSession,
    user: CurrentUser,
    body: ExchangeTokenRequest,
) -> PlaidItemRead:
    return await plaid_service.exchange_token(db, user.id, body)


@router.post("/sync", response_model=SyncResponse)
async def sync_transactions(
    db: DBSession,
    user: CurrentUser,
    item_id: uuid.UUID | None = Query(default=None),
) -> SyncResponse:
    return await plaid_service.sync_all_items(db, user.id, item_id)
