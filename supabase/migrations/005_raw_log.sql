-- ─── Raw game log storage ────────────────────────────────────────────────────
-- Stores the full pasted TM app log text so card-effect parsing rules
-- can be re-run retroactively without re-pasting.

ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS raw_log text;

COMMENT ON COLUMN game_sessions.raw_log IS 'Full raw text pasted into the log parser admin tool, preserved for future re-parsing.';
