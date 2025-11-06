-- Migration: Clear legacy author field from articles table
-- Date: 2025-11-06
-- Purpose: Remove old Thai journalist names and migrate to new journalist attribution system

-- Step 1: Drop the NOT NULL constraint on the author column
ALTER TABLE articles ALTER COLUMN author DROP NOT NULL;

-- Step 2: Clear all author data (set to NULL)
UPDATE articles SET author = NULL;

-- Verification query (optional - shows count of articles with NULL author)
-- SELECT COUNT(*) as articles_with_null_author FROM articles WHERE author IS NULL;
