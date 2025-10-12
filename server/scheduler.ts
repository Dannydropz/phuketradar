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
import { checkSemanticDuplicate } from "./lib/semantic-similarity";

export async function runScheduledScrape() {
  console.log("=== Starting Scheduled Scrape ===");
  console.log(`Time: ${new Date().toISOString()}`);
  
  try {
    const fbPageUrl = "https://www.facebook.com/PhuketTimeNews";
    
    // Create duplicate checker function that stops pagination early to save API credits
    const checkForDuplicate = async (sourceUrl: string) => {
      const existing = await storage.getArticleBySourceUrl(sourceUrl);
      return !!existing;
    };
    
    // Smart scrape: stops when hitting known posts to minimize API usage
    const scrapedPosts = await scraperService.scrapeFacebookPageWithPagination(
      fbPageUrl, 
      3, // max pages
      checkForDuplicate // stop early on duplicates
    );
    console.log(`Found ${scrapedPosts.length} NEW posts to process`);
    
    // Get all existing article embeddings for semantic duplicate detection
    const existingEmbeddings = await storage.getArticlesWithEmbeddings();
    console.log(`Loaded ${existingEmbeddings.length} existing article embeddings`);
    
    let createdCount = 0;
    let publishedCount = 0;
    let skippedNotNews = 0;
    let skippedSemanticDuplicates = 0;

    // Process each scraped post
    for (const post of scrapedPosts) {
      try {
        // STEP 1: Generate embedding from Thai title (before translation - saves money!)
        let titleEmbedding: number[] | undefined;
        try {
          titleEmbedding = await translatorService.generateEmbeddingFromTitle(post.title);
          
          // STEP 2: Check for semantic duplicates
          const duplicateCheck = checkSemanticDuplicate(titleEmbedding, existingEmbeddings, 0.9);
          
          if (duplicateCheck.isDuplicate) {
            skippedSemanticDuplicates++;
            console.log(`🔄 Semantic duplicate detected (${(duplicateCheck.similarity * 100).toFixed(1)}% similar)`);
            console.log(`   New: ${post.title.substring(0, 60)}...`);
            console.log(`   Existing: ${duplicateCheck.matchedArticleTitle?.substring(0, 60)}...`);
            continue;
          }
        } catch (embeddingError) {
          console.error(`Error generating embedding, proceeding without semantic check:`, embeddingError);
          // Continue without semantic duplicate check if embedding fails
        }

        // STEP 3: Translate and rewrite (only if not a semantic duplicate)
        const translation = await translatorService.translateAndRewrite(
          post.title,
          post.content
        );

        // STEP 4: Only create article if it's actual news
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
            embedding: translation.embedding,
          });

          createdCount++;
          if (article.isPublished) {
            publishedCount++;
          }
          
          // Add to existing embeddings so we can catch duplicates within this batch
          if (translation.embedding) {
            existingEmbeddings.push({
              id: article.id,
              title: translation.translatedTitle,
              embedding: translation.embedding,
            });
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
    console.log(`New posts fetched: ${scrapedPosts.length}`);
    console.log(`Skipped (semantic duplicates): ${skippedSemanticDuplicates}`);
    console.log(`Skipped (not news): ${skippedNotNews}`);
    console.log(`Articles created: ${createdCount}`);
    console.log(`Articles published: ${publishedCount}`);
    
    return {
      success: true,
      totalPosts: scrapedPosts.length,
      skippedSemanticDuplicates,
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
