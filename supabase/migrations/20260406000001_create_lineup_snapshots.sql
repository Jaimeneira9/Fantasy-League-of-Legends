CREATE TABLE IF NOT EXISTS lineup_snapshots (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id      uuid NOT NULL REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
    member_id      uuid NOT NULL REFERENCES league_members(id)  ON DELETE CASCADE,
    competition_id uuid NOT NULL REFERENCES competitions(id)    ON DELETE CASCADE,
    week           int  NOT NULL CHECK (week > 0),
    slot           varchar(20) NOT NULL
                       CHECK (slot IN ('starter_1','starter_2','starter_3','starter_4','starter_5')),
    player_id      uuid REFERENCES players(id) ON DELETE SET NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_lineup_snapshot_slot UNIQUE (league_id, member_id, week, slot)
);
CREATE INDEX idx_lineup_snapshots_member_week ON lineup_snapshots (member_id, week);
CREATE INDEX idx_lineup_snapshots_league_week ON lineup_snapshots (league_id, week);
ALTER TABLE lineup_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members can view snapshots in their league"
    ON lineup_snapshots FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM league_members lm
        WHERE lm.league_id = lineup_snapshots.league_id
          AND lm.user_id = auth.uid()
    ));
CREATE POLICY "service role can write snapshots"
    ON lineup_snapshots FOR INSERT WITH CHECK (auth.role() = 'service_role');
