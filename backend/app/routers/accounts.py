from fastapi import APIRouter

from app.dependencies import CurrentUser, DBSession
from app.schemas.account import AccountRead
from app.services import account_service

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountRead])
async def list_accounts(db: DBSession, user: CurrentUser) -> list[AccountRead]:
    return await account_service.get_user_accounts(db, user.id)
