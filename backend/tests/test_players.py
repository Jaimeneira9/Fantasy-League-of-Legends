"""Tests para /players — mockean Supabase, sin red."""
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from auth.dependencies import get_supabase
from main import app

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

PLAYER_1 = {
    "id": str(uuid4()),
    "name": "Caps",
    "team": "G2 Esports",
    "role": "mid",
    "league": "LEC",
    "current_price": 12.0,
    "image_url": None,
    "is_active": True,
}
PLAYER_2 = {
    "id": str(uuid4()),
    "name": "BrokenBlade",
    "team": "G2 Esports",
    "role": "top",
    "league": "LEC",
    "current_price": 10.0,
    "image_url": None,
    "is_active": True,
}
PLAYERS = [PLAYER_1, PLAYER_2]


def _make_supabase_mock(data: list | dict) -> MagicMock:
    """Crea un mock de supabase que devuelve `data` en .execute()."""
    result = MagicMock()
    result.data = data

    chain = MagicMock()
    chain.execute.return_value = result
    # Cada método del query builder devuelve el mismo chain
    for method in ("select", "eq", "order", "single", "limit"):
        getattr(chain, method).return_value = chain

    sb = MagicMock()
    sb.table.return_value = chain
    return sb


@pytest.fixture
def client_with_players() -> TestClient:
    app.dependency_overrides[get_supabase] = lambda: _make_supabase_mock(PLAYERS)
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def client_with_single_player() -> TestClient:
    app.dependency_overrides[get_supabase] = lambda: _make_supabase_mock(PLAYER_1)
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def client_with_empty() -> TestClient:
    app.dependency_overrides[get_supabase] = lambda: _make_supabase_mock([])
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def client_with_none() -> TestClient:
    """Simula jugador no encontrado (single() devuelve None)."""
    app.dependency_overrides[get_supabase] = lambda: _make_supabase_mock(None)
    yield TestClient(app)
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# GET /players/
# ---------------------------------------------------------------------------

def test_list_players_ok(client_with_players: TestClient) -> None:
    r = client_with_players.get("/players/")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    assert len(body) == 2


def test_list_players_fields(client_with_players: TestClient) -> None:
    r = client_with_players.get("/players/")
    player = r.json()[0]
    assert {"id", "name", "team", "role", "league", "current_price", "is_active"} <= player.keys()


def test_list_players_empty(client_with_empty: TestClient) -> None:
    r = client_with_empty.get("/players/")
    assert r.status_code == 200
    assert r.json() == []


def test_list_players_filter_role(client_with_players: TestClient) -> None:
    r = client_with_players.get("/players/?role=mid")
    assert r.status_code == 200


def test_list_players_filter_team(client_with_players: TestClient) -> None:
    r = client_with_players.get("/players/?team=G2+Esports")
    assert r.status_code == 200


def test_list_players_invalid_role(client_with_players: TestClient) -> None:
    r = client_with_players.get("/players/?role=noexiste")
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# GET /players/{player_id}
# ---------------------------------------------------------------------------

def test_get_player_ok(client_with_single_player: TestClient) -> None:
    r = client_with_single_player.get(f"/players/{PLAYER_1['id']}")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Caps"
    assert body["role"] == "mid"


def test_get_player_not_found(client_with_none: TestClient) -> None:
    r = client_with_none.get(f"/players/{uuid4()}")
    assert r.status_code == 404


def test_get_player_invalid_uuid(client_with_players: TestClient) -> None:
    r = client_with_players.get("/players/no-es-un-uuid")
    assert r.status_code == 422
