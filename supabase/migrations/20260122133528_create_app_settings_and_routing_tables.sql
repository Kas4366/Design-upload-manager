/*
  # Create Application Settings and SKU Routing Tables

  1. New Tables
    - `app_settings`
      - `id` (uuid, primary key)
      - `key` (text, unique) - Setting key name (e.g., 'date_folder_path', 'premade_folder_path')
      - `value` (text) - Setting value
      - `updated_at` (timestamptz) - Last update timestamp
      - `created_at` (timestamptz) - Creation timestamp

    - `sku_routing_rules`
      - `id` (uuid, primary key)
      - `pattern` (text) - SKU pattern to match (e.g., 'CH', 'CD', 'BL')
      - `folder_name` (text) - Target folder name
      - `priority` (integer) - Rule priority for matching order (lower = higher priority)
      - `active` (boolean) - Whether rule is active
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for public access (desktop app context)
  
  3. Initial Data
    - Default folder paths (empty initially)
    - Default SKU routing rules (CH, CD, BL)
*/

CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sku_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern text NOT NULL,
  folder_name text NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on app_settings"
  ON app_settings
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on sku_routing_rules"
  ON sku_routing_rules
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO app_settings (key, value) VALUES
  ('date_folder_path', ''),
  ('premade_folder_path', '')
ON CONFLICT (key) DO NOTHING;

INSERT INTO sku_routing_rules (pattern, folder_name, priority, active) VALUES
  ('CH', 'CH', 1, true),
  ('CD', 'CD', 2, true),
  ('BL', 'BL', 3, true)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_sku_routing_rules_priority ON sku_routing_rules(priority);
CREATE INDEX IF NOT EXISTS idx_sku_routing_rules_active ON sku_routing_rules(active);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);
