-- Add timeline columns to articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS series_id VARCHAR;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS story_series_title TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_parent_story BOOLEAN DEFAULT FALSE;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS series_update_count INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_series_id ON articles(series_id);
CREATE INDEX IF NOT EXISTS idx_articles_parent_story ON articles(is_parent_story);
CREATE INDEX IF NOT EXISTS idx_articles_series_published ON articles(series_id, published_at DESC);

-- Create view for timeline stories
CREATE OR REPLACE VIEW timeline_stories AS
SELECT 
    series_id,
    MAX(story_series_title) as title,
    COUNT(*) as article_count,
    MAX(published_at) as last_updated
FROM articles
WHERE series_id IS NOT NULL
GROUP BY series_id;
