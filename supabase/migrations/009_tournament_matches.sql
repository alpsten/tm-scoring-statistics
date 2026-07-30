-- ─── Tournament matches ───────────────────────────────────────────────────────
-- Replaces tournament_games. A tournament match is recorded directly — the
-- placement each player got, plus TR/milestone/award counts for the tp bonus —
-- rather than through the full game_sessions/player_results flow, which is far
-- more detail (corporations, cards played, colonies...) than a tournament
-- table needs. Matches are created once per round (pairing is persisted
-- immediately, not just previewed) and results can be edited afterward
-- without regenerating pairings.

DROP TABLE IF EXISTS tournament_games;

CREATE TABLE tournament_matches (
  id            uuid     DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid     NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round         smallint NOT NULL   -- 1, 2, 3 = qualifying rounds; 99 = final
);

CREATE TABLE tournament_match_players (
  id                 uuid     DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id           uuid     NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
  player_name        text     NOT NULL,
  position           smallint,               -- null until the match result is saved
  tr                 smallint,
  milestones_claimed smallint NOT NULL DEFAULT 0,
  awards_won         smallint NOT NULL DEFAULT 0,
  UNIQUE (match_id, player_name)
);

ALTER TABLE tournament_matches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_match_players  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON tournament_matches        FOR SELECT USING (true);
CREATE POLICY "Public read" ON tournament_match_players  FOR SELECT USING (true);

CREATE POLICY "Authenticated write" ON tournament_matches        FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write" ON tournament_match_players  FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX idx_tournament_matches_tournament        ON tournament_matches(tournament_id);
CREATE INDEX idx_tournament_matches_round             ON tournament_matches(tournament_id, round);
CREATE INDEX idx_tournament_match_players_match       ON tournament_match_players(match_id);
