-- COMPLETE SCHEMA FIX - Add ALL missing columns at once

ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS original_title TEXT,
ADD COLUMN IF NOT EXISTS original_content TEXT,
ADD COLUMN IF NOT EXISTS image_hash TEXT,
ADD COLUMN IF NOT EXISTS author TEXT,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_language TEXT DEFAULT 'th',
ADD COLUMN IF NOT EXISTS translated_by TEXT DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS facebook_post_id TEXT,
ADD COLUMN IF NOT EXISTS facebook_headline TEXT,
ADD COLUMN IF NOT EXISTS facebook_post_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_post_id TEXT,
ADD COLUMN IF NOT EXISTS instagram_post_url TEXT,
ADD COLUMN IF NOT EXISTS threads_post_id TEXT,
ADD COLUMN IF NOT EXISTS threads_post_url TEXT,
ADD COLUMN IF NOT EXISTS article_type TEXT DEFAULT 'breaking',
ADD COLUMN IF NOT EXISTS related_article_ids TEXT[],
ADD COLUMN IF NOT EXISTS entities JSONB,
ADD COLUMN IF NOT EXISTS is_manually_created BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_story_id TEXT,
ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS enrichment_count INTEGER DEFAULT 0;

-- Add unique constraints where needed (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'articles_facebook_post_id_key') THEN
        ALTER TABLE articles ADD CONSTRAINT articles_facebook_post_id_key UNIQUE (facebook_post_id);
    END IF;
END $$;

-- Success message
SELECT 'All columns added successfully!' as status;
