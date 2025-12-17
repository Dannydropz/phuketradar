-- Add Switchy short URL column to articles table
-- For storing branded short links for social media sharing

ALTER TABLE articles ADD COLUMN IF NOT EXISTS switchy_short_url TEXT;

-- Optional: Add index for faster lookups if needed
-- CREATE INDEX IF NOT EXISTS idx_articles_switchy_short_url ON articles(switchy_short_url) WHERE switchy_short_url IS NOT NULL;
