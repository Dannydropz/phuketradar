# Apify Multi-Image Scraping Setup

## Overview
Your app now supports **two scraping providers** that you can switch between at any time:

### 🎯 Apify (Recommended - Multi-Image Support)
- ✅ Extracts **all images** from Facebook carousel/album posts
- ✅ Free tier: 500 pages/month
- ✅ Paid tier: $39/month for 3,900 pages
- ✅ Currently **active** (SCRAPER_PROVIDER=apify in .env)

### 🔄 ScrapeCreators (Fallback - Single Image Only)
- ⚠️ Only returns **one image** per post
- ✅ Good as backup option
- ⚠️ You'll miss carousel images

---

## How to Use Apify

### 1. Sign Up (Already Done!)
You've already added your `APIFY_API_KEY` to Replit Secrets. ✅

### 2. How It Works
When you trigger scraping (manually or via cron), the app will:
1. Use Apify to scrape Facebook posts
2. Extract **all images** from carousel posts
3. Store them in the `imageUrls` array
4. Display them as an image carousel on your website
5. Post them as a grid on Facebook when publishing

### 3. Monitor Usage
- Check your Apify dashboard: https://console.apify.com/
- View "Runs" to see scraping activity
- Monitor credits (500 pages free per month)

---

## Switching Between Providers

### Option A: Use Apify (Multi-Image) - Current Setting
```
SCRAPER_PROVIDER=apify
```
Requires: `APIFY_API_KEY` in secrets ✅

### Option B: Use ScrapeCreators (Single Image)
```
SCRAPER_PROVIDER=scrapecreators
```
Requires: `SCRAPECREATORS_API_KEY` in secrets

### How to Switch
1. Go to Replit Secrets (🔒 icon in sidebar)
2. Add/change `SCRAPER_PROVIDER` value
3. Restart your app
4. Next scraping run will use the new provider

**Default behavior:** If you don't set `SCRAPER_PROVIDER`, it will use Apify if `APIFY_API_KEY` exists, otherwise ScrapeCreators.

---

## Duplicate Detection (Handles Both URL Formats)

You mentioned seeing duplicates with different Facebook URL formats:
- `https://www.facebook.com/posts/1115795577429138` (numeric ID)
- `https://www.facebook.com/posts/pfbid034pFkj6...` (pfbid format)

These are the **same post** with different URL formats. Your app now handles this with **4-layer duplicate detection**:

### 1. ✅ Source URL Check (Fast)
Checks if the exact URL is already in database

### 2. ✅ Image URL Check (Catches URL Format Differences) 
**This is the key!** Even if Facebook URLs differ, the same story will use the same images. The app checks **all images** in the `imageUrls` array against existing articles.

### 3. ✅ Semantic Similarity (70% threshold)
Compares Thai title embeddings to catch near-duplicates with different wording

### 4. ✅ Database Constraint
PostgreSQL UNIQUE constraint prevents race condition duplicates

### Enhanced Logging
Now when duplicates are detected, you'll see clear messages like:
```
🚫 DUPLICATE DETECTED - Method: IMAGE URL CHECK (3 images checked)
   New title: Phuket City Police Crack Down on Fireworks Sales...
   Existing: Phuket City Police Crack Down on Fireworks Sales...
   Matching image: https://scontent.fbos1-1.fna.fbcdn.net/...
   ✅ Skipped before translation (saved API credits)
```

This makes it easy to see **why** each duplicate was caught.

---

## Cost Comparison

### Apify
- Free: 500 pages/month
- Paid: $39/month for 3,900 pages (~$0.01/page)
- **Benefit:** Full carousel images = better content quality

### ScrapeCreators
- Check their pricing
- **Limitation:** Single image only

**Recommendation:** Start with Apify's free tier (500 pages). If ScrapeCreators adds multi-image support later, you can switch back with one environment variable change!

---

## Testing

To test the Apify scraper:
1. Go to your admin panel
2. Click "Trigger Scraping"
3. Watch the logs for `[APIFY]` messages
4. Look for `📸 MULTI-IMAGE POST DETECTED!` in logs
5. Check articles to verify `imageUrls` array is populated

---

## Troubleshooting

### "Apify run timed out"
- Apify scraper waits up to 5 minutes for completion
- If it times out, check Apify dashboard for run status
- Consider reducing `maxPosts` in `apify-scraper.ts` (currently 50)

### "No images extracted"
- Check if posts actually have multiple images on Facebook
- Verify `APIFY_API_KEY` is valid
- Check Apify dashboard for error logs

### Want to go back to ScrapeCreators?
Just change `SCRAPER_PROVIDER=scrapecreators` and restart!

---

## Files Changed
- ✅ `server/services/apify-scraper.ts` - New Apify integration
- ✅ `server/services/scraper.ts` - Provider switching logic
- ✅ `server/scheduler.ts` - Enhanced logging, uses provider
- ✅ `server/routes.ts` - Uses provider for manual scraping
- ✅ `.env.example` - Documentation
- ✅ `replit.md` - Architecture documentation
