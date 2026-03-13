-- Enums
create type player_role as enum ('top', 'jungle', 'mid', 'adc', 'support', 'coach');
create type match_status as enum ('scheduled', 'live', 'finished');
create type transaction_type as enum ('buy', 'sell');

-- Jugadores de la LEC (y futuras ligas)
create table players (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  team          text not null,
  role          player_role not null,
  league        text not null default 'LEC',
  current_price numeric(10,2) not null check (current_price > 0),
  price_history jsonb not null default '[]',
  image_url     text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Partidos de la competición oficial
create table matches (
  id             uuid primary key default gen_random_uuid(),
  league         text not null default 'LEC',
  team_home      text not null,
  team_away      text not null,
  scheduled_at   timestamptz not null,
  status         match_status not null default 'scheduled',
  week           int,
  split          text,
  season         int,
  created_at     timestamptz not null default now()
);

-- Stats de un jugador en un partido concreto
create table player_match_stats (
  id               uuid primary key default gen_random_uuid(),
  player_id        uuid not null references players(id) on delete cascade,
  match_id         uuid not null references matches(id) on delete cascade,
  kills            int not null default 0,
  deaths           int not null default 0,
  assists          int not null default 0,
  cs_per_min       numeric(5,2) not null default 0,
  gold_diff_15     int,
  vision_score     int,
  damage_share     numeric(5,4),
  objective_steals int not null default 0,
  double_kill      boolean not null default false,
  triple_kill      boolean not null default false,
  quadra_kill      boolean not null default false,
  penta_kill       boolean not null default false,
  picks_correct    int,
  bans_effective   int,
  match_points     numeric(8,2),
  created_at       timestamptz not null default now(),
  unique (player_id, match_id)
);

create index idx_players_role    on players(role);
create index idx_players_league  on players(league);
create index idx_pms_player      on player_match_stats(player_id);
create index idx_pms_match       on player_match_stats(match_id);
create index idx_matches_status  on matches(status);
