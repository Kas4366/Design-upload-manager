/*
  # Create product_type_positions table

  1. New Tables
    - `product_type_positions`
      - `id` (uuid, primary key)
      - `product_type` (text, unique) - e.g., "wrapper", "bottle_label", "card"
      - `x_position` (integer) - X coordinate for order number placement
      - `y_position` (integer) - Y coordinate for order number placement
      - `font_size` (integer) - Font size for order number text
      - `rotation` (integer) - Rotation angle in degrees
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `product_type_positions` table
    - Add policy for all users to read product type positions
    - Add policy for all users to insert/update product type positions

  3. Notes
    - This table stores default order number positions by product type
    - Used to automatically apply positions to all products of the same type
    - Chocolate wrappers will use the "wrapper" product type
*/

CREATE TABLE IF NOT EXISTS product_type_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text UNIQUE NOT NULL,
  x_position integer DEFAULT 0,
  y_position integer DEFAULT 0,
  font_size integer DEFAULT 12,
  rotation integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE product_type_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read product type positions"
  ON product_type_positions
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert product type positions"
  ON product_type_positions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update product type positions"
  ON product_type_positions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete product type positions"
  ON product_type_positions
  FOR DELETE
  USING (true);