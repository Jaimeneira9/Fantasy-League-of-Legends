LoL Fantasy League — LEC Edition

Cómo explicar los cambios

IMPORTANTE: Cada vez que implementes algo, al terminar explícame:



Qué has creado o modificado y por qué

Qué patrón o concepto técnico has usado (con una frase simple)

Si hay algo que podría hacer diferente y por qué elegiste esta opción

Soy desarrollador aprendiendo, así que adapta las explicaciones a alguien

que entiende lógica pero puede no conocer todos los patrones de cada framework.



Proyecto

Fantasy league de League of Legends estilo Comunio/FantasyMarca.

Liga inicial: LEC. Diseñada para escalar a LFL/LCK/LPL.

Ligas privadas con código de invitación. Puntuación por partido individual.

Roster: 5 titulares + 1 coach + 2 suplentes. Presupuesto inicial + mercado dinámico.

Stack



Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS → Vercel

Backend: FastAPI (Python 3.11) → Render free tier

DB: Supabase (PostgreSQL) con auth, RLS y Realtime WebSockets

Pipeline: Python worker con APScheduler → Riot Games API + Leaguepedia

Monorepo: /frontend · /backend · /supabase · /scripts



Comandos

Frontend

cd frontend \&\& npm run dev          # dev server :3000

cd frontend \&\& npm run build

cd frontend \&\& npm run lint

cd frontend \&\& npm run type-check

Backend

cd backend \&\& uvicorn main:app --reload   # FastAPI dev :8000

cd backend \&\& pytest

cd backend \&\& python -m pipeline.scheduler

Supabase

supabase db push

supabase gen types typescript --local > frontend/src/types/database.ts

supabase db diff -f nombre\_migracion

Arquitectura DB

Ver: supabase/migrations/ para schema completo.

Tablas: players, player\_match\_stats, fantasy\_leagues, league\_members,

rosters, roster\_players, matches, market\_listings, transactions



RLS habilitado en TODAS las tablas sin excepción

price\_history: JSONB en players (no tabla separada)

player\_match\_stats guarda stats raw + match\_points calculados



Sistema de puntuación

Ver: backend/scoring/engine.py

Pesos distintos por rol. Bonuses: robo de objetivos, multikills, gold\_diff@15.

Normalización anti-snowball para partidas largas.

Mercado

Ver: backend/market/pricing.py

Variables: rendimiento reciente + demanda/oferta + momentum

Cap: ±15% diario. Update post-partido y cron a medianoche.

Convenciones



TypeScript: strict mode, sin any, named exports

Python: type hints en todo, Pydantic para request/response

CSS: solo Tailwind, sin archivos CSS custom

Supabase client: usar @/lib/supabase/ (server y client separados)



Gotchas



NUNCA commitear .env files

Supabase Realtime: siempre cleanup en useEffect

Riot API: 100 req/2min en dev key, pedir producción key pronto

Leaguepedia: fuente para pick/ban data del coach scoring

Render free tier: worker duerme → keep-alive ping cada 14min

Precios: siempre leer current\_price de DB, nunca calcular en frontend



Agentes disponibles



/agent scoring-calculator — Calcula puntos de fantasy tras nuevos partidos del LEC

/agent data-sync — Sincroniza datos desde Leaguepedia / Oracle's Elixir

/agent migration-agent — Genera y aplica migraciones de Supabase



Invocar siempre el agente correcto según la tarea en lugar de hacerlo manualmente.

