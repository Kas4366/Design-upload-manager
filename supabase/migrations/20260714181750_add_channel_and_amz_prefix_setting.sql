/*
# Add Sales Channel to Orders and Amz- Prefix Setting

1. Modified Tables
   - `order_items`: Add `channel` text column (nullable, defaults to empty string)
     to store the sales channel (e.g., "Amazon", "eBay") sourced from CSV column AB.
     This allows the app to identify Amazon orders at save time and optionally
     prepend "Amz-" to the Veeqo ID in saved filenames.

2. New Settings
   - `app_settings`: Insert a new row with key `append_amz_prefix` and value `'false'`.
     When set to `'true'`, the app will prepend "Amz-" to the Veeqo ID in the
     physical filename for Amazon orders only (e.g., Amz-1234.pdf).
     Non-Amazon orders are unaffected. The database `saved_files` records
     continue to store the original Veeqo ID without the prefix.

3. Security
   - No new tables created; existing RLS policies on `order_items` and
     `app_settings` already cover the new column and new setting row.
   - No policy changes needed.
*/

-- Add channel column to order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'channel'
  ) THEN
    ALTER TABLE order_items ADD COLUMN channel text DEFAULT '';
  END IF;
END $$;

-- Insert the append_amz_prefix setting
INSERT INTO app_settings (key, value) VALUES
  ('append_amz_prefix', 'false')
ON CONFLICT (key) DO NOTHING;
