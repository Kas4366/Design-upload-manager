/*
  # Create Processing Session History Table

  1. New Table
    - `processing_sessions`
      - `id` (uuid, primary key)
      - `csv_filename` (text) - Name of uploaded CSV file
      - `total_orders` (integer) - Total number of orders processed
      - `completed_orders` (integer) - Number of completed orders
      - `started_at` (timestamptz) - Session start time
      - `completed_at` (timestamptz, nullable) - Session completion time
      - `status` (text) - Session status: 'in_progress', 'completed', 'abandoned'
      - `created_at` (timestamptz) - Creation timestamp

    - `order_items`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key) - Reference to processing session
      - `veeqo_id` (text) - Veeqo internal order number (id column from CSV)
      - `order_number` (text) - Display order number
      - `sku` (text) - Product SKU
      - `product_title` (text) - Product title
      - `quantity` (integer) - Order quantity
      - `number_of_lines` (integer) - Number of lines (from CSV)
      - `customer_note` (text) - Customer notes
      - `additional_options` (text) - Additional options
      - `is_customized` (boolean) - Whether order requires customization
      - `status` (text) - Item status: 'pending', 'uploaded', 'saved'
      - `saved_at` (timestamptz, nullable) - When files were saved
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for public access (desktop app context)
  
  3. Indexes
    - Index on session_id for fast order item lookups
    - Index on veeqo_id for quick order searches
    - Index on status for filtering
*/

CREATE TABLE IF NOT EXISTS processing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  csv_filename text NOT NULL,
  total_orders integer DEFAULT 0,
  completed_orders integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text DEFAULT 'in_progress',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES processing_sessions(id) ON DELETE CASCADE,
  veeqo_id text NOT NULL,
  order_number text NOT NULL,
  sku text NOT NULL,
  product_title text NOT NULL,
  quantity integer DEFAULT 1,
  number_of_lines integer DEFAULT 1,
  customer_note text DEFAULT '',
  additional_options text DEFAULT '',
  is_customized boolean DEFAULT false,
  status text DEFAULT 'pending',
  saved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE processing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on processing_sessions"
  ON processing_sessions
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on order_items"
  ON order_items
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_order_items_session_id ON order_items(session_id);
CREATE INDEX IF NOT EXISTS idx_order_items_veeqo_id ON order_items(veeqo_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);
CREATE INDEX IF NOT EXISTS idx_processing_sessions_status ON processing_sessions(status);
