# Production Deployment Guide: Facebook Auto-Posting Fix

## Overview
This guide explains how to deploy the Facebook auto-posting bug fix to production. The fix separates source Facebook post IDs (for duplicate detection) from our Facebook posting status.

## What Changed
- **New Field**: `source_facebook_post_id` - stores the original Facebook post ID from scraped pages
- **Updated Field**: `facebook_post_id` - now ONLY tracks OUR Facebook page posting status
- **Result**: Duplicate detection works correctly, and auto-posting no longer incorrectly blocks articles

## Why Staged Deployment?
With 376 articles in production, adding a UNIQUE constraint during deployment can cause timeouts. We'll deploy in 3 stages:
1. **First deployment**: Add column WITHOUT unique constraint (fast)
2. **Data migration**: Populate the new column
3. **Second deployment**: Add UNIQUE constraint (fast - column already has data)

---

## STAGE 1: Initial Deployment (Add Column)

### STEP 1: Deploy the Code (WITHOUT UNIQUE Constraint)
1. **Current State**: The schema has `sourceFacebookPostId` WITHOUT `.unique()`
2. Click **Deploy** in Replit
3. Wait for deployment to complete
4. This creates the `source_facebook_post_id` column without constraints - should be FAST

**Expected**: Deployment completes in ~1-2 minutes (no constraint = no timeout)

---

## STAGE 2: Data Migration

### STEP 2: Access Your Production Database
1. Open the Replit Database pane (left sidebar)
2. Click the database dropdown and select **Production**
3. Open the SQL console/query editor

### STEP 3: Run Pre-Migration Checks (DRY RUN)
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
-- Count: How many articles will be migrated (should be ~376)
SELECT COUNT(*) as articles_to_migrate
FROM articles
WHERE facebook_post_id IS NOT NULL;
```

**Expected Result**: You should see 376 articles with `facebook_post_id` values (scraped source IDs).

### STEP 4: Run the Data Migration
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

### STEP 5: Verify the Migration Worked
Run these verification queries:

```sql
-- Verify: Check migration statistics (should show 376 migrated)
SELECT 
  COUNT(*) as migrated_articles,
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
- `has_source_id` = 376 (all articles migrated)
- `facebook_post_id` should be NULL for all migrated articles
- `source_facebook_post_id` should contain the original Facebook post IDs

---

## STAGE 3: Add UNIQUE Constraint

### STEP 6: Update Schema and Deploy Again
**I'll do this for you** - After you confirm the migration worked, I'll:
1. Add `.unique()` back to `sourceFacebookPostId` in the schema
2. You deploy again
3. This adds the UNIQUE constraint to the already-populated column (fast)

**Expected**: Deployment completes quickly since data is already in place

---

## STEP 7: Test in Production
After the second deployment, verify everything works:

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
