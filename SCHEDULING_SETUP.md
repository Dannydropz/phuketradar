# Automated Scraping Schedule Setup

This guide explains how to set up automated scraping for Phuket Radar with **4-hour auto-publishing**.

## ✅ Database Setup Complete

The application now uses **persistent PostgreSQL database storage**. Articles created by scheduled scraping will be permanently saved and appear in the main application.

## How It Works

The `server/scheduler.ts` file contains the scraping logic that:
1. Scrapes the Facebook page for new posts
2. Translates content from Thai to English using OpenAI
3. **Filters out sensitive content** (royal family/king news, Phuket Times self-referential posts)
4. Filters out non-news content (promotional posts, greetings, ads)
5. **Auto-publishes articles** (no manual approval needed)

## Setting Up 4-Hour Auto-Publishing Schedule

### Step-by-Step Instructions

1. **Access Deployments Tab**
   - Click on the **Deployments** tab in your Replit workspace sidebar
   - Or press `Cmd/Ctrl + K` and search for "Deployments"

2. **Create Scheduled Deployment**
   - Click **"Create deployment"** or **"New deployment"**
   - Select **"Scheduled"** deployment type
   - Click **"Continue"** or **"Set up"**

3. **Configure 4-Hour Schedule**
   - **Schedule**: Enter `every 4 hours` or use cron: `0 */4 * * *`
   - This will run at: 12:00 AM, 4:00 AM, 8:00 AM, 12:00 PM, 4:00 PM, 8:00 PM

4. **Set Commands** (IMPORTANT - Copy exactly)
   - **Build Command**: `npm install`
   - **Run Command**: `tsx server/scheduler.ts`
   - **Timeout**: `300` seconds (5 minutes)

5. **Verify Environment Variables**
   Your secrets are already configured:
   - ✅ `OPENAI_API_KEY` - For translation
   - ✅ `SCRAPECREATORS_API_KEY` - For Facebook scraping
   - ✅ `DATABASE_URL` - For persistent storage

6. **Deploy & Activate**
   - Click **"Deploy"** or **"Publish"**
   - Your scheduled scraper is now active! 🎉
   - Articles will auto-publish every 4 hours

### Method 2: Manual Execution

You can also run the scraper manually:

```bash
# Run the scraper once
tsx server/scheduler.ts
```

Or from the admin dashboard, use the "Scrape Now" button.

## Monitoring Your Auto-Published Articles

- **Logs**: Click **"Schedule"** tab in Deployments to view execution logs
- **Articles**: Visit your homepage - new articles appear automatically
- **Admin**: Check `/admin` dashboard (if implemented) for all articles
- **Costs**: Monitor Replit Core credits in your account settings

## What Gets Published Automatically

✅ **Included:**
- Breaking news about Phuket
- Tourism updates
- Business news
- Local events
- General news about the island

❌ **Filtered Out:**
- Royal family/king news (sensitive political content)
- Phuket Times self-referential posts (news about the news source)
- Promotional content & ads
- Greetings and filler posts
- Non-news social media content

## Cost Breakdown

- **Replit Scheduled Deployments**: ~$1.35/month (covered by Core credits)
- **OpenAI API** (GPT-4-mini): ~$5-10/month depending on volume
- **ScrapeCreators API**: Check your plan limits
- **Total**: ~$6-12/month for fully automated news site

## Troubleshooting

**Issue**: Scheduled deployment fails
- Check that all environment variables are set
- Verify API keys are valid
- Review logs for specific error messages

**Issue**: No articles are published
- Check that the Facebook page has new content
- Verify translation service is filtering correctly
- Review logs to see if posts are being classified as non-news

**Issue**: Duplicate articles
- The system should handle duplicates, but if issues persist:
  - Increase scraping interval
  - Check storage implementation for duplicate detection
