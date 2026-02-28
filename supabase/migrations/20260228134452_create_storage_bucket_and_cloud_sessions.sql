/*
  # Create Storage Bucket and Cloud-Based Session Management

  ## Overview
  This migration sets up cloud-based file storage and session management for the web application.
  It creates a Supabase Storage bucket for design files and updates the database schema to support
  CSV-based session identification with cloud file storage.

  ## 1. Storage Bucket
    - `design-files` bucket for storing uploaded PDF and JPG files
    - Public read access for designers and checkers
    - Files organized as: {csv-filename}/{order-number}/{tab-number}.{pdf|jpg}

  ## 2. New Tables
    - `session_uploaded_files` - Tracks all uploaded design files with Supabase Storage URLs
      - `id` (uuid, primary key)
      - `session_id` (uuid, references processing_sessions)
      - `order_item_id` (uuid, references order_items)
      - `tab_id` (text, unique tab identifier)
      - `storage_path` (text, path in Supabase Storage)
      - `storage_url` (text, public URL to access file)
      - `file_type` (text, pdf or jpg)
      - `file_size` (bigint, size in bytes)
      - `original_filename` (text, original file name)
      - `uploaded_at` (timestamptz, when uploaded)

    - `session_positions` - Stores order number placement positions for each tab
      - `id` (uuid, primary key)
      - `session_id` (uuid, references processing_sessions)
      - `order_item_id` (uuid, references order_items)
      - `tab_id` (text, unique tab identifier)
      - `x_position` (integer, x coordinate)
      - `y_position` (integer, y coordinate)
      - `font_size` (integer, font size)
      - `rotation` (integer, rotation angle)
      - `saved_at` (timestamptz, when saved)

  ## 3. Schema Updates
    - Update `processing_sessions` table
      - Add `csv_filename` (text, filename of uploaded CSV)
      - Add `last_accessed_at` (timestamptz, last access time)
      - Add `auto_cleanup_days` (integer, days until auto-cleanup, default 30)
      - Add `is_archived` (boolean, soft delete flag, default false)

  ## 4. Security
    - Enable RLS on all new tables
    - Public read access for storage bucket
    - Policies to allow public access for MVP
    - Ready for authenticated access in future

  ## 5. Important Notes
    - All file operations now use Supabase Storage instead of local file system
    - Session identified by CSV filename for easy recognition
    - Auto-cleanup after 30 days (configurable per session)
    - Files organized logically in storage: csv-name/order/tab
*/

-- Create storage bucket for design files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-files',
  'design-files',
  true,
  52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Public read access for design files" ON storage.objects;
DROP POLICY IF EXISTS "Public upload access for design files" ON storage.objects;
DROP POLICY IF EXISTS "Public update access for design files" ON storage.objects;
DROP POLICY IF EXISTS "Public delete access for design files" ON storage.objects;

-- Set up storage policies for public access
CREATE POLICY "Public read access for design files"
ON storage.objects FOR SELECT
USING (bucket_id = 'design-files');

CREATE POLICY "Public upload access for design files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'design-files');

CREATE POLICY "Public update access for design files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'design-files');

CREATE POLICY "Public delete access for design files"
ON storage.objects FOR DELETE
USING (bucket_id = 'design-files');

-- Update processing_sessions table for CSV-based identification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processing_sessions' AND column_name = 'csv_filename'
  ) THEN
    ALTER TABLE processing_sessions ADD COLUMN csv_filename text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processing_sessions' AND column_name = 'last_accessed_at'
  ) THEN
    ALTER TABLE processing_sessions ADD COLUMN last_accessed_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processing_sessions' AND column_name = 'auto_cleanup_days'
  ) THEN
    ALTER TABLE processing_sessions ADD COLUMN auto_cleanup_days integer DEFAULT 30;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processing_sessions' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE processing_sessions ADD COLUMN is_archived boolean DEFAULT false;
  END IF;
END $$;

-- Create session_uploaded_files table
CREATE TABLE IF NOT EXISTS session_uploaded_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES processing_sessions(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  tab_id text NOT NULL,
  storage_path text NOT NULL,
  storage_url text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'jpg', 'jpeg', 'png')),
  file_size bigint NOT NULL DEFAULT 0,
  original_filename text NOT NULL DEFAULT '',
  uploaded_at timestamptz DEFAULT now(),
  UNIQUE(session_id, order_item_id, tab_id)
);

ALTER TABLE session_uploaded_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for session files" ON session_uploaded_files;
DROP POLICY IF EXISTS "Public insert access for session files" ON session_uploaded_files;
DROP POLICY IF EXISTS "Public update access for session files" ON session_uploaded_files;
DROP POLICY IF EXISTS "Public delete access for session files" ON session_uploaded_files;

CREATE POLICY "Public read access for session files"
  ON session_uploaded_files FOR SELECT
  USING (true);

CREATE POLICY "Public insert access for session files"
  ON session_uploaded_files FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access for session files"
  ON session_uploaded_files FOR UPDATE
  USING (true);

CREATE POLICY "Public delete access for session files"
  ON session_uploaded_files FOR DELETE
  USING (true);

-- Create session_positions table
CREATE TABLE IF NOT EXISTS session_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES processing_sessions(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  tab_id text NOT NULL,
  x_position integer NOT NULL DEFAULT 0,
  y_position integer NOT NULL DEFAULT 0,
  font_size integer NOT NULL DEFAULT 12,
  rotation integer NOT NULL DEFAULT 0,
  saved_at timestamptz DEFAULT now(),
  UNIQUE(session_id, order_item_id, tab_id)
);

ALTER TABLE session_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for session positions" ON session_positions;
DROP POLICY IF EXISTS "Public insert access for session positions" ON session_positions;
DROP POLICY IF EXISTS "Public update access for session positions" ON session_positions;
DROP POLICY IF EXISTS "Public delete access for session positions" ON session_positions;

CREATE POLICY "Public read access for session positions"
  ON session_positions FOR SELECT
  USING (true);

CREATE POLICY "Public insert access for session positions"
  ON session_positions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access for session positions"
  ON session_positions FOR UPDATE
  USING (true);

CREATE POLICY "Public delete access for session positions"
  ON session_positions FOR DELETE
  USING (true);

-- Create index for faster session lookups by CSV filename
CREATE INDEX IF NOT EXISTS idx_processing_sessions_csv_filename 
  ON processing_sessions(csv_filename) 
  WHERE is_archived = false;

-- Create index for faster file lookups
CREATE INDEX IF NOT EXISTS idx_session_uploaded_files_session 
  ON session_uploaded_files(session_id);

CREATE INDEX IF NOT EXISTS idx_session_uploaded_files_order_item 
  ON session_uploaded_files(order_item_id);

-- Create index for faster position lookups
CREATE INDEX IF NOT EXISTS idx_session_positions_session 
  ON session_positions(session_id);

CREATE INDEX IF NOT EXISTS idx_session_positions_order_item 
  ON session_positions(order_item_id);

-- Create index for auto-cleanup queries
CREATE INDEX IF NOT EXISTS idx_processing_sessions_cleanup 
  ON processing_sessions(last_accessed_at) 
  WHERE is_archived = false;