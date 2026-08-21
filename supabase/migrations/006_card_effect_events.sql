-- ─── Card effect events ───────────────────────────────────────────────────────
-- One row per action-use / triggered-effect event for cards whose stats
-- can't be derived from cards_played alone (e.g. AI Central's draw count,
-- Martian Zoo's MC gained per use, Inventors' Guild bought vs discarded).

CREATE TABLE card_effect_events (
  id           uuid      DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id      text      NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_name  text      NOT NULL,
  card_name    text      NOT NULL,
  event_type   text      NOT NULL,   -- 'draw', 'bought', 'discarded', 'production_raise', 'floater_added', 'mc_gain'
  amount       numeric   NOT NULL,
  generation   smallint,
  event_order  int       NOT NULL    -- flat per-game counter, order events were parsed in
);

ALTER TABLE card_effect_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read"
  ON card_effect_events FOR SELECT USING (true);

CREATE POLICY "Authenticated write"
  ON card_effect_events FOR ALL
  USING (auth.role() = 'authenticated');

CREATE INDEX idx_card_effect_events_game ON card_effect_events(game_id);
CREATE INDEX idx_card_effect_events_card ON card_effect_events(card_name);
CREATE INDEX idx_card_effect_events_game_card ON card_effect_events(game_id, card_name);
