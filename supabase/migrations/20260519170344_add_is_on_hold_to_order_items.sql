/*
  # Add is_on_hold to order_items

  ## Summary
  Adds an `is_on_hold` boolean flag to the `order_items` table so designers can
  mark orders as blocked (e.g. missing information) without counting them as
  incomplete. On-hold orders block the Save button and are counted as "handled"
  in the session progress counter alongside saved orders.

  ## Changes
  - `order_items`: new column `is_on_hold` (boolean, default false)

  ## Notes
  - Safe additive migration — no existing data is modified
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'is_on_hold'
  ) THEN
    ALTER TABLE order_items ADD COLUMN is_on_hold boolean NOT NULL DEFAULT false;
  END IF;
END $$;
