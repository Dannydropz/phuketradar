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

import { getScraperService } from "./services/scraper";
import { translatorService } from "./services/translator";
import { storage } from "./storage";
import { PLACEHOLDER_IMAGE } from "./lib/placeholders";
import { checkSemanticDuplicate } from "./lib/semantic-similarity";
import { getEnabledSources } from "./config/news-sources";
import { postArticleToFacebook } from "./lib/facebook-service";

export async function runScheduledScrape() {
  const timestamp = new Date().toISOString();
  console.log("\n".repeat(3) + "=".repeat(80));
  console.log("🚨 SCRAPE TRIGGERED 🚨");
  console.log(`Time: ${timestamp}`);
  console.log(`Trigger: AUTOMATED CRON SCHEDULE (every 4 hours)`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log("=".repeat(80) + "\n");
  
  try {
    const sources = getEnabledSources();
    console.log(`Scraping ${sources.length} Facebook news sources`);
    
    // Create duplicate checker function that stops pagination early to save API credits
    const checkForDuplicate = async (sourceUrl: string) => {
      const existing = await storage.getArticleBySourceUrl(sourceUrl);
      return !!existing;
    };
    
    // Get all existing article embeddings for semantic duplicate detection
    const existingEmbeddings = await storage.getArticlesWithEmbeddings();
    console.log(`Loaded ${existingEmbeddings.length} existing article embeddings`);
    
    let totalPosts = 0;
    let createdCount = 0;
    let publishedCount = 0;
    let skippedNotNews = 0;
    let skippedSemanticDuplicates = 0;

    // Get the appropriate scraper based on SCRAPER_PROVIDER env var
    const scraperService = getScraperService();

    // Loop through each news source
    for (const source of sources) {
      console.log(`Scraping source: ${source.name}`);
      
      // Smart scrape: stops when hitting known posts to minimize API usage
      const scrapedPosts = await scraperService.scrapeFacebookPageWithPagination(
        source.url, 
        1, // max pages (reduced from 3 to minimize API costs)
        checkForDuplicate // stop early on duplicates
      );
      console.log(`${source.name}: Found ${scrapedPosts.length} NEW posts`);
      totalPosts += scrapedPosts.length;

    // Process each scraped post from this source
    for (const post of scrapedPosts) {
      try {
        // STEP -1: Check if this source URL already exists in database (fast check before expensive API calls)
        const existingBySourceUrl = await storage.getArticleBySourceUrl(post.sourceUrl);
        if (existingBySourceUrl) {
          skippedSemanticDuplicates++;
          console.log(`\n🚫 DUPLICATE DETECTED - Method: SOURCE URL CHECK`);
          console.log(`   URL: ${post.sourceUrl}`);
          console.log(`   New title: ${post.title.substring(0, 60)}...`);
          console.log(`   Existing: ${existingBySourceUrl.title.substring(0, 60)}...`);
          console.log(`   ✅ Skipped before translation (saved API credits)\n`);
          continue;
        }
        
        // STEP 0: Check for image URL duplicate (same image = same story)
        // Check ALL images in the array, not just the primary one
        if (post.imageUrls && post.imageUrls.length > 0) {
          let foundDuplicate = false;
          for (const imageUrl of post.imageUrls) {
            const existingImageArticle = await storage.getArticleByImageUrl(imageUrl);
            if (existingImageArticle) {
              skippedSemanticDuplicates++;
              console.log(`\n🚫 DUPLICATE DETECTED - Method: IMAGE URL CHECK (${post.imageUrls?.length || 1} images checked)`);
              console.log(`   New title: ${post.title.substring(0, 60)}...`);
              console.log(`   Existing: ${existingImageArticle.title.substring(0, 60)}...`);
              console.log(`   Matching image: ${imageUrl.substring(0, 80)}...`);
              console.log(`   ✅ Skipped before translation (saved API credits)\n`);
              foundDuplicate = true;
              break;
            }
          }
          if (foundDuplicate) {
            continue;
          }
        } else if (post.imageUrl) {
          // Fallback for posts without imageUrls array
          const existingImageArticle = await storage.getArticleByImageUrl(post.imageUrl);
          if (existingImageArticle) {
            skippedSemanticDuplicates++;
            console.log(`\n🚫 DUPLICATE DETECTED - Method: IMAGE URL CHECK (single image)`);
            console.log(`   New title: ${post.title.substring(0, 60)}...`);
            console.log(`   Existing: ${existingImageArticle.title.substring(0, 60)}...`);
            console.log(`   ✅ Skipped before translation (saved API credits)\n`);
            continue;
          }
        }
        
        // STEP 1: Generate embedding from Thai title (before translation - saves money!)
        let titleEmbedding: number[] | undefined;
        try {
          titleEmbedding = await translatorService.generateEmbeddingFromTitle(post.title);
          
          // STEP 2: Check for semantic duplicates (70% threshold catches near-duplicates)
          const duplicateCheck = checkSemanticDuplicate(titleEmbedding, existingEmbeddings, 0.70);
          
          if (duplicateCheck.isDuplicate) {
            skippedSemanticDuplicates++;
            console.log(`\n🚫 DUPLICATE DETECTED - Method: SEMANTIC SIMILARITY (${(duplicateCheck.similarity * 100).toFixed(1)}% match)`);
            console.log(`   New title: ${post.title.substring(0, 60)}...`);
            console.log(`   Existing: ${duplicateCheck.matchedArticleTitle?.substring(0, 60)}...`);
            console.log(`   ✅ Skipped before translation (saved API credits)\n`);
            continue;
          }
        } catch (embeddingError) {
          console.error(`Error generating embedding, proceeding without semantic check:`, embeddingError);
          // Continue without semantic duplicate check if embedding fails
        }

        // STEP 3: Translate and rewrite (pass precomputed Thai embedding)
        const translation = await translatorService.translateAndRewrite(
          post.title,
          post.content,
          titleEmbedding // Pass precomputed Thai embedding to be stored
        );

        // STEP 4: Only create article if it's actual news
        if (translation.isActualNews) {
          let article;
          try {
            // Create article - auto-publish for scheduled runs
            article = await storage.createArticle({
              title: translation.translatedTitle,
              content: translation.translatedContent,
              excerpt: translation.excerpt,
              imageUrl: post.imageUrl || null,
              imageUrls: post.imageUrls || null,
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
          } catch (createError: any) {
            // Catch duplicate key violations (PostgreSQL error code 23505)
            if (createError.code === '23505') {
              console.log(`⚠️  Duplicate article caught by database constraint: ${post.sourceUrl}`);
              console.log(`   Title: ${translation.translatedTitle.substring(0, 60)}...`);
              continue; // Skip Facebook posting and move to next post
            } else {
              // Re-throw other errors
              throw createError;
            }
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

          // Auto-post to Facebook after publishing (only if not already posted)
          if (article.isPublished && !article.facebookPostId && article.imageUrl) {
            try {
              const fbResult = await postArticleToFacebook(article, storage);
              if (fbResult) {
                if (fbResult.status === 'posted') {
                  console.log(`✅ Posted to Facebook: ${fbResult.postUrl}`);
                } else {
                  console.log(`ℹ️  Article already posted to Facebook: ${fbResult.postUrl}`);
                }
              } else {
                console.error(`❌ Failed to post to Facebook for ${article.title.substring(0, 60)}...`);
              }
            } catch (fbError) {
              console.error(`❌ Error posting to Facebook:`, fbError);
              // Don't fail the whole scrape if Facebook posting fails
            }
          } else if (article.isPublished && article.facebookPostId) {
            console.log(`⏭️  Already posted to Facebook: ${article.title.substring(0, 60)}...`);
          } else if (article.isPublished && !article.imageUrl) {
            console.log(`⏭️  Skipping Facebook post (no image): ${article.title.substring(0, 60)}...`);
          }
        } else {
          skippedNotNews++;
          console.log(`⏭️  Skipped non-news: ${post.title.substring(0, 50)}...`);
        }
      } catch (error) {
        console.error("Error processing post:", error);
      }
    } // End of posts loop
    } // End of sources loop

    console.log(`\n=== Multi-Source Scrape Complete ===`);
    console.log(`Total posts fetched: ${totalPosts}`);
    console.log(`Skipped (semantic duplicates): ${skippedSemanticDuplicates}`);
    console.log(`Skipped (not news): ${skippedNotNews}`);
    console.log(`Articles created: ${createdCount}`);
    console.log(`Articles published: ${publishedCount}`);
    
    return {
      success: true,
      totalPosts,
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
