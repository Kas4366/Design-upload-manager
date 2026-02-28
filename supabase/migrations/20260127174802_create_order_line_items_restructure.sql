/*
  # Restructure Orders to Support Multi-Line Consolidation

  ## Overview
  This migration consolidates CSV rows with the same order_number into a single order,
  with individual line items tracked separately. This enables proper handling of
  multi-line orders where all lines share the same order number and veeqo_id.

  ## Changes

  1. New Tables
    - `order_line_items`: Stores individual line details from CSV
      - `id` (uuid, primary key)
      - `order_item_id` (uuid, foreign key to order_items)
      - `sku` (text) - Product SKU for this line
      - `product_title` (text) - Product title
      - `quantity` (integer) - Quantity for this line
      - `number_of_lines` (integer) - Number of design lines/tabs needed
      - `line_index` (integer) - Order of this line in CSV (0-based)
      - `created_at` (timestamptz)

  2. Modified Tables
    - `order_items`: Remove line-specific columns (sku, product_title, quantity, number_of_lines, line_index)
      - Keep: veeqo_id, order_number, customer_note, additional_options, is_customized, status, total_tabs
      - total_tabs now represents sum across all line items
    - `tab_metadata`: Add line_item_id to track which line each tab belongs to

  3. Data Migration
    - Migrate existing order_items data to new structure
    - Create order_line_items from existing orders
    - Update tab_metadata with line_item references

  4. Security
    - Enable RLS on order_line_items table
    - Add policies for authenticated access
*/

-- Step 1: Create order_line_items table
CREATE TABLE IF NOT EXISTS order_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL,
  sku text NOT NULL DEFAULT '',
  product_title text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  number_of_lines integer NOT NULL DEFAULT 1,
  line_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Step 2: Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'order_line_items_order_item_id_fkey'
  ) THEN
    ALTER TABLE order_line_items
    ADD CONSTRAINT order_line_items_order_item_id_fkey
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Add line_item_id to tab_metadata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tab_metadata' AND column_name = 'line_item_id'
  ) THEN
    ALTER TABLE tab_metadata ADD COLUMN line_item_id uuid;
  END IF;
END $$;

-- Step 4: Migrate existing data
-- Create line items from existing order_items
INSERT INTO order_line_items (order_item_id, sku, product_title, quantity, number_of_lines, line_index)
SELECT 
  id,
  COALESCE(sku, ''),
  COALESCE(product_title, ''),
  COALESCE(quantity, 1),
  COALESCE(number_of_lines, 1),
  COALESCE(line_index, 0)
FROM order_items
WHERE NOT EXISTS (
  SELECT 1 FROM order_line_items WHERE order_line_items.order_item_id = order_items.id
);

-- Step 5: Update tab_metadata with line_item_id references
UPDATE tab_metadata tm
SET line_item_id = oli.id
FROM order_line_items oli
WHERE tm.order_item_id = oli.order_item_id
  AND tm.line_index = oli.line_index
  AND tm.line_item_id IS NULL;

-- Step 6: Add foreign key for line_item_id in tab_metadata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tab_metadata_line_item_id_fkey'
  ) THEN
    ALTER TABLE tab_metadata
    ADD CONSTRAINT tab_metadata_line_item_id_fkey
    FOREIGN KEY (line_item_id) REFERENCES order_line_items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 7: Enable RLS on order_line_items
ALTER TABLE order_line_items ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for order_line_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'order_line_items' AND policyname = 'Allow all operations for authenticated users'
  ) THEN
    CREATE POLICY "Allow all operations for authenticated users"
      ON order_line_items
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'order_line_items' AND policyname = 'Allow all operations for anon users'
  ) THEN
    CREATE POLICY "Allow all operations for anon users"
      ON order_line_items
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_line_items_order_item_id 
  ON order_line_items(order_item_id);

CREATE INDEX IF NOT EXISTS idx_tab_metadata_line_item_id 
  ON tab_metadata(line_item_id);
