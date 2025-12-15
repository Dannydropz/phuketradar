-- Add facebook_embed_url column to articles table
-- This allows storing a Facebook post/reel/video URL for embedding directly on article pages
-- Useful when scraping fails but we still want to display the original Facebook content

ALTER TABLE articles ADD COLUMN IF NOT EXISTS facebook_embed_url TEXT;

COMMENT ON COLUMN articles.facebook_embed_url IS 'Facebook video/reel URL to embed on article page using Facebook SDK';
