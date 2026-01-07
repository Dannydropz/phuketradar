# N8N Scheduled Tasks Setup Guide

This guide explains how to set up N8N workflows that replace the unreliable GitHub Actions for scheduled scraping and enrichment.

## Why N8N Instead of GitHub Actions?

| Feature | GitHub Actions | N8N (Self-hosted) |
|---------|---------------|-------------------|
| **Reliability** | "Best effort" - can delay hours or skip | Guaranteed execution on your server |
| **Timing Precision** | Often delayed 1-3+ hours | Precise to the minute |
| **Control** | Limited visibility | Full execution logs, retry support |
| **Cost** | Free but unreliable | Already running on your Netcup |
| **Monitoring** | Basic logs | Visual workflow execution history |

## Prerequisites

1. **N8N running on Coolify** (already set up at `n8n.phuketradar.com`)
2. **CRON_API_KEY** from your Coolify environment variables
3. **Access to N8N dashboard**

## Step 1: Create HTTP Header Auth Credential

Before importing workflows, create the authentication credential:

1. Go to **N8N Dashboard** → **Credentials** → **Add Credential**
2. Search for "**HTTP Header Auth**"
3. Configure:
   - **Credential Name**: `Phuket Radar CRON Auth`
   - **Name**: `Authorization`
   - **Value**: `Bearer YOUR_CRON_API_KEY`
   
   Replace `YOUR_CRON_API_KEY` with the value from Coolify's environment variables.

4. Click **Save**

## Step 2: Set N8N Environment Variables

In Coolify, add these environment variables to your N8N service:

```bash
PHUKETRADAR_BASE_URL=https://phuketradar.com
```

This allows the workflow to dynamically use your domain.

## Step 3: Import Scheduled Scrape Workflow

1. Go to **N8N Dashboard** → **Workflows** → **Add Workflow** → **Import from File**
2. Select `n8n-workflows/scheduled-scrape.json`
3. Click **Import**
4. Connect the `Phuket Radar CRON Auth` credential to the "Trigger Scrape" HTTP Request node:
   - Click on the **Trigger Scrape** node
   - Under **Authentication**, select "HTTP Header Auth"
   - Choose `Phuket Radar CRON Auth` credential
5. **Test** by clicking "Execute Workflow"
6. If successful, toggle **Active** to ON

## Step 4: Import Scheduled Enrichment Workflow

1. Go to **N8N Dashboard** → **Workflows** → **Add Workflow** → **Import from File**
2. Select `n8n-workflows/scheduled-enrichment.json`
3. Follow same steps as above for credential connection
4. **Test** and **Activate**

## ⚠️ CRITICAL: Credential ID Mismatch Fix

**Known Issue**: The workflow JSON files use placeholder credential IDs (e.g., `"id": "phuketradar-cron-auth"`) but N8N auto-generates alphanumeric IDs (e.g., `"id": "NrPW8odF5D9gB4a8"`). This causes scheduled executions to fail with:

```
Credential with ID "phuketradar-cron-auth" does not exist for type "httpHeaderAuth"
```

**Solution 1: Manual UI Fix (Quick)**
1. Open each workflow in N8N
2. Double-click the HTTP Request node (Trigger Scrape / Trigger Enrichment)
3. In "Header Auth" dropdown, **re-select** "Phuket Radar CRON Auth"
4. Save the workflow (Ctrl+S)
5. Activate the workflow

**Solution 2: API Recreation (Permanent)**
If the UI fix doesn't persist, delete and recreate workflows via API with the correct credential ID:

```bash
# 1. Find the correct credential ID
curl -s "https://n8n.optimisr.com/api/v1/credentials" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.data[] | {id, name}'

# 2. Export, fix, and recreate workflow
# (See scripts/deploy-scheduled-workflows.ts for full automation)
```

**Current Correct Credential ID**: `NrPW8odF5D9gB4a8` (Phuket Radar CRON Auth)

## Step 5: Disable GitHub Actions (Optional)

Once N8N workflows are running reliably, you can disable GitHub Actions to avoid redundant calls:

### Option A: Delete the workflows
```bash
rm .github/workflows/scheduled-scrape.yml
rm .github/workflows/scheduled-enrichment.yml
git add -A && git commit -m "Remove GitHub Actions - using N8N instead"
git push
```

### Option B: Comment out the schedule trigger
Edit each workflow and comment the schedule:

```yaml
on:
  # schedule:
  #   - cron: '0 */2 * * *'
  
  # Keep manual trigger for emergencies
  workflow_dispatch:
```

## Workflow Schedules

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| **Scheduled Scrape** | Every 2 hours | Scrape Facebook sources for news |
| **Scheduled Enrichment** | Every 15 minutes | Enrich articles with GPT-4 |
| **Facebook Auto-Poster** | Every 30 minutes | Post high-interest articles |

## Monitoring

### View Execution History

1. Go to **N8N Dashboard** → **Executions**
2. Filter by workflow name
3. Click any execution to see detailed logs

### Expected Scrape Response

```json
{
  "success": true,
  "message": "Scrape job completed",
  "totalSources": 15,
  "articlesCreated": 3,
  "articlesPublished": 2
}
```

### Check if Scrape is Working

Look for new articles on https://phuketradar.com or check the database:

```sql
SELECT title, "publishedAt", "createdAt"
FROM articles
WHERE "createdAt" > NOW() - INTERVAL '4 hours'
ORDER BY "createdAt" DESC;
```

## Troubleshooting

### Workflow Not Triggering?

1. **Check N8N is running**: Visit `n8n.phuketradar.com`
2. **Check workflow is Active**: Toggle button should be green
3. **Check Coolify container logs** for errors

### Auth Errors (401 Unauthorized)?

1. **Verify CRON_API_KEY** matches between N8N credential and Coolify env vars
2. **Format must be**: `Bearer YOUR_KEY` (with Bearer prefix and space)
3. **Check server logs** in Coolify for auth error messages

### Timeout Errors?

The workflow has a 5-minute (300,000ms) timeout. If scraping takes longer:
1. Check if Apify/ScrapeCreators are responding
2. Check network connectivity between N8N and Phuket Radar app
3. Consider increasing timeout in the HTTP Request node

### Connection Refused?

If N8N can't reach `phuketradar.com`:
1. Try using internal Docker hostname if both are on same Coolify server
2. Check if the Phuket Radar app is running in Coolify
3. Verify firewall/network settings

## Benefits of N8N Over GitHub Actions

✅ **Precise timing** - No more 1-3 hour delays  
✅ **Visual debugging** - See exactly where workflows fail  
✅ **Retry logic** - Built-in error handling and retries  
✅ **Self-hosted** - Runs on your Netcup VPS, no external dependencies  
✅ **Combined monitoring** - All automation in one dashboard  
✅ **Easy modifications** - Visual workflow editor  

---

**Need help?** Check N8N execution logs or Coolify container logs for detailed error messages.
