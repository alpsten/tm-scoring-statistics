-- ─── Parameter contributions ─────────────────────────────────────────────────
-- Tracks how many steps of each terraforming parameter each player raised
-- in a game. Optional — only logged when enabled in the Add Game form.

CREATE TABLE parameter_contributions (
  id                 uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id            text    NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_name        text    NOT NULL,
  oxygen_steps       smallint NOT NULL DEFAULT 0,
  temperature_steps  smallint NOT NULL DEFAULT 0,
  ocean_steps        smallint NOT NULL DEFAULT 0,
  venus_steps        smallint NOT NULL DEFAULT 0
);

ALTER TABLE parameter_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read"
  ON parameter_contributions FOR SELECT USING (true);

CREATE POLICY "Authenticated write"
  ON parameter_contributions FOR ALL
  USING (auth.role() = 'authenticated');

CREATE INDEX idx_param_contributions_game ON parameter_contributions(game_id);
