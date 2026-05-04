import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert

from app.models.profile import Profile
from app.schemas.auth import ProfileCreate, ProfileUpdate


async def get_profile(db: AsyncSession, user_id: uuid.UUID) -> Profile | None:
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    return result.scalar_one_or_none()


async def upsert_profile(db: AsyncSession, data: ProfileCreate) -> Profile:
    stmt = (
        insert(Profile)
        .values(id=data.id, email=data.email, full_name=data.full_name)
        .on_conflict_do_update(
            index_elements=["id"],
            set_={"email": data.email, "full_name": data.full_name},
        )
        .returning(Profile)
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.scalar_one()


async def update_profile(db: AsyncSession, user_id: uuid.UUID, data: ProfileUpdate) -> Profile | None:
    values = data.model_dump(exclude_none=True)
    if not values:
        return await get_profile(db, user_id)
    stmt = (
        update(Profile)
        .where(Profile.id == user_id)
        .values(**values)
        .returning(Profile)
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.scalar_one_or_none()
