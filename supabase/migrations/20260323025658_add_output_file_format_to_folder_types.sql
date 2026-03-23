/*
  # Add Output File Format to Folder Types

  1. Changes
    - Add `output_file_format` column to `folder_types` table
      - Type: text with constraint ('pdf' or 'jpg')
      - Default: 'pdf' for backward compatibility
      - Not null

  2. Purpose
    - Allow each folder type to specify whether files should be saved as PDF or JPG
    - Enables automatic format conversion based on folder configuration
    - Maintains backward compatibility with existing folders (default to PDF)

  3. Security
    - No RLS changes needed (existing policies apply)
*/

-- Add output_file_format column to folder_types table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'folder_types' AND column_name = 'output_file_format'
  ) THEN
    ALTER TABLE folder_types 
    ADD COLUMN output_file_format text DEFAULT 'pdf' NOT NULL
    CHECK (output_file_format IN ('pdf', 'jpg'));
  END IF;
END $$;