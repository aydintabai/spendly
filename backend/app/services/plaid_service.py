import asyncio
import uuid

import plaid
from fastapi import HTTPException
from plaid.api.plaid_api import PlaidApi
from plaid.api_client import ApiClient
from plaid.configuration import Configuration, Environment
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.account import Account
from app.models.plaid_item import PlaidItem
from app.models.transaction import Transaction
from app.schemas.plaid import ExchangeTokenRequest, LinkTokenResponse, PlaidItemRead, SyncResponse

_ENV_MAP = {
    "sandbox": Environment.Sandbox,
    "production": Environment.Production,
}

_CATEGORY_MAP: dict[str, str] = {
    "FOOD_AND_DRINK": "Food & Dining",
    "TRAVEL": "Transportation",
    "TRANSPORTATION": "Transportation",
    "GENERAL_MERCHANDISE": "Shopping",
    "HOME_IMPROVEMENT": "Shopping",
    "ENTERTAINMENT": "Entertainment",
    "MEDICAL": "Health",
    "PERSONAL_CARE": "Health",
    "INCOME": "Income",
    "TRANSFER_IN": "Income",
    "SUBSCRIPTION": "Subscriptions",
    "RENT_AND_UTILITIES": "Other",
    "GENERAL_SERVICES": "Other",
    "LOAN_PAYMENTS": "Other",
    "BANK_FEES": "Other",
    "GOVERNMENT_AND_NON_PROFIT": "Other",
    "TRANSFER_OUT": "Other",
}

_DETAILED_OVERRIDE: dict[str, str] = {
    "TRANSPORTATION_GAS_AND_FUEL": "Gas",
}


def _get_plaid_client() -> PlaidApi:
    configuration = Configuration(
        host=_ENV_MAP.get(settings.plaid_env, Environment.Sandbox),
        api_key={"clientId": settings.plaid_client_id, "secret": settings.plaid_secret},
    )
    return PlaidApi(ApiClient(configuration))


def _map_category(primary: str | None, detailed: str | None = None) -> str:
    if detailed and detailed.upper() in _DETAILED_OVERRIDE:
        return _DETAILED_OVERRIDE[detailed.upper()]
    if primary is None:
        return "Other"
    return _CATEGORY_MAP.get(primary.upper(), "Other")


async def create_link_token(user_id: uuid.UUID) -> LinkTokenResponse:
    client = _get_plaid_client()
    req = LinkTokenCreateRequest(
        client_name="Spendly",
        language="en",
        country_codes=[CountryCode("US")],
        user=LinkTokenCreateRequestUser(client_user_id=str(user_id)),
        products=[Products("transactions")],
    )
    try:
        response = await asyncio.to_thread(client.link_token_create, req)
        return LinkTokenResponse(
            link_token=response["link_token"],
            expiration=response["expiration"].isoformat(),
        )
    except plaid.ApiException as e:
        raise HTTPException(status_code=502, detail=f"Plaid error: {e.body}") from e


async def exchange_token(
    db: AsyncSession,
    user_id: uuid.UUID,
    req: ExchangeTokenRequest,
) -> PlaidItemRead:
    client = _get_plaid_client()
    try:
        response = await asyncio.to_thread(
            client.item_public_token_exchange,
            ItemPublicTokenExchangeRequest(public_token=req.public_token),
        )
    except plaid.ApiException as e:
        raise HTTPException(status_code=502, detail=f"Plaid error: {e.body}") from e

    access_token: str = response["access_token"]
    plaid_item_id: str = response["item_id"]

    # Duplicate institution guard
    if req.institution_id:
        existing = (
            await db.execute(
                select(PlaidItem).where(
                    PlaidItem.user_id == user_id,
                    PlaidItem.institution_id == req.institution_id,
                )
            )
        ).scalar_one_or_none()
        if existing is not None:
            raise HTTPException(
                status_code=400,
                detail="This institution is already connected. Use sync to refresh.",
            )

    stmt = (
        insert(PlaidItem)
        .values(
            user_id=user_id,
            plaid_item_id=plaid_item_id,
            access_token=access_token,
            institution_id=req.institution_id,
            institution_name=req.institution_name,
        )
        .on_conflict_do_update(
            index_elements=["plaid_item_id"],
            set_={
                "access_token": access_token,
                "institution_id": req.institution_id,
                "institution_name": req.institution_name,
            },
        )
        .returning(PlaidItem)
    )
    plaid_item = (await db.execute(stmt)).scalar_one()
    await db.commit()
    await db.refresh(plaid_item)

    await sync_item_transactions(db, user_id, plaid_item)

    return PlaidItemRead.model_validate(plaid_item)


