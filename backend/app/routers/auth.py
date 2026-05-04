from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUser, DBSession
from app.schemas.auth import ProfileCreate, ProfileRead, ProfileUpdate
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=ProfileRead)
async def get_me(user: CurrentUser) -> ProfileRead:
    return user


@router.post("/profile", response_model=ProfileRead, status_code=201)
async def create_profile(data: ProfileCreate, db: DBSession) -> ProfileRead:
    return await auth_service.upsert_profile(db, data)


@router.patch("/profile", response_model=ProfileRead)
async def update_profile(body: ProfileUpdate, db: DBSession, user: CurrentUser) -> ProfileRead:
    updated = await auth_service.update_profile(db, user.id, body)
    if updated is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return updated
