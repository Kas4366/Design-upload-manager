/*
# Add Channel Column to CSV Column Mappings

1. Modified Tables
   - `csv_column_mappings`: Add `channel_column` text column (nullable)
     to store the user's custom mapping for the sales channel column.
     When null/empty, the app falls back to positional column AB (index 27).

2. Security
   - No new tables; existing RLS policies on `csv_column_mappings` already cover the new column.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csv_column_mappings' AND column_name = 'channel_column'
  ) THEN
    ALTER TABLE csv_column_mappings ADD COLUMN channel_column text;
  END IF;
END $$;
