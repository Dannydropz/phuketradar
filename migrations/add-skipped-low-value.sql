-- Migration: Add skipped_low_value table and status column to articles table

CREATE TABLE IF NOT EXISTS skipped_low_value (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT,
  caption TEXT NOT NULL,
  detected_markers TEXT[] DEFAULT ARRAY[]::TEXT[],
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE articles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
