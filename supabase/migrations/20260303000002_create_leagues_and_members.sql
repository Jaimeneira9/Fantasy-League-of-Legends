create table fantasy_leagues (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  invite_code  text not null unique default substr(md5(random()::text), 1, 8),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  competition  text not null default 'LEC',
  budget       numeric(10,2) not null default 100.0,
  max_members  int not null default 10,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table league_members (
  id            uuid primary key default gen_random_uuid(),
  league_id     uuid not null references fantasy_leagues(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  display_name  text,
  remaining_budget numeric(10,2) not null default 100.0,
  total_points  numeric(10,2) not null default 0,
  joined_at     timestamptz not null default now(),
  unique (league_id, user_id)
);

create index idx_leagues_owner   on fantasy_leagues(owner_id);
create index idx_members_league  on league_members(league_id);
create index idx_members_user    on league_members(user_id);
