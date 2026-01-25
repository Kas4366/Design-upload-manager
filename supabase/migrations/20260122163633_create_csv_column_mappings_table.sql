/*
  # Create CSV Column Mappings Table

  1. New Tables
    - `csv_column_mappings`
      - `id` (uuid, primary key) - Unique identifier for the mapping record
      - `veeqo_id_column` (text) - CSV column name that maps to veeqo_id field
      - `order_number_column` (text) - CSV column name that maps to order_number field
      - `sku_column` (text) - CSV column name that maps to sku field
      - `title_column` (text) - CSV column name that maps to title field
      - `quantity_column` (text) - CSV column name that maps to quantity field
      - `number_of_lines_column` (text) - CSV column name that maps to number_of_lines field
      - `customer_note_column` (text) - CSV column name that maps to customer_note field
      - `additional_options_column` (text) - CSV column name that maps to additional_options field
      - `updated_at` (timestamptz) - Timestamp of last mapping update
      - `created_at` (timestamptz) - Timestamp of mapping creation

  2. Security
    - Enable RLS on `csv_column_mappings` table
    - Add policy for all users to read mapping data (single global configuration)
    - Add policy for all users to update mapping data (single global configuration)

  3. Notes
    - This table stores a single row with the global CSV column mapping configuration
    - All columns allow NULL values to support partial mappings
    - Users can update the mapping anytime by uploading a new sample CSV
*/

CREATE TABLE IF NOT EXISTS csv_column_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veeqo_id_column text,
  order_number_column text,
  sku_column text,
  title_column text,
  quantity_column text,
  number_of_lines_column text,
  customer_note_column text,
  additional_options_column text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE csv_column_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read column mappings"
  ON csv_column_mappings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert column mappings"
  ON csv_column_mappings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update column mappings"
  ON csv_column_mappings FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete column mappings"
  ON csv_column_mappings FOR DELETE
  USING (true);