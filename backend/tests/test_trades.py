"""Tests para /trades — mockean Supabase y get_current_user, sin red."""
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
FROM_MEMBER_ID = str(uuid4())
TO_MEMBER_ID = str(uuid4())
PLAYER_A_ID = str(uuid4())
PLAYER_B_ID = str(uuid4())
OFFER_ID = str(uuid4())
ROSTER_ID_FROM = str(uuid4())
ROSTER_ID_TO = str(uuid4())
RP_A_ID = str(uuid4())  # roster_player del jugador A (pertenece a FROM)
RP_B_ID = str(uuid4())  # roster_player del jugador B (pertenece a TO)

FROM_MEMBER = {"id": FROM_MEMBER_ID, "remaining_budget": 50.0}
TO_MEMBER = {"id": TO_MEMBER_ID, "remaining_budget": 50.0}

TRADE_OFFER = {
    "id": OFFER_ID,
    "league_id": LEAGUE_ID,
    "from_member_id": FROM_MEMBER_ID,
    "to_member_id": TO_MEMBER_ID,
    "offered_player_id": PLAYER_A_ID,
    "requested_player_id": PLAYER_B_ID,
    "offered_money": 0.0,
    "requested_money": 0.0,
    "status": "pending",
    "created_at": "2026-03-03T00:00:00+00:00",
    "expires_at": None,
}

FAKE_USER = {"id": USER_ID, "email": "test@test.com"}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_user() -> dict:
    return FAKE_USER


def _chain(*return_values: object) -> MagicMock:
    results = []
    for val in return_values:
        r = MagicMock()
        r.data = val
        results.append(r)

    call_count = {"n": 0}
    chain = MagicMock()

    def execute_side_effect():
        idx = call_count["n"]
        call_count["n"] += 1
        return results[idx] if idx < len(results) else results[-1]

    chain.execute.side_effect = execute_side_effect
    for method in ("select", "eq", "in_", "insert", "single", "order", "limit",
                   "update", "delete"):
        getattr(chain, method).return_value = chain

    return chain


def _sb_multi(*table_chains: tuple) -> MagicMock:
    mapping = {name: chain for name, chain in table_chains}
    sb = MagicMock()
    sb.table.side_effect = lambda name: mapping.get(name, _chain([]))
    return sb


# ---------------------------------------------------------------------------
# Fixtures
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
# GET /trades/{league_id}
# ---------------------------------------------------------------------------

def test_list_trades_ok() -> None:
    # El usuario es FROM_MEMBER
    lm_chain = _chain(FROM_MEMBER)
    # two queries: from + to (both return same offer to test dedup)
    to_chain = _chain([TRADE_OFFER], [])  # from_resp, to_resp

    sb = _sb_multi(
        ("league_members", lm_chain),
        ("trade_offers", to_chain),
    )

    r = _client(sb).get(f"/trades/{LEAGUE_ID}")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_list_trades_not_member_returns_403() -> None:
    lm_chain = _chain(None)
    sb = _sb_multi(("league_members", lm_chain))

    r = _client(sb).get(f"/trades/{LEAGUE_ID}")
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# POST /trades/{league_id} — crear oferta
# ---------------------------------------------------------------------------

def test_create_trade_ok() -> None:
    # league_members: 1) get from_member, 2) to_member league check
    lm_chain = _chain(FROM_MEMBER, {"id": TO_MEMBER_ID})
    # rosters: 1) roster of from_member, 2) roster of to_member
    ro_chain = _chain({"id": ROSTER_ID_FROM}, {"id": ROSTER_ID_TO})
    # roster_players: 1) player A in from, 2) player B in to
    rp_chain = _chain({"id": RP_A_ID}, {"id": RP_B_ID})
    # insert offer
    to_insert = _chain([TRADE_OFFER])

    sb = _sb_multi(
        ("league_members", lm_chain),
        ("rosters", ro_chain),
        ("roster_players", rp_chain),
        ("trade_offers", to_insert),
    )

    r = _client(sb).post(
        f"/trades/{LEAGUE_ID}",
        json={
            "to_member_id": TO_MEMBER_ID,
            "offered_player_id": PLAYER_A_ID,
            "requested_player_id": PLAYER_B_ID,
        },
    )
    assert r.status_code == 201
    assert r.json()["status"] == "pending"


