import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account


async def get_user_accounts(db: AsyncSession, user_id: uuid.UUID) -> list[Account]:
    result = await db.execute(
        select(Account)
        .where(Account.user_id == user_id, Account.is_active == True)  # noqa: E712
        .order_by(Account.institution_name.asc(), Account.name.asc())
    )
    return list(result.scalars().all())
