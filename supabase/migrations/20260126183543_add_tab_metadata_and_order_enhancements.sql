/*
  # Add Tab Metadata and Enhanced Order Processing

  ## Overview
  Enhances the order processing system to support:
  - Multi-line order grouping by order number
  - Sequential tab numbering across different SKUs
  - Per-tab folder selection with manual override
  - Card SKU identification with manual toggle
  - Tab-level metadata tracking

  ## New Tables
  
  ### `tab_metadata`
  Stores tab-level information for each design upload tab:
  - `id` (uuid, primary key) - Unique identifier
  - `order_item_id` (uuid, foreign key) - References order_items
  - `tab_id` (text) - Client-side tab identifier
  - `tab_number` (integer) - Sequential tab number (1, 2, 3, 4...)
  - `sku` (text) - SKU associated with this tab
  - `line_index` (integer) - Which CSV line this tab belongs to
  - `is_card` (boolean) - Whether designer marked this as a card
  - `auto_selected_folder` (text, nullable) - Folder matched by routing rules
  - `selected_folder` (text, nullable) - Designer's folder selection
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Modified Tables
  
  ### `order_items`
  Added columns:
  - `line_index` (integer, default 0) - Index within grouped order
  - `total_tabs` (integer, default 1) - Total tabs for this line item
  - `is_card` (boolean, default false) - Card identification flag
  
  ## Security
  - Enable RLS on `tab_metadata` table
  - Add policies for authenticated users to manage their tab data
  - Policies allow full access since this is a desktop app with single user
  
  ## Notes
  - Tab numbering is sequential across all lines in an order
  - Folder selection allows designer override of automatic routing
  - Card detection can be automatic (from title) or manual (checkbox)
  - Each tab can have different folder destinations
*/

-- Add new columns to order_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'line_index'
  ) THEN
    ALTER TABLE order_items ADD COLUMN line_index integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'total_tabs'
  ) THEN
    ALTER TABLE order_items ADD COLUMN total_tabs integer DEFAULT 1 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'is_card'
  ) THEN
    ALTER TABLE order_items ADD COLUMN is_card boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create tab_metadata table
CREATE TABLE IF NOT EXISTS tab_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  tab_id text NOT NULL,
  tab_number integer NOT NULL,
  sku text NOT NULL,
  line_index integer NOT NULL DEFAULT 0,
  is_card boolean NOT NULL DEFAULT false,
  auto_selected_folder text,
  selected_folder text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tab_metadata_order_item_id ON tab_metadata(order_item_id);
CREATE INDEX IF NOT EXISTS idx_tab_metadata_tab_id ON tab_metadata(tab_id);

-- Enable RLS
ALTER TABLE tab_metadata ENABLE ROW LEVEL SECURITY;

-- Policies for tab_metadata (full access for authenticated users)
CREATE POLICY "Users can view all tab metadata"
  ON tab_metadata FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert tab metadata"
  ON tab_metadata FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update tab metadata"
  ON tab_metadata FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete tab metadata"
  ON tab_metadata FOR DELETE
  TO authenticated
  USING (true);