# N8N Workflows for Phuket Radar

This directory contains N8N automation workflows for Phuket Radar.

## Available Workflows

### 1. Facebook Auto-Poster (Simple) - **RECOMMENDED**
**File**: `phuket-radar-facebook-autoposter-simple.json`

**Description**: Simplified workflow using Code nodes and direct HTTP requests to Facebook Graph API.

**What it does**:
- ✅ Runs every 30 minutes
- ✅ Posts articles with interest score 4-5
- ✅ Uses enriched `facebookHeadline` for better CTR
- ✅ Supports multi-image posts (photo grid)
- ✅ Adds link in first comment
- ✅ Pins the comment
- ✅ Updates database with post ID and URL

**Setup**: See `docs/N8N_QUICK_SETUP.md`

**Environment Variables Required**:
```bash
FB_PAGE_ID=786684811203574
FB_PAGE_ACCESS_TOKEN=your_page_access_token
DATABASE_URL=postgresql://postgres:password@phuketradar-postgres:5432/phuketradar
SITE_BASE_URL=https://phuketradar.com
```

---

### 2. Facebook Auto-Poster (Full)
**File**: `phuket-radar-facebook-autoposter.json`

**Description**: Full workflow using N8N's native Facebook and PostgreSQL nodes.

**What it does**: Same as simple version, but uses native N8N integrations.

**Setup**: See `docs/N8N_FACEBOOK_AUTOPOSTER_SETUP.md`

**Credentials Required**:
- PostgreSQL connection
- Facebook Graph API OAuth
- Facebook Page Access Token

---

## Quick Start

### Option 1: Simple Workflow (Recommended)

1. **Import** `phuket-radar-facebook-autoposter-simple.json` into N8N
2. **Set environment variables** in your N8N instance (via Coolify):
   ```bash
   FB_PAGE_ID=786684811203574
   FB_PAGE_ACCESS_TOKEN=your_token
   DATABASE_URL=postgresql://postgres:password@phuketradar-postgres:5432/phuketradar
   SITE_BASE_URL=https://phuketradar.com
   ```
3. **Test** by clicking "Execute Workflow"
4. **Activate** by toggling "Active"

### Option 2: Full Workflow

1. **Import** `phuket-radar-facebook-autoposter.json` into N8N
2. **Configure credentials**:
   - Create PostgreSQL credential
   - Create Facebook Graph API credential
   - Set up HTTP Query Auth for access token
3. **Update node references** to use your credentials
4. **Test** and **Activate**

---

## How It Works

### Step-by-Step Process:

1. **Trigger**: Runs every 30 minutes
2. **Fetch**: Query database for unposted articles
   ```sql
   WHERE "isPublished" = true
     AND "facebookPostId" IS NULL
     AND "interestScore" >= 4
     AND "imageUrl" IS NOT NULL
     AND "isManuallyCreated" = false
   LIMIT 5
   ```
3. **Loop**: Process up to 5 articles
4. **Prepare**: Build post message with:
   - Enriched headline (or regular title)
   - Article excerpt
   - Call-to-action
   - Category-specific hashtags
5. **Post**: Upload to Facebook (single or multi-image)
6. **Comment**: Add link to full article
7. **Pin**: Pin the comment to top
8. **Update**: Save `facebookPostId` and `facebookPostUrl` to database
9. **Wait**: 5-second delay before next article

---

## Facebook Post Format

### Message:
```
{facebookHeadline or title}

{excerpt}

Want the full story? Click the link in the first comment below...

#Phuket {category-specific hashtags}
```

### Comment:
```
Read the full story: https://phuketradar.com/{category}/{slug}-{id}
```

### Hashtags by Category:
- **Breaking**: `#PhuketNews #ThailandNews #BreakingNews`
- **Tourism**: `#PhuketTourism #ThailandTravel #VisitPhuket`
- **Business**: `#PhuketBusiness #ThailandBusiness #PhuketEconomy`
- **Events**: `#PhuketEvents #ThingsToDoInPhuket #PhuketLife`
- **Crime**: `#PhuketNews #PhuketCrime #ThailandSafety`
- **Traffic**: `#PhuketTraffic #PhuketNews #ThailandTravel`
- **Weather**: `#PhuketWeather #ThailandWeather #TropicalWeather`

---

## Database Schema Requirements

The workflow expects these columns in the `articles` table:

