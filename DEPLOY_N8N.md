# 🚀 Deploy to N8N via API

## Quick Deploy (3 Steps)

### 1. Get Your N8N API Key

Go to your N8N instance and create an API key:

```
https://n8n.optimisr.com/settings/api
```

Click **"Create API key"** → Give it a name → Copy the key

### 2. Add API Key to .env

Add these lines to your `.env` file:

```bash
# N8N API Configuration
N8N_API_KEY=your_api_key_here
N8N_BASE_URL=https://n8n.optimisr.com/api/v1
```

### 3. Deploy the Workflow

Run the deployment command:

```bash
npm run deploy:n8n
```

That's it! ✅

---

## What Happens

The script will:

1. ✅ Connect to your N8N instance at `https://n8n.optimisr.com`
2. ✅ Load the workflow from `n8n-workflows/phuket-radar-facebook-autoposter-simple.json`
3. ✅ Check if the workflow already exists
4. ✅ Create new OR update existing workflow
5. ✅ Activate the workflow
6. ✅ Show you the workflow URL to open in your browser

---

## After Deployment

You'll see output like:

```
✅ SUCCESS: Workflow deployed and activated!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 View workflow: https://n8n.optimisr.com/workflow/12345
📊 Workflow ID: 12345
📋 Workflow Name: Phuket Radar - Facebook Auto-Poster (Simple)
⚡ Status: ACTIVE
```

Click the URL to open the workflow in N8N!

---

## Configure Environment Variables in N8N

The workflow needs these environment variables in your **N8N instance**:

```bash
FB_PAGE_ID=786684811203574
FB_PAGE_ACCESS_TOKEN=your_facebook_page_access_token
DATABASE_URL=postgresql://user:pass@host.supabase.co:5432/postgres
SITE_BASE_URL=https://phuketradar.com
```

### How to Set in N8N:

**If using Docker:**
Edit your `docker-compose.yml`:
```yaml
services:
  n8n:
    environment:
      - FB_PAGE_ID=786684811203574
      - FB_PAGE_ACCESS_TOKEN=your_token
      - NEON_DATABASE_URL=postgresql://...
      - SITE_BASE_URL=https://phuketradar.com
```

**If using Coolify:**
1. Go to your N8N app in Coolify
2. Click "Environment Variables"
3. Add the 4 variables above

---

## Test the Workflow

1. Open the workflow URL (shown in deployment output)
2. Click **"Execute Workflow"** (play button)
3. Check the execution log for errors
4. Verify a post was created on Facebook
5. Check your database to confirm `facebookPostId` was saved

---

## Troubleshooting

### "Authentication failed"
- Check your `N8N_API_KEY` is correct
- Regenerate the key in N8N settings

### "Workflow not found"
- Verify N8N is running at `https://n8n.optimisr.com`
- Check API is enabled in N8N settings

### "No articles being posted"
- Verify environment variables are set in N8N
- Check database has articles with score 4-5
- Ensure Facebook token is valid

---

## Update Workflow

To update the workflow after making changes:

1. Edit the JSON file: `n8n-workflows/phuket-radar-facebook-autoposter-simple.json`
2. Run deployment again: `npm run deploy:n8n`
3. The script will automatically update the existing workflow

---

## Full Documentation

See `docs/N8N_API_DEPLOYMENT.md` for detailed setup instructions.

---

**Ready?** Get your API key and run `npm run deploy:n8n`! 🎯
