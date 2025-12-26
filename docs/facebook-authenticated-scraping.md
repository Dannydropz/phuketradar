# How to Set Up Authenticated Facebook Scraping

When Facebook posts are set to "Facebook users only" or have other visibility restrictions, the regular scraper cannot access them. This guide explains how to set up authenticated scraping using your Facebook login session.

## Overview

The scraper fallback chain:
1. **ScrapeCreators Single Post API** - Fast, cheap, public posts only
2. **ScrapeCreators Page Scraper** - Fetches recent posts from page, finds the target
3. **Apify Authenticated Scraper** - Uses your Facebook cookies to access login-protected posts

## Setup Steps

### Step 1: Get your Apify API Key

1. Sign up at [apify.com](https://apify.com) 
2. Go to Settings → Integrations
3. Copy your API token

### Step 2: Export Facebook Cookies

You need to export your session cookies from a logged-in Facebook browser session.

#### Using Cookie-Editor Extension (Recommended)

1. Install the **Cookie-Editor** browser extension:
   - [Chrome](https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/cookie-editor/)

2. Log into Facebook in your browser (make sure you're logged in)

3. Click the Cookie-Editor extension icon

4. Click **Export** → **Export as JSON**

5. Copy the entire JSON array

### Step 3: Configure Environment Variables

Add these to your `.env` file or Coolify environment:

```bash
# Apify API key for authenticated Facebook scraping
APIFY_API_KEY=your_apify_api_token_here

# Facebook cookies exported from Cookie-Editor (JSON array format)
# This should be a single-line JSON string
FACEBOOK_COOKIES=[{"name":"c_user","value":"...","domain":".facebook.com",...},...]
```

#### Formatting the Cookies for Environment Variable

The cookies JSON can be very long. You can either:

**Option A: Single line (works best)**
- Remove all newlines from the JSON and paste as one long string

**Option B: Base64 encode**
```bash
# On Mac/Linux:
cat cookies.json | base64 | tr -d '\n'
```

Then set:
```bash
FACEBOOK_COOKIES_BASE64=your_base64_encoded_cookies
```

### Step 4: Verify Setup

After deploying:
1. Try to manually scrape a login-protected post
2. Check the Coolify logs for:
   ```
   🔐 [APIFY-AUTH] Scraping with AUTHENTICATED session: ...
   ✅ Cookies parsed: XX cookies available
   ```

## Troubleshooting

### "No Facebook cookies configured"
- Make sure `FACEBOOK_COOKIES` environment variable is set
- Make sure it's valid JSON format

### "Failed to parse FACEBOOK_COOKIES"
- The cookies must be a valid JSON array
- Check for escaped quotes or special characters
- Try re-exporting the cookies

### Cookies expired / still can't access posts
- Facebook cookies typically expire after a few weeks
- Log into Facebook and re-export cookies
- Make sure you're logged into the same Facebook account that can view the posts

### Post still not found
- Some posts may be genuinely deleted or private (friends only)
- Check if you can see the post when logged into Facebook manually

## Cookie Refresh Schedule

Facebook cookies typically last 2-4 weeks. Set a reminder to:
1. Log into Facebook
2. Export new cookies using Cookie-Editor
3. Update the `FACEBOOK_COOKIES` environment variable in Coolify

## Cost Considerations

- Apify charges per run (approximately $0.25-0.50 per authenticated scrape)
- This fallback only triggers when public scraping fails
- Most posts should still work with the free ScrapeCreators API

## Security Notes

- Keep your `FACEBOOK_COOKIES` secret - they provide full access to your Facebook account
- Consider using a dedicated Facebook account for scraping
- Don't commit cookies to git
