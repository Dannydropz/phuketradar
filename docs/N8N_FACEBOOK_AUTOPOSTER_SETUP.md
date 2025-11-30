# N8N Facebook Auto-Poster Setup Guide

This guide will help you set up the N8N automation to replace the current Node.js Facebook posting functionality.

## Overview

The N8N workflow replicates your existing auto-posting logic:
- ✅ Posts only articles with **interest score 4-5**
- ✅ Uses **enriched `facebookHeadline`** for better CTR
- ✅ Posts the article **excerpt** as the description
- ✅ Includes **category-specific hashtags**
- ✅ Adds **link back to site** in the first comment
- ✅ **Pins the comment** to keep it at the top
- ✅ Supports **multi-image posts** (photo grid)
- ✅ Updates database with `facebookPostId` and `facebookPostUrl`
- ✅ Processes up to **5 unposted articles** every 30 minutes
- ✅ Excludes **manually created articles** (`isManuallyCreated = false`)

## Prerequisites

1. **N8N Instance**: You mentioned you have N8N running on your server ✅
2. **Facebook Page Access Token**: Your existing token from `.env`
3. **Database Credentials**: Your Neon PostgreSQL connection
4. **Facebook Page ID**: `786684811203574` (already in your code)

## Step 1: Import the Workflow

1. Open your N8N instance
2. Click **"Workflows"** in the sidebar
3. Click **"Import from File"** or **"Import from URL"**
4. Select the file: `/Users/dannykeegan/Github Repository/phuketradar/n8n-workflows/phuket-radar-facebook-autoposter.json`
5. Click **"Import"**

## Step 2: Configure Database Connection

1. In the workflow, locate the **"Get Unposted Articles (Score 4-5)"** node
2. Click on it to open the settings
3. Create a new **PostgreSQL credential**:
   - **Name**: `Phuket Radar Database`
   - **Host**: Your Neon database host (from `.env` - `DATABASE_URL`)
   - **Database**: Your database name
   - **User**: Your database user
   - **Password**: Your database password
   - **Port**: `5432` (default)
   - **SSL**: Enable SSL (Neon requires it)

4. Repeat for the **"Update Article in Database"** node (use the same credential)

### Neon Database Connection String Format
If your `DATABASE_URL` looks like:
```
DATABASE_URL=postgresql://user:pass@host.supabase.co:5432/postgres
```

Extract:
- **Host**: `host.neon.tech`
- **Database**: `dbname`
- **User**: `user`
- **Password**: `password`

## Step 3: Configure Facebook Credentials

You have **two options** for Facebook authentication:

### Option A: Use Built-in Facebook OAuth (Recommended)

1. Go to **Settings → Credentials** in N8N
2. Create a new **Facebook Graph API** credential
3. Follow N8N's OAuth setup wizard
4. This will handle token refresh automatically ✅

### Option B: Use Your Existing Access Token

1. Create an **HTTP Query Auth** credential named `Facebook Access Token`
2. Set:
   - **Name**: `access_token`
   - **Value**: Your `FB_PAGE_ACCESS_TOKEN` from `.env`

3. Apply this credential to these nodes:
   - **Add Comment with Link**
   - **Pin Comment**

## Step 4: Configure Environment Variables in N8N

N8N can access environment variables. Add these to your N8N environment:

```bash
FB_PAGE_ID=786684811203574
FB_PAGE_ACCESS_TOKEN=your_page_access_token_here
```

### How to Add Environment Variables in N8N:

**If using Docker:**
Edit your `docker-compose.yml`:
```yaml
services:
  n8n:
    environment:
      - FB_PAGE_ID=786684811203574
      - FB_PAGE_ACCESS_TOKEN=your_token_here
```

**If using Coolify:**
1. Go to your N8N application in Coolify
2. Navigate to **Environment Variables**
3. Add:
   - `FB_PAGE_ID` = `786684811203574`
   - `FB_PAGE_ACCESS_TOKEN` = `your_token_here`

## Step 5: Update Node Credential References

After creating your credentials, you need to update the workflow nodes:

1. **Get Unposted Articles (Score 4-5)** node:
   - Credential: Select your PostgreSQL credential

2. **Post Single Image to Facebook** node:
   - Credential: Select your Facebook Graph API credential (Option A)
   - OR configure to use access token directly (Option B)

3. **Add Comment with Link** node:
   - Credential: Select your HTTP Query Auth credential

4. **Pin Comment** node:
   - Credential: Select your HTTP Query Auth credential

5. **Update Article in Database** node:
   - Credential: Select your PostgreSQL credential

## Step 6: Test the Workflow

1. **Manual Test Run**:
   - Click **"Execute Workflow"** in the top right
   - Check the execution log for errors

2. **Verify Database Query**:
   - The **"Get Unposted Articles"** node should return 0-5 articles
   - Verify the SQL query is working correctly

