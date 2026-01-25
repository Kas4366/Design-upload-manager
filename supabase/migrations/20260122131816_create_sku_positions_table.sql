/*
  # Create SKU Position Memory System

  1. New Tables
    - `sku_positions`
      - `id` (uuid, primary key) - Unique identifier
      - `sku` (text, unique, not null) - Product SKU identifier
      - `x_position` (numeric, not null) - Horizontal position in pixels
      - `y_position` (numeric, not null) - Vertical position in pixels
      - `font_size` (integer, not null, default 12) - Font size for order number
      - `last_updated` (timestamptz, default now()) - Last modification timestamp
      - `created_at` (timestamptz, default now()) - Creation timestamp

  2. Security
    - Enable RLS on `sku_positions` table
    - Add policy for public access (since this is a designer tool without user auth)
    
  3. Notes
    - SKU is unique to prevent duplicate entries for the same product
    - Positions are stored in pixels for precise placement
    - Timestamps help track when positions were last modified
*/

CREATE TABLE IF NOT EXISTS sku_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  x_position numeric NOT NULL,
  y_position numeric NOT NULL,
  font_size integer NOT NULL DEFAULT 12,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sku_positions ENABLE ROW LEVEL SECURITY;

-- Allow public access for read operations
CREATE POLICY "Anyone can read SKU positions"
  ON sku_positions
  FOR SELECT
  USING (true);

-- Allow public access for insert operations
CREATE POLICY "Anyone can insert SKU positions"
  ON sku_positions
  FOR INSERT
  WITH CHECK (true);

-- Allow public access for update operations
CREATE POLICY "Anyone can update SKU positions"
  ON sku_positions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow public access for delete operations
CREATE POLICY "Anyone can delete SKU positions"
  ON sku_positions
  FOR DELETE
  USING (true);

-- Create index on SKU for faster lookups
CREATE INDEX IF NOT EXISTS idx_sku_positions_sku ON sku_positions(sku);