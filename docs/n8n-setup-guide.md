# N8N Setup Guide for Smart Learning System

## Step 1: Set Up Authentication in N8N

1. Log into your N8N instance at your Netcup server
2. Go to **Credentials** (left sidebar)
3. Click **Add Credential**
4. Select **Header Auth**
5. Configure:
   - **Name**: `Railway Admin Auth`
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer YOUR_CRON_API_KEY`
   
   Replace `YOUR_CRON_API_KEY` with the value from your Railway `CRON_API_KEY` environment variable.

## Step 2: Import Workflows

### Import Daily Analytics Sync

1. In N8N, click **Workflows** → **Add Workflow**
2. Click the **⋮** menu → **Import from File**
3. Upload `docs/n8n-daily-analytics-sync.json`
4. The workflow will appear with 4 nodes:
   - Schedule Trigger (6:00 AM daily)
   - Sync Google Analytics
   - Sync Google Search Console
   - Recalculate Engagement Scores

### Import Facebook Insights Sync

1. Create another new workflow
2. Import `docs/n8n-facebook-sync.json`
3. The workflow will have 3 nodes:
   - Schedule Trigger (8:00 PM daily)
   - Sync Facebook Insights
   - Recalculate Engagement Scores

## Step 3: Configure Credentials

For each HTTP Request node in both workflows:

1. Click on the node
2. Under **Credentials**, select `Railway Admin Auth` (the one you created in Step 1)
3. Save the node

## Step 4: Test the Workflows

Before activating the schedules:

1. **Test Daily Analytics Sync**:
   - Open the workflow
   - Click **Execute Workflow** (top right)
   - Watch the nodes execute sequentially
   - Check for green checkmarks ✓ on each node
   - Click on each node to see the response data

2. **Test Facebook Sync**:
   - Repeat the same process for the Facebook workflow

## Step 5: Activate the Workflows

Once testing is successful:

1. Toggle the **Active** switch (top right) to ON for each workflow
2. The workflows will now run automatically on schedule

## Step 6: Monitor Execution

### View Execution History

1. Go to **Executions** in the left sidebar
2. See all past workflow runs
3. Click on any execution to see detailed logs
4. Failed executions will be marked in red

### Set Up Error Notifications (Optional)

To get notified when a sync fails:

1. Edit each workflow
2. Add an **Error Trigger** node
3. Connect it to a notification node:
   - **Send Email** (if you have SMTP configured)
   - **Slack** (if you use Slack)
   - **Discord** (if you use Discord)
   - **HTTP Request** to a webhook service

## Expected Results

### Daily Analytics Sync (6:00 AM)
- Syncs Google Analytics data
- Syncs Google Search Console data
- Recalculates engagement scores
- Takes ~2-3 minutes total

### Facebook Insights Sync (8:00 PM)
- Syncs Facebook post insights
- Recalculates engagement scores
- Takes ~2-5 minutes (depending on number of posts)

## Troubleshooting

### "401 Unauthorized" Error

**Cause**: Invalid or missing API key

**Fix**:
1. Check that `CRON_API_KEY` is set in Railway
2. Verify the credential in N8N matches exactly (including `Bearer ` prefix)
3. Make sure there are no extra spaces

### "500 Internal Server Error"

**Cause**: Error in the sync script

**Fix**:
1. Check Railway logs for the specific error
2. Common issues:
   - Missing Google credentials
   - Facebook token expired
   - Database connection issues

### "Timeout" Error

**Cause**: Sync taking too long

**Fix**:
1. Increase timeout in the HTTP Request node settings
2. Current timeouts:
   - GA/GSC: 60 seconds
   - Facebook: 120 seconds
   - Recalculate: 120 seconds

### Workflow Not Running on Schedule

**Cause**: Workflow not activated or N8N not running

**Fix**:
1. Check that the workflow is **Active** (toggle should be ON)
2. Verify N8N service is running on Netcup:
   ```bash
   docker ps | grep n8n
   ```
3. Check N8N logs:
   ```bash
   docker logs n8n
   ```

## Advanced: Manual Trigger via Webhook

If you want to trigger syncs manually from outside N8N:

1. Add a **Webhook** trigger node to each workflow
2. Set the webhook path (e.g., `/webhook/sync-analytics`)
3. Get the webhook URL from N8N
4. Call it with:
   ```bash
   curl -X POST https://your-n8n-domain.com/webhook/sync-analytics
   ```

## Monitoring Dashboard

You can create a simple monitoring dashboard by:

1. Creating a new workflow with a **Schedule Trigger** (every hour)
2. Adding HTTP Request nodes to check:
   - `/api/articles/trending?limit=1` (verify trending is working)
   - Railway health endpoint
3. Storing results in a database or sending to a monitoring service

## Next Steps

Once the workflows are running smoothly:

1. **Monitor for a week** to ensure stability
2. **Adjust schedules** if needed (e.g., run GA sync twice daily)
3. **Add more workflows** for other automation needs
4. **Set up backups** of your N8N workflows (export JSON regularly)

## Summary

✅ **Daily Analytics Sync**: 6:00 AM - GA + GSC + Scores  
✅ **Facebook Insights**: 8:00 PM - FB + Scores  
✅ **Authentication**: Using existing `CRON_API_KEY`  
✅ **Monitoring**: Via N8N Executions page  

Your Smart Learning System is now fully automated! 🚀
