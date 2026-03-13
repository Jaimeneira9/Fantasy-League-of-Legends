-- RLS habilitado en TODAS las tablas
alter table players              enable row level security;
alter table matches              enable row level security;
alter table player_match_stats   enable row level security;
alter table fantasy_leagues      enable row level security;
alter table league_members       enable row level security;
alter table rosters              enable row level security;
alter table roster_players       enable row level security;
alter table market_listings      enable row level security;
alter table transactions         enable row level security;

-- Datos públicos de la competición
create policy "Players are publicly readable"
  on players for select using (true);

create policy "Matches are publicly readable"
  on matches for select using (true);

create policy "Player match stats are publicly readable"
  on player_match_stats for select using (true);

-- fantasy_leagues
create policy "Users can view leagues they belong to"
  on fantasy_leagues for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from league_members
      where league_members.league_id = fantasy_leagues.id
        and league_members.user_id = auth.uid()
    )
  );

create policy "Users can create leagues"
  on fantasy_leagues for insert
  with check (owner_id = auth.uid());

create policy "Only owner can update league"
  on fantasy_leagues for update
  using (owner_id = auth.uid());

-- league_members
create policy "Members can view their league"
  on league_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from league_members lm2
      where lm2.league_id = league_members.league_id
        and lm2.user_id = auth.uid()
    )
  );

create policy "Users can join a league"
  on league_members for insert
  with check (user_id = auth.uid());

-- rosters
create policy "Members of a league can view rosters"
  on rosters for select
  using (
    exists (
      select 1 from league_members lm
      join league_members my_lm on my_lm.league_id = lm.league_id
      where lm.id = rosters.member_id
        and my_lm.user_id = auth.uid()
    )
  );

create policy "Users can manage their own roster"
  on rosters for all
  using (
    exists (
      select 1 from league_members
      where league_members.id = rosters.member_id
        and league_members.user_id = auth.uid()
    )
  );

-- roster_players
create policy "League members can view all roster players"
  on roster_players for select
  using (
    exists (
      select 1 from rosters r
      join league_members lm on lm.id = r.member_id
      join league_members my_lm on my_lm.league_id = lm.league_id
      where r.id = roster_players.roster_id
        and my_lm.user_id = auth.uid()
    )
  );

create policy "Users can manage their own roster players"
  on roster_players for all
  using (
    exists (
      select 1 from rosters r
      join league_members lm on lm.id = r.member_id
      where r.id = roster_players.roster_id
        and lm.user_id = auth.uid()
    )
  );

-- market_listings
create policy "League members can view market listings"
  on market_listings for select
  using (
    exists (
      select 1 from league_members
      where league_members.league_id = market_listings.league_id
        and league_members.user_id = auth.uid()
    )
  );

create policy "Members can create listings in their leagues"
  on market_listings for insert
  with check (
    exists (
      select 1 from league_members
      where league_members.league_id = market_listings.league_id
        and league_members.user_id = auth.uid()
        and league_members.id = market_listings.seller_id
    )
  );

-- transactions
create policy "League members can view transactions"
  on transactions for select
  using (
    exists (
      select 1 from league_members
      where league_members.league_id = transactions.league_id
        and league_members.user_id = auth.uid()
    )
  );
