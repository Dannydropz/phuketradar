# Instagram & Threads Auto-Posting via Publer

This guide explains how to set up automated posting to Instagram and Threads using Publer as the intermediary. This approach:

- ✅ **Zero risk** to existing Facebook auto-posting
- ✅ **No Graph API complexity** - Publer handles OAuth/tokens
- ✅ **Reliable** - Publer's official API integration with Meta
- ✅ **Easy maintenance** - No token refresh needed

## Architecture

```
Scheduler creates article (score >= 4)
         ↓
    Facebook: Internal facebook-service.ts (unchanged) ✅
         ↓
    Instagram + Threads: N8N Workflow → Publer API
```

## Prerequisites

1. ✅ **Publer Account** with Instagram and Threads connected
2. ✅ **N8N Instance** running (Netcup server via Coolify)
3. ✅ **Supabase Database** with articles table

---

## Step 1: Generate Publer API Key

1. Log in to [Publer](https://app.publer.com)
2. Go to **Settings → Access & Login → API Keys**
3. Click **"Generate API Key"**
4. Select scopes: `posts`, `media`, `workspaces`, `accounts`
5. **Copy the API key** (it won't be shown again!)

---

## Step 2: Get Workspace & Account IDs

Run the helper script to get your Publer IDs:

```bash
cd /Users/dannykeegan/Github\ Repository/phuketradar

PUBLER_API_KEY=your_api_key_here npx tsx scripts/get-publer-accounts.ts
```

The script will output:
- `PUBLER_WORKSPACE_ID`
- `PUBLER_INSTAGRAM_ACCOUNT_ID`
- `PUBLER_THREADS_ACCOUNT_ID`

---

## Step 3: Add Environment Variables to N8N

In your N8N instance (Coolify), add these environment variables:

```bash
PUBLER_API_KEY=your_publer_api_key
PUBLER_WORKSPACE_ID=your_workspace_id
PUBLER_INSTAGRAM_ACCOUNT_ID=your_instagram_account_id
PUBLER_THREADS_ACCOUNT_ID=your_threads_account_id
```

### Via Coolify:
1. Go to your N8N service
2. Click **Environment Variables**
3. Add each variable
4. **Redeploy** N8N

---

## Step 4: Import N8N Workflow

1. Open your N8N instance
2. Go to **Workflows** → **Import from File**
3. Select `n8n-workflows/publer-instagram-threads-autoposter.json`
4. **Update Postgres credentials**:
   - Click on "Fetch Unposted Article" node
   - Select your existing "Supabase PostgreSQL" credential
   - Do the same for "Update Database" node

---

## Step 5: Test the Workflow

1. **Create a test article** in the admin with:
   - `interestScore >= 4`
   - `isPublished = true`
   - `instagramPostId = NULL`
   - Valid `imageUrl`

2. **Manually execute** the workflow by clicking "Execute Workflow"

3. **Check results**:
   - Verify post appears on Instagram
   - Verify post appears on Threads
   - Check database has `instagramPostId` and `threadsPostId` updated

---

## Step 6: Activate Workflow

Once testing passes:
1. Toggle the workflow to **Active**
2. The schedule trigger will run every 30 minutes

---

## Workflow Logic

### What It Does:
1. **Fetch** newest unposted article (score >= 4, published within 12 hours)
2. **Upload** image to Publer's media storage
3. **Post** to Instagram with full caption + hashtags
4. **Post** to Threads with shorter text + link
5. **Update** database with post IDs

### Post Content Format:

**Instagram:**
```
{facebookHeadline or title}

{excerpt}

📰 Read the full story: https://phuketradar.com/{category}/{slug}-{id}

#Phuket #PhuketNews #ThailandNews {category hashtags}
```

**Threads (max 500 chars):**
```
{headline}

📰 https://phuketradar.com/{category}/{slug}-{id}

#Phuket #PhuketNews {hashtags}
```

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `PUBLER_API_KEY` | Your Publer API key | `pk_live_abc123...` |
| `PUBLER_WORKSPACE_ID` | Workspace containing your accounts | `ws_123456` |
| `PUBLER_INSTAGRAM_ACCOUNT_ID` | Instagram account ID in Publer | `acc_ig_789` |
| `PUBLER_THREADS_ACCOUNT_ID` | Threads account ID in Publer | `acc_th_012` |

---

## Troubleshooting

### No articles being posted?

Check the SQL query criteria:
- `isPublished = true` ✓
- `instagramPostId IS NULL` ✓
- `interestScore >= 4` ✓
- `imageUrl IS NOT NULL` ✓
- `isManuallyCreated = false` ✓
- `publishedAt > NOW() - INTERVAL '12 hours'` ✓

### Publer API errors?

1. **401 Unauthorized**: Check `PUBLER_API_KEY` is correct
2. **400 Bad Request**: Check workspace ID and account IDs
3. **Media upload failed**: Ensure image URL is publicly accessible

### Posts not appearing?

1. Check Publer dashboard → **Scheduled Posts** for any queued/failed posts
2. Verify Instagram/Threads accounts are still connected and active in Publer

---

## Database Columns

The workflow uses these existing columns:

```sql
-- Already exists in your schema
instagram_post_id TEXT     -- Set after successful Instagram post
instagram_post_url TEXT    -- Direct link to Instagram post
threads_post_id TEXT       -- Set after successful Threads post  
threads_post_url TEXT      -- Direct link to Threads post
```

---

## Monitoring

### Check Posting Queue:
```sql
SELECT id, title, "interestScore", "publishedAt"
FROM articles
WHERE "isPublished" = true
  AND "instagramPostId" IS NULL
  AND "interestScore" >= 4
  AND "imageUrl" IS NOT NULL
  AND "isManuallyCreated" = false
ORDER BY "publishedAt" DESC
LIMIT 10;
```

### Check Recently Posted:
```sql
SELECT id, title, "instagramPostId", "threadsPostId", "publishedAt"
FROM articles
WHERE "instagramPostId" IS NOT NULL
ORDER BY "publishedAt" DESC
LIMIT 10;
```

---

## Cost Considerations

- **Publer**: You have lifetime deal with 30 accounts (no additional cost)
- **N8N**: Self-hosted on Netcup (no API call costs)
- **Meta API**: Publer handles all rate limiting and quotas

---

## Next Steps

After activation, consider:
1. **Manual posting buttons** in admin (for stories below score 4)
2. **Failed post retry logic** in N8N workflow
3. **Analytics integration** to track engagement
