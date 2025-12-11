-- Create score_adjustments table for learning from admin corrections
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS score_adjustments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id TEXT NOT NULL,
    original_score INTEGER NOT NULL,
    adjusted_score INTEGER NOT NULL,
    adjustment_reason TEXT,
    article_title TEXT NOT NULL,
    article_category TEXT NOT NULL,
    article_content_snippet TEXT,
    thai_keywords TEXT[],
    adjusted_by TEXT NOT NULL DEFAULT 'admin',
    adjusted_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS score_adjustments_article_id_idx ON score_adjustments(article_id);
CREATE INDEX IF NOT EXISTS score_adjustments_category_idx ON score_adjustments(article_category);
CREATE INDEX IF NOT EXISTS score_adjustments_adjusted_at_idx ON score_adjustments(adjusted_at);

-- Enable RLS but allow service role full access
ALTER TABLE score_adjustments ENABLE ROW LEVEL SECURITY;

-- Service role bypass policy (for backend)
CREATE POLICY "Service role has full access to score_adjustments"
    ON score_adjustments
    FOR ALL
    USING (true)
    WITH CHECK (true);
