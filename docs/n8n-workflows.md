# N8N Workflows for Smart Learning System

This document contains the N8N workflow configurations for automating the Smart Learning System data collection and score calculation.

## Prerequisites

1. N8N installed and running on Netcup VPS
2. Railway app accessible from N8N server
3. Environment variables set in Railway:
   - `GA_PROPERTY_ID`
   - `GA_CLIENT_EMAIL`
   - `GA_PRIVATE_KEY`
   - `GSC_SITE_URL`
   - `FB_PAGE_ACCESS_TOKEN`
   - `FB_PAGE_ID`

## Workflow 1: Daily Analytics Sync

**Schedule**: Every day at 6:00 AM (UTC+7)

**Purpose**: Sync Google Analytics and Search Console data

### Nodes:

1. **Schedule Trigger**
   - Type: Cron
   - Expression: `0 6 * * *`
   - Timezone: Asia/Bangkok

2. **Sync Google Analytics**
   - Type: HTTP Request
   - Method: POST
   - URL: `https://phuketradar.com/api/admin/sync-google-analytics`
   - Authentication: Header Auth
   - Header Name: `Authorization`
   - Header Value: `Bearer {{$env.RAILWAY_ADMIN_TOKEN}}`
   - Timeout: 60000ms

3. **Sync Google Search Console**
   - Type: HTTP Request
   - Method: POST
   - URL: `https://phuketradar.com/api/admin/sync-google-search-console`
   - Authentication: Header Auth
   - Header Name: `Authorization`
   - Header Value: `Bearer {{$env.RAILWAY_ADMIN_TOKEN}}`
   - Timeout: 60000ms

4. **Recalculate Engagement Scores**
   - Type: HTTP Request
   - Method: POST
   - URL: `https://phuketradar.com/api/admin/recalculate-engagement`
   - Authentication: Header Auth
   - Header Name: `Authorization`
   - Header Value: `Bearer {{$env.RAILWAY_ADMIN_TOKEN}}`
   - Timeout: 120000ms

5. **Notification (Optional)**
   - Type: Send Email / Slack / Discord
   - Message: "Daily analytics sync completed. Updated: {{$node["Recalculate Engagement Scores"].json["updated"]}} articles"

## Workflow 2: Facebook Insights Sync

**Schedule**: Every day at 8:00 PM (UTC+7)

**Purpose**: Sync Facebook post insights (run in evening to get full day's data)

### Nodes:

1. **Schedule Trigger**
   - Type: Cron
   - Expression: `0 20 * * *`
   - Timezone: Asia/Bangkok

2. **Sync Facebook Insights**
   - Type: HTTP Request
   - Method: POST
   - URL: `https://phuketradar.com/api/admin/sync-facebook-insights`
   - Authentication: Header Auth
   - Header Name: `Authorization`
   - Header Value: `Bearer {{$env.RAILWAY_ADMIN_TOKEN}}`
   - Timeout: 120000ms

3. **Recalculate Engagement Scores**
   - Type: HTTP Request
   - Method: POST
   - URL: `https://phuketradar.com/api/admin/recalculate-engagement`
   - Authentication: Header Auth
   - Header Name: `Authorization`
   - Header Value: `Bearer {{$env.RAILWAY_ADMIN_TOKEN}}`
   - Timeout: 120000ms

## Workflow 3: Weekly Full Sync (Backup)

**Schedule**: Every Sunday at 3:00 AM (UTC+7)

**Purpose**: Full sync of all data sources as a backup/catchup

### Nodes:

1. **Schedule Trigger**
   - Type: Cron
   - Expression: `0 3 * * 0`
   - Timezone: Asia/Bangkok

2. **Sync All Sources** (Sequential)
   - Google Analytics
   - Google Search Console
   - Facebook Insights
   - Recalculate Scores

## Authentication Setup

### Option 1: Using Admin Session Token

If your app uses session-based auth, you'll need to:

1. Create a long-lived admin API key in Railway
2. Add it to N8N environment variables as `RAILWAY_ADMIN_TOKEN`
3. Use it in the Authorization header

### Option 2: Using API Key Auth

If you want to use the existing `requireAdminAuth` middleware:

1. The middleware checks for session authentication
2. You may need to modify it to also accept API key authentication
3. Or create a separate middleware for N8N requests

## Recommended: Add API Key Authentication

Add this to your Railway environment variables:
```
N8N_API_KEY=your-secure-random-key-here
```

Then modify the endpoints to accept this key as an alternative to session auth.

## Testing Workflows

Before enabling the schedules, test each workflow manually:

1. In N8N, click "Execute Workflow" 
2. Check the Railway logs for successful execution
3. Verify data is being synced in the database
4. Check for any errors in the N8N execution logs

## Monitoring

Set up error notifications:

1. Add an "Error Trigger" node to each workflow
2. Connect it to a notification service (Email/Slack/Discord)
3. Get alerted when syncs fail

## Workflow JSON Export

You can import these workflows into N8N. I'll create the JSON files next if you'd like to import them directly.

## Notes

- **Rate Limiting**: Facebook API has rate limits. The 200ms delay in the sync script helps avoid hitting them.
- **Timeout**: Some syncs may take 1-2 minutes for large datasets. Adjust timeouts accordingly.
- **Retries**: Consider adding retry logic in N8N for failed requests.
- **Logs**: Monitor Railway logs to see sync progress and any errors.
