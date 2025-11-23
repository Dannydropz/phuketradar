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
import { checkSemanticDuplicate, getTopSimilarArticles } from "./lib/semantic-similarity";
import { getEnabledSources } from "./config/news-sources";
import { postArticleToFacebook } from "./lib/facebook-service";
import { postArticleToInstagram } from "./lib/instagram-service";
import { postArticleToThreads } from "./lib/threads-service";
import { entityExtractionService, type ExtractedEntities } from "./services/entity-extraction";
import { imageHashService } from "./services/image-hash";
import { imageAnalysisService } from "./services/image-analysis";
import { DuplicateVerifierService } from "./services/duplicate-verifier";
import { imageDownloaderService } from "./services/image-downloader";
import type { InsertArticle } from "@shared/schema";

// Optional callback for progress updates (used by admin UI)
export interface ScrapeProgressCallback {
  onProgress?: (stats: {
    totalPosts: number;
    processedPosts: number;
    createdArticles: number;
    skippedNotNews: number;
  }) => void;
}

// Skip reason tracking for detailed debugging
interface SkipReason {
  reason: string;
  postTitle: string;
  sourceUrl: string;
  facebookPostId?: string;
  details?: string;
}

// Timeout wrapper to prevent posts from hanging indefinitely
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

// Helper to yield control to the event loop (prevents blocking)
async function yieldToEventLoop(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

export async function runScheduledScrape(callbacks?: ScrapeProgressCallback) {
  const timestamp = new Date().toISOString();
  console.log("\n".repeat(3) + "=".repeat(80));
  console.log("🚨 SCRAPE TRIGGERED 🚨");
  console.log(`Time: ${timestamp}`);
  console.log(`Trigger: AUTOMATED CRON SCHEDULE (every 4 hours)`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log("=".repeat(80) + "\n");

  // Get batch size from environment (default: 12 posts per scrape - balanced for coverage + stability)
  const BATCH_SIZE = parseInt(process.env.SCRAPE_BATCH_SIZE || "12");
  console.log(`📦 Batch mode: Processing max ${BATCH_SIZE} posts per scrape to prevent server blocking`);

  try {
    const sources = getEnabledSources();
    console.log(`Scraping ${sources.length} Facebook news sources`);

    // Fetch all journalists for random assignment
    const journalists = await storage.getAllJournalists();
    console.log(`Loaded ${journalists.length} journalists for article attribution`);

    // Helper function to randomly select a journalist
    const getRandomJournalist = () => {
      return journalists[Math.floor(Math.random() * journalists.length)];
    };

    // Create duplicate checker function that stops pagination early to save API credits
    const checkForDuplicate = async (sourceUrl: string) => {
      const existing = await storage.getArticleBySourceUrl(sourceUrl);
      return !!existing;
    };

    // Get all existing article embeddings for semantic duplicate detection
    const existingEmbeddings = await storage.getArticlesWithEmbeddings();
    console.log(`Loaded ${existingEmbeddings.length} existing article embeddings`);

    // Get all existing article image hashes for visual duplicate detection
    const existingImageHashes = await storage.getArticlesWithImageHashes();
    console.log(`Loaded ${existingImageHashes.length} existing article image hashes`);

    // Initialize GPT duplicate verifier for borderline cases
    const duplicateVerifier = new DuplicateVerifierService();
    console.log(`🧠 GPT duplicate verifier initialized (for 70-85% similarity cases)`);

    // CLEANUP: Clear stuck Facebook posting locks before starting scrape
    console.log(`\n🔧 Checking for stuck Facebook posting locks...`);
    const stuckLocks = await storage.getArticlesWithStuckLocks();
    if (stuckLocks.length > 0) {
      console.warn(`⚠️  Found ${stuckLocks.length} articles with stuck LOCK tokens`);
      for (const article of stuckLocks) {
        console.warn(`   - Article ID: ${article.id}`);
        console.warn(`     Title: ${article.title.substring(0, 60)}...`);
        console.warn(`     Lock token: ${article.facebookPostId}`);
        await storage.clearStuckFacebookLock(article.id);
      }
      console.log(`✅ Cleared ${stuckLocks.length} stuck locks - these articles will retry Facebook posting`);
    } else {
      console.log(`✅ No stuck locks found`);
    }
    console.log();

    let totalPosts = 0;
    let createdCount = 0;
    let publishedCount = 0;
    let skippedNotNews = 0;
    let skippedSemanticDuplicates = 0;

    // Detailed skip reason tracking for debugging
    const skipReasons: SkipReason[] = [];

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

      // CRITICAL FIX: Deduplicate by sourceUrl in case Apify returns the same post twice
      // This was causing the same Facebook post to be published twice with different translations
      const seenUrls = new Set<string>();
      const uniquePosts = scrapedPosts.filter(post => {
        if (seenUrls.has(post.sourceUrl)) {
          console.log(`🔁 DUPLICATE POST IN BATCH - Skipping: ${post.sourceUrl.substring(0, 80)}...`);
          return false;
        }
        seenUrls.add(post.sourceUrl);
        return true;
      });

      if (uniquePosts.length < scrapedPosts.length) {
        console.log(`⚠️  Removed ${scrapedPosts.length - uniquePosts.length} duplicate URLs from scraper response`);
      }

      console.log(`${source.name}: Found ${uniquePosts.length} unique NEW posts`);

      // Limit posts to batch size to prevent event loop blocking
      const postsToProcess = uniquePosts.slice(0, BATCH_SIZE);
      if (uniquePosts.length > BATCH_SIZE) {
        console.log(`   ⚠️  Limited to ${BATCH_SIZE} posts (${uniquePosts.length - BATCH_SIZE} posts deferred to next scrape)`);
      }

      totalPosts += postsToProcess.length;

      // Process each scraped post from this source
      for (let postIndex = 0; postIndex < postsToProcess.length; postIndex++) {
        const post = postsToProcess[postIndex];
        try {
          // Wrap entire post processing in timeout to prevent indefinite stalls (2 minutes max)
          await withTimeout(
            (async () => {
              // STEP -4: Skip posts with no images (only publish posts with 1+ photos)
              const hasImages = (post.imageUrls && post.imageUrls.length > 0) || post.imageUrl;
              if (!hasImages) {
                skippedNotNews++;
                skipReasons.push({
                  reason: "No images",
                  postTitle: post.title.substring(0, 60),
                  sourceUrl: post.sourceUrl,
                  facebookPostId: post.facebookPostId,
                  details: "Posts must have at least 1 image"
                });
                console.log(`\n⏭️  SKIPPED - NO IMAGES (only posts with photos are published)`);
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
                return;
              }

              // STEP -3: Skip Facebook "colored background text posts" (reliable filtering via API field)
              // These posts have text_format_preset_id set when using Facebook's colored backgrounds
              if (post.textFormatPresetId) {
                skippedNotNews++;
                skipReasons.push({
                  reason: "Colored background text",
                  postTitle: post.title.substring(0, 60),
                  sourceUrl: post.sourceUrl,
                  facebookPostId: post.facebookPostId,
                  details: `Preset ID: ${post.textFormatPresetId}`
                });
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
                return;
              }

              // STEP -2: Check if this source Facebook post ID already exists in database (fastest and most reliable check)
              if (post.facebookPostId) {
                const existingByPostId = await storage.getArticleBySourceFacebookPostId(post.facebookPostId);
                if (existingByPostId) {
                  skippedSemanticDuplicates++;
                  skipReasons.push({
                    reason: "Duplicate: Source Facebook Post ID",
                    postTitle: post.title.substring(0, 60),
                    sourceUrl: post.sourceUrl,
                    facebookPostId: post.facebookPostId,
                    details: `Post ID: ${post.facebookPostId}`
                  });
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
                  return;
                }
              }

              // STEP -1: Check if this source URL already exists in database (fast check before expensive API calls)
              const existingBySourceUrl = await storage.getArticleBySourceUrl(post.sourceUrl);
              if (existingBySourceUrl) {
                skippedSemanticDuplicates++;
                skipReasons.push({
                  reason: "Duplicate: Source URL",
                  postTitle: post.title.substring(0, 60),
                  sourceUrl: post.sourceUrl,
                  facebookPostId: post.facebookPostId,
                  details: `URL: ${post.sourceUrl}`
                });
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
                return;
              }

              // STEP 0: Check for image URL duplicate (same image = same story)
              // Check ALL images in the array, not just the primary one
              if (post.imageUrls && post.imageUrls.length > 0) {
                let foundDuplicate = false;
                for (const imageUrl of post.imageUrls) {
                  const existingImageArticle = await storage.getArticleByImageUrl(imageUrl);
                  if (existingImageArticle) {
                    skippedSemanticDuplicates++;
                    skipReasons.push({
                      reason: "Duplicate: Image URL",
                      postTitle: post.title.substring(0, 60),
                      sourceUrl: post.sourceUrl,
                      facebookPostId: post.facebookPostId,
                      details: `Matching image: ${imageUrl.substring(0, 80)}`
                    });
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
                  return;
                }
              } else if (post.imageUrl) {
                // Fallback for posts without imageUrls array
                const existingImageArticle = await storage.getArticleByImageUrl(post.imageUrl);
                if (existingImageArticle) {
                  skippedSemanticDuplicates++;
                  skipReasons.push({
                    reason: "Duplicate: Image URL",
                    postTitle: post.title.substring(0, 60),
                    sourceUrl: post.sourceUrl,
                    facebookPostId: post.facebookPostId,
                    details: `Matching image: ${post.imageUrl}`
                  });
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
                  return;
                }
              }

              // STEP 0.25: Perceptual image hash duplicate detection - DISABLED
              // REASON: Threshold of 5 was causing too many false positives
              // Example: Drug bust story matched to tunnel advocacy story (completely different events)
              // The AI semantic similarity check is more accurate for detecting duplicate stories
              // Keeping exact image URL check above, which is reliable and precise

              // Generate image hash for storage (for future use) but don't use it for filtering
              const primaryImageUrl = post.imageUrl || (post.imageUrls && post.imageUrls[0]);
              let imageHash: string | undefined;

              if (primaryImageUrl) {
                try {
                  imageHash = await imageHashService.generatePerceptualHash(primaryImageUrl);
                  // Hash generated successfully - will be stored with article for future use
                } catch (hashError) {
                  // Hash generation failed - continue without it
                }
              }

              // STEP 0.3: Smart image quality filtering
              // Multi-stage: file size check → color analysis → vision API (only if ambiguous)
              // Gracefully handles download failures - accepts posts when images can't be fetched

              const imagesToCheck = post.imageUrls || (post.imageUrl ? [post.imageUrl] : []);

              if (imagesToCheck.length > 0) {
                console.log(`\n📸 IMAGE QUALITY CHECK: Analyzing ${imagesToCheck.length} image(s)...`);

                const batchResult = await imageAnalysisService.analyzeMultipleImages(imagesToCheck);

                // Log each image result with detailed breakdown
                const realPhotoCount = batchResult.results.filter(r => r.analysis.status === 'real_photo').length;
                const textGraphicCount = batchResult.results.filter(r => r.analysis.status === 'solid_background' && r.analysis.confidence === 'high').length;
                const uncertainCount = batchResult.results.length - realPhotoCount - textGraphicCount;

                batchResult.results.forEach((result, idx) => {
                  const { analysis } = result;
                  const icon = analysis.status === 'solid_background' ? '❌' :
                    analysis.status === 'real_photo' ? '✅' : '⚠️';
                  console.log(`   Image ${idx + 1}/${imagesToCheck.length}: ${icon} ${analysis.status} (${analysis.confidence} confidence)`);
                  console.log(`      ${analysis.reason}`);
                  console.log(`      URL: ${result.url.substring(0, 100)}${result.url.length > 100 ? '...' : ''}`);
                  if (analysis.metadata?.fileSize) {
                    console.log(`      File size: ${Math.round(analysis.metadata.fileSize / 1024)}KB`);
                  }
                  if (analysis.metadata?.dominancePercentage) {
                    console.log(`      Color dominance: ${analysis.metadata.dominancePercentage.toFixed(1)}%`);
                  }
                });

                console.log(`\n   📊 SUMMARY: ${realPhotoCount} real photos, ${textGraphicCount} text graphics, ${uncertainCount} uncertain`);

                // Extra logging for multi-image posts with multiple real photos
                if (batchResult.multipleRealPhotos) {
                  console.log(`   🌟 HIGH QUALITY: Post has ${realPhotoCount} real photos - strong accept signal!`);
                }

                // Reject ONLY if ALL images are confirmed text graphics with high confidence
                if (batchResult.allTextGraphics) {
                  skippedNotNews++;
                  skipReasons.push({
                    reason: "Text graphic (multi-stage analysis)",
                    postTitle: post.title.substring(0, 60),
                    sourceUrl: post.sourceUrl,
                    facebookPostId: post.facebookPostId,
                    details: `All ${imagesToCheck.length} image(s) are text graphics (small + solid color)`
                  });

                  console.log(`\n⏭️  SKIPPED - TEXT GRAPHIC POST (all images are text-on-background)`);
                  console.log(`   Title: ${post.title.substring(0, 60)}...`);
                  console.log(`   Images analyzed: ${imagesToCheck.length}`);
                  console.log(`   🎯 Result: ALL images confirmed as text graphics → REJECTED\n`);

                  // Update progress
                  if (callbacks?.onProgress) {
                    callbacks.onProgress({
                      totalPosts,
                      processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                      createdArticles: createdCount,
                      skippedNotNews,
                    });
                  }
                  return;
                } else if (batchResult.anyRealPhotos) {
                  console.log(`   ✅ ACCEPTED: At least one real photo detected\n`);
                } else {
                  // Ambiguous case - accept by default
                  console.log(`   ⚠️  ACCEPTED: Uncertain analysis, erring on side of inclusion\n`);
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
                  if (!existingEntities) return; // Skip old articles without entities

                  // Compare entities
                  const entityMatch = entityExtractionService.compareEntities(extractedEntities, existingEntities);

                  // If entity match score >= 60, it's likely the same story
                  // This catches: same crime + same location + same organization
                  if (entityMatch.score >= 60) {
                    skippedSemanticDuplicates++;
                    foundEntityDuplicate = true;
                    skipReasons.push({
                      reason: "Duplicate: Entity match",
                      postTitle: post.title.substring(0, 60),
                      sourceUrl: post.sourceUrl,
                      facebookPostId: post.facebookPostId,
                      details: `Score: ${entityMatch.score}%`
                    });
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
                  return;
                }
              } catch (entityError) {
                console.error(`Error extracting entities, proceeding without entity check:`, entityError);
                // Continue without entity check if extraction fails
              }

              // STEP 2: Generate embedding from FULL Thai content (title + body) - catches duplicates with different headlines
              let contentEmbedding: number[] | undefined;
              try {
                contentEmbedding = await translatorService.generateEmbeddingFromContent(post.title, post.content);

                // STEP 2.5: Hybrid semantic duplicate detection (Option D)
                // Stage 1: Fast embedding similarity check (50% threshold) - much lower to catch more potential duplicates
                // Stage 2: GPT verification for ANY similarity ≥50%
                // Stage 3: Safety net - GPT checks top 5 similar stories even if <50%
                const initialThreshold = 0.50; // Lowered from 70% to catch duplicates with different wording

                const duplicateCheck = checkSemanticDuplicate(contentEmbedding, existingEmbeddings, initialThreshold);

                if (duplicateCheck.isDuplicate) {
                  const similarityPercent = duplicateCheck.similarity * 100;

                  // Safety check: If matched article ID is missing, skip (shouldn't happen but be safe)
                  if (!duplicateCheck.matchedArticleId || !duplicateCheck.matchedArticleTitle) {
                    console.log(`⚠️  Warning: Embedding matched but no article ID/title - skipping for safety`);
                    skippedSemanticDuplicates++;
                    skipReasons.push({
                      reason: "Duplicate: Semantic match without article details",
                      postTitle: post.title.substring(0, 60),
                      sourceUrl: post.sourceUrl,
                      facebookPostId: post.facebookPostId,
                      details: `Similarity: ${similarityPercent.toFixed(1)}% (safety skip)`
                    });

                    if (callbacks?.onProgress) {
                      callbacks.onProgress({
                        totalPosts,
                        processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                        createdArticles: createdCount,
                        skippedNotNews,
                      });
                    }
                    return;
                  }

                  // If similarity is >=85%, it's an obvious duplicate - skip immediately
                  if (duplicateCheck.similarity >= 0.85) {
                    skippedSemanticDuplicates++;
                    skipReasons.push({
                      reason: "Duplicate: High semantic similarity (full content)",
                      postTitle: post.title.substring(0, 60),
                      sourceUrl: post.sourceUrl,
                      facebookPostId: post.facebookPostId,
                      details: `Similarity: ${similarityPercent.toFixed(1)}% (obvious duplicate)`
                    });
                    console.log(`\n🚫 DUPLICATE DETECTED - Method: FULL CONTENT EMBEDDING (${similarityPercent.toFixed(1)}%)`);
                    console.log(`   New title: ${post.title.substring(0, 60)}...`);
                    console.log(`   Existing: ${duplicateCheck.matchedArticleTitle.substring(0, 60)}...`);
                    console.log(`   ✅ Skipped before translation (saved API credits)\n`);

                    if (callbacks?.onProgress) {
                      callbacks.onProgress({
                        totalPosts,
                        processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                        createdArticles: createdCount,
                        skippedNotNews,
                      });
                    }
                    return;
                  }

                  // If similarity is ≥50%, use GPT to verify (lowered from 70-85% to catch more duplicates)
                  // This catches duplicates with different headlines but similar content
                  console.log(`\n🤔 POTENTIAL DUPLICATE DETECTED (${similarityPercent.toFixed(1)}%) - Using GPT to analyze full content...`);
                  console.log(`   New title: ${post.title.substring(0, 60)}...`);
                  console.log(`   Existing: ${duplicateCheck.matchedArticleTitle.substring(0, 60)}...`);

                  const gptVerification = await duplicateVerifier.verifyDuplicate(
                    post.title,
                    post.content, // Full scraped content
                    duplicateCheck.matchedArticleTitle,
                    duplicateCheck.matchedArticleContent || "", // Full existing article content
                    duplicateCheck.similarity
                  );

                  console.log(`\n🧠 GPT VERIFICATION RESULT:`);
                  console.log(`   Decision: ${gptVerification.isDuplicate ? '❌ DUPLICATE' : '✅ NOT DUPLICATE'}`);
                  console.log(`   Confidence: ${(gptVerification.confidence * 100).toFixed(0)}%`);
                  console.log(`   Reasoning: ${gptVerification.reasoning}`);
                  console.log(`\n   New Story Analysis:`);
                  console.log(`      Event: ${gptVerification.newStoryAnalysis.eventType}`);
                  console.log(`      Location: ${gptVerification.newStoryAnalysis.location.join(', ') || 'N/A'}`);
                  console.log(`      People: ${gptVerification.newStoryAnalysis.people.join(', ') || 'N/A'}`);
                  console.log(`      Timing: ${gptVerification.newStoryAnalysis.timing}`);
                  console.log(`      Facts: ${gptVerification.newStoryAnalysis.coreFacts.join('; ')}`);
                  console.log(`\n   Existing Story Analysis:`);
                  console.log(`      Event: ${gptVerification.existingStoryAnalysis.eventType}`);
                  console.log(`      Location: ${gptVerification.existingStoryAnalysis.location.join(', ') || 'N/A'}`);
                  console.log(`      People: ${gptVerification.existingStoryAnalysis.people.join(', ') || 'N/A'}`);
                  console.log(`      Timing: ${gptVerification.existingStoryAnalysis.timing}`);
                  console.log(`      Facts: ${gptVerification.existingStoryAnalysis.coreFacts.join('; ')}\n`);

                  if (gptVerification.isDuplicate) {
                    skippedSemanticDuplicates++;
                    skipReasons.push({
                      reason: "Duplicate: GPT-verified same event",
                      postTitle: post.title.substring(0, 60),
                      sourceUrl: post.sourceUrl,
                      facebookPostId: post.facebookPostId,
                      details: `Embedding: ${similarityPercent.toFixed(1)}%, GPT confidence: ${(gptVerification.confidence * 100).toFixed(0)}%`
                    });
                    console.log(`🚫 CONFIRMED DUPLICATE by GPT - Same event with different framing`);
                    console.log(`   ✅ Skipped before translation (saved API credits)\n`);

                    if (callbacks?.onProgress) {
                      callbacks.onProgress({
                        totalPosts,
                        processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                        createdArticles: createdCount,
                        skippedNotNews,
                      });
                    }
                    return;
                  } else {
                    console.log(`✅ NOT A DUPLICATE - GPT determined these are different events`);
                    console.log(`   Proceeding with translation...\n`);
                    // Fall through to translation
                  }
                } else {
                  // Similarity is <50% - run SAFETY NET
                  // Check top 5 most similar articles with GPT to catch edge cases
                  // where embeddings don't capture semantic similarity well
                  console.log(`\n🛡️ SAFETY NET: Similarity below 50% (${(duplicateCheck.similarity * 100).toFixed(1)}%) - Checking top 5 similar stories...`);

                  const topSimilar = getTopSimilarArticles(contentEmbedding, existingEmbeddings, 5);

                  if (topSimilar.length > 0) {
                    console.log(`   Found ${topSimilar.length} stories to check`);

                    // Check each of the top 5 with GPT
                    let duplicateFoundInSafetyNet = false;
                    for (const similar of topSimilar) {
                      const simPercent = (similar.similarity * 100).toFixed(1);
                      console.log(`   Checking against story with ${simPercent}% similarity...`);

                      const safetyVerification = await duplicateVerifier.verifyDuplicate(
                        post.title,
                        post.content,
                        similar.title,
                        similar.content,
                        similar.similarity
                      );

                      if (safetyVerification.isDuplicate) {
                        skippedSemanticDuplicates++;
                        skipReasons.push({
                          reason: "Duplicate: Caught by safety net (GPT verification)",
                          postTitle: post.title.substring(0, 60),
                          sourceUrl: post.sourceUrl,
                          facebookPostId: post.facebookPostId,
                          details: `Embedding: ${simPercent}%, GPT confidence: ${(safetyVerification.confidence * 100).toFixed(0)}%`
                        });
                        console.log(`\n🚫 DUPLICATE CAUGHT BY SAFETY NET!`);
                        console.log(`   GPT confidence: ${(safetyVerification.confidence * 100).toFixed(0)}%`);
                        console.log(`   Reasoning: ${safetyVerification.reasoning}`);
                        console.log(`   ✅ Skipped before translation (saved API credits)\n`);

                        if (callbacks?.onProgress) {
                          callbacks.onProgress({
                            totalPosts,
                            processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                            createdArticles: createdCount,
                            skippedNotNews,
                          });
                        }

                        duplicateFoundInSafetyNet = true;
                        break;
                      }
                    }

                    if (duplicateFoundInSafetyNet) {
                      return; // Skip this post, duplicate found by safety net
                    }

                    console.log(`   ✅ Safety net passed - not a duplicate of top similar stories`);
                  }
                }
              } catch (embeddingError) {
                console.error(`Error generating embedding, proceeding without semantic check:`, embeddingError);
                // Continue without semantic duplicate check if embedding fails
              }

              // STEP 3: Translate and rewrite (pass precomputed embedding from full Thai content)
              let translation;
              try {
                translation = await translatorService.translateAndRewrite(
                  post.title,
                  post.content,
                  contentEmbedding // Pass precomputed full content embedding to be stored
                );
              } catch (translationError) {
                // Translation failed - skip this post entirely (do NOT publish Thai text)
                console.error(`\n❌ TRANSLATION FAILED - Skipping post`);
                console.error(`   Title: ${post.title.substring(0, 60)}...`);
                console.error(`   Error: ${translationError}`);
                console.error(`   ✅ Post skipped (prevents publishing untranslated Thai content)\n`);

                skippedNotNews++;
                skipReasons.push({
                  reason: "Translation service error",
                  postTitle: post.title.substring(0, 60),
                  sourceUrl: post.sourceUrl,
                  facebookPostId: post.facebookPostId,
                  details: `Translation API failed - post skipped to prevent Thai text from being published`
                });

                if (callbacks?.onProgress) {
                  callbacks.onProgress({
                    totalPosts,
                    processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                    createdArticles: createdCount,
                    skippedNotNews,
                  });
                }

                return; // Skip this post entirely
              }

              // STEP 4: Classify event type and severity using GPT-4o-mini
              const classification = await classificationService.classifyArticle(
                translation.translatedTitle,
                translation.excerpt
              );

              // STEP 5: Only create article if it's actual news
              if (translation.isActualNews) {
                // STEP 5.5: Check interest score for auto-publish decision
                // Auto-publish stories with interest score >= 3 (moderate interest and above)
                // Lower-scored stories (1-2) are saved as drafts for review
                const shouldAutoPublish = translation.interestScore >= 3;

                if (!shouldAutoPublish) {
                  skipReasons.push({
                    reason: "Low interest (draft)",
                    postTitle: post.title.substring(0, 60),
                    sourceUrl: post.sourceUrl,
                    facebookPostId: post.facebookPostId,
                    details: `Score: ${translation.interestScore}/5`
                  });
                }

                let article;
                try {
                  // Randomly assign a journalist to this article
                  const assignedJournalist = getRandomJournalist();

                  // NEW: Download images locally to prevent expiration
                  let localImageUrl = post.imageUrl;
                  let localImageUrls = post.imageUrls;

                  try {
                    // Download primary image
                    if (post.imageUrl) {
                      console.log(`⬇️  Downloading primary image: ${post.imageUrl.substring(0, 60)}...`);
                      const savedPath = await imageDownloaderService.downloadAndSaveImage(post.imageUrl, "news");
                      if (savedPath) {
                        localImageUrl = savedPath;
                      } else {
                        console.warn(`⚠️  Failed to download primary image, keeping original URL`);
                      }
                    }

                    // Download additional images (if any)
                    if (post.imageUrls && post.imageUrls.length > 0) {
                      console.log(`⬇️  Downloading ${post.imageUrls.length} additional images...`);
                      const savedUrls: string[] = [];
                      for (const url of post.imageUrls) {
                        const savedPath = await imageDownloaderService.downloadAndSaveImage(url, "news-gallery");
                        if (savedPath) {
                          savedUrls.push(savedPath);
                        } else {
                          savedUrls.push(url); // Keep original if download fails
                        }
                      }
                      localImageUrls = savedUrls;
                    }
                  } catch (downloadError) {
                    console.error("❌ Error downloading images:", downloadError);
                    // Continue with original URLs if critical failure
                  }

                  // Log right before database write to track hangs
                  console.log(`💾 Attempting to save article to database...`);
                  console.log(`   Title: ${translation.translatedTitle.substring(0, 60)}...`);
                  console.log(`   Category: ${translation.category} | Interest: ${translation.interestScore}/5 | Will publish: ${shouldAutoPublish}`);

                  // Prepare article data for duplicate detection
                  const articleData: InsertArticle = {
                    title: translation.translatedTitle,
                    content: translation.translatedContent,
                    excerpt: translation.excerpt,
                    originalTitle: post.title, // Store Thai source title for duplicate detection
                    originalContent: post.content, // Store Thai source content for duplicate detection
                    facebookHeadline: translation.facebookHeadline, // Save high-CTR headline
                    imageUrl: localImageUrl || null,
                    imageUrls: localImageUrls || null,
                    imageHash: imageHash || null, // Store perceptual hash for duplicate detection
                    category: translation.category,
                    sourceUrl: post.sourceUrl,
                    sourceName: source.name, // Actual source name (e.g., "The Phuket Times", "Phuket Info Center")
                    sourceFacebookPostId: post.facebookPostId || null, // Source post ID for duplicate detection
                    facebookPostId: null, // OUR posting status - only set after posting to OUR Facebook page
                    journalistId: assignedJournalist.id, // Assign random journalist
                    isPublished: shouldAutoPublish, // Auto-publish moderate+ interest stories (score >= 3)
                    originalLanguage: "th",
                    translatedBy: "openai",
                    embedding: translation.embedding,
                    eventType: classification.eventType,
                    severity: classification.severity,
                    interestScore: translation.interestScore,
                    isDeveloping: translation.isDeveloping || false, // Story has limited details
                    entities: extractedEntities as any, // Store extracted entities for future duplicate detection
                  };

                  // STEP 5.7: Check for duplicates and merge if found (NEW Second Pass Enrichment System)
                  const { StoryEnrichmentCoordinator } = await import("./services/story-enrichment-coordinator");
                  const enrichmentCoordinator = new StoryEnrichmentCoordinator();

                  console.log(`🔍 Running duplicate detection and enrichment...`);
                  const enrichmentResult = await enrichmentCoordinator.processNewStory(articleData, storage);

                  if (enrichmentResult.action === 'merge') {
                    console.log(`🔄 MERGED: Story merged into existing article(s)`);
                    console.log(`   Reason: ${enrichmentResult.reason}`);
                    console.log(`   Merged with: ${enrichmentResult.mergedWith?.join(', ')}`);

                    skipReasons.push({
                      reason: "Merged with existing",
                      postTitle: post.title.substring(0, 60),
                      sourceUrl: post.sourceUrl,
                      facebookPostId: post.facebookPostId,
                      details: enrichmentResult.reason || 'Story merged into existing article'
                    });

                    // Skip creating a new article - it was merged into existing one
                    return;
                  }

                  // If enrichment returned modified article data, use it
                  const finalArticleData = enrichmentResult.article || articleData;

                  // Create article - auto-publish if interest score >= 3
                  article = await storage.createArticle(finalArticleData);

                  console.log(`✅ SUCCESS: Article created with ID: ${article.id}`);

                  if (article.isPublished) {
                    console.log(`   📰 HIGH INTEREST (${translation.interestScore}/5) - Article AUTO-PUBLISHED`);
                    publishedCount++;
                  } else {
                    console.log(`   📋 Low interest (${translation.interestScore}/5) - Article saved as DRAFT for review`);
                  }

                  createdCount++;
                } catch (createError: any) {
                  // Comprehensive error logging
                  console.error(`\n❌ ERROR: Failed to create article in database`);
                  console.error(`   Error Code: ${createError.code || 'UNKNOWN'}`);
                  console.error(`   Error Message: ${createError.message || 'No message'}`);
                  console.error(`   Error Name: ${createError.name || 'Unknown'}`);
                  console.error(`   Full Error:`, JSON.stringify(createError, null, 2));
                  console.error(`   Stack Trace:`, createError.stack);
                  console.error(`   Article Title: ${translation.translatedTitle.substring(0, 60)}...`);
                  console.error(`   Source URL: ${post.sourceUrl}`);

                  // Catch duplicate key violations (PostgreSQL error code 23505)
                  if (createError.code === '23505') {
                    console.log(`⚠️  Duplicate article caught by database constraint: ${post.sourceUrl}`);
                    console.log(`   Title: ${translation.translatedTitle.substring(0, 60)}...`);
                    return; // Skip Facebook posting and move to next post
                  } else {
                    // Log and re-throw other errors to prevent silent failures
                    console.error(`\n🚨 CRITICAL: Non-duplicate database error - re-throwing to stop scrape`);
                    throw createError;
                  }
                }

                // Add to existing image hashes so we can catch duplicates within this batch
                if (imageHash) {
                  existingImageHashes.push({
                    id: article.id,
                    title: translation.translatedTitle,
                    imageHash: imageHash,
                  });
                }

                // CRITICAL FIX: Add to existingEmbeddings so semantic similarity can catch duplicates within the same scrape
                if (contentEmbedding) {
                  existingEmbeddings.push({
                    id: article.id,
                    title: post.title, // Store original Thai title
                    content: post.content, // Store original full content (used for embeddings)
                    embedding: contentEmbedding,
                    entities: extractedEntities || null,
                  });
                }

                console.log(`✅ ${article.isPublished ? 'Created and published' : 'Created as draft'}: ${translation.translatedTitle.substring(0, 50)}...`);

                // Auto-post to Facebook after publishing (only for high-interest stories score >= 4)
                // Score 3 articles are published but NOT auto-posted to Facebook
                // Manually created articles are NEVER auto-posted regardless of interest score
                const hasImage = article.imageUrl || (article.imageUrls && article.imageUrls.length > 0);
                const isReallyPosted = article.facebookPostId && !article.facebookPostId.startsWith('LOCK:');
                const isStuckWithLock = article.facebookPostId && article.facebookPostId.startsWith('LOCK:');
                const shouldAutoPostToFacebook = article.isPublished &&
                  (article.interestScore ?? 0) >= 4 &&
                  !isReallyPosted &&
                  hasImage &&
                  !article.isManuallyCreated; // Don't auto-post manually created articles

                if (shouldAutoPostToFacebook) {
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
                } else if (article.isPublished && isStuckWithLock) {
                  console.warn(`⚠️  STUCK LOCK DETECTED - Article has lock token instead of real Facebook post ID`);
                  console.warn(`   Article ID: ${article.id}`);
                  console.warn(`   Title: ${article.title.substring(0, 60)}...`);
                  console.warn(`   Lock token: ${article.facebookPostId}`);
                  console.warn(`   This indicates a previous Facebook posting attempt failed without releasing the lock`);
                  console.warn(`   The lock should have been cleared, but will retry on next scrape`);
                } else if (article.isPublished && isReallyPosted) {
                  console.log(`⏭️  Already posted to Facebook: ${article.title.substring(0, 60)}...`);
                } else if (article.isPublished && !hasImage) {
                  console.log(`⏭️  Skipping Facebook post (no image): ${article.title.substring(0, 60)}...`);
                } else if (article.isPublished && (article.interestScore ?? 0) < 4) {
                  console.log(`⏭️  Skipping auto-post to Facebook (score ${article.interestScore}/5 - manual post available in admin): ${article.title.substring(0, 60)}...`);
                }

                /* DISABLED: Instagram and Threads Graph API not configured
                // Auto-post to Instagram after Facebook (only for high-interest stories score >= 4)
                // Manually created articles are NEVER auto-posted regardless of interest score
                const isReallyPostedToInstagram = article.instagramPostId && !article.instagramPostId.startsWith('IG-LOCK:');
                const isStuckWithInstagramLock = article.instagramPostId && article.instagramPostId.startsWith('IG-LOCK:');
                const shouldAutoPostToInstagram = article.isPublished &&
                  (article.interestScore ?? 0) >= 4 &&
                  !isReallyPostedToInstagram &&
                  hasImage &&
                  !article.isManuallyCreated; // Don't auto-post manually created articles

                if (shouldAutoPostToInstagram) {
                  try {
                    const igResult = await postArticleToInstagram(article, storage);
                    if (igResult) {
                      if (igResult.status === 'posted') {
                        console.log(`📸 Posted to Instagram: ${igResult.postUrl}`);
                      } else {
                        console.log(`ℹ️  Article already posted to Instagram: ${igResult.postUrl}`);
                      }
                    } else {
                      console.error(`❌ Failed to post to Instagram for ${article.title.substring(0, 60)}...`);
                    }
                  } catch (igError) {
                    console.error(`❌ Error posting to Instagram:`, igError);
                    // Don't fail the whole scrape if Instagram posting fails
                  }
                } else if (article.isPublished && isStuckWithInstagramLock) {
                  console.warn(`⚠️  STUCK INSTAGRAM LOCK DETECTED - Article has lock token instead of real Instagram post ID`);
                  console.warn(`   Article ID: ${article.id}`);
                  console.warn(`   Title: ${article.title.substring(0, 60)}...`);
                  console.warn(`   Lock token: ${article.instagramPostId}`);
                } else if (article.isPublished && isReallyPostedToInstagram) {
                  console.log(`⏭️  Already posted to Instagram: ${article.title.substring(0, 60)}...`);
                } else if (article.isPublished && (article.interestScore ?? 0) < 4) {
                  console.log(`⏭️  Skipping auto-post to Instagram (score ${article.interestScore}/5 - manual post available in admin): ${article.title.substring(0, 60)}...`);
                }

                // Auto-post to Threads after Instagram (only for high-interest stories score >= 4)
                // Manually created articles are NEVER auto-posted regardless of interest score
                const isReallyPostedToThreads = article.threadsPostId && !article.threadsPostId.startsWith('THREADS-LOCK:');
                const isStuckWithThreadsLock = article.threadsPostId && article.threadsPostId.startsWith('THREADS-LOCK:');
                const shouldAutoPostToThreads = article.isPublished &&
                  (article.interestScore ?? 0) >= 4 &&
                  !isReallyPostedToThreads &&
                  hasImage &&
                  !article.isManuallyCreated; // Don't auto-post manually created articles

                if (shouldAutoPostToThreads) {
                  try {
                    const threadsResult = await postArticleToThreads(article, storage);
                    if (threadsResult) {
                      if (threadsResult.status === 'posted') {
                        console.log(`🧵 Posted to Threads: ${threadsResult.postUrl}`);
                      } else {
                        console.log(`ℹ️  Article already posted to Threads: ${threadsResult.postUrl}`);
                      }
                    } else {
                      console.error(`❌ Failed to post to Threads for ${article.title.substring(0, 60)}...`);
                    }
                  } catch (threadsError) {
                    console.error(`❌ Error posting to Threads:`, threadsError);
                    // Don't fail the whole scrape if Threads posting fails
                  }
                } else if (article.isPublished && isStuckWithThreadsLock) {
                  console.warn(`⚠️  STUCK THREADS LOCK DETECTED - Article has lock token instead of real Threads post ID`);
                  console.warn(`   Article ID: ${article.id}`);
                  console.warn(`   Title: ${article.title.substring(0, 60)}...`);
                  console.warn(`   Lock token: ${article.threadsPostId}`);
                } else if (article.isPublished && isReallyPostedToThreads) {
                  console.log(`⏭️  Already posted to Threads: ${article.title.substring(0, 60)}...`);
                } else if (article.isPublished && (article.interestScore ?? 0) < 4) {
                  console.log(`⏭️  Skipping auto-post to Threads (score ${article.interestScore}/5 - manual post available in admin): ${article.title.substring(0, 60)}...`);
                }
                */
              } else {
                // Not classified as actual news - skip regardless of interest score
                const interestScore = translation.interestScore || 0;
                skippedNotNews++;
                skipReasons.push({
                  reason: "Not news (AI classified)",
                  postTitle: post.title.substring(0, 60),
                  sourceUrl: post.sourceUrl,
                  facebookPostId: post.facebookPostId,
                  details: `AI classified as non-news (score: ${interestScore}/5)`
                });
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
            })(), // End of async function - invoke immediately
            300000, // 5 minute timeout (increased from 2 min due to slow Neon queries)
            `Post processing timeout after 5 minutes: ${post.title.substring(0, 60)}...`
          ); // End of withTimeout
        } catch (error: any) {
          console.error("\n❌ CRITICAL ERROR processing post:");
          console.error(`   Post Title: ${post.title.substring(0, 60)}...`);
          console.error(`   Source URL: ${post.sourceUrl}`);
          console.error(`   Error: ${error.message || 'Unknown error'}`);
          console.error(`   Stack:`, error.stack);

          // Log timeout errors specifically
          if (error.message?.includes('timeout')) {
            console.error(`   ⏱️  POST TIMED OUT - Skipping and continuing to next post`);
            skipReasons.push({
              reason: "Processing timeout",
              postTitle: post.title.substring(0, 60),
              sourceUrl: post.sourceUrl,
              facebookPostId: post.facebookPostId,
              details: "Processing took longer than 2 minutes"
            });
          }

          // Continue to next post instead of stopping entire scrape
          continue;
        }

        // Yield to event loop every 3 posts to keep server responsive
        if ((postIndex + 1) % 3 === 0) {
          console.log(`   ⏸️  Yielding to event loop after ${postIndex + 1} posts (keeping server responsive)...`);
          await yieldToEventLoop();
        }

        // Small delay between posts to prevent overwhelming database (especially on Neon free tier)
        await new Promise(resolve => setTimeout(resolve, 500));
      } // End of posts loop
    } // End of sources loop

    // Print detailed summary with skip reason breakdown
    console.log("\n" + "━".repeat(80));
    console.log("📊 SCRAPE SUMMARY");
    console.log("━".repeat(80));
    console.log(`Total posts checked: ${totalPosts}`);
    console.log(`Articles created: ${createdCount} (${publishedCount} published, ${createdCount - publishedCount} drafts)`);
    console.log(`Posts skipped: ${skipReasons.length}`);

    if (skipReasons.length > 0) {
      // Group skip reasons by type and count them
      const reasonCounts = skipReasons.reduce((acc, skip) => {
        acc[skip.reason] = (acc[skip.reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log("\n" + "─".repeat(80));
      console.log("🚫 REJECTION BREAKDOWN:");
      console.log("─".repeat(80));

      // Sort by count (most common first)
      Object.entries(reasonCounts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([reason, count]) => {
          console.log(`  • ${reason}: ${count} post${count > 1 ? 's' : ''}`);
        });

      // Print detailed list of each rejection
      console.log("\n" + "─".repeat(80));
      console.log("📋 DETAILED REJECTION LOG:");
      console.log("─".repeat(80));

      skipReasons.forEach((skip, idx) => {
        console.log(`\n${idx + 1}. ${skip.reason}`);
        console.log(`   Title: ${skip.postTitle}...`);
        if (skip.facebookPostId) {
          console.log(`   FB Post ID: ${skip.facebookPostId}`);
        }
        console.log(`   Source: ${skip.sourceUrl}`);
        if (skip.details) {
          console.log(`   Details: ${skip.details}`);
        }
      });
    }

    console.log("\n" + "━".repeat(80));
    console.log("✅ SCRAPE COMPLETE");
    console.log("━".repeat(80) + "\n");

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
