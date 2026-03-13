-- Migration: add_splits_historical_stats
-- Created: 2026-03-09
-- Rollback:
--   ALTER TABLE matches DROP COLUMN IF EXISTS split_id;
--   ALTER TABLE roster_players DROP COLUMN IF EXISTS is_protected;
--   DROP TABLE IF EXISTS player_historical_stats;
--   DROP TABLE IF EXISTS member_split_scores;
--   DROP TABLE IF EXISTS splits;

-- === FORWARD MIGRATION ===

-- ------------------------------------------------------------
-- 1. splits — one row per competitive split (e.g. LEC Spring 2026)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS splits (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        NOT NULL UNIQUE,
    competition text        NOT NULL DEFAULT 'LEC',
    start_date  date,
    end_date    date,
    reset_date  date,
    is_active   boolean     NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Enforce at most one active split at any time via a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS splits_one_active
    ON splits (is_active)
    WHERE is_active = true;

-- RLS: any authenticated user may read; writes go through the service role (backend)
ALTER TABLE splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Splits are publicly readable"
    ON splits FOR SELECT
    USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 2. member_split_scores — points snapshot per member per split
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_split_scores (
    id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id   uuid         NOT NULL REFERENCES league_members(id) ON DELETE CASCADE,
    split_id    uuid         NOT NULL REFERENCES splits(id)         ON DELETE CASCADE,
    points      numeric(10,2) NOT NULL DEFAULT 0,
    recorded_at timestamptz  NOT NULL DEFAULT now(),
    UNIQUE (member_id, split_id)
);

CREATE INDEX IF NOT EXISTS idx_member_split_scores_member
    ON member_split_scores(member_id);
CREATE INDEX IF NOT EXISTS idx_member_split_scores_split
    ON member_split_scores(split_id);

-- RLS: a member may read scores for any league they belong to
ALTER TABLE member_split_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view split scores in their leagues"
    ON member_split_scores FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM league_members lm
            -- the score's member must be in the same league as the requesting user
            JOIN league_members my_lm ON my_lm.league_id = lm.league_id
            WHERE lm.id = member_split_scores.member_id
              AND my_lm.user_id = auth.uid()
        )
    );

-- ------------------------------------------------------------
-- 3. player_historical_stats — aggregate stats per player per split
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_historical_stats (
    id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id          uuid          NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    split_id           uuid          NOT NULL REFERENCES splits(id)  ON DELETE CASCADE,
    games_played       int           NOT NULL DEFAULT 0,
    wins               int           NOT NULL DEFAULT 0,
    kills              int           NOT NULL DEFAULT 0,
    deaths             int           NOT NULL DEFAULT 0,
    assists            int           NOT NULL DEFAULT 0,
    kda                numeric(6,2),
    cspm               numeric(6,2),
    dpm                numeric(8,2),
    damage_pct         numeric(5,4),
    kill_participation numeric(5,4),
    wards_per_min      numeric(6,3),
    created_at         timestamptz   NOT NULL DEFAULT now(),
    UNIQUE (player_id, split_id)
);

CREATE INDEX IF NOT EXISTS idx_player_historical_stats_player
    ON player_historical_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_historical_stats_split
    ON player_historical_stats(split_id);

-- RLS: any authenticated user may read; writes go through the service role (backend)
ALTER TABLE player_historical_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Player historical stats are publicly readable"
    ON player_historical_stats FOR SELECT
    USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 4. roster_players — add is_protected flag
-- ------------------------------------------------------------
ALTER TABLE roster_players
    ADD COLUMN IF NOT EXISTS is_protected boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN roster_players.is_protected IS
    'When true this player cannot be removed from the roster during a split reset window.';

-- ------------------------------------------------------------
-- 5. matches — link each match to a split
-- ------------------------------------------------------------
ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS split_id uuid REFERENCES splits(id);

CREATE INDEX IF NOT EXISTS idx_matches_split
    ON matches(split_id);

COMMENT ON COLUMN matches.split_id IS
    'The competitive split this match belongs to. NULL for legacy rows pre-splits.';
