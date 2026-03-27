import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from auth.dependencies import get_current_user, get_supabase

logger = logging.getLogger(__name__)

router = APIRouter()


class TeamStandingEntry(BaseModel):
    team_id: str
    team_name: str
    logo_url: str | None
    wins: int
    losses: int
    win_rate: float
    avg_kda: float | None
    avg_gold_diff_15: float | None
    avg_dpm: float | None
    avg_cs_per_min: float | None
    games_played: int


class TeamStandingsOut(BaseModel):
    competition_name: str
    entries: list[TeamStandingEntry]


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


@router.get("/standings/{league_id}", response_model=TeamStandingsOut)
def get_team_standings(
    league_id: UUID,
    competition_id: str | None = Query(None),
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_current_user),
) -> TeamStandingsOut:
    """
    Standings reales de LEC teams para el competition activo o el indicado.
    W/L basado en series.winner_id. Stats agregadas desde player_game_stats.
    """
    _check_membership(supabase, str(league_id), user["id"])

    # 1. Encontrar la competition — por id si se provee, sino la activa
    if competition_id:
        comp_resp = (
            supabase.table("competitions")
            .select("id, name")
            .eq("id", competition_id)
            .limit(1)
            .execute()
        )
    else:
        comp_resp = (
            supabase.table("competitions")
            .select("id, name")
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
    if not comp_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay competición activa")

    competition = comp_resp.data[0]
    competition_id = competition["id"]
    competition_name = competition["name"]

    # 2. Traer todos los equipos de esa competition (históricos también)
    teams_resp = (
        supabase.table("teams")
        .select("id, name, logo_url")
        .eq("competition_id", competition_id)
        .execute()
    )
    teams = teams_resp.data or []
    if not teams:
        return TeamStandingsOut(competition_name=competition_name, entries=[])

    team_ids = [t["id"] for t in teams]
    teams_by_id = {t["id"]: t for t in teams}

    # 3. Traer series finalizadas para contar W/L
    # series_status = 'finished' (ver migration 20260314100000)
    series_resp = (
        supabase.table("series")
        .select("id, team_home_id, team_away_id, winner_id, status")
        .eq("competition_id", competition_id)
        .eq("status", "finished")
        .execute()
    )
    series_list = series_resp.data or []

    # Acumuladores de W/L por equipo
    wins: dict[str, int] = {tid: 0 for tid in team_ids}
    losses: dict[str, int] = {tid: 0 for tid in team_ids}

    for s in series_list:
        home = s.get("team_home_id")
        away = s.get("team_away_id")
        winner = s.get("winner_id")

        if winner and home and away:
            loser = away if winner == home else home
            if winner in wins:
                wins[winner] += 1
            if loser in losses:
                losses[loser] += 1

    # 4. Traer player_game_stats para todos los jugadores de los equipos en la competition
    # Necesitamos player.team (nombre del equipo) para agrupar por equipo
    # Obtenemos todos los jugadores activos de los equipos de la competition
    players_resp = (
        supabase.table("players")
        .select("id, team")
        .eq("is_active", True)
        .execute()
    )
    all_players = players_resp.data or []

    # Mapear player_id -> team_name (solo players cuyos teams estén en la competition)
    team_name_to_id = {t["name"]: t["id"] for t in teams}
    player_to_team_id: dict[str, str] = {}
    for p in all_players:
        team_name = p.get("team") or ""
        tid = team_name_to_id.get(team_name)
        if tid:
            player_to_team_id[p["id"]] = tid

    player_ids_in_competition = list(player_to_team_id.keys())

    # Acumuladores de stats por equipo
    team_stats_raw: dict[str, dict] = {
        tid: {
            "kills": [],
            "deaths": [],
            "assists": [],
            "gold_diff_15": [],
            "dpm": [],
            "cs_per_min": [],
        }
        for tid in team_ids
    }

    games_played_per_team: dict[str, set] = {tid: set() for tid in team_ids}

    if player_ids_in_competition:
        # Fetch player_game_stats filtrado por competition via games → series join
        pgs_resp = (
            supabase.table("player_game_stats")
            .select("player_id, game_id, kills, deaths, assists, gold_diff_15, dpm, cs_per_min, games(series(competition_id))")
            .in_("player_id", player_ids_in_competition)
            .execute()
        )
        for row in (pgs_resp.data or []):
            game = row.get("games") or {}
            series_data = game.get("series") or {}
            if str(series_data.get("competition_id") or "") != str(competition_id):
                continue

            pid = row["player_id"]
            tid = player_to_team_id.get(pid)
            if not tid:
                continue

            acc = team_stats_raw[tid]
            game_id = row.get("game_id")
            if game_id:
                games_played_per_team[tid].add(game_id)

            if row.get("kills") is not None:
                acc["kills"].append(float(row["kills"]))
            if row.get("deaths") is not None:
                acc["deaths"].append(float(row["deaths"]))
            if row.get("assists") is not None:
                acc["assists"].append(float(row["assists"]))
            if row.get("gold_diff_15") is not None:
                acc["gold_diff_15"].append(float(row["gold_diff_15"]))
            if row.get("dpm") is not None:
                acc["dpm"].append(float(row["dpm"]))
            if row.get("cs_per_min") is not None:
                acc["cs_per_min"].append(float(row["cs_per_min"]))

    # 5. Armar la respuesta
    def _safe_avg(values: list[float]) -> float | None:
        return round(sum(values) / len(values), 2) if values else None

    entries: list[TeamStandingEntry] = []
    for tid in team_ids:
        acc = team_stats_raw[tid]
        w = wins[tid]
        l = losses[tid]
        total = w + l
        win_rate = round(w / total, 3) if total > 0 else 0.0

        avg_kills = _safe_avg(acc["kills"])
        avg_deaths = _safe_avg(acc["deaths"])
        avg_assists = _safe_avg(acc["assists"])
        avg_gold_diff_15 = _safe_avg(acc["gold_diff_15"])
        avg_dpm = _safe_avg(acc["dpm"])
        avg_cs_per_min = _safe_avg(acc["cs_per_min"])

        if avg_kills is not None and avg_assists is not None:
            _deaths = avg_deaths if avg_deaths and avg_deaths > 0 else 1.0
            avg_kda: float | None = round((avg_kills + avg_assists) / _deaths, 2)
        else:
            avg_kda = None

        games_played = len(games_played_per_team[tid])

        entries.append(
            TeamStandingEntry(
                team_id=tid,
                team_name=teams_by_id[tid]["name"],
                logo_url=teams_by_id[tid].get("logo_url"),
                wins=w,
                losses=l,
                win_rate=win_rate,
                avg_kda=avg_kda,
                avg_gold_diff_15=avg_gold_diff_15,
                avg_dpm=avg_dpm,
                avg_cs_per_min=avg_cs_per_min,
                games_played=games_played,
            )
        )

    # Ordenar: wins DESC, win_rate DESC
    entries.sort(key=lambda e: (-e.wins, -e.win_rate))

    return TeamStandingsOut(competition_name=competition_name, entries=entries)
