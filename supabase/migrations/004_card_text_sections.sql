-- ─── Card text sections ──────────────────────────────────────────────────────
-- Adds separate text fields for modular card-frame rendering.

ALTER TABLE card_reference
  ADD COLUMN IF NOT EXISTS effect_text text,
  ADD COLUMN IF NOT EXISTS action_text text,
  ADD COLUMN IF NOT EXISTS flavour_text text;

COMMENT ON COLUMN card_reference.card_text IS 'Primary card text for cards that use one rules text block.';
COMMENT ON COLUMN card_reference.effect_text IS 'Effect section text, mainly for Active cards.';
COMMENT ON COLUMN card_reference.action_text IS 'Action section text, mainly for Active cards.';
COMMENT ON COLUMN card_reference.flavour_text IS 'Optional flavour text shown separately from rules text.';

ALTER TABLE card_reference
  DROP CONSTRAINT IF EXISTS card_reference_card_type_check;

ALTER TABLE card_reference
  ADD CONSTRAINT card_reference_card_type_check
  CHECK (card_type IN (
    'Automated',
    'Active',
    'Event',
    'Prelude',
    'Corporation',
    'CEO',
    'Global Event'
  ));
