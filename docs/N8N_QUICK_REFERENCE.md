# N8N Facebook Auto-Poster - Quick Reference Card

## 🚀 Quick Start (5 Minutes)

### 1. Import Workflow
```bash
File: n8n-workflows/phuket-radar-facebook-autoposter-simple.json
```

### 2. Set Environment Variables
```bash
FB_PAGE_ID=786684811203574
FB_PAGE_ACCESS_TOKEN=your_page_access_token_here
DATABASE_URL=postgresql://user:pass@host.supabase.co:5432/postgres
SITE_BASE_URL=https://phuketradar.com
```

### 3. Test & Activate
- Click **"Execute Workflow"**
- Check executions for errors
- Toggle **"Active"**

---

## 📊 What Gets Posted?

### Criteria:
- ✅ `isPublished = true`
- ✅ `interestScore >= 4` (High interest only)
- ✅ `facebookPostId IS NULL` (Not posted yet)
- ✅ `imageUrl IS NOT NULL` (Has image)
- ✅ `isManuallyCreated = false` (Auto-scraped only)

### Posting Frequency:
- **Every 30 minutes**
- **Up to 5 articles** per run
- **5-second delay** between posts

---

## 🎯 Post Format

### Message:
```
{facebookHeadline or title}

{excerpt}

Want the full story? Click the link in the first comment below...

#Phuket {category hashtags}
```

### Comment (Pinned):
```
Read the full story: https://phuketradar.com/{category}/{slug}-{id}
```

---

## 🏷️ Hashtags by Category

| Category | Hashtags |
|----------|----------|
| **Breaking** | `#PhuketNews #ThailandNews #BreakingNews` |
| **Tourism** | `#PhuketTourism #ThailandTravel #VisitPhuket` |
| **Business** | `#PhuketBusiness #ThailandBusiness #PhuketEconomy` |
| **Events** | `#PhuketEvents #ThingsToDoInPhuket #PhuketLife` |
| **Crime** | `#PhuketNews #PhuketCrime #ThailandSafety` |
| **Traffic** | `#PhuketTraffic #PhuketNews #ThailandTravel` |
| **Weather** | `#PhuketWeather #ThailandWeather #TropicalWeather` |

---

## 🔍 Check Posting Queue

### See what's ready to post:
```sql
SELECT id, title, "interestScore", "imageUrl", "publishedAt"
FROM articles
WHERE "isPublished" = true
  AND "facebookPostId" IS NULL
  AND "interestScore" >= 4
  AND "imageUrl" IS NOT NULL
  AND "isManuallyCreated" = false
ORDER BY "publishedAt" DESC;
```

### See recent posts:
```sql
SELECT id, title, "facebookPostUrl", "publishedAt"
FROM articles
WHERE "facebookPostId" IS NOT NULL
ORDER BY "publishedAt" DESC
LIMIT 20;
```

---

## 🛠️ Common Customizations

### Change posting frequency:
```
Schedule node → Interval: 15 minutes / 1 hour / custom
```

### Change interest score threshold:
```sql
AND "interestScore" >= 3  -- Include score 3
```

### Limit to specific categories:
```sql
AND category IN ('Breaking', 'Tourism', 'Crime')
```

### Change articles per run:
```sql
LIMIT 10  -- Post up to 10 articles
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| No articles posting | Check criteria (score, image, not posted) |
| Facebook API error | Verify access token and permissions |
| Database connection fails | Check connection string and SSL |
| Multi-image post fails | Check image URLs are publicly accessible |
| Comment not pinned | Non-critical, post still succeeds |

---

## 📈 Monitoring

### N8N Dashboard:
1. **Executions** → View all workflow runs
2. Click run → See each node's output
3. Check for errors in red nodes

### Database:
```sql
-- Count posted vs unposted
SELECT 
  COUNT(*) FILTER (WHERE "facebookPostId" IS NOT NULL) as posted,
  COUNT(*) FILTER (WHERE "facebookPostId" IS NULL AND "interestScore" >= 4) as queued
FROM articles
WHERE "isPublished" = true;
```

---

## 🔐 Required Permissions

### Facebook Page Access Token:
- ✅ `pages_read_engagement`
- ✅ `pages_manage_posts`
- ✅ `pages_manage_metadata`

### Database Access:
- ✅ `SELECT` on `articles` table
- ✅ `UPDATE` on `articles` table

---

## 📝 Workflow Nodes (Simple Version)

1. **Schedule Trigger** - Runs every 30 min
2. **Fetch Articles** - Query database
3. **Any Articles?** - Check if results > 0
4. **Loop Articles** - Process one by one
5. **Prepare Data** - Build post message
6. **Post to Facebook** - Upload photo/multi-image
7. **Add Comment** - Post link
8. **Pin Comment** - Keep at top
9. **Update Database** - Save post ID
10. **Wait** - 5-second delay

---

## 🎛️ Environment Variables

| Variable | Example | Purpose |
|----------|---------|---------|
| `FB_PAGE_ID` | `786684811203574` | Your Facebook Page ID |
| `FB_PAGE_ACCESS_TOKEN` | `EAABsb...` | Long-lived page token |
| `NEON_DATABASE_URL` | `postgresql://...` | Database connection |
| `SITE_BASE_URL` | `https://phuketradar.com` | Your site URL |

---

## 🚦 Status Indicators

### Green Execution:
- ✅ All nodes completed successfully
- ✅ Articles posted to Facebook
- ✅ Database updated

### Yellow Warning:
- ⚠️ Some nodes failed (e.g., pin comment)
- ⚠️ Post still succeeded
- ⚠️ Check logs for details

### Red Error:
- ❌ Critical failure (e.g., Facebook API error)
- ❌ Post not created
- ❌ Database not updated

---

## 🔄 Disable Old Node.js Auto-Posting

### Option 1: Add to `.env`
```bash
DISABLE_AUTO_FACEBOOK_POST=true
```

### Option 2: Keep both (recommended)
- Claim/lock mechanism prevents duplicates
- Acts as failsafe backup

---

## 📚 Documentation

- **Quick Setup**: `docs/N8N_QUICK_SETUP.md`
- **Full Setup**: `docs/N8N_FACEBOOK_AUTOPOSTER_SETUP.md`
- **Workflow Diagram**: `docs/N8N_WORKFLOW_DIAGRAM.md`
- **Workflows README**: `n8n-workflows/README.md`

---

## 💡 Pro Tips

1. **Test First**: Always test manually before activating
2. **Monitor Daily**: Check executions for errors
3. **Token Expiry**: Long-lived tokens last ~60 days
4. **Fallback**: Keep Node.js posting as backup
5. **Scaling**: Easy to add Instagram, Twitter, etc.

---

## 🆘 Emergency Commands

### Stop all posting:
```
N8N UI → Toggle "Active" OFF
```

### Check last execution:
```
N8N UI → Executions → View latest
```

### Manual post test:
```
N8N UI → Click "Execute Workflow"
```

### Repost an article:
```sql
UPDATE articles 
SET "facebookPostId" = NULL 
WHERE id = 12345;
```

---

**Questions?** See full documentation or check N8N execution logs! 🎯
