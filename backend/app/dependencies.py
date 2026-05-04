import time
import uuid
from typing import Annotated

import httpx
from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.db.session import get_db
from app.models.profile import Profile

__all__ = ["get_db", "get_current_user", "CurrentUser", "DBSession"]

_jwks_cache: dict | None = None
_jwks_fetched_at: float = 0.0
_JWKS_TTL = 600  # 10 minutes


async def _get_jwks(*, force_refresh: bool = False) -> dict:
    global _jwks_cache, _jwks_fetched_at
    now = time.monotonic()
    if force_refresh or _jwks_cache is None or (now - _jwks_fetched_at) > _JWKS_TTL:
        async with httpx.AsyncClient() as client:
            r = await client.get(settings.supabase_jwks_url, timeout=5.0)
            r.raise_for_status()
            _jwks_cache = r.json()
            _jwks_fetched_at = now
    return _jwks_cache


async def get_current_user(
    authorization: Annotated[str, Header()],
    db: AsyncSession = Depends(get_db),
) -> Profile:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not authorization.startswith("Bearer "):
        raise credentials_exception

    token = authorization.removeprefix("Bearer ").strip()

    try:
        header = jwt.get_unverified_header(token)
    except JWTError:
        raise credentials_exception

    kid = header.get("kid")

    async def _decode_with_jwks(force: bool) -> dict:
        jwks = await _get_jwks(force_refresh=force)
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if key is None:
            return {}
        return jwt.decode(
            token,
            key,
            algorithms=["ES256"],
            audience="authenticated",
            options={"verify_aud": True},
        )

    try:
        payload = await _decode_with_jwks(force=False)
        if not payload:
            # kid not found — key may have rotated, retry with fresh JWKS
            payload = await _decode_with_jwks(force=True)
        if not payload:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user_id_str: str | None = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    result = await db.execute(select(Profile).where(Profile.id == user_id))
    profile = result.scalar_one_or_none()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User profile not found. Complete registration first.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return profile


DBSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[Profile, Depends(get_current_user)]