def test_create_trade_nothing_offered_returns_422() -> None:
    sb = _sb_multi(("league_members", _chain(FROM_MEMBER)))

    r = _client(sb).post(
        f"/trades/{LEAGUE_ID}",
        json={
            "to_member_id": TO_MEMBER_ID,
            "offered_money": 0,
        },
    )
    assert r.status_code == 422


def test_create_trade_not_member_returns_403() -> None:
    lm_chain = _chain(None)
    sb = _sb_multi(("league_members", lm_chain))

    r = _client(sb).post(
        f"/trades/{LEAGUE_ID}",
        json={
            "to_member_id": TO_MEMBER_ID,
            "offered_player_id": PLAYER_A_ID,
        },
    )
    assert r.status_code == 403


def test_create_trade_self_returns_400() -> None:
    member = {**FROM_MEMBER, "id": USER_ID}
    # Override _get_member to return the user's own ID as to_member_id
    lm_chain = _chain({"id": FROM_MEMBER_ID, "remaining_budget": 50.0})
    sb = _sb_multi(("league_members", lm_chain))

    r = _client(sb).post(
        f"/trades/{LEAGUE_ID}",
        json={
            "to_member_id": FROM_MEMBER_ID,  # same as from_member
            "offered_player_id": PLAYER_A_ID,
        },
    )
    assert r.status_code == 400


def test_create_trade_to_not_in_league_returns_400() -> None:
    # league_members: 1) get from_member ok, 2) to_member check → None
    lm_chain = _chain(FROM_MEMBER, None)
    sb = _sb_multi(("league_members", lm_chain))

    r = _client(sb).post(
        f"/trades/{LEAGUE_ID}",
        json={
            "to_member_id": TO_MEMBER_ID,
            "offered_player_id": PLAYER_A_ID,
        },
    )
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# POST /trades/{league_id}/{offer_id}/reject
# ---------------------------------------------------------------------------

def test_reject_trade_ok() -> None:
    # to_member rejects
    lm_chain = _chain(TO_MEMBER)
    to_chain = _chain(TRADE_OFFER, None)

    sb = _sb_multi(
        ("league_members", lm_chain),
        ("trade_offers", to_chain),
    )

    r = _client(sb).post(f"/trades/{LEAGUE_ID}/{OFFER_ID}/reject")
    assert r.status_code == 200
    assert "rechazado" in r.json()["message"]


def test_reject_trade_not_found_returns_404() -> None:
    lm_chain = _chain(TO_MEMBER)
    to_chain = _chain(None)

    sb = _sb_multi(
        ("league_members", lm_chain),
        ("trade_offers", to_chain),
    )

    r = _client(sb).post(f"/trades/{LEAGUE_ID}/{OFFER_ID}/reject")
    assert r.status_code == 404


def test_reject_trade_already_accepted_returns_409() -> None:
    lm_chain = _chain(TO_MEMBER)
    to_chain = _chain({**TRADE_OFFER, "status": "accepted"})

    sb = _sb_multi(
        ("league_members", lm_chain),
        ("trade_offers", to_chain),
    )

    r = _client(sb).post(f"/trades/{LEAGUE_ID}/{OFFER_ID}/reject")
    assert r.status_code == 409


# ---------------------------------------------------------------------------
# DELETE /trades/{league_id}/{offer_id} — cancelar
# ---------------------------------------------------------------------------

