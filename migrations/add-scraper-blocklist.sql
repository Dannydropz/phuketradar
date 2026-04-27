-- Migration: Add scraper_blocklist table
-- Purpose: Permanently block source URLs / Facebook post IDs from being re-scraped.
-- Populated automatically when an article is deleted (so dedup survives deletion),
-- or manually via POST /api/admin/blocklist for immediate blocking.
--
-- Run this on production BEFORE deploying the new code.
-- Safe to run multiple times (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS scraper_blocklist (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url           TEXT,                             -- Full Facebook post permalink
  source_facebook_post_id TEXT,                          -- Numeric FB post ID (most reliable)
  reason      TEXT NOT NULL DEFAULT 'deleted_by_admin',  -- Why it was blocked
  blocked_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  article_title TEXT                                     -- Original title for audit trail
);

-- Indexes for fast lookup during every scrape cycle
CREATE INDEX IF NOT EXISTS blocklist_source_url_idx
  ON scraper_blocklist(source_url);

CREATE INDEX IF NOT EXISTS blocklist_fb_post_id_idx
  ON scraper_blocklist(source_facebook_post_id);

-- ── IMMEDIATE BLOCK: Krabi AirAsia bomb-threat reshare ─────────────────────────
-- Block this specific post NOW so it can never be scraped/published again.
-- The sourceUrl below is the Newshawk Phuket reshare post. Update it with the
-- actual URL if you can find it from the article's sourceUrl field.
-- You can find it by running: SELECT source_url, source_facebook_post_id FROM articles WHERE title ILIKE '%krabi%' OR title ILIKE '%airasias%' OR title ILIKE '%bomb%' ORDER BY published_at DESC LIMIT 10;
--
-- Uncomment and fill in the actual URL once confirmed:
-- INSERT INTO scraper_blocklist (source_url, reason, article_title)
-- VALUES ('https://www.facebook.com/NewshawkPhuket/posts/REPLACE_WITH_ACTUAL_POST_ID',
--         'manually_blocked',
--         'Krabi AirAsia bomb threat reshare — hallucinated 3 fake articles')
-- ON CONFLICT DO NOTHING;
