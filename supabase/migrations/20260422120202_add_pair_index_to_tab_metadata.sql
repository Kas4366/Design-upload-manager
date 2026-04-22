/*
  # Add pair_index to tab_metadata

  Adds a nullable pair_index column to tab_metadata to track which copy number
  a card tab belongs to (e.g. pair 1 = first copy, pair 2 = second copy of a
  multi-quantity card order). Non-card tabs will have NULL.

  1. Modified Tables
    - `tab_metadata`
      - `pair_index` (integer, nullable) — 1-based index of the Front/Inside pair for card tabs
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tab_metadata' AND column_name = 'pair_index'
  ) THEN
    ALTER TABLE tab_metadata ADD COLUMN pair_index integer DEFAULT NULL;
  END IF;
END $$;
