"""Tests para /market — mockean Supabase y get_current_user, sin red."""
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from auth.dependencies import get_current_user, get_supabase
from main import app

# ---------------------------------------------------------------------------
# Datos de prueba
# ---------------------------------------------------------------------------

USER_ID = str(uuid4())
LEAGUE_ID = str(uuid4())
MEMBER_ID = str(uuid4())
PLAYER_ID = str(uuid4())
LISTING_ID = str(uuid4())
ROSTER_ID = str(uuid4())
ROSTER_PLAYER_ID = str(uuid4())
TRANSACTION_ID = str(uuid4())
OFFER_ID = str(uuid4())
CANDIDATE_ID = str(uuid4())

MEMBER = {"id": MEMBER_ID, "remaining_budget": 100.0}

PLAYER = {
    "id": PLAYER_ID,
    "name": "Caps",
    "team": "G2 Esports",
    "role": "mid",
    "image_url": None,
    "current_price": 12.0,
}

LISTING = {
    "id": LISTING_ID,
    "player_id": PLAYER_ID,
    "seller_id": None,
    "league_id": LEAGUE_ID,
    "ask_price": 12.0,
    "status": "active",
    "listed_at": "2026-03-03T00:00:00+00:00",
    "closes_at": "2099-01-01T00:00:00+00:00",
    "candidate_id": None,
}

LISTING_DETAIL = {**LISTING, "players": PLAYER}

ROSTER = {"id": ROSTER_ID}

ROSTER_PLAYER = {"id": ROSTER_PLAYER_ID, "player_id": PLAYER_ID, "slot": "mid"}

TRANSACTION = {
    "id": TRANSACTION_ID,
    "league_id": LEAGUE_ID,
    "buyer_id": MEMBER_ID,
    "seller_id": None,
    "player_id": PLAYER_ID,
    "type": "buy",
    "price": 12.0,
    "executed_at": "2026-03-03T00:00:00+00:00",
}

SELL_OFFER = {
    "id": OFFER_ID,
    "ask_price": 12.0,
    "status": "pending",
    "expires_at": "2026-03-05T00:00:00+00:00",
    "players": PLAYER,
}

CANDIDATE = {
    "id": CANDIDATE_ID,
    "player_id": PLAYER_ID,
    "ask_price": 12.0,
    "added_at": "2026-03-03T00:00:00+00:00",
    "players": PLAYER,
}

FAKE_USER = {"id": USER_ID, "email": "test@test.com"}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_user() -> dict:
    return FAKE_USER


def _chain(*return_values: object) -> MagicMock:
    """
    Query-builder mock que devuelve `return_values` en orden por cada .execute().
    Soporta todos los métodos del query-builder de Supabase usados en el backend.
    """
    results = []
    for val in return_values:
        r = MagicMock()
        r.data = val
        r.count = len(val) if isinstance(val, list) else 0
        results.append(r)

    call_count = {"n": 0}
    chain = MagicMock()

    def execute_side_effect():
        idx = call_count["n"]
        call_count["n"] += 1
        return results[idx] if idx < len(results) else results[-1]

    chain.execute.side_effect = execute_side_effect
    for method in ("select", "eq", "in_", "insert", "single", "order", "limit",
                   "update", "delete", "gt", "gte", "lt", "lte", "neq", "is_",
                   "not_", "or_", "filter"):
        getattr(chain, method).return_value = chain

    return chain


def _sb_multi(*table_chains: tuple) -> MagicMock:
    mapping = {name: chain for name, chain in table_chains}
    sb = MagicMock()
    sb.table.side_effect = lambda name: mapping.get(name, _chain([]))
    return sb


# ---------------------------------------------------------------------------
# Fixtures base
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def override_user():
    app.dependency_overrides[get_current_user] = _mock_user
    yield
    app.dependency_overrides.pop(get_current_user, None)


def _client(sb: MagicMock) -> TestClient:
    app.dependency_overrides[get_supabase] = lambda: sb
    return TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# GET /market/{league_id}/listings
# ---------------------------------------------------------------------------

def test_get_listings_ok() -> None:
    lm_chain = _chain([MEMBER])
    # First execute: stale check (count=0 → no refresh). Second: active listings.
    ml_chain = _chain([], [LISTING_DETAIL])
    sb = _sb_multi(("league_members", lm_chain), ("market_listings", ml_chain))

    r = _client(sb).get(f"/market/{LEAGUE_ID}/listings")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    assert body[0]["ask_price"] == 12.0
    assert body[0]["players"]["name"] == "Caps"
    assert body[0]["status"] == "active"


