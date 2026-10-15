-- Change position columns from integer to numeric in product_type_positions
-- and session_positions tables to allow decimal pixel coordinates

-- product_type_positions: allow decimals for precise placement
ALTER TABLE product_type_positions
  ALTER COLUMN x_position TYPE numeric USING x_position::numeric,
  ALTER COLUMN y_position TYPE numeric USING y_position::numeric,
  ALTER COLUMN font_size TYPE numeric USING font_size::numeric,
  ALTER COLUMN rotation TYPE numeric USING rotation::numeric;

-- session_positions: allow decimals for precise placement
ALTER TABLE session_positions
  ALTER COLUMN x_position TYPE numeric USING x_position::numeric,
  ALTER COLUMN y_position TYPE numeric USING y_position::numeric,
  ALTER COLUMN font_size TYPE numeric USING font_size::numeric,
  ALTER COLUMN rotation TYPE numeric USING rotation::numeric;
