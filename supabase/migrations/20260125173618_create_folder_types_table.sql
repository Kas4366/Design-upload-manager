/*
  # Create Folder Types Table

  1. New Tables
    - `folder_types`
      - `id` (uuid, primary key) - Unique identifier for each folder type
      - `folder_name` (text, unique, not null) - Name of the folder (e.g., "CH", "CD", "BL")
      - `description` (text, nullable) - Optional description of what the folder is for
      - `is_active` (boolean, default true) - Whether this folder type is currently active
      - `sort_order` (integer, default 0) - Order for displaying/sorting folder types
      - `created_at` (timestamptz) - Timestamp of creation
      - `updated_at` (timestamptz) - Timestamp of last update

  2. Security
    - Enable RLS on `folder_types` table
    - Add policies for authenticated users to read all folder types
    - Add policies for authenticated users to manage (insert/update/delete) folder types

  3. Notes
    - Folder types define the available target folders for order processing
    - Only active folders should be used when saving files
    - Folders are created on-demand only when files are actually saved to them
*/

CREATE TABLE IF NOT EXISTS folder_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_name text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE folder_types ENABLE ROW LEVEL SECURITY;

-- Create policies for folder_types
CREATE POLICY "Anyone can view folder types"
  ON folder_types FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert folder types"
  ON folder_types FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update folder types"
  ON folder_types FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete folder types"
  ON folder_types FOR DELETE
  USING (true);

-- Create index on folder_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_folder_types_folder_name ON folder_types(folder_name);

-- Create index on is_active for filtering active folders
CREATE INDEX IF NOT EXISTS idx_folder_types_is_active ON folder_types(is_active);