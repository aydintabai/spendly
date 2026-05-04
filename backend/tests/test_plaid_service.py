import pytest

from app.schemas.transaction import VALID_CATEGORIES
from app.services.plaid_service import _CATEGORY_MAP, _map_category


# ---------------------------------------------------------------------------
# _map_category — pure function, no mocks needed
# ---------------------------------------------------------------------------


def test_map_category_detailed_override_wins():
    assert _map_category("TRANSPORTATION", "TRANSPORTATION_GAS_AND_FUEL") == "Gas"


def test_map_category_primary_used_when_no_detailed():
    assert _map_category("FOOD_AND_DRINK", None) == "Food & Dining"


def test_map_category_primary_case_insensitive():
    assert _map_category("food_and_drink", None) == "Food & Dining"


def test_map_category_detailed_case_insensitive():
    assert _map_category("TRANSPORTATION", "transportation_gas_and_fuel") == "Gas"


def test_map_category_unknown_returns_other():
    assert _map_category("TOTALLY_UNKNOWN_CATEGORY", None) == "Other"


def test_map_category_none_primary_returns_other():
    assert _map_category(None, None) == "Other"


def test_map_category_detailed_not_in_override_falls_through_to_primary():
    assert _map_category("FOOD_AND_DRINK", "FOOD_AND_DRINK_COFFEE") == "Food & Dining"


@pytest.mark.parametrize("primary,expected", list(_CATEGORY_MAP.items()))
def test_map_category_all_primary_keys_map_to_valid_categories(primary, expected):
    result = _map_category(primary, None)
    assert result in VALID_CATEGORIES
