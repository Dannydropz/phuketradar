# Production Deployment Guide: Facebook Auto-Posting Fix

## Overview
This guide explains how to deploy the Facebook auto-posting bug fix to production. The fix separates source Facebook post IDs (for duplicate detection) from our Facebook posting status.

## What Changed
- **New Field**: `source_facebook_post_id` - stores the original Facebook post ID from scraped pages
- **Updated Field**: `facebook_post_id` - now ONLY tracks OUR Facebook page posting status
- **Result**: Duplicate detection works correctly, and auto-posting no longer incorrectly blocks articles

---

## Step-by-Step Production Deployment

### STEP 1: Access Your Production Database
1. Open the Replit Database pane (left sidebar)
2. Click the database dropdown and select **Production**
3. Open the SQL console/query editor

### STEP 2: Run Pre-Migration Checks (DRY RUN)
Copy and paste these queries ONE AT A TIME to see what will be affected:

```sql
-- Preview: See articles that will be migrated
SELECT 
  id,
  title,
  facebook_post_id as current_facebook_post_id,
  source_facebook_post_id as current_source_post_id,
  is_published
FROM articles
WHERE facebook_post_id IS NOT NULL
LIMIT 20;
```

```sql
-- Count: How many articles will be migrated
SELECT COUNT(*) as articles_to_migrate
FROM articles
WHERE facebook_post_id IS NOT NULL;
```

**Expected Result**: You should see articles that currently have a `facebook_post_id` value. These are articles scraped from Facebook (with source post IDs), NOT articles posted to YOUR Facebook page.

### STEP 3: Run the Migration (DO THIS CAREFULLY)
Copy and paste this UPDATE statement into the SQL console:

```sql
UPDATE articles
SET 
  source_facebook_post_id = facebook_post_id,
  facebook_post_id = NULL,
  facebook_post_url = NULL
WHERE facebook_post_id IS NOT NULL
  AND facebook_post_id NOT LIKE 'LOCK:%';
```

**What This Does**:
- Moves all existing `facebook_post_id` values to `source_facebook_post_id` (for duplicate detection)
- Clears `facebook_post_id` to NULL (so articles can be auto-posted to YOUR page)
- Clears `facebook_post_url` (will be set when actually posted)
- Skips any locked rows (safety measure)

### STEP 4: Verify the Migration Worked
Run these verification queries:

```sql
-- Verify: Check migration statistics
SELECT 
  COUNT(*) as total_articles,
  COUNT(CASE WHEN source_facebook_post_id IS NOT NULL THEN 1 END) as has_source_id,
  COUNT(CASE WHEN facebook_post_id IS NULL THEN 1 END) as facebook_id_cleared
FROM articles
WHERE source_facebook_post_id IS NOT NULL;
```

```sql
-- Verify: Look at example migrated articles
SELECT 
  id,
  title,
  facebook_post_id,
  source_facebook_post_id,
  is_published,
  interest_score
FROM articles
WHERE source_facebook_post_id IS NOT NULL
LIMIT 10;
```

**Expected Results**:
- `has_source_id` should equal the count from STEP 2
- `facebook_post_id` should be NULL for migrated articles
- `source_facebook_post_id` should contain the original Facebook post IDs

### STEP 5: Deploy the New Code
1. In the Replit workspace, click **Deploy** (or your deployment method)
2. Wait for the deployment to complete
3. The new code includes:
   - Schema changes for `source_facebook_post_id`
   - Updated duplicate detection logic
   - Fixed Facebook auto-posting rules
   - Admin dashboard improvements

### STEP 6: Test in Production
After deployment, verify everything works:

1. **Check Admin Dashboard**:
   - Go to `/admin` in production
   - Verify published articles show the Facebook button
   - Check that interest scores are displayed correctly

2. **Test Manual Scrape** (optional):
   - Trigger a manual scrape from the admin dashboard
   - Verify duplicate detection works (old articles aren't re-scraped)
   - Check that high-interest articles (score ≥ 4) auto-post to Facebook

3. **Monitor Next Automated Scrape**:
   - Wait for the next scheduled scrape (runs every 2 hours)
   - Check logs for any errors
   - Verify new articles are being processed correctly

---

## Rollback Plan (If Something Goes Wrong)

If you need to rollback the migration:

```sql
-- ROLLBACK: Restore original state
UPDATE articles
SET 
  facebook_post_id = source_facebook_post_id,
  source_facebook_post_id = NULL
WHERE source_facebook_post_id IS NOT NULL
  AND facebook_post_id IS NULL;
```

Then redeploy the previous version of the code.

---

## Expected Behavior After Deployment

### ✅ What Should Happen
- Duplicate detection prevents re-scraping articles with the same source Facebook post ID
- Articles with interest score ≥ 4 automatically post to YOUR Facebook page during scraping
- Admin dashboard shows Facebook button for ALL published articles
- Manual Facebook posting works for any published article
- Interest scores are visible with color-coded badges

### ❌ What Should NOT Happen Anymore
- "Already posted to Facebook" errors for articles that were never posted
- Duplicate articles with different Facebook post IDs
- Facebook button hidden on published articles
- Auto-posting blocked by incorrect duplicate detection

---

## Questions or Issues?

If you encounter any problems during deployment:
1. Check the production logs for error messages
2. Verify the migration queries ran successfully
3. Ensure the database schema includes `source_facebook_post_id` column
4. Contact support if needed with specific error messages

---

## Summary Checklist

- [ ] Run pre-migration checks (STEP 2)
- [ ] Run the UPDATE migration query (STEP 3)
- [ ] Verify migration succeeded (STEP 4)
- [ ] Deploy the new code (STEP 5)
- [ ] Test admin dashboard and scraping (STEP 6)
- [ ] Monitor automated scrapes for issues

**Estimated Time**: 10-15 minutes
**Risk Level**: Low (tested in development, rollback available)
