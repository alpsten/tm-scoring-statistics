-- ─── Tournaments ──────────────────────────────────────────────────────────────
-- Qualifying/final games are ordinary game_sessions rows, tagged via
-- tournament_games. Standings (tournament points) are computed on read from
-- player_results, game_milestones, and game_awards — nothing is duplicated
-- or denormalized here.

CREATE TABLE tournaments (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL,
  status     text        NOT NULL DEFAULT 'qualifying' CHECK (status IN ('qualifying', 'final', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tournament_players (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_name   text NOT NULL,
  UNIQUE (tournament_id, player_name)
);

CREATE TABLE tournament_games (
  id            uuid     DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid     NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  game_id       text     NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  round         smallint NOT NULL,   -- 1, 2, 3 = qualifying rounds; 99 = final
  UNIQUE (game_id)
);

ALTER TABLE tournaments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_games   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON tournaments        FOR SELECT USING (true);
CREATE POLICY "Public read" ON tournament_players FOR SELECT USING (true);
CREATE POLICY "Public read" ON tournament_games   FOR SELECT USING (true);

CREATE POLICY "Authenticated write" ON tournaments        FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write" ON tournament_players FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write" ON tournament_games   FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX idx_tournament_players_tournament ON tournament_players(tournament_id);
CREATE INDEX idx_tournament_games_tournament    ON tournament_games(tournament_id);
CREATE INDEX idx_tournament_games_round         ON tournament_games(tournament_id, round);
