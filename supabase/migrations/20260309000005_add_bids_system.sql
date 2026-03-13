-- Migration: add_bids_system
-- Created: 2026-03-09
-- Rollback:
--   ALTER TABLE market_listings DROP COLUMN IF EXISTS winning_bid_id;
--   ALTER TABLE market_listings DROP COLUMN IF EXISTS closes_at;
--   DROP TABLE IF EXISTS market_bids;
--   -- NOTE: PostgreSQL does not support removing enum values directly.
--   -- To remove 'bid_win' from transaction_type you must recreate the type.

-- === FORWARD MIGRATION ===

-- 1. Extend market_listings with auction columns
ALTER TABLE market_listings
  ADD COLUMN IF NOT EXISTS closes_at      timestamptz,
  ADD COLUMN IF NOT EXISTS winning_bid_id uuid;

-- 2. Create market_bids table
CREATE TABLE IF NOT EXISTS market_bids (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid          NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
  league_id   uuid          NOT NULL REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
  member_id   uuid          NOT NULL REFERENCES league_members(id) ON DELETE CASCADE,
  bid_amount  numeric(10,2) NOT NULL CHECK (bid_amount > 0),
  placed_at   timestamptz   NOT NULL DEFAULT now(),
  status      text          NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'won', 'lost', 'cancelled')),
  UNIQUE (listing_id, member_id)
);

-- Add FK from market_listings.winning_bid_id -> market_bids.id (forward ref resolved now)
ALTER TABLE market_listings
  ADD CONSTRAINT fk_market_listings_winning_bid
  FOREIGN KEY (winning_bid_id) REFERENCES market_bids(id) ON DELETE SET NULL
  NOT VALID;

CREATE INDEX IF NOT EXISTS idx_market_bids_listing ON market_bids(listing_id);
CREATE INDEX IF NOT EXISTS idx_market_bids_member  ON market_bids(member_id);
CREATE INDEX IF NOT EXISTS idx_market_bids_league  ON market_bids(league_id);

-- 3. RLS for market_bids
ALTER TABLE market_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view bids in their leagues"
  ON market_bids FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.league_id = market_bids.league_id
        AND lm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can place their own bids"
  ON market_bids FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.id = market_bids.member_id
        AND lm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update their own bids"
  ON market_bids FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.id = market_bids.member_id
        AND lm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can cancel their own bids"
  ON market_bids FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.id = market_bids.member_id
        AND lm.user_id = auth.uid()
    )
  );

-- 4. Extend transaction_type enum with 'bid_win'
-- 'trade' already exists (added in migration 20260303204003).
-- Idempotency guard: ALTER TYPE ADD VALUE does not support IF NOT EXISTS in PG17.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'transaction_type'
      AND pg_enum.enumlabel = 'bid_win'
  ) THEN
    ALTER TYPE transaction_type ADD VALUE 'bid_win';
  END IF;
END $$;

COMMENT ON COLUMN transactions.type IS 'Values: buy, sell, trade, bid_win';
