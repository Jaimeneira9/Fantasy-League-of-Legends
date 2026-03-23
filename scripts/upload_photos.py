#!/usr/bin/env python3
"""
Sube fotos de jugadores al bucket FotosJugadoresLec de Supabase.
Uso: python3 scripts/upload_photos.py --folder "/ruta/a/fotos"
"""

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / "backend" / ".env")

from supabase import create_client

GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
RESET  = "\033[0m"

BUCKET = "FotosJugadoresLec"
STORAGE_BASE = f"https://kjtifrtuknxtuuiyflza.supabase.co/storage/v1/object/public/{BUCKET}/"


def main():
    parser = argparse.ArgumentParser(description="Sube fotos de jugadores a Supabase Storage")
    parser.add_argument("--folder", required=True, help="Carpeta con los .webp a subir")
    parser.add_argument("--dry-run", action="store_true", help="Simular sin subir")
    args = parser.parse_args()

    folder = Path(args.folder)
    if not folder.exists():
        print(f"{RED}Error: la carpeta '{folder}' no existe.{RESET}", file=sys.stderr)
        sys.exit(1)

    photos = sorted(folder.glob("*.webp"))
    if not photos:
        print(f"{YELLOW}No se encontraron archivos .webp en '{folder}'.{RESET}")
        sys.exit(0)

    print(f"\nFotos encontradas: {len(photos)}")
    print(f"Bucket destino:   {BUCKET}\n")

    if args.dry_run:
        for p in photos:
            print(f"  [DRY-RUN] {p.name}")
        print(f"\n{YELLOW}Dry-run completado. No se subió nada.{RESET}")
        return

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print(f"{RED}Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en backend/.env{RESET}", file=sys.stderr)
        sys.exit(1)

    sb = create_client(url, key)

    ok_count = 0
    err_count = 0

    for photo in photos:
        try:
            with open(photo, "rb") as f:
                data = f.read()

            # upsert=True sobreescribe si ya existe
            sb.storage.from_(BUCKET).upload(
                path=photo.name,
                file=data,
                file_options={"content-type": "image/webp", "upsert": "true"},
            )

            # Actualizar image_url en la tabla players
            player_name = photo.stem  # nombre sin extensión
            public_url = STORAGE_BASE + photo.name
            sb.table("players").update({"image_url": public_url}).ilike(
                "name", player_name.replace("-", " ")
            ).execute()

            print(f"  {GREEN}✓{RESET} {photo.name}")
            ok_count += 1

        except Exception as e:
            print(f"  {RED}✗{RESET} {photo.name} — {e}")
            err_count += 1

    print(f"\n{GREEN}Subidas: {ok_count}{RESET}  {RED}Errores: {err_count}{RESET}\n")


if __name__ == "__main__":
    main()
