# Scheduled Deployment Setup Guide

## Overview

Phuket Radar uses a **Replit Scheduled Deployment** to run automated scraping every 4 hours. This architecture separates the scraper from the web server, preventing multiple server instances from running duplicate scrapers.

## Why Scheduled Deployment?

**Problem**: Embedding a cron scheduler in the web server (`server/index.ts`) causes issues:
- Replit runs multiple web server instances for load balancing
- Each instance runs its own cron scheduler
- This creates excessive API calls and duplicate scraping attempts

**Solution**: Use a dedicated Scheduled Deployment that:
- Runs ONLY the scraper script (`server/scheduler.ts`) on a schedule
- Independent from web server instances
- Guaranteed single execution per schedule

## Setup Instructions

### 1. Create Scheduled Deployment

1. Open the **Publishing** tool in Replit (left sidebar)
2. Click **"Create new"** → Select **"Scheduled"**
3. Click **"Set up your published app"**

### 2. Configure Schedule

**Schedule Settings:**
- **Natural language**: "Every 4 hours"
- **Or use cron**: `0 */4 * * *` (runs at minute 0 of every 4th hour)
- **Timezone**: Select your preferred timezone (e.g., Asia/Bangkok)

**Job Timeout:**
- Set to **10 minutes** (scraper typically completes in 1-3 minutes)

### 3. Configure Commands

**Build Command:**
```bash
npm install
```

**Run Command:**
```bash
tsx server/scheduler.ts
```

### 4. Add Environment Variables

The scheduled deployment needs these secrets (they should auto-populate from your main app):

- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - For translation and embeddings
- `SCRAPECREATORS_API_KEY` - For Facebook scraping via JINA AI

If any are missing, click **"Add deployment secret"** and add them manually.

### 5. Publish Scheduled Deployment

1. Click **"Publish"**
2. Wait for initial deployment to complete
3. Check **"Schedule"** tab to view run history

## Monitoring

### View Run History
1. Go to **Publishing** tool
2. Select your **Scheduled** deployment
3. Click **"Schedule"** tab
4. See past runs with timestamps and status

### View Logs
1. In the **Schedule** tab, click on any run
2. View complete logs for that execution
3. Look for:
   - `=== Starting Multi-Source Scheduled Scrape ===`
   - `Total posts fetched: X`
   - `Articles created: X`
   - `Articles published: X`

### Expected Behavior

**Successful Run Logs:**
```
=== Starting Multi-Source Scheduled Scrape ===
Scraping 3 Facebook news sources
Loaded 150 existing article embeddings
Scraping source: Phuket Time News
Phuket Time News: Found 10 NEW posts
✅ Created and published: [Article title]...
=== Multi-Source Scrape Complete ===
Total posts fetched: 10
Skipped (semantic duplicates): 2
Skipped (not news): 3
Articles created: 5
Articles published: 5
```

**If Duplicates Are Being Created:**
- Check that semantic duplicate threshold is 0.85 in `server/scheduler.ts`
- Verify embeddings are being generated (look for "Loaded X existing article embeddings")
- Check for error messages in logs

## Architecture Notes

### Database Lock Protection

Even with a dedicated scheduled deployment, the `withSchedulerLock()` function provides an extra safety layer:

- Uses row-based table locking (`scheduler_locks` table)
- Prevents overlapping executions if deployment triggers twice
- Auto-cleanup of stale locks (1-hour timeout)

### Web Server Configuration

The main web server (`server/index.ts`) NO LONGER runs a cron scheduler. This was removed to prevent multiple instances from scraping.

### API Cost Management

**Current Configuration:**
- Scrapes 3 sources every 4 hours = 6 runs/day
- Fetches 1 page per source = 3 API calls per run
- Total: ~18 API calls/day, ~540 calls/month
- Semantic duplicate detection prevents re-translating existing articles

**Cost Breakdown per Run:**
- 3 scrape calls (JINA AI): ~$0.003
- 5-10 embedding generations: ~$0.001
- 2-5 translations (GPT-4-mini): ~$0.01-0.05
- **Total per run**: ~$0.01-0.05
- **Monthly cost**: ~$3-9 at 180 runs/month

## Troubleshooting

### Scheduled Deployment Not Running

1. Check **Schedule** tab for error messages
2. Verify run command: `tsx server/scheduler.ts`
3. Ensure all environment variables are set
4. Check timeout isn't too short (should be 10+ minutes)

### Duplicate Articles Still Appearing

1. Verify semantic threshold is 0.85 in `server/scheduler.ts`
2. Check that embeddings are being stored (view database `articles` table)
3. Look for "Semantic duplicate detected" messages in logs
4. If threshold too strict, lower to 0.80 (more aggressive filtering)

### No Articles Being Created

1. Check logs for "Skipped non-news" messages
2. Verify OpenAI API key is valid
3. Check Facebook page URLs are accessible
4. Ensure translation service is working

## Summary

✅ **Web Server**: Handles user requests, serves articles, admin dashboard
✅ **Scheduled Deployment**: Runs scraper every 4 hours independently
✅ **Database Lock**: Prevents overlapping executions
✅ **Semantic Duplicates**: 85% similarity threshold catches near-duplicates
✅ **Cost Optimized**: ~$3-9/month for automated news aggregation