async def _upsert_account(
    db: AsyncSession,
    user_id: uuid.UUID,
    plaid_item: PlaidItem,
    plaid_account: dict,
) -> None:
    balances = plaid_account["balances"]
    currency = (
        balances.get("iso_currency_code")
        or balances.get("unofficial_currency_code")
        or "USD"
    )
    stmt = (
        insert(Account)
        .values(
            user_id=user_id,
            plaid_item_id=plaid_item.id,
            plaid_account_id=plaid_account["account_id"],
            name=plaid_account["name"],
            official_name=plaid_account.get("official_name"),
            type=str(plaid_account["type"]),
            subtype=str(plaid_account["subtype"]) if plaid_account.get("subtype") else None,
            institution_name=plaid_item.institution_name,
            current_balance=balances.get("current"),
            available_balance=balances.get("available"),
            currency_code=currency,
            mask=plaid_account.get("mask"),
            is_active=True,
        )
        .on_conflict_do_update(
            index_elements=["plaid_account_id"],
            set_={
                "name": plaid_account["name"],
                "official_name": plaid_account.get("official_name"),
                "type": str(plaid_account["type"]),
                "subtype": str(plaid_account["subtype"]) if plaid_account.get("subtype") else None,
                "current_balance": balances.get("current"),
                "available_balance": balances.get("available"),
                "currency_code": currency,
                "mask": plaid_account.get("mask"),
                "is_active": True,
            },
        )
    )
    await db.execute(stmt)


async def _upsert_transaction(
    db: AsyncSession,
    user_id: uuid.UUID,
    txn: dict,
) -> None:
    account_id = (
        await db.execute(
            select(Account.id).where(Account.plaid_account_id == txn["account_id"])
        )
    ).scalar_one_or_none()

    pfc = txn.get("personal_finance_category")
    primary = pfc["primary"] if pfc else None
    detailed = pfc["detailed"] if pfc else None
    category = _map_category(primary, detailed)

    merchant = txn.get("merchant_name") or txn.get("name") or "Unknown"
    currency = (
        txn.get("iso_currency_code")
        or txn.get("unofficial_currency_code")
        or "USD"
    )

    stmt = (
        insert(Transaction)
        .values(
            user_id=user_id,
            account_id=account_id,
            plaid_transaction_id=txn["transaction_id"],
            merchant_name=merchant,
            amount=txn["amount"],
            category=category,
            raw_category=detailed or primary,
            date=txn["date"],
            authorized_date=txn.get("authorized_date"),
            pending=txn["pending"],
            currency_code=currency,
        )
        .on_conflict_do_update(
            index_elements=["plaid_transaction_id"],
            set_={
                "merchant_name": merchant,
                "amount": txn["amount"],
                "category": category,
                "raw_category": detailed or primary,
                "date": txn["date"],
                "authorized_date": txn.get("authorized_date"),
                "pending": txn["pending"],
                "currency_code": currency,
                "account_id": account_id,
            },
        )
    )
    await db.execute(stmt)


async def _remove_transaction(db: AsyncSession, plaid_transaction_id: str) -> None:
    await db.execute(
        delete(Transaction).where(
            Transaction.plaid_transaction_id == plaid_transaction_id
        )
    )


async def sync_item_transactions(
    db: AsyncSession,
    user_id: uuid.UUID,
    plaid_item: PlaidItem,
) -> SyncResponse:
    client = _get_plaid_client()
    cursor = plaid_item.cursor
    total_added = total_modified = total_removed = 0

    while True:
        sync_req = TransactionsSyncRequest(
            access_token=plaid_item.access_token,
            **( {"cursor": cursor} if cursor else {}),
        )
        try:
            response = await asyncio.to_thread(client.transactions_sync, sync_req)
        except plaid.ApiException as e:
            raise HTTPException(status_code=502, detail=f"Plaid sync error: {e.body}") from e

        for acct in response["accounts"]:
            await _upsert_account(db, user_id, plaid_item, acct)

        for txn in response["added"]:
            await _upsert_transaction(db, user_id, txn)
            total_added += 1

        for txn in response["modified"]:
            await _upsert_transaction(db, user_id, txn)
            total_modified += 1

        for removed in response["removed"]:
            await _remove_transaction(db, removed["transaction_id"])
            total_removed += 1

        cursor = response["next_cursor"]
        if not response["has_more"]:
            break

    # Persist cursor only after all pages are consumed (Plaid requirement)
    plaid_item.cursor = cursor
    db.add(plaid_item)
    await db.commit()

    return SyncResponse(
        added=total_added,
        modified=total_modified,
        removed=total_removed,
        has_more=False,
    )


async def sync_all_items(
    db: AsyncSession,
    user_id: uuid.UUID,
    item_id: uuid.UUID | None = None,
) -> SyncResponse:
    if item_id is not None:
        plaid_item = (
            await db.execute(
                select(PlaidItem).where(
                    PlaidItem.id == item_id,
                    PlaidItem.user_id == user_id,
                )
            )
        ).scalar_one_or_none()
        if plaid_item is None:
            raise HTTPException(status_code=404, detail="PlaidItem not found.")
        items = [plaid_item]
    else:
        items = list(
            (
                await db.execute(
                    select(PlaidItem).where(PlaidItem.user_id == user_id)
                )
            ).scalars().all()
        )

    totals = SyncResponse(added=0, modified=0, removed=0, has_more=False)
    for item in items:
        result = await sync_item_transactions(db, user_id, item)
        totals.added += result.added
        totals.modified += result.modified
        totals.removed += result.removed

    return totals
