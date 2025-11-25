-- Migration: Add auto-tagging and smart context fields to articles table
-- Date: 2025-11-25
-- Description: Adds series_id for developing story timelines, tags array for auto-tagging, and view_count for trending logic

-- Add series_id column (groups related stories in a developing event)
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS series_id VARCHAR(255);

-- Add tags column (stores auto-detected location/topic tags)
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add view_count column (tracks article popularity for trending widget)
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create index on series_id for efficient timeline queries
CREATE INDEX IF NOT EXISTS idx_articles_series_id ON articles(series_id) WHERE series_id IS NOT NULL;

-- Create index on tags for efficient tag-based queries (GIN index for array columns)
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN(tags);

-- Create index on view_count for trending queries
CREATE INDEX IF NOT EXISTS idx_articles_view_count ON articles(view_count DESC, published_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN articles.series_id IS 'Groups related articles that are part of a developing story (e.g., same incident unfolding over time)';
COMMENT ON COLUMN articles.tags IS 'Auto-detected location and topic tags from article content (e.g., ["Patong", "Crime", "Traffic"])';
COMMENT ON COLUMN articles.view_count IS 'Number of times this article has been viewed, used for trending calculations';
