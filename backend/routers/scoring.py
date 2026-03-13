from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from auth.dependencies import get_current_user, get_supabase

router = APIRouter()


class LeaderboardEntry(BaseModel):
    rank: int
    member_id: UUID
    display_name: str | None
    total_points: float
    remaining_budget: float
    player_count: int


def _check_membership(supabase: Client, league_id: str, user_id: str) -> None:
    resp = (
        supabase.table("league_members")
        .select("id")
        .eq("league_id", league_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No eres miembro de esta liga")


@router.get("/leaderboard/{league_id}", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    league_id: UUID,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_current_user),
) -> list[LeaderboardEntry]:
    _check_membership(supabase, str(league_id), user["id"])

    members_resp = (
        supabase.table("league_members")
        .select("id, display_name, total_points, remaining_budget")
        .eq("league_id", str(league_id))
        .order("total_points", desc=True)
        .execute()
    )
    members = members_resp.data or []

    player_counts: dict[str, int] = {}
    for m in members:
        roster_resp = (
            supabase.table("rosters")
            .select("id")
            .eq("member_id", m["id"])
            .execute()
        )
        if roster_resp.data:
            roster_id = roster_resp.data[0]["id"]
            count_resp = (
                supabase.table("roster_players")
                .select("id", count="exact")
                .eq("roster_id", roster_id)
                .execute()
            )
            player_counts[m["id"]] = count_resp.count or 0
        else:
            player_counts[m["id"]] = 0

    return [
        LeaderboardEntry(
            rank=i + 1,
            member_id=m["id"],
            display_name=m.get("display_name"),
            total_points=float(m["total_points"] or 0),
            remaining_budget=float(m["remaining_budget"] or 0),
            player_count=player_counts.get(m["id"], 0),
        )
        for i, m in enumerate(members)
    ]


@router.get("/player/{player_id}/history")
async def get_player_score_history(
    player_id: UUID,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_current_user),
) -> dict:
    """Historial de stats y puntuación de un jugador (últimas 10 partidas)."""
    # Datos básicos del jugador
    player_resp = (
        supabase.table("players")
        .select("id, name, team, role, image_url, current_price")
        .eq("id", str(player_id))
        .execute()
    )
    if not player_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Jugador no encontrado")
    player = player_resp.data[0]

    # Stats recientes
    stats_resp = (
        supabase.table("player_match_stats")
        .select(
            "kills, deaths, assists, cs, vision_score, fantasy_points,"
            " matches(scheduled_at, team_1, team_2)"
        )
        .eq("player_id", str(player_id))
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    stats = stats_resp.data or []

    total_points = sum(float(s.get("fantasy_points") or 0) for s in stats)

    return {"player": player, "stats": stats, "total_points": round(total_points, 2)}
