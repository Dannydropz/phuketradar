# Scheduled Deployment Setup Guide

## Overview

This guide walks you through setting up automated news scraping using Replit's Scheduled Deployment feature. This replaces the old buggy cron scheduler and eliminates overlapping execution issues.

## Why Use Scheduled Deployment?

✅ **No Overlapping**: Replit guarantees one execution at a time  
✅ **Reliable**: Infrastructure managed by Replit  
✅ **Cost Effective**: Reduced from ~50,000 to ~540 API calls/month (98% reduction!)  
✅ **Easy Monitoring**: Built-in logs and status tracking  

## Setup Steps

### 1. Open Deployments Tab
- In your Replit workspace, click the **Deployments** icon in the left sidebar

### 2. Create New Scheduled Deployment
- Click **"Create deployment"** or **"New deployment"**
- Select deployment type: **"Scheduled"**

### 3. Configure the Schedule
Choose one of these options:

**Option A: Simple Schedule (Recommended)**
- Select: "Every 4 hours"
- This will run at: 12:00 AM, 4:00 AM, 8:00 AM, 12:00 PM, 4:00 PM, 8:00 PM

**Option B: Custom Cron Expression**
- Select: "Custom cron expression"
- Enter: `0 */4 * * *`
- Same schedule as Option A

### 4. Set the Run Command
In the "Run command" field, enter:
```bash
tsx server/scheduler.ts
```

### 5. Configure Machine Size
- Select: **Small** (the scraper doesn't need much compute power)

### 6. Set Environment Variables
Make sure these environment variables are set (copy from your main deployment):

**Required:**
- `DATABASE_URL` - Your PostgreSQL connection string
- `OPENAI_API_KEY` - For translation and embeddings
- `SCRAPECREATORS_API_KEY` - For scraping Facebook pages

**Auto-populated (should already be there):**
- `PGHOST`
- `PGPORT`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`

### 7. Deploy!
- Click **"Create deployment"** or **"Deploy"**
- Wait for the deployment to start
- Check the logs to verify it's working

## Verify It's Working

### Check the Logs
- Go to the Scheduled Deployment
- Click on a completed run
- Look for these log messages:
  ```
  === Starting Multi-Source Scheduled Scrape ===
  Scraping 3 Facebook news sources
  ...
  === Multi-Source Scrape Complete ===
  ```

### Expected Behavior
- **API Usage**: 3 calls per scrape (1 per news source)
- **Frequency**: Every 4 hours = 6 scrapes/day = 18 API calls/day
- **Monthly Total**: ~540 API calls (~$5-10 at typical rates)

### First Run
The first scrape might process many posts, but subsequent runs will be faster because:
- Duplicate checking stops pagination early when hitting known posts
- Semantic similarity prevents re-translating similar stories
- Smart filtering rejects non-news content

## Monitoring & Troubleshooting

### Monitor API Usage
Check your ScrapeCreators dashboard at https://scrapecreators.com
- Should see consistent ~18 calls/day pattern
- Spikes indicate something wrong

### Common Issues

**Issue: Deployment fails to start**
- Check environment variables are set
- Verify DATABASE_URL is correct
- Ensure OPENAI_API_KEY and SCRAPECREATORS_API_KEY are valid

**Issue: No articles being created**
- Check deployment logs for errors
- Verify news sources are enabled in `server/config/news-sources.ts`
- Check if all posts are being filtered as non-news

**Issue: Too many API calls**
- Verify only ONE Scheduled Deployment is active
- Check pagination is set to 1 (not 3) in `server/scheduler.ts`

## Cost Breakdown

### Current Setup (Post-Fix)
- **3 sources** × **1 API call** = 3 calls/scrape
- **6 scrapes/day** = 18 API calls/day
- **~540 API calls/month**
- **Estimated cost**: $5-10/month

### Old Setup (Buggy)
- Multiple overlapping cron jobs
- 1,679 calls/day (!)
- ~50,000 calls/month
- Estimated cost: $500-1,000/month 💸

## Next Steps

1. **Delete Old Deployments**: If you have old/test deployments, delete them to avoid confusion
2. **Monitor First 24 Hours**: Watch the logs to ensure everything works smoothly
3. **Check Production**: Visit your live site to see new articles appearing every 4 hours

## Alternative Scraping Solutions

If you want to reduce costs further, consider:

1. **JINA AI (Free)** - Switch from ScrapeCreators to JINA AI Reader
   - Cost: FREE
   - Reliability: Moderate (may break with Facebook changes)
   
2. **Apify ($0.25/1000 posts)** - More reliable, much cheaper
   - Cost: ~$0.13/month at current usage
   - Reliability: High
   
3. **Manual Scraping** - Build your own with Puppeteer
   - Cost: FREE (just server costs)
   - Maintenance: You own it, you fix it

---

**Questions?** Check the logs, monitor API usage, and everything should work smoothly! 🚀
