from fastapi import APIRouter

from app.dependencies import CurrentUser, DBSession
from app.schemas.auth import ProfileCreate, ProfileRead
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=ProfileRead)
async def get_me(user: CurrentUser) -> ProfileRead:
    return user


@router.post("/profile", response_model=ProfileRead, status_code=201)
async def create_profile(data: ProfileCreate, db: DBSession) -> ProfileRead:
    return await auth_service.upsert_profile(db, data)
