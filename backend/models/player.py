from pydantic import BaseModel
from typing import Literal

Role = Literal["top", "jungle", "mid", "adc", "support", "coach"]


class PlayerBase(BaseModel):
    name: str
    team: str
    role: Role
    current_price: float
    price_history: list[dict] = []  # JSONB en DB, no tabla separada


class PlayerResponse(PlayerBase):
    id: str
    avg_points: float = 0.0


class PlayerMatchStatsResponse(BaseModel):
    player_id: str
    match_id: str
    match_points: float
    kills: int
    deaths: int
    assists: int
    cs_per_min: float