3. **Test with a Single Article**:
   - Temporarily change `LIMIT 5` to `LIMIT 1` in the SQL query
   - Run the workflow
   - Check Facebook to verify the post was created
   - Check your database to verify `facebookPostId` was updated

## Step 7: Activate the Workflow

1. Once testing is successful, click **"Active"** toggle in the top right
2. The workflow will now run **every 30 minutes** automatically
3. It will process up to **5 unposted articles** per run

## Step 8: Disable Old Auto-Posting (Optional)

Since N8N will now handle Facebook posting, you can disable the auto-posting in your Node.js code:

**Option 1: Keep both systems (failsafe)**
- Leave the Node.js code as-is
- Both systems will attempt to post, but the claim/lock mechanism will prevent duplicates

**Option 2: Disable Node.js auto-posting**
- Set an environment variable: `DISABLE_AUTO_FACEBOOK_POST=true`
- Modify `/Users/dannykeegan/Github Repository/phuketradar/server/scheduler.ts` to check this variable

I can help you with Option 2 if you prefer to fully migrate to N8N.

## Workflow Logic Breakdown

### 1. Schedule Trigger
Runs every 30 minutes

### 2. Database Query
Selects unposted articles:
```sql
SELECT id, title, excerpt, "facebookHeadline", "imageUrl", "imageUrls", 
       category, slug, "interestScore"
FROM articles
WHERE "isPublished" = true
  AND "facebookPostId" IS NULL
  AND "interestScore" >= 4
  AND "imageUrl" IS NOT NULL
  AND "isManuallyCreated" = false
ORDER BY "publishedAt" DESC
LIMIT 5;
```

### 3. Loop Through Articles
Processes each article one by one with a 5-second delay between posts

### 4. Prepare Post Data
- Generates category-specific hashtags
- Uses `facebookHeadline` (or falls back to `title`)
- Builds the post message with excerpt and CTA
- Constructs the article URL
- Determines single vs. multi-image post

### 5. Post to Facebook
- **Single Image**: Direct photo upload with message
- **Multi-Image**: Upload photos unpublished → Create feed post with attached media

### 6. Add Comment
Posts comment: `Read the full story: https://phuketradar.com/...`

### 7. Pin Comment
Pins the comment to keep it at the top

### 8. Update Database
Saves `facebookPostId` and `facebookPostUrl` to prevent duplicate posting

### 9. Wait & Loop
Waits 5 seconds before processing the next article

## Monitoring & Debugging

### View Execution History
1. Go to **Executions** in N8N sidebar
2. View logs for each workflow run
3. Check for errors in specific nodes

### Common Issues

**Issue**: "No articles found"
- **Solution**: Check if you have published articles with score 4-5 that haven't been posted yet

**Issue**: "Database connection failed"
- **Solution**: Verify your PostgreSQL credentials and SSL settings

**Issue**: "Facebook API error"
- **Solution**: Check your access token is valid and has the right permissions

**Issue**: "Multi-image post failed"
- **Solution**: Facebook requires at least 2 images for multi-image posts. Workflow will auto-fallback to single image.

## Adjusting the Schedule

To change how often the workflow runs:

1. Click on the **"Schedule (Every 30 min)"** node
2. Modify the interval:
   - **Every 15 minutes**: Better for high-traffic sites
   - **Every hour**: For lower-volume posting
   - **Custom**: Set specific times (e.g., only during business hours)

## Advanced Features

### Filter by Category
To only post certain categories, modify the SQL query:
```sql
WHERE "isPublished" = true
  AND "facebookPostId" IS NULL
  AND "interestScore" >= 4
  AND "imageUrl" IS NOT NULL
  AND "isManuallyCreated" = false
  AND category IN ('Breaking', 'Tourism', 'Crime')  -- Add this line
```

### Add Facebook Insights Tracking
After the workflow runs, you could add a node to track engagement metrics from the Facebook Graph API.

### Post at Optimal Times
Modify the schedule to only post during high-engagement hours (e.g., 8AM-8PM Thailand time).

## Benefits of N8N Over Node.js

1. **✅ Visual Workflow**: Easier to understand and modify
2. **✅ No Code Deployment**: Changes don't require redeploying your app
3. **✅ Better Error Handling**: See exactly which step failed
4. **✅ Token Management**: N8N can auto-refresh OAuth tokens
5. **✅ Execution History**: View logs of all past runs
6. **✅ Easy to Pause**: Disable with one click
7. **✅ Retry Mechanisms**: Built-in retry on failure

## Next Steps

Once this is working, you can create similar workflows for:
- **Instagram Carousel Posts** (similar logic)
- **Twitter/X Thread Posts**
- **Email Newsletter Generation**
- **Push Notifications**
- **Analytics Reports**

## Need Help?

If you encounter any issues:
1. Check the N8N execution logs
2. Verify your credentials are correct
3. Test each node individually (right-click → "Test step")
4. Check Facebook's Graph API documentation for error codes

---

**Questions or need help setting this up?** Let me know! 🚀
