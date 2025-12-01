-- Score Learning System
-- Tracks manual score adjustments by admins to improve AI scoring over time

CREATE TABLE IF NOT EXISTS score_adjustments (
  id SERIAL PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  original_score INTEGER NOT NULL,
  adjusted_score INTEGER NOT NULL,
  adjustment_reason TEXT,
  article_title TEXT NOT NULL,
  article_category TEXT NOT NULL,
  article_content_snippet TEXT,
  thai_keywords TEXT[], -- Original Thai keywords from the article
  adjusted_by TEXT DEFAULT 'admin',
  adjusted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_score_adjustments_article_id ON score_adjustments(article_id);
CREATE INDEX IF NOT EXISTS idx_score_adjustments_category ON score_adjustments(article_category);
CREATE INDEX IF NOT EXISTS idx_score_adjustments_adjusted_at ON score_adjustments(adjusted_at DESC);

-- Success message
SELECT 'Score learning table created successfully!' as status;
