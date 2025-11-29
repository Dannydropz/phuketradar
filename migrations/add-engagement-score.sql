-- Add engagement_score to articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS engagement_score REAL DEFAULT 0;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_posted_to_facebook BOOLEAN DEFAULT FALSE;
