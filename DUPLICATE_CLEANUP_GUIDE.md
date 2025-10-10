# Duplicate Article Cleanup Guide

## Problem Summary
The scraper was creating duplicate articles every 4 hours because it didn't check if articles with the same `source_url` already existed. This resulted in ~615 duplicate articles in production.

## What's Been Fixed
✅ Added `getArticleBySourceUrl()` method to storage layer  
✅ Scheduler now checks for duplicates before translating (saves API costs!)  
✅ Admin scrape route checks for duplicates before processing  
✅ Enhanced logging shows: total posts, skipped duplicates, skipped non-news, created articles  

## Production Database Cleanup

### Step 1: Check How Many Duplicates You Have

Run this query in your **production database** to see the damage:

```sql
SELECT 
  source_url,
  COUNT(*) as duplicate_count,
  MIN(published_at) as first_created,
  MAX(published_at) as last_created
FROM articles
GROUP BY source_url
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;
```

This shows:
- Which articles were duplicated
- How many times each was duplicated
- When the first and last duplicates were created

### Step 2: Preview Articles That Will Be Deleted

Before deleting anything, see what will be removed:

```sql
-- Articles that will be KEPT (oldest version of each unique source_url)
SELECT 
  a.id,
  a.title,
  a.source_url,
  a.published_at,
  a.is_published
FROM articles a
WHERE a.id IN (
  SELECT MIN(id) 
  FROM articles 
  GROUP BY source_url
)
ORDER BY a.published_at DESC
LIMIT 10;

-- Articles that will be DELETED (newer duplicates)
SELECT 
  a.id,
  a.title,
  a.source_url,
  a.published_at,
  a.is_published
FROM articles a
WHERE a.id NOT IN (
  SELECT MIN(id) 
  FROM articles 
  GROUP BY source_url
)
ORDER BY a.published_at DESC
LIMIT 10;
```

### Step 3: Delete Duplicate Articles (SAFE VERSION)

This query keeps the **oldest** version of each article (by ID) and deletes all newer duplicates:

```sql
DELETE FROM articles
WHERE id NOT IN (
  SELECT MIN(id)
  FROM articles
  GROUP BY source_url
);
```

**What this does:**
- Groups articles by `source_url`
- For each unique source URL, keeps only the article with the smallest ID (oldest)
- Deletes all other duplicates

### Step 4: Verify Cleanup

After deletion, verify you have no more duplicates:

```sql
-- Should return 0 rows if cleanup was successful
SELECT 
  source_url,
  COUNT(*) as count
FROM articles
GROUP BY source_url
HAVING COUNT(*) > 1;
```

Check total article count:

```sql
SELECT 
  COUNT(*) as total_articles,
  COUNT(CASE WHEN is_published = true THEN 1 END) as published,
  COUNT(CASE WHEN is_published = false THEN 1 END) as pending
FROM articles;
```

## Expected Results

**Before cleanup:**
- Total articles: ~615
- Many duplicates per source URL

**After cleanup:**
- Total articles: ~60-100 (unique articles only)
- Each source URL appears exactly once
- No more duplicates!

## Going Forward

The duplicate prevention is now active in both:
1. **Automated scraping** (every 4 hours via cron)
2. **Manual scraping** (admin dashboard "Scrape New Articles" button)

Both will now:
- Check if article already exists before translating
- Skip duplicates (logs: "⏭️ Skipped duplicate: ...")
- Save API costs by not re-translating existing posts
- Show detailed stats: total posts, duplicates skipped, articles created

## Monitoring

Check your logs after the next scrape to see the new behavior:

```
=== Scrape Complete ===
Total posts found: 9
Skipped (duplicates): 8
Skipped (not news): 0
Articles created: 1
Articles published: 1
```

Most posts will be skipped as duplicates - this is correct! Only truly new posts will be translated and created.
