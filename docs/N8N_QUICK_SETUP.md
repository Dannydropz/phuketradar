# Quick Setup: N8N Facebook Auto-Poster (Simplified)

This is a **simplified version** that uses webhooks and HTTP requests instead of native N8N nodes. This approach is easier to set up if you're having issues with N8N's built-in Facebook integration.

## Quick Setup Steps

### 1. Environment Variables

Add these to your N8N environment (or directly in the Code nodes):

```bash
FB_PAGE_ID=786684811203574
FB_PAGE_ACCESS_TOKEN=your_long_lived_page_access_token
DATABASE_URL=postgresql://user:pass@host.supabase.co:5432/postgres
SITE_BASE_URL=https://phuketradar.com
```

### 2. Import Workflow

Import the file: `n8n-workflows/phuket-radar-facebook-autoposter-simple.json`

### 3. Test & Activate

1. Click "Execute Workflow" to test
2. Toggle "Active" to enable automatic runs
3. Done! ✅

## How It Works

### Every 30 Minutes:
1. **Fetch** unposted articles (score 4-5) from database
2. **Loop** through up to 5 articles
3. **Post** to Facebook with image and enriched headline
4. **Comment** with link back to your site
5. **Pin** the comment
6. **Update** database to mark as posted
7. **Wait** 5 seconds before next article

## SQL Query Used

```sql
SELECT 
  id, 
  title, 
  excerpt, 
  "facebookHeadline", 
  "imageUrl", 
  "imageUrls", 
  category, 
  slug, 
  "interestScore"
FROM articles
WHERE "isPublished" = true
  AND "facebookPostId" IS NULL
  AND "interestScore" >= 4
  AND "imageUrl" IS NOT NULL
  AND "isManuallyCreated" = false
ORDER BY "publishedAt" DESC
LIMIT 5;
```

## Category-Specific Hashtags

The workflow automatically generates hashtags based on article category:

- **Breaking**: `#Phuket #PhuketNews #ThailandNews #BreakingNews`
- **Tourism**: `#Phuket #PhuketTourism #ThailandTravel #VisitPhuket`
- **Business**: `#Phuket #PhuketBusiness #ThailandBusiness #PhuketEconomy`
- **Events**: `#Phuket #PhuketEvents #ThingsToDoInPhuket #PhuketLife`
- **Other**: `#Phuket #PhuketNews #Thailand #PhuketLife`

## Facebook Post Format

### Post Message:
```
{facebookHeadline or title}

{excerpt}

Want the full story? Click the link in the first comment below...

#Phuket #{category-specific hashtags}
```

### Comment:
```
Read the full story: https://phuketradar.com/{category}/{slug}-{id}
```

The comment is automatically **pinned** to stay at the top.

## Multi-Image Support

If an article has multiple images (`imageUrls` array), the workflow:
1. Uploads each image as **unpublished**
2. Creates a **multi-photo post** (photo grid)
3. Falls back to **single image** if upload fails

## Monitoring

### Check Executions:
1. Go to **Executions** in N8N
2. View logs for each run
3. See which articles were posted

### Check Database:
```sql
SELECT 
  id, 
  title, 
  "facebookPostId", 
  "facebookPostUrl"
FROM articles
WHERE "facebookPostId" IS NOT NULL
ORDER BY "publishedAt" DESC
LIMIT 10;
```

## Troubleshooting

### No articles being posted?
- Check if you have published articles with `interestScore >= 4`
- Verify `facebookPostId IS NULL` (not already posted)
- Ensure `imageUrl IS NOT NULL` (posts require images)

### Facebook API errors?
- Verify your `FB_PAGE_ACCESS_TOKEN` is valid
- Check token permissions include `pages_manage_posts` and `pages_read_engagement`
- Ensure `FB_PAGE_ID` is correct: `786684811203574`

### Database connection errors?
- Verify your Neon database URL is correct
- Ensure SSL is enabled (`?sslmode=require`)
- Check firewall settings allow N8N server IP

## Customization

### Change Posting Interval
Default: Every 30 minutes

To change:
1. Click the **Schedule Trigger** node
2. Modify the interval (e.g., every 15 min, every hour)

### Change Number of Posts Per Run
Default: 5 articles

To change:
1. Click the **Get Unposted Articles** node
2. Modify `LIMIT 5` to your desired number

### Filter by Category
Add to the SQL query:
```sql
AND category IN ('Breaking', 'Tourism', 'Crime')
```

### Change Interest Score Threshold
Default: Score 4-5

To include score 3:
```sql
AND "interestScore" >= 3
```

## Disabling Node.js Auto-Posting

Once N8N is working, you can disable the Node.js auto-posting to avoid any conflicts:

### Option 1: Environment Variable
Add to your app's `.env`:
```bash
DISABLE_AUTO_FACEBOOK_POST=true
```

Then modify `/server/scheduler.ts` around line 1024:
```typescript
const shouldAutoPostToFacebook = 
  process.env.DISABLE_AUTO_FACEBOOK_POST !== 'true' &&
  article.isPublished &&
  (article.interestScore ?? 0) >= 4 &&
  !isReallyPosted &&
  hasImage &&
  !article.isManuallyCreated;
```

### Option 2: Keep Both (Failsafe)
The claim/lock mechanism prevents duplicates, so you can keep both systems running as a failsafe.

## Benefits

✅ **Handles Access Tokens**: N8N manages Facebook tokens  
✅ **No Code Changes**: Modify posting logic without redeploying  
✅ **Visual Logs**: See exactly what's being posted  
✅ **Easy to Pause**: Disable with one click  
✅ **Centralized**: All automations in one place  
✅ **Scalable**: Easy to add Instagram, Twitter, etc.

## What's Next?

Consider creating similar workflows for:
- **Instagram Carousel Posts**: Similar to Facebook multi-image
- **Story Alerts**: Push high-interest stories to Telegram/Slack
- **Weekly Digest**: Auto-generate newsletter from top stories
- **Analytics Reports**: Daily/weekly engagement summaries

---

**Need help?** Check the full setup guide: `docs/N8N_FACEBOOK_AUTOPOSTER_SETUP.md`
