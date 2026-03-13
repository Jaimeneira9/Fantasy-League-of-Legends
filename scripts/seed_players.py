"""
Seed inicial de jugadores de la LEC.

Uso: python scripts/seed_players.py
Requiere: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env
"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")


# Jugadores iniciales LEC (temporada 2025) — completar con datos reales
LEC_PLAYERS: list[dict] = [
    # {"name": "Faker", "team": "T1", "role": "mid", "current_price": 15.0},
    # Añadir jugadores reales de la LEC aquí
]


def seed() -> None:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    client = create_client(url, key)

    if not LEC_PLAYERS:
        print("No hay jugadores definidos en LEC_PLAYERS. Añádelos primero.")
        return

    result = client.table("players").insert(LEC_PLAYERS).execute()
    print(f"Insertados {len(result.data)} jugadores.")


if __name__ == "__main__":
    seed()
