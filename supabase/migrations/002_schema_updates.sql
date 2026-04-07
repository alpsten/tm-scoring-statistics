-- ─── Schema updates based on actual spreadsheet data ─────────────────────────

-- 1. Fix card_type constraint to include Prelude and Corporation cards
ALTER TABLE card_reference
DROP
CONSTRAINT card_reference_card_type_check;

ALTER TABLE card_reference
    ADD CONSTRAINT card_reference_card_type_check
        CHECK (card_type IN ('Automated', 'Active', 'Event', 'Prelude', 'Corporation'));

-- 2. Add mc (MegaCredits at game end) to player_results
ALTER TABLE player_results
    ADD COLUMN IF NOT EXISTS mc smallint;

-- 3. Add plantery_vp (Moon expansion plantery VP) to player_results
ALTER TABLE player_results
    ADD COLUMN IF NOT EXISTS plantery_vp smallint;
