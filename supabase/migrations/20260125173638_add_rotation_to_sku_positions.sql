/*
  # Add Rotation Column to SKU Positions Table

  1. Changes
    - Add `rotation` column to `sku_positions` table
      - Type: numeric (allows decimal values for precise rotation angles)
      - Default: 0 (no rotation)
      - Stores rotation angle in degrees (0-360)

  2. Notes
    - Rotation allows order numbers to be placed at any angle on PDFs
    - Common values: 0 (horizontal), 90 (vertical clockwise), 180 (upside down), 270 (vertical counter-clockwise)
    - Decimal values supported for fine-tuned rotation
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sku_positions' AND column_name = 'rotation'
  ) THEN
    ALTER TABLE sku_positions ADD COLUMN rotation numeric DEFAULT 0 NOT NULL;
  END IF;
END $$;