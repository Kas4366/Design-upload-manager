/*
# Add BL Label Numbering Setting

1. New Settings
   - `app_settings`: Insert a new row with key `bl_label_numbering` and value `'false'`.
     When set to `'true'`, the app will draw a sequential number inside a circle
     to the left of the order number on BL (bottle label) design files.
     The sequence is determined by sorting all BL orders in the current session
     by Veeqo ID. If the Amz prefix toggle is also on, Amazon and non-Amazon
     BL orders get separate sequences (Amazon prefixed with "A").

2. Security
   - No new tables created; existing RLS policies on `app_settings` already
     cover the new setting row. No policy changes needed.
*/

INSERT INTO app_settings (key, value) VALUES
  ('bl_label_numbering', 'false')
ON CONFLICT (key) DO NOTHING;