**Required**:
- `id` (integer)
- `title` (text)
- `excerpt` (text)
- `imageUrl` (text)
- `category` (text)
- `slug` (text)
- `interestScore` (integer 1-5)
- `isPublished` (boolean)
- `facebookPostId` (text, nullable)
- `isManuallyCreated` (boolean)

**Optional but Recommended**:
- `facebookHeadline` (text) - Enriched headline for better CTR
- `imageUrls` (text[]) - Multiple images for photo grid
- `facebookPostUrl` (text) - Direct link to Facebook post
- `publishedAt` (timestamp)

---

## Monitoring

### View Executions
1. Go to **Executions** in N8N sidebar
2. Click on a workflow run to see logs
3. Check each node's output

### Check Database
```sql
-- Recently posted articles
SELECT 
  id, 
  title, 
  "interestScore",
  "facebookPostId", 
  "facebookPostUrl",
  "publishedAt"
FROM articles
WHERE "facebookPostId" IS NOT NULL
ORDER BY "publishedAt" DESC
LIMIT 20;
```

### Check Posting Queue
```sql
-- Articles ready to post
SELECT 
  id, 
  title, 
  "interestScore",
  "imageUrl",
  "publishedAt"
FROM articles
WHERE "isPublished" = true
  AND "facebookPostId" IS NULL
  AND "interestScore" >= 4
  AND "imageUrl" IS NOT NULL
  AND "isManuallyCreated" = false
ORDER BY "publishedAt" DESC;
```

---

## Customization

### Change Posting Frequency
Edit the **Schedule Trigger** node:
- Every 15 minutes: More frequent posting
- Every hour: Less frequent
- Custom schedule: Specific times only

### Change Articles Per Run
Modify the `LIMIT 5` in the SQL query

### Filter by Category
Add to SQL query:
```sql
AND category IN ('Breaking', 'Tourism', 'Crime')
```

### Change Interest Score Threshold
Modify the SQL query:
```sql
AND "interestScore" >= 3  -- Include score 3
```

---

## Troubleshooting

### No articles being posted?

**Check**:
1. Are there published articles with `interestScore >= 4`?
2. Do they have images (`imageUrl IS NOT NULL`)?
3. Are they already posted (`facebookPostId IS NULL`)?
4. Are they auto-scraped (`isManuallyCreated = false`)?

### Facebook API errors?

**Common issues**:
- **Invalid token**: Regenerate your Page Access Token
- **Permission error**: Token needs `pages_manage_posts` permission
- **Rate limit**: Reduce posting frequency
- **Invalid image URL**: Check image URLs are publicly accessible

### Database connection errors?

**Check**:
- Connection string is correct (use internal Docker hostname `phuketradar-postgres` for Netcup)
- SSL is disabled for internal connections (both N8N and Postgres on same Netcup VPS)
- Database credentials are valid
- Both services are on the same Docker network in Coolify

---

## Disabling Node.js Auto-Posting

Once N8N is working, you have two options:

### Option 1: Keep Both (Failsafe)
The claim/lock mechanism in the Node.js code prevents duplicates, so both systems can run safely.

### Option 2: Disable Node.js Posting
Add to `.env`:
```bash
DISABLE_AUTO_FACEBOOK_POST=true
```

Then modify `/server/scheduler.ts` line 1024:
```typescript
const shouldAutoPostToFacebook = 
  process.env.DISABLE_AUTO_FACEBOOK_POST !== 'true' &&
  article.isPublished &&
  (article.interestScore ?? 0) >= 4 &&
  !isReallyPosted &&
  hasImage &&
  !article.isManuallyCreated;
```

---

## Future Workflows

Consider creating workflows for:

### Instagram Auto-Poster
- Similar to Facebook but uses Instagram Graph API
- Carousel posts for multi-image articles
- Instagram Stories for breaking news

### Twitter/X Auto-Poster
- Thread generation for longer stories
- Hashtag optimization for reach
- Image attachments

### Email Digest
- Weekly newsletter with top stories
- Category-specific digests
- Personalized based on user preferences

### Analytics Reporter
- Daily engagement summaries
- Weekly performance reports
- Identify trending topics

### Content Syndication
- Post to Medium, LinkedIn
- Cross-post to partner sites
- RSS feed generation

---

## Support

- **Quick Setup**: See `docs/N8N_QUICK_SETUP.md`
- **Full Setup**: See `docs/N8N_FACEBOOK_AUTOPOSTER_SETUP.md`
- **N8N Docs**: https://docs.n8n.io/
- **Facebook Graph API**: https://developers.facebook.com/docs/graph-api

---

**Questions?** Open an issue or check the documentation!
