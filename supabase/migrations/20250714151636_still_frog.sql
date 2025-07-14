/*
  # Add name column to leaderboard table

  1. Changes
    - Add `name` column to `leaderboard` table
    - Set default value to 'ANON' for existing records
    - Add constraint to limit name length to 6 characters

  2. Security
    - No changes to existing RLS policies needed
*/

-- Add name column to leaderboard table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leaderboard' AND column_name = 'name'
  ) THEN
    ALTER TABLE leaderboard ADD COLUMN name text DEFAULT 'ANON';
    
    -- Add constraint to limit name length to 6 characters
    ALTER TABLE leaderboard ADD CONSTRAINT name_length_check CHECK (char_length(name) <= 6);
  END IF;
END $$;