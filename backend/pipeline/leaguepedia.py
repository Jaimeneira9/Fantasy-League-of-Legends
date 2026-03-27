"""
Cliente Leaguepedia (MediaWiki Cargo API).

Responsabilidad única: detectar partidas LEC terminadas.
NO extrae stats de jugadores — eso es responsabilidad de Oracle's Elixir.
"""
import logging
import time
from datetime import datetime

import httpx
from pydantic import BaseModel

logger = logging.getLogger(__name__)

CARGO_API = "https://lol.fandom.com/api.php"
HEADERS = {"User-Agent": "SummonersFantasy/1.0 (fantasy league project)"}
REQUEST_DELAY_S = 1.5
MAX_RETRIES = 3


class GameSummary(BaseModel):
    game_id: str                   # Leaguepedia GameId, ej: "ESPORTSTMNT01_1234"
    riot_platform_game_id: str     # Para cruzar con Oracle's Elixir, ej: "EUW1_7123456"
    team1: str
    team2: str
    winner: int                    # 1 o 2
    duration_min: float            # Gamelength_Number
    scheduled_at: datetime         # DateTime_UTC
    team1_picks: list[str]
    team2_picks: list[str]
    team1_bans: list[str]
    team2_bans: list[str]


class LeaguepediaClient:
    def __init__(self) -> None:
        self._client = httpx.Client(headers=HEADERS, timeout=30)

    def _cargo_query(
        self,
        tables: str,
        fields: str,
        where: str,
        order_by: str = "",
        limit: int = 50,
    ) -> list[dict]:
        """Ejecuta una consulta Cargo con paginación y retry automático."""
        results: list[dict] = []
        offset = 0

        while True:
            params: dict = {
                "action": "cargoquery",
                "format": "json",
                "tables": tables,
                "fields": fields,
                "where": where,
                "limit": str(limit),
                "offset": str(offset),
            }
            if order_by:
                params["order_by"] = order_by

            for attempt in range(MAX_RETRIES):
                try:
                    resp = self._client.get(CARGO_API, params=params)
                    resp.raise_for_status()
                    data = resp.json()
                    break
                except (httpx.HTTPError, Exception) as exc:
                    if attempt == MAX_RETRIES - 1:
                        logger.error("Cargo query failed after %d retries: %s", MAX_RETRIES, exc)
                        raise
                    logger.warning("Cargo query attempt %d failed: %s", attempt + 1, exc)
                    time.sleep(1.0 * (attempt + 1))

            page_results = [item["title"] for item in data.get("cargoquery", [])]
            results.extend(page_results)

            if len(page_results) < limit:
                break

            offset += limit
            time.sleep(REQUEST_DELAY_S)

        return results

    def list_recent_tournaments(self, league_contains: str = "LEC", limit: int = 10) -> list[dict]:
        """
        Método de diagnóstico: devuelve los torneos más recientes cuyo
        OverviewPage contiene `league_contains`.
        """
        today = datetime.utcnow().strftime("%Y-%m-%d")
        return self._cargo_query(
            tables="Tournaments",
            fields="OverviewPage,League,DateStart,Date,IsPlayoffs",
            where=(
                f'Tournaments.OverviewPage LIKE "%{league_contains}%"'
                f' AND Tournaments.DateStart<="{today}"'
            ),
            order_by="Tournaments.DateStart DESC",
            limit=limit,
        )

    def get_active_tournament(self, league: str = "LEC") -> str:
        """
        Devuelve el OverviewPage del torneo LEC activo (season o playoffs).
        Fallback: torneo más reciente si estamos entre splits.

        Nota: el campo League no es filtrable directamente en Cargo (es un
        wikilink). Se filtra por OverviewPage LIKE "LEC/%" que identifica
        unívocamente los torneos de la LEC.
        """
        today = datetime.utcnow().strftime("%Y-%m-%d")
        league_filter = f'Tournaments.OverviewPage LIKE "%{league}/%"'

        # 1. Torneo en curso ahora mismo (DateStart <= hoy <= Date)
        result = self._cargo_query(
            tables="Tournaments",
            fields="OverviewPage,League,DateStart,Date",
            where=(
                f'{league_filter}'
                f' AND Tournaments.DateStart<="{today}"'
                f' AND Tournaments.Date>="{today}"'
            ),
            order_by="Tournaments.DateStart DESC",
            limit=1,
        )
        if result:
            logger.info("Active tournament: %s", result[0]["OverviewPage"])
            return result[0]["OverviewPage"]

        # 2. Fallback: torneo más reciente (entre splits)
        result = self._cargo_query(
            tables="Tournaments",
            fields="OverviewPage,League,DateStart,Date",
            where=(
                f'{league_filter}'
                f' AND Tournaments.DateStart<="{today}"'
            ),
            order_by="Tournaments.Date DESC",
            limit=1,
        )
        if result:
            logger.info("Most recent tournament: %s", result[0]["OverviewPage"])
            return result[0]["OverviewPage"]

        raise RuntimeError(f"No active or recent tournament found for league: {league}")

    def get_recent_games(
        self,
        overview_page: str,
        since: datetime | None = None,
    ) -> list[GameSummary]:
        """
        Devuelve las partidas terminadas en el torneo dado.
        Si `since` se proporciona, solo devuelve partidas posteriores a esa fecha.
        """
        where = f'ScoreboardGames.OverviewPage="{overview_page}"'
        if since:
            since_str = since.strftime("%Y-%m-%d %H:%M:%S")
            where += f' AND ScoreboardGames.DateTime_UTC>"{since_str}"'

        rows = self._cargo_query(
            tables="ScoreboardGames",
            fields=(
                "ScoreboardGames.GameId=game_id,"
                "ScoreboardGames.RiotPlatformGameId=riot_platform_game_id,"
                "ScoreboardGames.Team1=team1,"
                "ScoreboardGames.Team2=team2,"
                "ScoreboardGames.Winner=winner,"
                "ScoreboardGames.Gamelength_Number=duration_min,"
                "ScoreboardGames.DateTime_UTC=scheduled_at,"
                "ScoreboardGames.Team1Picks=team1_picks,"
                "ScoreboardGames.Team2Picks=team2_picks,"
                "ScoreboardGames.Team1Bans=team1_bans,"
                "ScoreboardGames.Team2Bans=team2_bans"
            ),
            where=where,
            order_by="ScoreboardGames.DateTime_UTC DESC",
            limit=50,
        )

        games: list[GameSummary] = []
        for row in rows:
            try:
                game = GameSummary(
                    game_id=row.get("game_id") or "",
                    riot_platform_game_id=row.get("riot_platform_game_id") or "",
                    team1=row.get("team1") or "",
                    team2=row.get("team2") or "",
                    winner=int(row.get("winner") or 0),
                    duration_min=float(row.get("duration_min") or 0),
                    scheduled_at=datetime.fromisoformat(row["scheduled_at"].replace(" ", "T"))
                    if row.get("scheduled_at")
                    else datetime.utcnow(),
                    team1_picks=_parse_pipe_list(row.get("team1_picks")),
                    team2_picks=_parse_pipe_list(row.get("team2_picks")),
                    team1_bans=_parse_pipe_list(row.get("team1_bans")),
                    team2_bans=_parse_pipe_list(row.get("team2_bans")),
                )
                # Omitir partidas sin riot_platform_game_id (no se pueden cruzar con OE)
                if game.game_id:
                    games.append(game)
            except Exception as exc:
                logger.warning("Could not parse game row %s: %s", row, exc)

        logger.info("Found %d games for %s (since=%s)", len(games), overview_page, since)
        return games

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "LeaguepediaClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()


def _parse_pipe_list(value: str | None) -> list[str]:
    """Convierte 'A,B,C' o 'A|B|C' en ['A', 'B', 'C']."""
    if not value:
        return []
    sep = "|" if "|" in value else ","
    return [v.strip() for v in value.split(sep) if v.strip()]
