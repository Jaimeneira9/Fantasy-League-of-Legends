"""
Cliente Oracle's Elixir.

Responsabilidad única: descargar el CSV anual de Oracle's Elixir,
filtrar a LEC y extraer stats definitivas por partida.
"""
import io
import logging
import os
import xml.etree.ElementTree as ET
from pathlib import Path

import httpx
import pandas as pd
from pydantic import BaseModel

DATA_DIR = Path(__file__).parent.parent / "data"

logger = logging.getLogger(__name__)

S3_BASE = "https://oracleselixir-downloadable-match-data.s3-us-west-2.amazonaws.com"

# Mapeo de posiciones Oracle's Elixir → scoring engine
POSITION_MAP = {
    "top": "top",
    "jng": "jungle",
    "mid": "mid",
    "bot": "adc",
    "sup": "support",
}


class PlayerStats(BaseModel):
    gameid: str
    playername: str
    position: str          # Normalizado: top/jungle/mid/adc/support
    champion: str
    kills: int
    deaths: int
    assists: int
    cs_per_min: float      # minionkills / (gamelength / 60)
    gold_diff_15: int | None
    damage_share: float    # columna "damageshare"
    vision_score: int      # columna "visionscore"
    objective_steals: int  # columna "monsterkillsenemyjungle"
    result: int            # 0 o 1


class OraclesElixirClient:
    def __init__(self) -> None:
        self._client = httpx.Client(timeout=120, follow_redirects=True)

    def _find_local_csv(self, year: int) -> Path | None:
        """
        Busca en DATA_DIR un CSV que coincida con {year}_LoL_esports_match_data*.csv.
        Devuelve el path más reciente (por nombre) o None si no hay ninguno.
        """
        if not DATA_DIR.is_dir():
            return None
        matches = sorted(DATA_DIR.glob(f"{year}_LoL_esports_match_data*.csv"))
        if matches:
            logger.info("Found local Oracle's Elixir CSV: %s", matches[-1])
            return matches[-1]
        return None

    def _discover_csv_url(self, year: int) -> str:
        """
        Descubre la URL del CSV más reciente del año dado via S3 XML listing.
        Fallback final: ORACLES_ELIXIR_CSV_URL env var.
        """
        list_url = f"{S3_BASE}/?prefix={year}&max-keys=10"
        try:
            resp = self._client.get(list_url)
            resp.raise_for_status()
            root = ET.fromstring(resp.text)
            ns = {"s3": "http://s3.amazonaws.com/doc/2006-03-01/"}
            keys = [el.text for el in root.findall(".//s3:Key", ns) if el.text and el.text.endswith(".csv")]
            if not keys:
                # Algunos buckets no usan namespace
                keys = [el.text for el in root.findall(".//Key") if el.text and el.text.endswith(".csv")]
            if keys:
                key = sorted(keys)[-1]  # más reciente por nombre
                url = f"{S3_BASE}/{key}"
                logger.info("Discovered Oracle's Elixir CSV: %s", url)
                return url
        except Exception as exc:
            logger.warning("S3 discovery failed: %s", exc)

        # Fallback: variable de entorno
        env_url = os.getenv("ORACLES_ELIXIR_CSV_URL")
        if env_url:
            logger.info("Using ORACLES_ELIXIR_CSV_URL from env: %s", env_url)
            return env_url

        fallback = f"{S3_BASE}/{year}_LoL_esports_match_data_from_OraclesElixir.csv"
        logger.info("Using fallback CSV URL: %s", fallback)
        return fallback

    def download_lec_dataframe(self, year: int) -> pd.DataFrame:
        """
        Carga el CSV de Oracle's Elixir (local → S3 → env var), filtra a LEC
        y filas de jugadores. Devuelve un DataFrame listo para `get_stats_for_game`.
        """
        local_path = self._find_local_csv(year)
        if local_path:
            df = pd.read_csv(local_path, low_memory=False)
            logger.info("Loaded local CSV: %d rows, %d columns", len(df), len(df.columns))
        else:
            url = self._discover_csv_url(year)
            logger.info("Downloading Oracle's Elixir CSV from %s", url)
            resp = self._client.get(url)
            resp.raise_for_status()
            df = pd.read_csv(io.BytesIO(resp.content), low_memory=False)
            logger.info("Downloaded CSV: %d rows, %d columns", len(df), len(df.columns))

        # Filtrar solo LEC y solo filas de jugadores (no filas de equipo)
        lec_mask = df["league"].str.upper() == "LEC"
        player_mask = df["position"].str.lower() != "team"
        df_lec = df[lec_mask & player_mask].copy()

        logger.info("LEC player rows: %d", len(df_lec))
        return df_lec

    def get_stats_for_game(
        self,
        df: pd.DataFrame,
        riot_game_id: str,
    ) -> list[PlayerStats]:
        """
        Extrae las stats de los jugadores de una partida concreta.
        `riot_game_id` debe coincidir con la columna `gameid` del CSV.
        """
        game_df = df[df["gameid"] == riot_game_id]
        if game_df.empty:
            logger.debug("No rows found for gameid=%s", riot_game_id)
            return []

        stats_list: list[PlayerStats] = []
        for _, row in game_df.iterrows():
            try:
                position_raw = str(row.get("position", "")).lower()
                position = POSITION_MAP.get(position_raw, position_raw)

                gamelength = float(row.get("gamelength", 0) or 0)
                minionkills = float(row.get("minionkills", 0) or 0)
                cs_per_min = (minionkills / (gamelength / 60)) if gamelength > 0 else 0.0

                gold_diff_raw = row.get("golddiffat15")
                gold_diff_15: int | None = None
                if pd.notna(gold_diff_raw):
                    gold_diff_15 = int(gold_diff_raw)

                stats = PlayerStats(
                    gameid=str(row.get("gameid", "")),
                    playername=str(row.get("playername", "")),
                    position=position,
                    champion=str(row.get("champion", "")),
                    kills=int(row.get("kills", 0) or 0),
                    deaths=int(row.get("deaths", 0) or 0),
                    assists=int(row.get("assists", 0) or 0),
                    cs_per_min=round(cs_per_min, 2),
                    gold_diff_15=gold_diff_15,
                    damage_share=float(row.get("damageshare", 0) or 0),
                    vision_score=int(row.get("visionscore", 0) or 0),
                    objective_steals=int(row.get("monsterkillsenemyjungle", 0) or 0),
                    result=int(row.get("result", 0) or 0),
                )
                stats_list.append(stats)
            except Exception as exc:
                logger.warning(
                    "Could not parse player row (gameid=%s, player=%s): %s",
                    row.get("gameid"),
                    row.get("playername"),
                    exc,
                )

        logger.debug("Parsed %d player stats for gameid=%s", len(stats_list), riot_game_id)
        return stats_list

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "OraclesElixirClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
