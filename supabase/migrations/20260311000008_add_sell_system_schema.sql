-- Columna for_sale en roster_players
ALTER TABLE roster_players
  ADD COLUMN IF NOT EXISTS for_sale boolean NOT NULL DEFAULT false;

-- Pool de candidatos al mercado
CREATE TABLE IF NOT EXISTS market_candidates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id   uuid NOT NULL REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
  player_id   uuid NOT NULL REFERENCES players(id),
  seller_id   uuid REFERENCES league_members(id),
  ask_price   numeric(10,2) NOT NULL,
  added_at    timestamptz NOT NULL DEFAULT now()
);

-- Índice para acceso por liga
CREATE INDEX IF NOT EXISTS market_candidates_league_idx ON market_candidates(league_id);

-- Ofertas de venta que el sistema envía al propietario
CREATE TABLE IF NOT EXISTS sell_offers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id        uuid NOT NULL REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
  member_id        uuid NOT NULL REFERENCES league_members(id),
  roster_player_id uuid REFERENCES roster_players(id) ON DELETE SET NULL,
  player_id        uuid NOT NULL REFERENCES players(id),
  ask_price        numeric(10,2) NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sell_offers_league_member_idx ON sell_offers(league_id, member_id);

-- FK de market_listings al candidato que originó el listing
ALTER TABLE market_listings
  ADD COLUMN IF NOT EXISTS candidate_id uuid REFERENCES market_candidates(id);

-- RLS: sell_offers solo visible por el miembro propietario
ALTER TABLE market_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sell_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read own candidates"
  ON market_candidates FOR SELECT
  USING (
    seller_id IN (
      SELECT id FROM league_members WHERE user_id = auth.uid()
    )
    OR seller_id IS NULL
  );

CREATE POLICY "members can read own sell_offers"
  ON sell_offers FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM league_members WHERE user_id = auth.uid()
    )
  );
