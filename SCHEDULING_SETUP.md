# Automated Scraping Schedule Setup

This guide explains how to set up automated scraping for Phuket Radar.

## ✅ Database Setup Complete

The application now uses **persistent PostgreSQL database storage**. Articles created by scheduled scraping will be permanently saved and appear in the main application.

## How It Works

The `server/scheduler.ts` file contains the scraping logic that:
1. Scrapes the Facebook page for new posts
2. Translates content from Thai to English using OpenAI
3. Filters out non-news content
4. Auto-publishes articles (no manual approval needed)

## Setting Up Scheduled Deployment in Replit

### Method 1: Using Replit's Scheduled Deployments (Recommended)

1. **Access Deployments Tool**
   - Open the Deployments tool from your workspace sidebar
   - Or search "Deployments" in the command palette

2. **Create Scheduled Deployment**
   - Select "Scheduled" deployment type
   - Click "Set up your published app"

3. **Configure Schedule**
   Choose one of these options:
   - **Natural Language**: "Every 2 hours" or "Every day at 9 AM"
   - **Cron Expression**: `0 */2 * * *` (every 2 hours)
   
   Recommended schedules:
   - Every 2 hours: `0 */2 * * *`
   - Every 4 hours: `0 */4 * * *`
   - Twice daily (9 AM, 9 PM): `0 9,21 * * *`

4. **Set Commands**
   - **Build Command**: `npm install`
   - **Run Command**: `tsx server/scheduler.ts`
   - **Timeout**: 300 seconds (5 minutes)

5. **Configure Environment Variables**
   Ensure these secrets are set:
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `SCRAPECREATORS_API_KEY` - Your ScrapeCreators API key

6. **Publish**
   - Review settings and click "Publish"
   - Monitor execution from the Schedule tab

### Method 2: Manual Execution

You can also run the scraper manually:

```bash
# Run the scraper once
tsx server/scheduler.ts
```

Or from the admin dashboard, use the "Scrape Now" button.

## Monitoring

- **Logs**: View execution logs in the Deployments tool
- **Articles**: Check the admin dashboard to see newly published articles
- **Costs**: Monitor your Replit Core credits usage

## Cost Considerations

- Scheduled deployments consume Replit Core credits
- OpenAI API calls cost money based on usage
- ScrapeCreators API has rate limits
- Recommended: Start with less frequent schedules (4-6 hours) and adjust

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