def test_get_listings_not_member_returns_403() -> None:
    lm_chain = _chain(None)
    sb = _sb_multi(("league_members", lm_chain))

    r = _client(sb).get(f"/market/{LEAGUE_ID}/listings")
    assert r.status_code == 403


def test_get_listings_empty() -> None:
    lm_chain = _chain([MEMBER])
    # First execute: stale check (count=0 → no refresh). Second: active listings (empty).
    ml_chain = _chain([], [])
    sb = _sb_multi(("league_members", lm_chain), ("market_listings", ml_chain))

    r = _client(sb).get(f"/market/{LEAGUE_ID}/listings")
    assert r.status_code == 200
    assert r.json() == []


# ---------------------------------------------------------------------------
# POST /market/{league_id}/buy
# ---------------------------------------------------------------------------

def test_buy_player_ok() -> None:
    lm_chain = _chain([MEMBER], None)
    ml_chain = _chain([LISTING], None)
    ro_chain = _chain([ROSTER])
    rp_chain = _chain([], [], [ROSTER_PLAYER])
    tx_chain = _chain([TRANSACTION])

    sb = _sb_multi(
        ("league_members", lm_chain),
        ("market_listings", ml_chain),
        ("rosters", ro_chain),
        ("roster_players", rp_chain),
        ("transactions", tx_chain),
    )

    r = _client(sb).post(
        f"/market/{LEAGUE_ID}/buy",
        json={"listing_id": LISTING_ID},
    )
    assert r.status_code == 201
    assert r.json()["type"] == "buy"
    assert r.json()["price"] == 12.0


def test_buy_player_with_candidate_removes_it() -> None:
    listing_with_candidate = {**LISTING, "candidate_id": CANDIDATE_ID}
    lm_chain = _chain([MEMBER], None)
    ml_chain = _chain([listing_with_candidate], None)
    ro_chain = _chain([ROSTER])
    rp_chain = _chain([], [], [ROSTER_PLAYER])
    tx_chain = _chain([TRANSACTION])
    mc_chain = _chain(None)  # delete candidate

    sb = _sb_multi(
        ("league_members", lm_chain),
        ("market_listings", ml_chain),
        ("rosters", ro_chain),
        ("roster_players", rp_chain),
        ("transactions", tx_chain),
        ("market_candidates", mc_chain),
    )

    r = _client(sb).post(
        f"/market/{LEAGUE_ID}/buy",
        json={"listing_id": LISTING_ID},
    )
    assert r.status_code == 201


def test_buy_player_not_member_returns_403() -> None:
    lm_chain = _chain(None)
    sb = _sb_multi(("league_members", lm_chain))

    r = _client(sb).post(
        f"/market/{LEAGUE_ID}/buy",
        json={"listing_id": LISTING_ID},
    )
    assert r.status_code == 403


def test_buy_listing_not_found_returns_404() -> None:
    lm_chain = _chain([MEMBER])
    ml_chain = _chain(None)
    sb = _sb_multi(("league_members", lm_chain), ("market_listings", ml_chain))

    r = _client(sb).post(
        f"/market/{LEAGUE_ID}/buy",
        json={"listing_id": LISTING_ID},
    )
    assert r.status_code == 404


def test_buy_insufficient_budget_returns_402() -> None:
    poor_member = {**MEMBER, "remaining_budget": 5.0}
    lm_chain = _chain([poor_member])
    ml_chain = _chain([LISTING])
    sb = _sb_multi(("league_members", lm_chain), ("market_listings", ml_chain))

    r = _client(sb).post(
        f"/market/{LEAGUE_ID}/buy",
        json={"listing_id": LISTING_ID},
    )
    assert r.status_code == 402


def test_buy_already_owned_returns_409() -> None:
    lm_chain = _chain([MEMBER])
    ml_chain = _chain([LISTING], None)
    ro_chain = _chain([ROSTER])
    rp_chain = _chain([ROSTER_PLAYER])
    sb = _sb_multi(
        ("league_members", lm_chain),
        ("market_listings", ml_chain),
        ("rosters", ro_chain),
        ("roster_players", rp_chain),
    )

    r = _client(sb).post(
        f"/market/{LEAGUE_ID}/buy",
        json={"listing_id": LISTING_ID},
    )
    assert r.status_code == 409


