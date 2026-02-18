-- Migration: Add source image URL columns for cross-source duplicate detection
-- These columns store the original Facebook CDN image URLs before they are
-- downloaded and replaced with locally-hosted paths.
-- This enables duplicate detection when the same image is posted by multiple sources.

ALTER TABLE articles 
  ADD COLUMN IF NOT EXISTS source_image_url TEXT,
  ADD COLUMN IF NOT EXISTS source_image_urls TEXT[];

-- Backfill: For existing articles, copy the current imageUrl/imageUrls as sourceImageUrl
-- (These may already be local paths, but this is a best-effort backfill)
-- In practice, new articles will have the correct CDN URLs stored going forward.
UPDATE articles 
SET 
  source_image_url = image_url,
  source_image_urls = image_urls
WHERE source_image_url IS NULL AND image_url IS NOT NULL;

COMMENT ON COLUMN articles.source_image_url IS 'Original Facebook CDN image URL before local download - used for cross-source duplicate detection';
COMMENT ON COLUMN articles.source_image_urls IS 'All original Facebook CDN image URLs before local download - used for cross-source duplicate detection';
