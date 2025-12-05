# N8N Analytics Workflows - Troubleshooting Guide

## Current Status (As of Dec 5, 2025)

The analytics workflows haven't been running automatically. Here's how to fix it.

## Step 1: Check Workflow Execution History

1. Go to your N8N Dashboard: `https://n8n.optimisr.com`
2. Click on "Executions" tab
3. Look for executions of:
   - "Daily Analytics Sync" (should run at 6:00 AM Bangkok time)
   - "Facebook Insights Sync" (should run at 8:00 PM Bangkok time)

If there are **no executions** in the last few days, the workflows may be:
- Not activated (check the toggle)
- Missing credentials

If there are **failed executions**, click on them to see the error.

## Step 2: Verify Credentials

The workflows use `httpHeaderAuth` credentials. You need to create/verify this credential:

1. Go to **Credentials** in N8N
2. Look for a credential named "Phuket Radar API Auth" or similar
3. If it doesn't exist, create it:
   - Type: **Header Auth**
   - Name: `Authorization`
   - Value: `Bearer YOUR_CRON_API_KEY_HERE`

4. **Get your CRON_API_KEY** from your server environment variables (same key used in `.env`)

## Step 3: Re-link Credentials in Workflows

After creating the credential:

1. Open "Daily Analytics Sync" workflow
2. Click on each HTTP Request node
3. In the "Credential to connect with" section, select your credential
4. Save the workflow
5. Repeat for "Facebook Insights Sync"

## Step 4: Test the Workflows

1. Open a workflow
2. Click "Execute Workflow" button
3. Check if all nodes turn green (success)

If a node fails, the error message will tell you what's wrong:
- **401 Unauthorized**: Wrong API key or credential not linked
- **500 Server Error**: Check server logs
- **Timeout**: Server took too long to respond

## Step 5: Activate Workflows

Make sure both workflows are **Active** (toggle should be green):
- Daily Analytics Sync ✅
- Facebook Insights Sync ✅

## Manual Sync (Local)

If N8N is not working, you can manually sync from your local machine:

```bash
cd /Users/dannykeegan/Github\ Repository/phuketradar
npx tsx scripts/force-analytics-update.ts
```

This will:
1. Sync Google Analytics
2. Sync Google Search Console  
3. Sync Facebook Insights
4. Recalculate Engagement Scores

## Workflow Schedule Summary

| Workflow | Schedule | Timezone |
|----------|----------|----------|
| Daily Analytics Sync | 6:00 AM | Asia/Bangkok |
| Facebook Insights Sync | 8:00 PM | Asia/Bangkok |

## API Endpoints Used

- `POST https://phuketradar.com/api/admin/sync-google-analytics`
- `POST https://phuketradar.com/api/admin/sync-google-search-console`
- `POST https://phuketradar.com/api/admin/sync-facebook-insights`
- `POST https://phuketradar.com/api/admin/recalculate-engagement`

All endpoints require `Authorization: Bearer <CRON_API_KEY>` header.
