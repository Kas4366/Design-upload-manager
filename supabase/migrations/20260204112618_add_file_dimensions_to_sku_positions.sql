/*
  # Add File Dimensions to SKU Positions

  ## Changes
  
  1. Adds file dimension tracking to sku_positions table
    - `file_width` (numeric) - Stores actual width of the file (pixels for JPG, points for PDF)
    - `file_height` (numeric) - Stores actual height of the file (pixels for JPG, points for PDF)
  
  ## Purpose
  
  These fields store the actual dimensions of the design file used when positioning was set.
  This allows accurate coordinate transformation between preview display and final output
  for both JPG files (A5 print size) and PDF files (various sizes).
  
  ## Notes
  
  - Coordinates (x, y) are stored relative to these file dimensions
  - Font sizes are stored in actual final printed size (no scaling needed)
  - Works universally for both JPG pixel dimensions and PDF point dimensions
*/

-- Add file dimension columns to sku_positions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sku_positions' AND column_name = 'file_width'
  ) THEN
    ALTER TABLE sku_positions ADD COLUMN file_width numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sku_positions' AND column_name = 'file_height'
  ) THEN
    ALTER TABLE sku_positions ADD COLUMN file_height numeric;
  END IF;
END $$;