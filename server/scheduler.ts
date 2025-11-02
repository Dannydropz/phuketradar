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
import { classificationService } from "./services/classifier";
import { storage } from "./storage";
import { PLACEHOLDER_IMAGE } from "./lib/placeholders";
import { checkSemanticDuplicate } from "./lib/semantic-similarity";
import { getEnabledSources } from "./config/news-sources";
import { postArticleToFacebook } from "./lib/facebook-service";
import { entityExtractionService, type ExtractedEntities } from "./services/entity-extraction";

// Optional callback for progress updates (used by admin UI)
export interface ScrapeProgressCallback {
  onProgress?: (stats: {
    totalPosts: number;
    processedPosts: number;
    createdArticles: number;
    skippedNotNews: number;
  }) => void;
}

export async function runScheduledScrape(callbacks?: ScrapeProgressCallback) {
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
    const scraperService = await getScraperService();

    // Loop through each news source
    for (const source of sources) {
      console.log(`Scraping source: ${source.name}`);
      
      // Smart scrape: stops when hitting known posts to minimize API usage
      const scrapedPosts = await scraperService.scrapeFacebookPageWithPagination(
        source.url, 
        3, // max pages - ensures we catch all recent stories from fast-posting sources like Newshawk
        checkForDuplicate // stop early on duplicates (prevents unnecessary API calls)
      );
      console.log(`${source.name}: Found ${scrapedPosts.length} NEW posts`);
      totalPosts += scrapedPosts.length;

    // Process each scraped post from this source
    for (const post of scrapedPosts) {
      try {
        // STEP -3: Skip Facebook "colored background text posts" (reliable filtering via API field)
        // These posts have text_format_preset_id set when using Facebook's colored backgrounds
        if (post.textFormatPresetId) {
          skippedNotNews++;
          console.log(`\n⏭️  SKIPPED - COLORED BACKGROUND TEXT POST (Facebook text format preset)`);
          console.log(`   Preset ID: ${post.textFormatPresetId}`);
          console.log(`   Title: ${post.title.substring(0, 60)}...`);
          console.log(`   ✅ Skipped before translation (saved API credits)\n`);
          
          // Update progress
          if (callbacks?.onProgress) {
            callbacks.onProgress({
              totalPosts,
              processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
              createdArticles: createdCount,
              skippedNotNews,
            });
          }
          continue;
        }
        
        // STEP -2: Check if this Facebook post ID already exists in database (fastest and most reliable check)
        if (post.facebookPostId) {
          const existingByPostId = await storage.getArticleByFacebookPostId(post.facebookPostId);
          if (existingByPostId) {
            skippedSemanticDuplicates++;
            console.log(`\n🚫 DUPLICATE DETECTED - Method: FACEBOOK POST ID CHECK`);
            console.log(`   Post ID: ${post.facebookPostId}`);
            console.log(`   New title: ${post.title.substring(0, 60)}...`);
            console.log(`   Existing: ${existingByPostId.title.substring(0, 60)}...`);
            console.log(`   ✅ Skipped before translation (saved API credits)\n`);
            
            // Update progress
            if (callbacks?.onProgress) {
              callbacks.onProgress({
                totalPosts,
                processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                createdArticles: createdCount,
                skippedNotNews,
              });
            }
            continue;
          }
        }
        
        // STEP -1: Check if this source URL already exists in database (fast check before expensive API calls)
        const existingBySourceUrl = await storage.getArticleBySourceUrl(post.sourceUrl);
        if (existingBySourceUrl) {
          skippedSemanticDuplicates++;
          console.log(`\n🚫 DUPLICATE DETECTED - Method: SOURCE URL CHECK`);
          console.log(`   URL: ${post.sourceUrl}`);
          console.log(`   New title: ${post.title.substring(0, 60)}...`);
          console.log(`   Existing: ${existingBySourceUrl.title.substring(0, 60)}...`);
          console.log(`   ✅ Skipped before translation (saved API credits)\n`);
          
          // Update progress
          if (callbacks?.onProgress) {
            callbacks.onProgress({
              totalPosts,
              processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
              createdArticles: createdCount,
              skippedNotNews,
            });
          }
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
            // Update progress
            if (callbacks?.onProgress) {
              callbacks.onProgress({
                totalPosts,
                processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                createdArticles: createdCount,
                skippedNotNews,
              });
            }
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
            
            // Update progress
            if (callbacks?.onProgress) {
              callbacks.onProgress({
                totalPosts,
                processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                createdArticles: createdCount,
                skippedNotNews,
              });
            }
            continue;
          }
        }
        
        // STEP 0.5: Vision-based text graphic filtering (GPT-4o-mini vision API)
        // Check all images to ensure at least one is a real photo (not a text graphic)
        const imagesToCheck = post.imageUrls || (post.imageUrl ? [post.imageUrl] : []);
        
        if (imagesToCheck.length > 0) {
          console.log(`\n📸 VISION CHECK: Analyzing ${imagesToCheck.length} image(s) for text graphics...`);
          
          let realPhotoCount = 0;
          let textGraphicCount = 0;
          const visionResults: Array<{url: string; isReal: boolean; reason?: string}> = [];
          
          // Check each image with GPT-4o-mini vision
          for (const imageUrl of imagesToCheck) {
            try {
              const isReal = await translatorService.isRealPhoto(imageUrl);
              visionResults.push({ url: imageUrl, isReal });
              
              if (isReal) {
                realPhotoCount++;
              } else {
                textGraphicCount++;
              }
            } catch (visionError) {
              console.warn(`   ⚠️  Vision check failed for image, assuming real photo:`, visionError);
              realPhotoCount++; // Err on the side of inclusion if vision fails
              visionResults.push({ url: imageUrl, isReal: true, reason: 'vision API error' });
            }
          }
          
          // Only skip if ALL images are text graphics (no real photos)
          if (realPhotoCount === 0 && textGraphicCount > 0) {
            skippedNotNews++;
            console.log(`\n⏭️  SKIPPED - TEXT GRAPHIC POST (GPT-4o-mini vision)`);
            console.log(`   Title: ${post.title.substring(0, 60)}...`);
            console.log(`   Images checked: ${imagesToCheck.length}`);
            console.log(`   Real photos: ${realPhotoCount} | Text graphics: ${textGraphicCount}`);
            console.log(`   🎯 Result: ALL images are text graphics → REJECTED`);
            visionResults.forEach((result, idx) => {
              console.log(`      Image ${idx + 1}: ${result.isReal ? '✅ Real photo' : '❌ Text graphic'}${result.reason ? ` (${result.reason})` : ''}`);
            });
            console.log(`   ✅ Skipped before translation (saved API credits)\n`);
            
            // Update progress
            if (callbacks?.onProgress) {
              callbacks.onProgress({
                totalPosts,
                processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                createdArticles: createdCount,
                skippedNotNews,
              });
            }
            continue;
          } else if (imagesToCheck.length > 1) {
            // Multi-image post with at least one real photo - log acceptance
            console.log(`   ✅ ACCEPTED: ${realPhotoCount} real photo(s) found`);
            visionResults.forEach((result, idx) => {
              console.log(`      Image ${idx + 1}: ${result.isReal ? '✅ Real photo' : '❌ Text graphic'}`);
            });
            console.log('');
          } else {
            // Single image, it's a real photo
            console.log(`   ✅ ACCEPTED: Real photo detected\n`);
          }
        }
        
        // STEP 1: Extract entities from Thai title (before translation - saves money!)
        let extractedEntities: ExtractedEntities | undefined;
        let foundEntityDuplicate = false;
        
        try {
          extractedEntities = await entityExtractionService.extractEntities(post.title);
          
          // STEP 1.5: Check for entity-based duplicates (catches same story from different sources)
          // This is MUCH better at catching rewrites of the same event than semantic similarity alone
          // Only check against recent articles (last 100) to avoid O(N²) performance issues
          const recentArticles = existingEmbeddings.slice(0, 100);
          
          for (const existing of recentArticles) {
            // Get stored entities (may be null for old articles without entities)
            const existingEntities = (existing as any).entities as ExtractedEntities | null;
            if (!existingEntities) continue; // Skip old articles without entities
            
            // Compare entities
            const entityMatch = entityExtractionService.compareEntities(extractedEntities, existingEntities);
            
            // If entity match score >= 50, it's likely the same story
            // This catches: same crime + same location + same organization
            if (entityMatch.score >= 50) {
              skippedSemanticDuplicates++;
              foundEntityDuplicate = true;
              console.log(`\n🚫 DUPLICATE DETECTED - Method: ENTITY MATCHING (${entityMatch.score}% match)`);
              console.log(`   New title: ${post.title.substring(0, 60)}...`);
              console.log(`   Existing: ${existing.title.substring(0, 60)}...`);
              console.log(`   📊 Entity matches:`);
              console.log(`      - Locations: ${entityMatch.matchedLocations}`);
              console.log(`      - Crime types: ${entityMatch.matchedCrimeTypes}`);
              console.log(`      - Organizations: ${entityMatch.matchedOrganizations}`);
              console.log(`      - People: ${entityMatch.matchedPeople}`);
              console.log(`   ✅ Skipped before translation (saved API credits)\n`);
              
              // Update progress
              if (callbacks?.onProgress) {
                callbacks.onProgress({
                  totalPosts,
                  processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                  createdArticles: createdCount,
                  skippedNotNews,
                });
              }
              break; // Found duplicate, no need to check more
            }
          }
          
          // If we found entity duplicate, skip this post
          if (foundEntityDuplicate) {
            continue;
          }
        } catch (entityError) {
          console.error(`Error extracting entities, proceeding without entity check:`, entityError);
          // Continue without entity check if extraction fails
        }
        
        // STEP 2: Generate embedding from Thai title (before translation - saves money!)
        let titleEmbedding: number[] | undefined;
        try {
          titleEmbedding = await translatorService.generateEmbeddingFromTitle(post.title);
          
          // STEP 2.5: Check for semantic duplicates (45% threshold for entity-matched articles, 65% for others)
          // If we have strong entity matches, we can use a lower semantic threshold
          const semanticThreshold = extractedEntities && 
            (extractedEntities.crimeTypes.length > 0 || extractedEntities.locations.length > 0) 
            ? 0.45  // Lower threshold when we have entity context
            : 0.65; // Higher threshold when no entities extracted
          
          const duplicateCheck = checkSemanticDuplicate(titleEmbedding, existingEmbeddings, semanticThreshold);
          
          if (duplicateCheck.isDuplicate) {
            skippedSemanticDuplicates++;
            console.log(`\n🚫 DUPLICATE DETECTED - Method: SEMANTIC SIMILARITY (${(duplicateCheck.similarity * 100).toFixed(1)}% match, threshold: ${(semanticThreshold * 100)}%)`);
            console.log(`   New title: ${post.title.substring(0, 60)}...`);
            console.log(`   Existing: ${duplicateCheck.matchedArticleTitle?.substring(0, 60)}...`);
            console.log(`   ✅ Skipped before translation (saved API credits)\n`);
            
            // Update progress
            if (callbacks?.onProgress) {
              callbacks.onProgress({
                totalPosts,
                processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                createdArticles: createdCount,
                skippedNotNews,
              });
            }
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

        // STEP 4: Classify event type and severity using GPT-5 nano (ultra-cheap!)
        const classification = await classificationService.classifyArticle(
          translation.translatedTitle,
          translation.excerpt
        );

        // STEP 5: Only create article if it's actual news
        if (translation.isActualNews) {
          // STEP 5.5: Check interest score for auto-publish decision
          // Only auto-publish stories with interest score >= 4 (important/urgent news)
          // Lower-scored stories are saved as drafts for review
          const shouldAutoPublish = translation.interestScore >= 4;
          
          if (!shouldAutoPublish) {
            console.log(`   📋 Low interest score (${translation.interestScore}/5) - saving as DRAFT for review`);
          } else {
            console.log(`   ✅ High interest score (${translation.interestScore}/5) - AUTO-PUBLISHING`);
          }
          
          let article;
          try {
            // Create article - auto-publish only if interest score >= 4
            article = await storage.createArticle({
              title: translation.translatedTitle,
              content: translation.translatedContent,
              excerpt: translation.excerpt,
              imageUrl: post.imageUrl || null,
              imageUrls: post.imageUrls || null,
              category: translation.category,
              sourceUrl: post.sourceUrl,
              facebookPostId: null, // Will be set after posting to Phuket Radar Facebook page
              author: translation.author,
              isPublished: shouldAutoPublish, // Only auto-publish high-interest stories (score >= 4)
              originalLanguage: "th",
              translatedBy: "openai",
              embedding: translation.embedding,
              eventType: classification.eventType,
              severity: classification.severity,
              interestScore: translation.interestScore,
              entities: extractedEntities as any, // Store extracted entities for future duplicate detection
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
          
          console.log(`✅ ${article.isPublished ? 'Created and published' : 'Created as draft'}: ${translation.translatedTitle.substring(0, 50)}...`);

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
        
        // Update progress after each post
        if (callbacks?.onProgress) {
          callbacks.onProgress({
            totalPosts,
            processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
            createdArticles: createdCount,
            skippedNotNews,
          });
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