def test_buy_roster_full_returns_409() -> None:
    """Fichar con el equipo completo (8/8 slots ocupados) devuelve 409."""
    lm_chain = _chain([MEMBER])
    ml_chain = _chain([LISTING], None)
    ro_chain = _chain([ROSTER])
    all_slots = [{"slot": s} for s in [
        "starter_1", "starter_2", "starter_3", "starter_4", "starter_5",
        "coach", "bench_1", "bench_2",
    ]]
    rp_chain = _chain([], all_slots)  # owned check: vacío; occupied: completo
    sb = _sb_multi(
        ("league_members", lm_chain),
        ("market_listings", ml_chain),
        ("rosters", ro_chain),
        ("roster_players", rp_chain),
    )

    r = _client(sb).post(
        f"/market/{LEAGUE_ID}/buy",
        json={"listing_id": LISTING_ID},
    )
    assert r.status_code == 409


def test_buy_invalid_listing_id_returns_422() -> None:
    sb = _sb_multi(("league_members", _chain([MEMBER])))

    r = _client(sb).post(
        f"/market/{LEAGUE_ID}/buy",
        json={"listing_id": "not-a-valid-uuid"},
    )
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# POST /market/{league_id}/sell (sell intent)
# ---------------------------------------------------------------------------

def test_sell_intent_ok() -> None:
    lm_chain = _chain([MEMBER])
    ro_chain = _chain([ROSTER])
    rp_chain = _chain([ROSTER_PLAYER], None)  # ownership, update

    sb = _sb_multi(
        ("league_members", lm_chain),
        ("rosters", ro_chain),
        ("roster_players", rp_chain),
    )

    r = _client(sb).post(
        f"/market/{LEAGUE_ID}/sell",
        json={"roster_player_id": ROSTER_PLAYER_ID},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["for_sale"] is True
    assert body["player_id"] == PLAYER_ID


def test_sell_intent_not_member_returns_403() -> None:
    lm_chain = _chain(None)
    sb = _sb_multi(("league_members", lm_chain))

    r = _client(sb).post(
        f"/market/{LEAGUE_ID}/sell",
        json={"roster_player_id": ROSTER_PLAYER_ID},
    )
    assert r.status_code == 403


def test_sell_intent_no_roster_returns_404() -> None:
    lm_chain = _chain([MEMBER])
    ro_chain = _chain(None)
    sb = _sb_multi(("league_members", lm_chain), ("rosters", ro_chain))

    r = _client(sb).post(
        f"/market/{LEAGUE_ID}/sell",
        json={"roster_player_id": ROSTER_PLAYER_ID},
    )
    assert r.status_code == 404


def test_sell_intent_player_not_owned_returns_404() -> None:
    lm_chain = _chain([MEMBER])
    ro_chain = _chain([ROSTER])
    rp_chain = _chain(None)
    sb = _sb_multi(
        ("league_members", lm_chain),
        ("rosters", ro_chain),
        ("roster_players", rp_chain),
    )

    r = _client(sb).post(
        f"/market/{LEAGUE_ID}/sell",
        json={"roster_player_id": ROSTER_PLAYER_ID},
    )
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /market/{league_id}/sell (cancel intent)
# ---------------------------------------------------------------------------

def test_cancel_sell_intent_ok() -> None:
    lm_chain = _chain([MEMBER])
    ro_chain = _chain([ROSTER])
    rp_chain = _chain([ROSTER_PLAYER], None)

    sb = _sb_multi(
        ("league_members", lm_chain),
        ("rosters", ro_chain),
        ("roster_players", rp_chain),
    )

    r = _client(sb).request(
        "DELETE",
        f"/market/{LEAGUE_ID}/sell",
        json={"roster_player_id": ROSTER_PLAYER_ID},
    )
    assert r.status_code == 200
    assert r.json()["for_sale"] is False


def test_cancel_sell_intent_not_found_returns_404() -> None:
    lm_chain = _chain([MEMBER])
    ro_chain = _chain([ROSTER])
    rp_chain = _chain(None)
    sb = _sb_multi(
        ("league_members", lm_chain),
        ("rosters", ro_chain),
        ("roster_players", rp_chain),
    )

    r = _client(sb).request(
        "DELETE",
        f"/market/{LEAGUE_ID}/sell",
        json={"roster_player_id": ROSTER_PLAYER_ID},
    )
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# GET /market/{league_id}/sell-offers
# ---------------------------------------------------------------------------

def test_get_sell_offers_ok() -> None:
    lm_chain = _chain([MEMBER])
    so_chain = _chain([SELL_OFFER])
    sb = _sb_multi(("league_members", lm_chain), ("sell_offers", so_chain))

    r = _client(sb).get(f"/market/{LEAGUE_ID}/sell-offers")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["ask_price"] == 12.0
    assert body[0]["player"]["name"] == "Caps"


def test_get_sell_offers_empty() -> None:
    lm_chain = _chain([MEMBER])
    so_chain = _chain([])
    sb = _sb_multi(("league_members", lm_chain), ("sell_offers", so_chain))

    r = _client(sb).get(f"/market/{LEAGUE_ID}/sell-offers")
    assert r.status_code == 200
    assert r.json() == []


# ---------------------------------------------------------------------------
# POST /market/{league_id}/sell-offers/{offer_id}/accept
# ---------------------------------------------------------------------------

SELL_OFFER_DB = {
    "id": OFFER_ID,
    "roster_player_id": ROSTER_PLAYER_ID,
    "player_id": PLAYER_ID,
    "ask_price": 12.0,
    "status": "pending",
}

SELL_TX = {
    "id": str(uuid4()),
    "league_id": LEAGUE_ID,
    "buyer_id": None,
    "seller_id": MEMBER_ID,
    "player_id": PLAYER_ID,
    "type": "sell",
    "price": 12.0,
    "executed_at": "2026-03-03T00:00:00+00:00",
}


def test_accept_sell_offer_ok() -> None:
    lm_chain = _chain([MEMBER])
    # sell_offers: 1) get offer, 2) update status
    so_chain = _chain([SELL_OFFER_DB], None)
    # roster_players: delete
    rp_chain = _chain(None)
    # market_candidates: insert
    mc_chain = _chain([CANDIDATE])
    # transactions: insert
    tx_chain = _chain([SELL_TX])

    sb = _sb_multi(
        ("league_members", lm_chain),
        ("sell_offers", so_chain),
        ("roster_players", rp_chain),
        ("market_candidates", mc_chain),
        ("transactions", tx_chain),
    )

    r = _client(sb).post(f"/market/{LEAGUE_ID}/sell-offers/{OFFER_ID}/accept")
    assert r.status_code == 201
    assert r.json()["type"] == "sell"


def test_accept_sell_offer_not_found_returns_404() -> None:
    lm_chain = _chain([MEMBER])
    so_chain = _chain(None)
    sb = _sb_multi(("league_members", lm_chain), ("sell_offers", so_chain))

    r = _client(sb).post(f"/market/{LEAGUE_ID}/sell-offers/{OFFER_ID}/accept")
    assert r.status_code == 404


def test_accept_sell_offer_already_accepted_returns_409() -> None:
    lm_chain = _chain([MEMBER])
    so_chain = _chain([{**SELL_OFFER_DB, "status": "accepted"}])
    sb = _sb_multi(("league_members", lm_chain), ("sell_offers", so_chain))

    r = _client(sb).post(f"/market/{LEAGUE_ID}/sell-offers/{OFFER_ID}/accept")
    assert r.status_code == 409


# ---------------------------------------------------------------------------
# POST /market/{league_id}/sell-offers/{offer_id}/reject
# ---------------------------------------------------------------------------

SELL_OFFER_WITH_RP = {
    "id": OFFER_ID,
    "roster_player_id": ROSTER_PLAYER_ID,
    "status": "pending",
}


def test_reject_sell_offer_ok() -> None:
    lm_chain = _chain([MEMBER])
    so_chain = _chain([SELL_OFFER_WITH_RP], None)
    rp_chain = _chain(None)

    sb = _sb_multi(
        ("league_members", lm_chain),
        ("sell_offers", so_chain),
        ("roster_players", rp_chain),
    )

    r = _client(sb).post(f"/market/{LEAGUE_ID}/sell-offers/{OFFER_ID}/reject")
    assert r.status_code == 200
    assert "rechazada" in r.json()["message"]


def test_reject_sell_offer_not_found_returns_404() -> None:
    lm_chain = _chain([MEMBER])
    so_chain = _chain(None)
    sb = _sb_multi(("league_members", lm_chain), ("sell_offers", so_chain))

    r = _client(sb).post(f"/market/{LEAGUE_ID}/sell-offers/{OFFER_ID}/reject")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# GET /market/{league_id}/candidates
# ---------------------------------------------------------------------------

def test_get_candidates_ok() -> None:
    lm_chain = _chain([MEMBER])
    mc_chain = _chain([CANDIDATE])
    sb = _sb_multi(("league_members", lm_chain), ("market_candidates", mc_chain))

    r = _client(sb).get(f"/market/{LEAGUE_ID}/candidates")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["ask_price"] == 12.0


def test_get_candidates_empty() -> None:
    lm_chain = _chain([MEMBER])
    mc_chain = _chain([])
    sb = _sb_multi(("league_members", lm_chain), ("market_candidates", mc_chain))

    r = _client(sb).get(f"/market/{LEAGUE_ID}/candidates")
    assert r.status_code == 200
    assert r.json() == []
