/*
  # Create global leaderboard table

  1. New Tables
    - `leaderboard`
      - `id` (uuid, primary key)
      - `score` (integer, not null)
      - `level` (integer, not null)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `leaderboard` table
    - Add policy for anyone to read leaderboard data
    - Add policy for anyone to insert new scores
*/

CREATE TABLE IF NOT EXISTS leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score integer NOT NULL,
  level integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read leaderboard data (public leaderboard)
CREATE POLICY "Anyone can read leaderboard"
  ON leaderboard
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anyone to insert new scores
CREATE POLICY "Anyone can insert scores"
  ON leaderboard
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create index for faster queries on score ordering
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard (score DESC, created_at DESC);