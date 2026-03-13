from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from auth.dependencies import get_current_user, get_supabase

router = APIRouter()


class SplitOut(BaseModel):
    id: UUID
    name: str
    competition: str
    start_date: str | None
    end_date: str | None
    reset_date: str | None
    is_active: bool


class HistoricalStatsOut(BaseModel):
    split_id: UUID
    split_name: str
    games_played: int
    wins: int
    kills: int
    deaths: int
    assists: int
    kda: float | None
    cspm: float | None
    dpm: float | None
    damage_pct: float | None
    kill_participation: float | None
    wards_per_min: float | None


@router.get("/", response_model=list[SplitOut])
async def list_splits(
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_current_user),
) -> list[SplitOut]:
    resp = (
        supabase.table("splits")
        .select("id, name, competition, start_date, end_date, reset_date, is_active")
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data or []


@router.get("/active", response_model=SplitOut | None)
async def get_active_split(
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_current_user),
) -> SplitOut | None:
    resp = (
        supabase.table("splits")
        .select("id, name, competition, start_date, end_date, reset_date, is_active")
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    return resp.data[0] if resp.data else None


@router.get("/player/{player_id}/history", response_model=list[HistoricalStatsOut])
async def get_player_split_history(
    player_id: UUID,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_current_user),
) -> list[HistoricalStatsOut]:
    """Estadísticas históricas agregadas por split de un jugador."""
    resp = (
        supabase.table("player_historical_stats")
        .select(
            "split_id, games_played, wins, kills, deaths, assists, kda,"
            " cspm, dpm, damage_pct, kill_participation, wards_per_min,"
            " splits(name)"
        )
        .eq("player_id", str(player_id))
        .execute()
    )
    result = []
    for row in (resp.data or []):
        result.append(HistoricalStatsOut(
            split_id=row["split_id"],
            split_name=row["splits"]["name"] if row.get("splits") else "Unknown",
            games_played=row["games_played"],
            wins=row["wins"],
            kills=row["kills"],
            deaths=row["deaths"],
            assists=row["assists"],
            kda=row.get("kda"),
            cspm=row.get("cspm"),
            dpm=row.get("dpm"),
            damage_pct=row.get("damage_pct"),
            kill_participation=row.get("kill_participation"),
            wards_per_min=row.get("wards_per_min"),
        ))
    return result
