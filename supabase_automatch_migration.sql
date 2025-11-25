-- Add columns for timeline auto-matching
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS timeline_tags text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS auto_match_enabled boolean DEFAULT false;

-- Add index for timeline tags to speed up matching (GIN index for array)
CREATE INDEX IF NOT EXISTS idx_articles_timeline_tags ON articles USING GIN (timeline_tags);
