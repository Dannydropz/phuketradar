# External Cron Setup for Phuket Radar

Automated scraping is now handled by an external cron service (cron-job.org) instead of internal node-cron scheduling.

## Why External Cron?

The internal `node-cron` library had issues with unpredictable firing times, causing scrapes to run every 2-10 minutes instead of every 4 hours. Using an external service gives you:
- ✅ Reliable, predictable scheduling
- ✅ Better monitoring and logging
- ✅ No dependency on Replit's server restart patterns
- ✅ Full control over when scrapes happen

## Setup Instructions

### 1. Create Account on cron-job.org

1. Go to https://cron-job.org
2. Sign up for a free account
3. Verify your email

### 2. Get Your Replit App URL

Your Replit app URL is:
```
https://[your-repl-name].[your-username].replit.app
```

Or if you have a custom domain configured, use that instead.

### 3. Set Up API Key for Cron Authentication

The external cron endpoint uses API key authentication instead of session cookies.

1. Go to your Replit Secrets tab
2. Add a new secret:
   - **Key**: `CRON_API_KEY`
   - **Value**: A long, random string (e.g., `cron_abc123xyz456def789_secure_key`)
   - You can generate one with: `openssl rand -base64 32` or use any secure random string generator

**Important**: Keep this API key secure! Anyone with this key can trigger scrapes on your server.

### 4. Configure Cron Job on cron-job.org

1. Click "Create cronjob"
2. Configure settings:
   - **Title**: Phuket Radar News Scraping
   - **URL**: `https://[your-replit-url]/api/cron/scrape`
   - **Schedule**: 
     - **Option 1**: Every 4 hours (0:00, 4:00, 8:00, 12:00, 16:00, 20:00)
     - **Option 2**: Custom: `0 */4 * * *` (cron expression)
   - **Timezone**: Asia/Bangkok (GMT+7)
   - **Request method**: POST
   - **Headers**: Click "Add header" and add:
     - **Name**: `Authorization`
     - **Value**: `Bearer YOUR_CRON_API_KEY` (replace with your actual CRON_API_KEY from Replit Secrets)
   - **Request body**: (leave empty)

3. Save the cron job

### 5. Test the Setup

Before relying on the automated cron:

1. In cron-job.org, find your newly created job
2. Click "Execute now" to test it manually
3. Check the execution log in cron-job.org - it should show HTTP 200 (success)
4. Check your Replit deployment logs - you should see:
   ```
   🚨 SCRAPE TRIGGERED 🚨
   Trigger: EXTERNAL CRON SERVICE (cron-job.org)
   ```
5. Check your admin dashboard - new articles should appear

If you see errors:
- **401 Unauthorized**: Check that your API key matches exactly (including the "Bearer " prefix)
- **500 Server Error**: Check Replit logs for details
- **Connection Error**: Verify your Replit URL is correct and the app is running

## Current Status

✅ **Internal automated scraping**: DISABLED  
✅ **Manual scraping via admin dashboard**: WORKING  
⏳ **External cron setup**: PENDING (you're setting this up now)

## Recommended Schedule

For cost optimization and fresh news:
- **Every 4 hours**: 0:00, 4:00, 8:00, 12:00, 16:00, 20:00 Bangkok time
- **API calls per day**: ~18 (3 sources × 6 scrapes)
- **Expected API cost**: Minimal with smart duplicate detection

## Monitoring

After setting up the external cron:
1. Check cron-job.org execution logs to see if requests succeed
2. Monitor your Replit deployment logs for scrape activity
3. Check your admin dashboard to see new articles appearing every 4 hours

## Need Help?

If you need me to:
- Create a public scraping endpoint with API key auth
- Add bearer token authentication
- Set up a different scheduling pattern

Just let me know!
