-- Timeline Story Feature Migration
-- Run this in Supabase SQL Editor to add timeline functionality

-- Add new columns for timeline/story series functionality
ALTER TABLE articles ADD COLUMN IF NOT EXISTS story_series_title TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_parent_story BOOLEAN DEFAULT FALSE;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS series_update_count INTEGER DEFAULT 0;

-- Update the existing series_id column comment for clarity
COMMENT ON COLUMN articles.series_id IS 'Groups related articles into a timeline. All articles with same series_id are part of one developing story.';
COMMENT ON COLUMN articles.story_series_title IS 'Human-readable title for the timeline (e.g., "Southern Thailand Flooding Crisis")';
COMMENT ON COLUMN articles.is_parent_story IS 'TRUE for the main story in a series that appears on homepage. FALSE for timeline updates.';
COMMENT ON COLUMN articles.series_update_count IS 'Number of updates in this series (only relevant for parent stories)';

-- Create indexes for efficient timeline queries
CREATE INDEX IF NOT EXISTS idx_articles_series_id ON articles(series_id) WHERE series_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_parent_story ON articles(is_parent_story) WHERE is_parent_story = true;
CREATE INDEX IF NOT EXISTS idx_articles_series_published ON articles(series_id, published_at DESC) WHERE series_id IS NOT NULL;

-- Create a view for easy timeline queries (optional but useful)
CREATE OR REPLACE VIEW timeline_stories AS
SELECT 
  a.series_id,
  MAX(CASE WHEN a.is_parent_story THEN a.id END) as parent_story_id,
  MAX(CASE WHEN a.is_parent_story THEN a.title END) as series_title,
  MAX(CASE WHEN a.is_parent_story THEN a.story_series_title END) as series_display_title,
  COUNT(*) as update_count,
  MAX(a.published_at) as latest_update_at,
  MIN(a.published_at) as first_update_at
FROM articles a
WHERE a.series_id IS NOT NULL
GROUP BY a.series_id;

-- Success message
SELECT 'Timeline migration completed successfully!' as status;

-- Example queries for testing:
-- List all timeline series:
-- SELECT * FROM timeline_stories ORDER BY latest_update_at DESC;

-- Get all updates for a specific series:
-- SELECT id, title, published_at, is_parent_story 
-- FROM articles 
-- WHERE series_id = 'your-series-id-here'
-- ORDER BY published_at DESC;
