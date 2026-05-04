import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.profile import Profile
from app.schemas.auth import ProfileCreate, ProfileUpdate
from app.services.auth_service import get_profile, update_profile, upsert_profile
from tests.conftest import make_result


@pytest.fixture
def mock_profile(user_id):
    profile = MagicMock(spec=Profile)
    profile.id = user_id
    profile.email = "test@example.com"
    profile.full_name = "Test User"
    return profile


# ---------------------------------------------------------------------------
# get_profile
# ---------------------------------------------------------------------------


async def test_get_profile_found(db_session, user_id, mock_profile):
    db_session.execute = AsyncMock(return_value=make_result(scalar_one_or_none=mock_profile))
    result = await get_profile(db_session, user_id)
    assert result is mock_profile
    assert db_session.execute.call_count == 1


async def test_get_profile_not_found(db_session, user_id):
    db_session.execute = AsyncMock(return_value=make_result(scalar_one_or_none=None))
    result = await get_profile(db_session, user_id)
    assert result is None


# ---------------------------------------------------------------------------
# upsert_profile
# ---------------------------------------------------------------------------


async def test_upsert_profile_returns_profile(db_session, user_id, mock_profile):
    db_session.execute = AsyncMock(return_value=make_result(scalar_one=mock_profile))
    data = ProfileCreate(id=user_id, email="test@example.com", full_name="Test User")
    result = await upsert_profile(db_session, data)
    assert result is mock_profile
    assert db_session.commit.await_count == 1


async def test_upsert_profile_calls_commit(db_session, user_id, mock_profile):
    db_session.execute = AsyncMock(return_value=make_result(scalar_one=mock_profile))
    data = ProfileCreate(id=user_id, email="new@example.com")
    await upsert_profile(db_session, data)
    db_session.execute.assert_awaited_once()
    db_session.commit.assert_awaited_once()


# ---------------------------------------------------------------------------
# update_profile
# ---------------------------------------------------------------------------


async def test_update_profile_with_changes(db_session, user_id, mock_profile):
    db_session.execute = AsyncMock(return_value=make_result(scalar_one_or_none=mock_profile))
    data = ProfileUpdate(full_name="Updated Name")
    result = await update_profile(db_session, user_id, data)
    assert result is mock_profile
    assert db_session.commit.await_count == 1


async def test_update_profile_empty_data_calls_get_profile(db_session, user_id, mock_profile):
    db_session.execute = AsyncMock(return_value=make_result(scalar_one_or_none=mock_profile))
    data = ProfileUpdate()
    result = await update_profile(db_session, user_id, data)
    assert result is mock_profile
    assert db_session.commit.await_count == 0
    assert db_session.execute.call_count == 1


async def test_update_profile_returns_none_when_not_found(db_session, user_id):
    db_session.execute = AsyncMock(return_value=make_result(scalar_one_or_none=None))
    data = ProfileUpdate(full_name="Ghost")
    result = await update_profile(db_session, user_id, data)
    assert result is None
