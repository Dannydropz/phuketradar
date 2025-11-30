# N8N API Deployment Guide

## Quick Deploy to Your N8N Instance

This guide will help you deploy the Facebook Auto-Poster workflow directly to your N8N instance at `https://n8n.optimisr.com` via the API.

---

## Step 1: Get Your N8N API Key

1. **Open your N8N instance**:
   ```
   https://n8n.optimisr.com
   ```

2. **Navigate to Settings → API**:
   - Click your profile icon (top right)
   - Click "Settings"
   - Click "API" in the left sidebar

3. **Create a new API key**:
   - Click "Create API key"
   - Give it a name: `Phuket Radar Deployment`
   - Copy the key (you'll only see it once!)

4. **Add to your `.env` file**:
   ```bash
   # N8N API Configuration
   N8N_API_KEY=your_api_key_here
   N8N_BASE_URL=https://n8n.optimisr.com/api/v1
   ```

---

## Step 2: Deploy the Workflow

Run the deployment script:

```bash
npm run deploy:n8n
# or
tsx scripts/deploy-n8n-workflow.ts
```

The script will:
1. ✅ Connect to your N8N instance
2. ✅ Check for existing workflows
3. ✅ Create or update the "Phuket Radar - Facebook Auto-Poster (Simple)" workflow
4. ✅ Activate the workflow
5. ✅ Show you the workflow URL

---

## Step 3: Configure Environment Variables in N8N

After deployment, you need to set these environment variables in your **N8N instance**:

### Option A: Via N8N Docker/System Environment

If you're running N8N via Docker or systemd, add these to your N8N environment:

```bash
FB_PAGE_ID=786684811203574
FB_PAGE_ACCESS_TOKEN=your_facebook_page_access_token
DATABASE_URL=postgresql://user:pass@host.supabase.co:5432/postgres
SITE_BASE_URL=https://phuketradar.com
```

**For Docker Compose**, edit your `docker-compose.yml`:
```yaml
services:
  n8n:
    environment:
      - FB_PAGE_ID=786684811203574
      - FB_PAGE_ACCESS_TOKEN=your_token
      - NEON_DATABASE_URL=postgresql://...
      - SITE_BASE_URL=https://phuketradar.com
```

**For Coolify**, add in the Environment Variables section.

### Option B: Hardcode in Workflow (Quick Test)

Alternatively, you can hardcode these values directly in the Code nodes for testing:

1. Open the workflow in N8N
2. Edit the "Fetch Unposted Articles" node
3. Replace `$env.NEON_DATABASE_URL` with your actual connection string
4. Repeat for other nodes

⚠️ **Security Note**: Option A (environment variables) is more secure for production.

---

## Step 4: Test the Workflow

1. **Open the workflow** in N8N (the deployment script will show you the URL)

2. **Click "Execute Workflow"** (play button, top right)

3. **Check execution**:
   - Green = Success! ✅
   - Red = Error (check logs)
   - Yellow = Partial success

4. **Verify on Facebook**:
   - Check your Facebook page
   - Verify post was created
   - Check that comment with link exists
   - Verify comment is pinned

5. **Check database**:
   ```sql
   SELECT id, title, "facebookPostId", "facebookPostUrl"
   FROM articles
   WHERE "facebookPostId" IS NOT NULL
   ORDER BY "publishedAt" DESC
   LIMIT 5;
   ```

---

## Step 5: Monitor & Maintain

### View Executions

1. Go to **Executions** in N8N sidebar
2. View logs for each run
3. Check for errors

### Workflow Schedule

The workflow runs **every 30 minutes** by default.

To change:
1. Open the workflow
2. Click the "Every 30 Minutes" trigger node
3. Modify the interval

### Troubleshooting

**No articles being posted?**
- Check SQL query returns results
- Verify environment variables are set
- Check Facebook API token is valid

**Database connection errors?**
- Verify `NEON_DATABASE_URL` is correct
- Check SSL is enabled (`?sslmode=require`)
- Ensure N8N can reach Neon database

**Facebook API errors?**
- Verify `FB_PAGE_ACCESS_TOKEN` is valid
- Check token permissions
- Ensure `FB_PAGE_ID` is correct

---

## Quick Commands

### Deploy/Update Workflow
```bash
tsx scripts/deploy-n8n-workflow.ts
```

### Add to package.json
Add this to your `package.json` scripts:
```json
{
  "scripts": {
    "deploy:n8n": "tsx scripts/deploy-n8n-workflow.ts"
  }
}
```

Then you can run:
```bash
npm run deploy:n8n
```

---

## Environment Variables Summary

### Required in `.env` (for deployment script):
```bash
N8N_API_KEY=your_n8n_api_key
N8N_BASE_URL=https://n8n.optimisr.com/api/v1
```

### Required in N8N Instance (for workflow execution):
```bash
FB_PAGE_ID=786684811203574
FB_PAGE_ACCESS_TOKEN=your_facebook_token
NEON_DATABASE_URL=postgresql://...
SITE_BASE_URL=https://phuketradar.com
```

---

## What the Deployment Script Does

1. **Loads** the workflow JSON from `n8n-workflows/phuket-radar-facebook-autoposter-simple.json`
2. **Connects** to N8N API at `https://n8n.optimisr.com/api/v1`
3. **Checks** if a workflow with the same name already exists
4. **Creates** new workflow OR **updates** existing one
5. **Activates** the workflow
6. **Reports** the workflow ID and URL

---

## Benefits of API Deployment

✅ **One Command**: Deploy with `npm run deploy:n8n`  
✅ **Version Control**: Workflow JSON is in Git  
✅ **Easy Updates**: Re-run script to update workflow  
✅ **Automated**: No manual import/export  
✅ **Consistent**: Same workflow across environments  

---

## Next Steps After Deployment

1. ✅ Verify workflow is active in N8N
2. ✅ Test with "Execute Workflow"
3. ✅ Monitor first few executions
4. ✅ Check Facebook posts are created correctly
5. ✅ Optionally disable Node.js auto-posting

---

## Need Help?

- **N8N API Docs**: https://docs.n8n.io/api/
- **Workflow Documentation**: See `docs/N8N_QUICK_SETUP.md`
- **Troubleshooting**: See `docs/N8N_QUICK_REFERENCE.md`

---

**Ready?** Get your API key and run `tsx scripts/deploy-n8n-workflow.ts`! 🚀
