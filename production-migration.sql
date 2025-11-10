-- Migration: Separate Source Facebook Post ID from Our Facebook Post ID
-- Purpose: Fix auto-posting bug by distinguishing between source post IDs (for duplicate detection)
--          and our Facebook posting status (for auto-posting logic)
--
-- Run this in PRODUCTION database AFTER deploying the code changes

-- Step 1: Preview what will be affected (DRY RUN)
SELECT 
  id,
  title,
  facebook_post_id as current_facebook_post_id,
  source_facebook_post_id as current_source_post_id,
  is_published
FROM articles
WHERE facebook_post_id IS NOT NULL
LIMIT 20;

-- Step 2: Count how many articles need migration
SELECT COUNT(*) as articles_to_migrate
FROM articles
WHERE facebook_post_id IS NOT NULL;

-- Step 3: ACTUAL MIGRATION (uncomment to run)
-- WARNING: This will move all facebook_post_id values to source_facebook_post_id
-- and clear facebook_post_id so articles can be auto-posted

-- UPDATE articles
-- SET 
--   source_facebook_post_id = facebook_post_id,
--   facebook_post_id = NULL,
--   facebook_post_url = NULL
-- WHERE facebook_post_id IS NOT NULL
--   AND facebook_post_id NOT LIKE 'LOCK:%';

-- Step 4: Verify migration worked
-- SELECT 
--   COUNT(*) as migrated_articles,
--   COUNT(CASE WHEN source_facebook_post_id IS NOT NULL THEN 1 END) as has_source_id,
--   COUNT(CASE WHEN facebook_post_id IS NULL THEN 1 END) as facebook_id_cleared
-- FROM articles
-- WHERE source_facebook_post_id IS NOT NULL;

-- Step 5: Check a few examples after migration
-- SELECT 
--   id,
--   title,
--   facebook_post_id,
--   source_facebook_post_id,
--   is_published,
--   interest_score
-- FROM articles
-- WHERE source_facebook_post_id IS NOT NULL
-- LIMIT 10;
