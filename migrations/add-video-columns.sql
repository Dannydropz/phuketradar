-- Add video support columns to articles table
-- This enables storing video URLs and high-quality thumbnails for video posts

ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS video_thumbnail text;

-- Create index for faster video content queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_articles_video_url ON articles(video_url) WHERE video_url IS NOT NULL;
