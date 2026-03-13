from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from auth.dependencies import get_supabase

router = APIRouter()

Role = Literal["top", "jungle", "mid", "adc", "support", "coach"]


class PlayerOut(BaseModel):
    id: UUID
    name: str
    team: str
    role: Role
    league: str
    current_price: float
    image_url: str | None
    is_active: bool


@router.get("/", response_model=list[PlayerOut])
async def list_players(
    role: Role | None = Query(None),
    team: str | None = Query(None),
    league: str = Query("LEC"),
    supabase: Client = Depends(get_supabase),
) -> list[PlayerOut]:
    query = supabase.table("players").select(
        "id, name, team, role, league, current_price, image_url, is_active"
    ).eq("league", league).eq("is_active", True)

    if role:
        query = query.eq("role", role)
    if team:
        query = query.eq("team", team)

    response = query.order("team").order("role").execute()
    return response.data


@router.get("/{player_id}", response_model=PlayerOut)
async def get_player(
    player_id: UUID,
    supabase: Client = Depends(get_supabase),
) -> PlayerOut:
    response = (
        supabase.table("players")
        .select("id, name, team, role, league, current_price, image_url, is_active")
        .eq("id", str(player_id))
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Jugador no encontrado")
    return response.data
