ALTER TABLE card_effect_events
  ADD COLUMN IF NOT EXISTS resource_type text,
  ADD COLUMN IF NOT EXISTS source_card text;

COMMENT ON COLUMN card_effect_events.resource_type IS 'Resource kind added, e.g. Animal, Microbe, Floater — only set for event_type = ''resource_added''.';
COMMENT ON COLUMN card_effect_events.source_card IS 'Best-effort attribution: the nearest preceding played/used-action card by the same player, for event_type = ''resource_added''.';
