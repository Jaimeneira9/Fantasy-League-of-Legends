#!/usr/bin/env python3
"""
Script de verificación del pipeline de datos LEC.

Uso:
    python scripts/test_pipeline.py            # modo mock (sin peticiones reales)
    python scripts/test_pipeline.py --live     # peticiones reales a Leaguepedia + Oracle's Elixir
"""
import argparse
import sys
from datetime import datetime
from pathlib import Path

# Añadir backend al path para importar módulos del proyecto
BACKEND_DIR = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))


# ---------------------------------------------------------------------------
# Mocks
# ---------------------------------------------------------------------------

MOCK_GAMES = [
    {
        "game_id": "ESPORTSTMNT01_3797342",
        "riot_platform_game_id": "EUW1_7123456",
        "team1": "G2 Esports",
        "team2": "Fnatic",
        "winner": 1,
        "duration_min": 32.5,
        "scheduled_at": "2026-02-14T18:00:00",
        "team1_picks": ["Jayce", "Vi", "Azir", "Jinx", "Thresh"],
        "team2_picks": ["Garen", "Hecarim", "Orianna", "Caitlyn", "Nautilus"],
        "team1_bans": ["Darius", "Zed"],
        "team2_bans": ["Syndra", "Leblanc"],
    },
    {
        "game_id": "ESPORTSTMNT01_3797343",
        "riot_platform_game_id": "EUW1_7123457",
        "team1": "Team BDS",
        "team2": "Vitality",
        "winner": 2,
        "duration_min": 28.1,
        "scheduled_at": "2026-02-14T19:00:00",
        "team1_picks": ["Malphite", "Jarvan IV", "Viktor", "Tristana", "Leona"],
        "team2_picks": ["Renekton", "Nidalee", "Zoe", "Ezreal", "Lulu"],
        "team1_bans": ["Syndra", "Akali"],
        "team2_bans": ["Darius", "Irelia"],
    },
]

MOCK_PLAYER_STATS = [
    {
        "playername": "Caps",
        "position": "mid",
        "champion": "Azir",
        "kills": 5, "deaths": 1, "assists": 8,
        "cs_per_min": 9.2, "gold_diff_15": 800,
        "damage_share": 0.31, "vision_score": 22,
        "objective_steals": 0, "result": 1,
    },
    {
        "playername": "Jankos",
        "position": "jungle",
        "champion": "Vi",
        "kills": 3, "deaths": 2, "assists": 12,
        "cs_per_min": 5.8, "gold_diff_15": 400,
        "damage_share": 0.18, "vision_score": 35,
        "objective_steals": 2, "result": 1,
    },
]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_mock() -> None:
    print("\n=== MODO MOCK ===\n")

    # Test Leaguepedia model
    from pipeline.leaguepedia import GameSummary
    games = [
        GameSummary(
            game_id=g["game_id"],
            riot_platform_game_id=g["riot_platform_game_id"],
            team1=g["team1"],
            team2=g["team2"],
            winner=g["winner"],
            duration_min=g["duration_min"],
            scheduled_at=datetime.fromisoformat(g["scheduled_at"]),
            team1_picks=g["team1_picks"],
            team2_picks=g["team2_picks"],
            team1_bans=g["team1_bans"],
            team2_bans=g["team2_bans"],
        )
        for g in MOCK_GAMES
    ]
    print(f"[OK] GameSummary models created: {len(games)} partidas")
    for g in games:
        print(f"     {g.team1} vs {g.team2}  ({g.duration_min:.1f} min)  winner={g.winner}")

    # Test Oracle's Elixir model
    from pipeline.oracles_elixir import PlayerStats
    from scoring.engine import calculate_match_points

    print(f"\n[OK] Scoring simulado para {len(MOCK_PLAYER_STATS)} jugadores:")
    print(f"     {'Jugador':<15} {'Rol':<10} {'Campeón':<12} {'Puntos':>8}")
    print("     " + "-" * 45)
    for raw in MOCK_PLAYER_STATS:
        stats = PlayerStats(gameid="ESPORTSTMNT01_3797342", **raw)
        points = calculate_match_points(
            stats=stats.model_dump(),
            role=stats.position,  # type: ignore[arg-type]
            game_duration_min=32.5,
        )
        print(f"     {stats.playername:<15} {stats.position:<10} {stats.champion:<12} {points:>8.2f}")

    print("\n[OK] Mock tests passed.\n")


