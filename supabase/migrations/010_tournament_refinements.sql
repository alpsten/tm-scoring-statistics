-- ─── Tournament refinements ───────────────────────────────────────────────────
-- TR never factored into tp scoring, so drop it. Milestones and awards are
-- always capped at 3 slots per game regardless of expansion, so constrain
-- them. Players can withdraw mid-tournament — `active` excludes them from
-- future round pairings while keeping their already-recorded results intact.

ALTER TABLE tournament_match_players DROP COLUMN tr;

ALTER TABLE tournament_match_players
  ADD CONSTRAINT milestones_claimed_range CHECK (milestones_claimed BETWEEN 0 AND 3),
  ADD CONSTRAINT awards_won_range CHECK (awards_won BETWEEN 0 AND 3);

ALTER TABLE tournament_players ADD COLUMN active boolean NOT NULL DEFAULT true;
