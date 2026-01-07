-- Add lastManualEditAt column to track when admin manually edited content
-- This prevents auto-enrichment from overwriting manual edits

ALTER TABLE articles ADD COLUMN IF NOT EXISTS last_manual_edit_at TIMESTAMP;

-- Add a comment for documentation
COMMENT ON COLUMN articles.last_manual_edit_at IS 'When admin last manually edited content - enrichment will skip articles with this set';