def test_live() -> None:
    print("\n=== MODO LIVE ===\n")

    from pipeline.leaguepedia import LeaguepediaClient
    from pipeline.oracles_elixir import OraclesElixirClient
    from scoring.engine import calculate_match_points

    # 1. Leaguepedia: auto-detección de torneo activo
    print("1. Consultando Leaguepedia...")
    with LeaguepediaClient() as lp:
        tournament = lp.get_active_tournament("LEC")
        print(f"   Torneo activo: {tournament}")

        games = lp.get_recent_games(tournament, since=None)
        recent = games[:5]
        print(f"   Últimas {len(recent)} partidas:")
        for g in recent:
            print(
                f"     [{g.scheduled_at.strftime('%Y-%m-%d %H:%M')}] "
                f"{g.team1} vs {g.team2}  "
                f"({g.duration_min:.1f} min)  "
                f"riot_id={g.riot_platform_game_id or 'N/A'}"
            )

    # 2. Oracle's Elixir: descargar CSV
    print("\n2. Descargando Oracle's Elixir CSV...")
    oe = OraclesElixirClient()
    try:
        year = datetime.utcnow().year
        df = oe.download_lec_dataframe(year=year)
        print(f"   Shape: {df.shape[0]} filas x {df.shape[1]} columnas")
        print(f"   Columnas: {list(df.columns[:15])}{'...' if len(df.columns) > 15 else ''}")
        print(f"   Torneos LEC únicos: {sorted(df['split'].dropna().unique().tolist()) if 'split' in df.columns else 'N/A'}")

        # 3. Cruzar primera partida disponible con riot_platform_game_id
        first_game_with_id = next(
            (g for g in games if g.riot_platform_game_id),
            None,
        )

        if first_game_with_id:
            print(f"\n3. Cruzando partida {first_game_with_id.riot_platform_game_id}...")
            player_stats = oe.get_stats_for_game(df, first_game_with_id.riot_platform_game_id)

            if player_stats:
                print(f"   {len(player_stats)} jugadores encontrados:")
                print(f"   {'Jugador':<15} {'Rol':<10} {'Campeón':<14} {'K/D/A':<10} {'Puntos':>8}")
                print("   " + "-" * 57)
                for s in player_stats:
                    points = calculate_match_points(
                        stats=s.model_dump(),
                        role=s.position,  # type: ignore[arg-type]
                        game_duration_min=first_game_with_id.duration_min,
                    )
                    kda = f"{s.kills}/{s.deaths}/{s.assists}"
                    print(f"   {s.playername:<15} {s.position:<10} {s.champion:<14} {kda:<10} {points:>8.2f}")
            else:
                print(f"   [WARN] No se encontraron stats en OE para riot_id={first_game_with_id.riot_platform_game_id}")
                print("         (puede que el CSV no incluya esa partida aún)")
        else:
            print("\n3. Ninguna partida reciente tiene riot_platform_game_id — cross no posible.")
    finally:
        oe.close()

    print("\n[OK] Live tests passed.\n")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Test del pipeline LEC")
    parser.add_argument(
        "--live",
        action="store_true",
        help="Hacer peticiones reales a Leaguepedia y Oracle's Elixir",
    )
    args = parser.parse_args()

    if args.live:
        test_live()
    else:
        test_mock()


if __name__ == "__main__":
    main()
