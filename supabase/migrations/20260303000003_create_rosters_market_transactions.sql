create table rosters (
  id        uuid primary key default gen_random_uuid(),
  member_id uuid not null references league_members(id) on delete cascade,
  name      text,
  created_at timestamptz not null default now(),
  unique (member_id)
);

create table roster_players (
  id         uuid primary key default gen_random_uuid(),
  roster_id  uuid not null references rosters(id) on delete cascade,
  player_id  uuid not null references players(id) on delete cascade,
  slot       text not null check (slot in ('starter_1','starter_2','starter_3','starter_4','starter_5','coach','bench_1','bench_2')),
  added_at   timestamptz not null default now(),
  price_paid numeric(10,2) not null,
  unique (roster_id, player_id),
  unique (roster_id, slot)
);

create table market_listings (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references players(id) on delete cascade,
  seller_id    uuid references league_members(id) on delete set null,
  league_id    uuid not null references fantasy_leagues(id) on delete cascade,
  ask_price    numeric(10,2) not null check (ask_price > 0),
  is_active    boolean not null default true,
  listed_at    timestamptz not null default now(),
  expires_at   timestamptz,
  unique (player_id, league_id, is_active)
);

create table transactions (
  id           uuid primary key default gen_random_uuid(),
  league_id    uuid not null references fantasy_leagues(id) on delete cascade,
  buyer_id     uuid references league_members(id) on delete set null,
  seller_id    uuid references league_members(id) on delete set null,
  player_id    uuid not null references players(id),
  type         transaction_type not null,
  price        numeric(10,2) not null,
  executed_at  timestamptz not null default now()
);

create index idx_roster_players_roster  on roster_players(roster_id);
create index idx_listings_league        on market_listings(league_id);
create index idx_listings_active        on market_listings(league_id, is_active) where is_active = true;
create index idx_transactions_league    on transactions(league_id);
create index idx_transactions_player    on transactions(player_id);
