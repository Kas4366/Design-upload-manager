/*
  # Add label column to tab_metadata table

  1. Changes
    - Add `label` column to `tab_metadata` table to store tab display labels like "Front", "Inside", "Tab 1", etc.
    - This fixes the session loading issue where tabs lose their display labels when sessions are resumed

  2. Notes
    - Uses IF NOT EXISTS check to prevent errors if column already exists
    - Column is nullable to support existing records
    - Default value is empty string for new records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tab_metadata' AND column_name = 'label'
  ) THEN
    ALTER TABLE tab_metadata ADD COLUMN label text DEFAULT '';
  END IF;
END $$;