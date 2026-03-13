-- Migration: add_split_protect_history
-- Created: 2026-03-09
-- Rollback:
--   DROP TABLE IF EXISTS split_protect_history;

-- === FORWARD MIGRATION ===

-- ------------------------------------------------------------
-- split_protect_history
-- One row per (member, player, split) combination.
-- Enforces the business rule: a member cannot protect the same
-- player in two consecutive splits — the backend queries this
-- table before allowing a new protection selection.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS split_protect_history (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id    uuid        NOT NULL REFERENCES league_members(id) ON DELETE CASCADE,
    player_id    uuid        NOT NULL REFERENCES players(id)        ON DELETE CASCADE,
    split_id     uuid        NOT NULL REFERENCES splits(id)         ON DELETE CASCADE,
    protected_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (member_id, player_id, split_id)
);

-- Indexes on every foreign key column for fast lookups by member, player, or split
CREATE INDEX IF NOT EXISTS idx_sph_member ON split_protect_history(member_id);
CREATE INDEX IF NOT EXISTS idx_sph_player ON split_protect_history(player_id);
CREATE INDEX IF NOT EXISTS idx_sph_split  ON split_protect_history(split_id);

-- RLS: a member may only read protect history rows for their own member record
ALTER TABLE split_protect_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view protect history in their leagues"
    ON split_protect_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM league_members lm
            WHERE lm.id = split_protect_history.member_id
              AND lm.user_id = auth.uid()
        )
    );
