-- Production Database Migration: Add slug column and backfill values
-- Run this in your Replit Production Database Studio

-- Step 1: Add slug column to articles table
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Step 2: Add unique constraint on slug (allows NULL)
ALTER TABLE articles 
ADD CONSTRAINT articles_slug_unique UNIQUE (slug);

-- Step 3: Backfill slugs for all existing articles
-- This generates SEO-friendly slugs from titles with unique suffixes
UPDATE articles
SET slug = CONCAT(
  -- Generate slug from title
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          LOWER(TRIM(title)),
          '\s+', '-', 'g'
        ),
        '[^\w\-]+', '', 'g'
      ),
      '\-\-+', '-', 'g'
    ),
    '^-+|-+$', '', 'g'
  ),
  '-',
  -- Add first 8 characters of ID for uniqueness
  SUBSTRING(id, 1, 8)
)
WHERE slug IS NULL OR slug = '';

-- Step 4: Verify the migration
SELECT COUNT(*) as articles_with_slugs FROM articles WHERE slug IS NOT NULL AND slug != '';
SELECT id, title, slug FROM articles ORDER BY published_at DESC LIMIT 5;
