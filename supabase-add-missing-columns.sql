-- Add all missing columns to articles table

ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS original_content TEXT,
ADD COLUMN IF NOT EXISTS image_hash TEXT,
ADD COLUMN IF NOT EXISTS author TEXT,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_language TEXT DEFAULT 'th',
ADD COLUMN IF NOT EXISTS translated_by TEXT DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS facebook_post_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS facebook_headline TEXT,
ADD COLUMN IF NOT EXISTS facebook_post_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_post_id TEXT,
ADD COLUMN IF NOT EXISTS instagram_post_url TEXT,
ADD COLUMN IF NOT EXISTS threads_post_id TEXT,
ADD COLUMN IF NOT EXISTS threads_post_url TEXT,
ADD COLUMN IF NOT EXISTS source_location TEXT,
ADD COLUMN IF NOT EXISTS source_entities JSONB,
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_tags TEXT[],
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS article_type TEXT;

-- Success message
SELECT 'All missing columns added!' as status;
