/**
 * Automated Scraping Scheduler
 * 
 * This module provides automated scraping functionality.
 * To enable scheduled scraping, set up a Scheduled Deployment in Replit.
 * 
 * Setup Steps:
 * - Go to Deployments tool in Replit
 * - Select "Scheduled" deployment type  
 * - Configure schedule (e.g., "Every 2 hours" or cron: "0 2-23/2 * * *")
 * - Set run command: tsx server/scheduler.ts
 * - Ensure environment variables are set: OPENAI_API_KEY, SCRAPECREATORS_API_KEY
 * - Publish the scheduled deployment
 * 
 * The scheduler uses PostgreSQL database storage for persistence, so articles
 * will be permanently saved and appear in the main application.
 */

import { scraperService } from "./services/scraper";
import { translatorService } from "./services/translator";
import { storage } from "./storage";
import { PLACEHOLDER_IMAGE } from "./lib/placeholders";

export async function runScheduledScrape() {
  console.log("=== Starting Scheduled Scrape ===");
  console.log(`Time: ${new Date().toISOString()}`);
  
  try {
    const fbPageUrl = "https://www.facebook.com/PhuketTimeNews";
    
    // Scrape with pagination (3 pages = ~9 posts)
    const scrapedPosts = await scraperService.scrapeFacebookPageWithPagination(fbPageUrl, 3);
    console.log(`Found ${scrapedPosts.length} potential posts`);
    
    let createdCount = 0;
    let publishedCount = 0;
    let skippedDuplicates = 0;
    let skippedNotNews = 0;

    // Process each scraped post
    for (const post of scrapedPosts) {
      try {
        // Check if article with this sourceUrl already exists
        const existingArticle = await storage.getArticleBySourceUrl(post.sourceUrl);
        
        if (existingArticle) {
          skippedDuplicates++;
          console.log(`⏭️  Skipped duplicate: ${post.title.substring(0, 50)}...`);
          continue;
        }

        // Translate and rewrite
        const translation = await translatorService.translateAndRewrite(
          post.title,
          post.content
        );

        // Only create article if it's actual news
        if (translation.isActualNews) {
          // Create article - auto-publish for scheduled runs
          const article = await storage.createArticle({
            title: translation.translatedTitle,
            content: translation.translatedContent,
            excerpt: translation.excerpt,
            imageUrl: post.imageUrl || null,
            category: translation.category,
            sourceUrl: post.sourceUrl,
            author: translation.author,
            isPublished: true, // Auto-publish on scheduled runs
            originalLanguage: "th",
            translatedBy: "openai",
          });

          createdCount++;
          if (article.isPublished) {
            publishedCount++;
          }
          
          console.log(`✅ Created and published: ${translation.translatedTitle.substring(0, 50)}...`);
        } else {
          skippedNotNews++;
          console.log(`⏭️  Skipped non-news: ${post.title.substring(0, 50)}...`);
        }
      } catch (error) {
        console.error("Error processing post:", error);
      }
    }

    console.log(`\n=== Scrape Complete ===`);
    console.log(`Total posts found: ${scrapedPosts.length}`);
    console.log(`Skipped (duplicates): ${skippedDuplicates}`);
    console.log(`Skipped (not news): ${skippedNotNews}`);
    console.log(`Articles created: ${createdCount}`);
    console.log(`Articles published: ${publishedCount}`);
    
    return {
      success: true,
      totalPosts: scrapedPosts.length,
      skippedDuplicates,
      skippedNotNews,
      articlesCreated: createdCount,
      articlesPublished: publishedCount,
    };
  } catch (error) {
    console.error("Error during scheduled scrape:", error);
    throw error;
  }
}

// If this file is run directly (via npm run scrape), execute the scrape
if (import.meta.url === `file://${process.argv[1]}`) {
  runScheduledScrape()
    .then((result) => {
      console.log("Scrape completed successfully:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Scrape failed:", error);
      process.exit(1);
    });
}
