/*
  # Fix Schema Consistency for Session and Order Items

  ## Overview
  This migration fixes schema inconsistencies that are causing 400 errors when querying
  the database. It ensures all columns referenced in the application code exist in the database.

  ## Changes

  1. Add missing column to order_items
    - `is_saved` (boolean) - Tracks if order item files have been saved
    - Derived from existing `saved_at` column (if saved_at IS NOT NULL, then is_saved = true)

  2. Add uploaded_at to processing_sessions
    - `uploaded_at` (timestamptz) - When the CSV was originally uploaded
    - Copies value from `started_at` for existing records

  3. Update existing data
    - Set is_saved based on saved_at values
    - Set uploaded_at from started_at

  ## Security
  - No RLS changes needed (existing policies remain)

  ## Important Notes
  - This ensures code queries match actual database schema
  - Fixes 400 Bad Request errors from Supabase REST API
*/

-- Add is_saved boolean column to order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'is_saved'
  ) THEN
    ALTER TABLE order_items ADD COLUMN is_saved boolean DEFAULT false;
    
    -- Update is_saved based on existing saved_at values
    UPDATE order_items SET is_saved = true WHERE saved_at IS NOT NULL;
  END IF;
END $$;

-- Add uploaded_at to processing_sessions (if not already added by previous migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processing_sessions' AND column_name = 'uploaded_at'
  ) THEN
    ALTER TABLE processing_sessions ADD COLUMN uploaded_at timestamptz;
    
    -- Set uploaded_at to started_at for existing records
    UPDATE processing_sessions SET uploaded_at = started_at WHERE uploaded_at IS NULL;
    
    -- Set default for new records
    ALTER TABLE processing_sessions ALTER COLUMN uploaded_at SET DEFAULT now();
  END IF;
END $$;

-- Create trigger to automatically update is_saved when saved_at changes
CREATE OR REPLACE FUNCTION update_is_saved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.saved_at IS NOT NULL AND (OLD.saved_at IS NULL OR OLD.saved_at IS DISTINCT FROM NEW.saved_at) THEN
    NEW.is_saved = true;
  ELSIF NEW.saved_at IS NULL THEN
    NEW.is_saved = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS trigger_update_is_saved ON order_items;
CREATE TRIGGER trigger_update_is_saved
  BEFORE INSERT OR UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_is_saved();

-- Create index for faster is_saved queries
CREATE INDEX IF NOT EXISTS idx_order_items_is_saved 
  ON order_items(session_id, is_saved);
