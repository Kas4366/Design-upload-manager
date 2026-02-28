/*
  # Add saved files tracking and review features

  1. New Tables
    - `saved_files`
      - `id` (uuid, primary key)
      - `order_item_id` (uuid, foreign key to order_items)
      - `tab_id` (text, unique identifier for the tab)
      - `file_path` (text, the saved file path)
      - `veeqo_id` (text, for quick lookups)
      - `tab_number` (integer, tab sequence number)
      - `saved_at` (timestamptz, when file was saved)
      - `created_at` (timestamptz)

  2. Changes to existing tables
    - Add `marked_for_review` boolean to order_items
    - Add `review_notes` text to order_items

  3. Security
    - Enable RLS on `saved_files` table
    - Add policies for authenticated users
*/

-- Create saved_files table
CREATE TABLE IF NOT EXISTS saved_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  tab_id text NOT NULL,
  file_path text NOT NULL,
  veeqo_id text NOT NULL,
  tab_number integer NOT NULL,
  saved_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_saved_files_order_item_id ON saved_files(order_item_id);
CREATE INDEX IF NOT EXISTS idx_saved_files_tab_id ON saved_files(tab_id);
CREATE INDEX IF NOT EXISTS idx_saved_files_veeqo_id ON saved_files(veeqo_id);

-- Add unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_files_unique_tab ON saved_files(order_item_id, tab_id);

-- Add review fields to order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'marked_for_review'
  ) THEN
    ALTER TABLE order_items ADD COLUMN marked_for_review boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'review_notes'
  ) THEN
    ALTER TABLE order_items ADD COLUMN review_notes text DEFAULT '';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE saved_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_files
CREATE POLICY "Authenticated users can view saved files"
  ON saved_files FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert saved files"
  ON saved_files FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update saved files"
  ON saved_files FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete saved files"
  ON saved_files FOR DELETE
  TO authenticated
  USING (true);
