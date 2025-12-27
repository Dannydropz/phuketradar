# Apify Fallback Scraping Setup

## Overview

**Important:** Apify is ONLY used as a fallback for manual single-post scrapes when ScrapeCreators fails. It is NOT used for scheduled auto-scrapes.

### Primary Scraper: ScrapeCreators
- ✅ Used for ALL scheduled auto-scrapes (every 4 hours)
- ✅ Used for page scraping in manual scrapes
- ✅ No monthly limits that would break auto-scraping

### Fallback Scraper: Apify
- ⚠️ ONLY used as fallback when ScrapeCreators fails for single-post scrapes
- ⚠️ Limited monthly quota (500 pages/month free tier)
- ⚠️ Should NOT be used as primary scraper to avoid quota issues
- ✅ Useful for authenticated scraping of login-protected content

---

## How It Works

1. **Scheduled Scrapes (Auto)**: Always use ScrapeCreators
2. **Manual Page Scrapes**: Always use ScrapeCreators
3. **Manual Single-Post Scrapes**: 
   - First tries ScrapeCreators
   - If ScrapeCreators fails, falls back to Apify (if `APIFY_API_KEY` is set)
   - This is useful for login-protected posts

---

## Environment Variables

```bash
# Primary scraper (required)
SCRAPECREATORS_API_KEY=...

# Fallback scraper (optional - for manual single-post fallback only)
APIFY_API_KEY=...

# Optional: Facebook cookies for authenticated Apify scraping
FACEBOOK_COOKIES=...
```

**Note:** Do NOT set `SCRAPER_PROVIDER=apify` - this is deprecated and will be ignored.

---

## Monitoring

### ScrapeCreators
- Check your ScrapeCreators dashboard for usage

### Apify (Fallback Only)
- Check Apify dashboard: https://console.apify.com/
- View "Runs" to see scraping activity
- Monitor credits (500 pages free per month)

---

## Troubleshooting

### "Monthly usage hard limit exceeded" Error
This means your Apify quota is exhausted. This should NOT affect scheduled scrapes since they use ScrapeCreators. If you see this error during scheduled scrapes, there's a bug - please report it.

### Single-post scrape failing
If both ScrapeCreators and Apify fail for a single post:
1. The post may be login-protected
2. Try setting `FACEBOOK_COOKIES` for authenticated Apify scraping
3. The post may have been deleted or made private

---

## Files

- `server/services/scraper.ts` - Primary ScrapeCreators service, getScraperService() always returns ScrapeCreators
- `server/services/apify-scraper.ts` - Apify fallback service (used only inside scrapeSingleFacebookPost when ScrapeCreators fails)
- `server/scheduler.ts` - Uses ScrapeCreators for scheduled scrapes
