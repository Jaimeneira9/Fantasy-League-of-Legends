"""
Script de keep-alive para Render free tier.

Render duerme los servicios gratuitos tras 15 min de inactividad.
Este script hace ping cada 14 min para mantenerlos activos.

Uso: python scripts/keep_alive.py
(Normalmente manejado por el scheduler interno del backend)
"""
import time
import httpx
import os

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
INTERVAL_SECONDS = 14 * 60  # 14 minutos


def ping() -> None:
    url = f"{BACKEND_URL}/health"
    try:
        response = httpx.get(url, timeout=10)
        print(f"[keep-alive] {url} → {response.status_code}")
    except Exception as e:
        print(f"[keep-alive] ERROR: {e}")


if __name__ == "__main__":
    print(f"Keep-alive iniciado. Ping cada {INTERVAL_SECONDS // 60} min a {BACKEND_URL}")
    while True:
        ping()
        time.sleep(INTERVAL_SECONDS)