def test_cancel_trade_ok() -> None:
    lm_chain = _chain(FROM_MEMBER)
    to_chain = _chain(TRADE_OFFER, None)

    sb = _sb_multi(
        ("league_members", lm_chain),
        ("trade_offers", to_chain),
    )

    r = _client(sb).delete(f"/trades/{LEAGUE_ID}/{OFFER_ID}")
    assert r.status_code == 200
    assert "cancelado" in r.json()["message"]


def test_cancel_trade_not_creator_returns_404() -> None:
    lm_chain = _chain(FROM_MEMBER)
    to_chain = _chain(None)  # offer not found for from_member

    sb = _sb_multi(
        ("league_members", lm_chain),
        ("trade_offers", to_chain),
    )

    r = _client(sb).delete(f"/trades/{LEAGUE_ID}/{OFFER_ID}")
    assert r.status_code == 404


def test_cancel_trade_already_rejected_returns_409() -> None:
    lm_chain = _chain(FROM_MEMBER)
    to_chain = _chain({**TRADE_OFFER, "status": "rejected"})

    sb = _sb_multi(
        ("league_members", lm_chain),
        ("trade_offers", to_chain),
    )

    r = _client(sb).delete(f"/trades/{LEAGUE_ID}/{OFFER_ID}")
    assert r.status_code == 409


# ---------------------------------------------------------------------------
# POST /trades/{league_id}/{offer_id}/accept — flujo completo
# ---------------------------------------------------------------------------

def test_accept_trade_ok_player_swap() -> None:
    """Intercambio de dos jugadores sin dinero."""
    # to_member llama a accept
    lm_chain_to = _chain(TO_MEMBER)

    # trade_offer: pending
    offer = {**TRADE_OFFER, "offered_money": 0, "requested_money": 0}
    to_chain = _chain(offer)

    # from_member lookup
    lm_from = _chain(FROM_MEMBER)

    # rosters: from (para transferir A→to) y to (para transferir B→from)
    ro_chain = _chain({"id": ROSTER_ID_FROM}, {"id": ROSTER_ID_TO}, {"id": ROSTER_ID_FROM})

    # roster_players: find A in from, find B in to
    rp_chain = _chain({"id": RP_A_ID}, {"id": RP_B_ID})

    # transactions + update offer
    tx_chain = _chain([{"id": str(uuid4()), "type": "trade", "price": 0.0,
                        "league_id": LEAGUE_ID, "buyer_id": TO_MEMBER_ID,
                        "seller_id": FROM_MEMBER_ID, "player_id": PLAYER_A_ID,
                        "executed_at": "2026-03-03T00:00:00+00:00"}])
    offer_update_chain = _chain(None)

    sb = _sb_multi(
        ("league_members", _chain(TO_MEMBER, FROM_MEMBER)),
        ("trade_offers", _chain(offer, None)),
        ("rosters", _chain({"id": ROSTER_ID_TO}, {"id": ROSTER_ID_FROM}, {"id": ROSTER_ID_TO})),
        ("roster_players", _chain({"id": RP_A_ID}, None, {"id": RP_B_ID}, None)),
        ("transactions", tx_chain),
    )

    r = _client(sb).post(f"/trades/{LEAGUE_ID}/{OFFER_ID}/accept")
    assert r.status_code == 200
    assert "aceptado" in r.json()["message"]


def test_accept_trade_insufficient_budget_returns_402() -> None:
    """El to_member no tiene presupuesto para pagar el requested_money."""
    poor_to = {**TO_MEMBER, "remaining_budget": 5.0}
    offer = {**TRADE_OFFER, "offered_money": 0, "requested_money": 20.0,
             "offered_player_id": None, "requested_player_id": None}

    sb = _sb_multi(
        ("league_members", _chain(poor_to, FROM_MEMBER)),
        ("trade_offers", _chain(offer)),
    )

    r = _client(sb).post(f"/trades/{LEAGUE_ID}/{OFFER_ID}/accept")
    assert r.status_code == 402
