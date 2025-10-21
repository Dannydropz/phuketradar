import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scraperService } from "./services/scraper";
import { translatorService } from "./services/translator";
import { PLACEHOLDER_IMAGE } from "./lib/placeholders";
import { insertArticleSchema } from "@shared/schema";
import { z } from "zod";
import { scrapeJobManager } from "./scrape-jobs";
import { checkSemanticDuplicate } from "./lib/semantic-similarity";
import { getEnabledSources } from "./config/news-sources";
import { postArticleToFacebook } from "./lib/facebook-service";

// Extend session type
declare module "express-session" {
  interface SessionData {
    isAdminAuthenticated?: boolean;
  }
}

// Auth middleware for admin session
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  console.log(`[AUTH CHECK] ${req.method} ${req.path} - Session auth: ${req.session.isAdminAuthenticated}`);
  if (req.session.isAdminAuthenticated) {
    console.log(`[AUTH CHECK] Authorized - proceeding`);
    return next();
  }
  console.log(`[AUTH CHECK] Unauthorized - blocking request`);
  return res.status(401).json({ error: "Unauthorized" });
}

// Auth middleware for external cron services (API key)
function requireCronAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const cronApiKey = process.env.CRON_API_KEY;

  if (!cronApiKey) {
    console.error(`[CRON AUTH] CRON_API_KEY not set in environment variables`);
    return res.status(500).json({ error: "Server configuration error" });
  }

  if (!authHeader) {
    console.log(`[CRON AUTH] No authorization header provided`);
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const providedKey = authHeader.replace(/^Bearer\s+/i, '');
  
  if (providedKey === cronApiKey) {
    console.log(`[CRON AUTH] Valid API key - authorized`);
    return next();
  }

  console.log(`[CRON AUTH] Invalid API key - unauthorized`);
  return res.status(401).json({ error: "Invalid API key" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Article routes
  
  // Get all published articles
  app.get("/api/articles", async (req, res) => {
    try {
      const articles = await storage.getPublishedArticles();
      res.json(articles);
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  // Get articles by category
  app.get("/api/articles/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const articles = await storage.getArticlesByCategory(category);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching articles by category:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  // Get single article by slug or ID
  app.get("/api/articles/:slugOrId", async (req, res) => {
    try {
      const { slugOrId } = req.params;
      
      // Try to find by slug first (preferred for SEO)
      let article = await storage.getArticleBySlug(slugOrId);
      
      // Fall back to ID lookup if not found by slug
      if (!article) {
        article = await storage.getArticleById(slugOrId);
      }
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      
      res.json(article);
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  // Cron service endpoint for external automated scraping
  // Protected by API key authentication (CRON_API_KEY environment variable)
  app.post("/api/cron/scrape", requireCronAuth, async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log("\n".repeat(3) + "=".repeat(80));
    console.log("🚨 SCRAPE TRIGGERED 🚨");
    console.log(`Time: ${timestamp}`);
    console.log(`Trigger: EXTERNAL CRON SERVICE (cron-job.org)`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log("=".repeat(80) + "\n");

    try {
      console.log("🔄 Starting scrape process...");
      // Import and run the scheduled scrape function directly
      const { runScheduledScrape } = await import("./scheduler");
      const { withSchedulerLock } = await import("./lib/scheduler-lock");
      
      // Use database lock to prevent duplicate runs
      const result = await withSchedulerLock(
        runScheduledScrape,
        () => {
          console.log(`⏭️  Skipping scrape - another scrape is already running`);
        }
      );

      if (result) {
        console.log("✅ Scrape completed successfully");
        console.log("Result:", JSON.stringify(result, null, 2));
        // Always return 200 OK for GitHub Actions (even with partial failures)
        res.json({
          success: true,
          message: "Scrape completed successfully",
          timestamp: timestamp,
          result: result,
        });
      } else {
        console.log("⏭️  Scrape skipped - another scrape was already running");
        // Always return 200 OK for GitHub Actions
        res.json({
          success: true,
          message: "Scrape skipped - another instance already running",
          timestamp: timestamp,
        });
      }
    } catch (error) {
      console.error("❌ Error during cron scrape:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      // Always return 200 OK for GitHub Actions (even on errors)
      // This prevents GitHub Actions from showing failure when articles were actually published
      res.json({
        success: false,
        message: "Scrape completed with errors",
        error: errorMessage,
        timestamp: timestamp,
      });
    }
  });

  // Admin routes

  // Admin authentication
  app.post("/api/admin/auth", async (req, res) => {
    try {
      const { password } = req.body;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!adminPassword) {
        console.error("ADMIN_PASSWORD not set in environment variables");
        return res.status(500).json({ error: "Server configuration error" });
      }

      if (password === adminPassword) {
        req.session.isAdminAuthenticated = true;
        return res.json({ success: true });
      }

      return res.status(401).json({ error: "Invalid password" });
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // Admin logout
  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Get all articles (including unpublished) - PROTECTED
  app.get("/api/admin/articles", requireAdminAuth, async (req, res) => {
    try {
      const articles = await storage.getAllArticles();
      res.json(articles);
    } catch (error) {
      console.error("Error fetching all articles:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  // Get pending articles - PROTECTED
  app.get("/api/admin/articles/pending", requireAdminAuth, async (req, res) => {
    try {
      const articles = await storage.getPendingArticles();
      res.json(articles);
    } catch (error) {
      console.error("Error fetching pending articles:", error);
      res.status(500).json({ error: "Failed to fetch pending articles" });
    }
  });

  // Scrape and process articles - PROTECTED (async with job tracking)
  app.post("/api/admin/scrape", requireAdminAuth, async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log("\n".repeat(3) + "=".repeat(80));
    console.log("🚨 SCRAPE TRIGGERED 🚨");
    console.log(`Time: ${timestamp}`);
    console.log(`Trigger: MANUAL (Admin Dashboard)`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log("=".repeat(80) + "\n");
    
    // Create job and respond immediately
    const job = scrapeJobManager.createJob();
    console.log(`Created scrape job: ${job.id}`);
    
    res.json({
      success: true,
      jobId: job.id,
      message: "Scraping started in background",
    });
    
    // Process in background (no await)
    (async () => {
      try {
        scrapeJobManager.updateJob(job.id, { status: 'processing' });
        
        const sources = getEnabledSources();
        console.log(`[Job ${job.id}] Starting multi-source scrape of ${sources.length} Facebook pages`);
        
        // Create duplicate checker function that stops pagination early
        const checkForDuplicate = async (sourceUrl: string) => {
          const existing = await storage.getArticleBySourceUrl(sourceUrl);
          return !!existing;
        };
        
        // Get all existing article embeddings for semantic duplicate detection
        const existingEmbeddings = await storage.getArticlesWithEmbeddings();
        console.log(`[Job ${job.id}] Loaded ${existingEmbeddings.length} existing article embeddings`);
        
        let totalPosts = 0;
        let createdArticles = 0;
        let skippedNotNews = 0;
        let skippedSemanticDuplicates = 0;

        // Loop through each news source
        for (const source of sources) {
          console.log(`[Job ${job.id}] Scraping source: ${source.name}`);
          
          // Scrape with smart pagination that stops when hitting known posts
          const scrapedPosts = await scraperService.scrapeFacebookPageWithPagination(
            source.url, 
            1, // max pages to fetch (reduced from 3 to minimize API costs)
            checkForDuplicate // stop early if we hit known posts
          );
          
          console.log(`[Job ${job.id}] ${source.name}: Found ${scrapedPosts.length} NEW posts`);
          totalPosts += scrapedPosts.length;
          scrapeJobManager.updateProgress(job.id, { totalPosts });

        // Process each scraped post from this source
        for (const post of scrapedPosts) {
          try {
            console.log(`[Job ${job.id}] Processing post: ${post.title.substring(0, 50)}`);
            
            // STEP -1: Check if this source URL already exists in database (fast check before expensive API calls)
            const existingBySourceUrl = await storage.getArticleBySourceUrl(post.sourceUrl);
            if (existingBySourceUrl) {
              skippedSemanticDuplicates++;
              console.log(`[Job ${job.id}] 🔗 Source URL already exists in database - skipping`);
              console.log(`[Job ${job.id}]    URL: ${post.sourceUrl}`);
              console.log(`[Job ${job.id}]    Existing: ${existingBySourceUrl.title.substring(0, 60)}...`);
              
              scrapeJobManager.updateProgress(job.id, {
                processedPosts: createdArticles + skippedNotNews + skippedSemanticDuplicates,
                createdArticles,
                skippedNotNews,
              });
              continue;
            }
            
            // STEP 0: Check for image URL duplicate (same image = same story)
            if (post.imageUrl) {
              const existingImageArticle = await storage.getArticleByImageUrl(post.imageUrl);
              if (existingImageArticle) {
                skippedSemanticDuplicates++;
                console.log(`[Job ${job.id}] 🖼️ Image duplicate detected - same image already exists`);
                console.log(`[Job ${job.id}]    New: ${post.title.substring(0, 60)}...`);
                console.log(`[Job ${job.id}]    Existing: ${existingImageArticle.title.substring(0, 60)}...`);
                
                scrapeJobManager.updateProgress(job.id, {
                  processedPosts: createdArticles + skippedNotNews + skippedSemanticDuplicates,
                  createdArticles,
                  skippedNotNews,
                });
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
                console.log(`[Job ${job.id}] 🔄 Semantic duplicate detected (${(duplicateCheck.similarity * 100).toFixed(1)}% similar)`);
                console.log(`[Job ${job.id}]    New: ${post.title.substring(0, 60)}...`);
                console.log(`[Job ${job.id}]    Existing: ${duplicateCheck.matchedArticleTitle?.substring(0, 60)}...`);
                
                // Update progress and skip translation
                scrapeJobManager.updateProgress(job.id, {
                  processedPosts: createdArticles + skippedNotNews + skippedSemanticDuplicates,
                  createdArticles,
                  skippedNotNews,
                });
                continue;
              }
            } catch (embeddingError) {
              console.error(`[Job ${job.id}] Error generating embedding, proceeding without semantic check:`, embeddingError);
              // Continue without semantic duplicate check if embedding fails
            }
            
            // STEP 3: Translate and rewrite the content (pass precomputed Thai embedding)
            const translation = await translatorService.translateAndRewrite(
              post.title,
              post.content,
              titleEmbedding // Pass precomputed Thai embedding to be stored
            );

            console.log(`[Job ${job.id}] Is actual news: ${translation.isActualNews}`);
            
            // STEP 4: Only create article if it's actual news
            if (translation.isActualNews) {
              let article;
              try {
                article = await storage.createArticle({
                  title: translation.translatedTitle,
                  content: translation.translatedContent,
                  excerpt: translation.excerpt,
                  imageUrl: post.imageUrl || null,
                  category: translation.category,
                  sourceUrl: post.sourceUrl,
                  author: translation.author,
                  isPublished: true, // Auto-publish from admin scrape too
                  originalLanguage: "th",
                  translatedBy: "openai",
                  embedding: translation.embedding,
                });

                createdArticles++;
              } catch (createError: any) {
                // Catch duplicate key violations (PostgreSQL error code 23505)
                if (createError.code === '23505') {
                  console.log(`[Job ${job.id}] ⚠️  Duplicate article caught by database constraint: ${post.sourceUrl}`);
                  console.log(`[Job ${job.id}]    Title: ${translation.translatedTitle.substring(0, 60)}...`);
                  
                  // Update progress (count as processed but not created)
                  scrapeJobManager.updateProgress(job.id, {
                    processedPosts: createdArticles + skippedNotNews + skippedSemanticDuplicates,
                    createdArticles,
                    skippedNotNews,
                  });
                  continue; // Skip Facebook posting and move to next post
                } else {
                  // Re-throw other errors
                  throw createError;
                }
              }
              
              // Auto-post to Facebook after publishing (only if not already posted)
              if (article.isPublished && !article.facebookPostId && article.imageUrl) {
                try {
                  const fbResult = await postArticleToFacebook(article, storage);
                  if (fbResult) {
                    if (fbResult.status === 'posted') {
                      console.log(`[Job ${job.id}] ✅ Posted to Facebook: ${fbResult.postUrl}`);
                    } else {
                      console.log(`[Job ${job.id}] ℹ️  Article already posted to Facebook: ${fbResult.postUrl}`);
                    }
                  } else {
                    console.error(`[Job ${job.id}] ❌ Failed to post to Facebook for ${article.title.substring(0, 60)}...`);
                  }
                } catch (fbError) {
                  console.error(`[Job ${job.id}] ❌ Error posting to Facebook:`, fbError);
                  // Don't fail the whole scrape if Facebook posting fails
                }
              } else if (article.isPublished && article.facebookPostId) {
                console.log(`[Job ${job.id}] ⏭️  Already posted to Facebook: ${article.title.substring(0, 60)}...`);
              } else if (article.isPublished && !article.imageUrl) {
                console.log(`[Job ${job.id}] ⏭️  Skipping Facebook post (no image): ${article.title.substring(0, 60)}...`);
              }
              
              // Add to existing embeddings so we can catch duplicates within this batch
              if (translation.embedding) {
                existingEmbeddings.push({
                  id: article.id,
                  title: translation.translatedTitle,
                  embedding: translation.embedding,
                });
              }
            } else {
              skippedNotNews++;
              console.log(`[Job ${job.id}] Skipped non-news: ${post.title.substring(0, 50)}...`);
            }
            
            // Update progress
            scrapeJobManager.updateProgress(job.id, {
              processedPosts: createdArticles + skippedNotNews + skippedSemanticDuplicates,
              createdArticles,
              skippedNotNews,
            });
          } catch (error) {
            console.log(`[Job ${job.id}] Error processing post:`, error);
            // Continue with next post
          }
        } // End of posts loop
        } // End of sources loop

        console.log(`[Job ${job.id}] Multi-Source Scrape Complete`);
        console.log(`[Job ${job.id}] Total posts fetched: ${totalPosts}`);
        console.log(`[Job ${job.id}] Skipped (semantic duplicates): ${skippedSemanticDuplicates}`);
        console.log(`[Job ${job.id}] Skipped (not news): ${skippedNotNews}`);
        console.log(`[Job ${job.id}] Articles created: ${createdArticles}`);
        
        scrapeJobManager.markCompleted(job.id);
      } catch (error) {
        console.error(`[Job ${job.id}] SCRAPING ERROR:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        scrapeJobManager.markFailed(job.id, errorMessage);
      }
    })();
  });

  // Get scrape job status - PROTECTED
  app.get("/api/admin/scrape/status/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const job = scrapeJobManager.getJob(id);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      res.json(job);
    } catch (error) {
      console.error("Error fetching job status:", error);
      res.status(500).json({ error: "Failed to fetch job status" });
    }
  });

  // Update article (approve/reject/edit) - PROTECTED
  app.patch("/api/admin/articles/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const article = await storage.updateArticle(id, updates);
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      res.json(article);
    } catch (error) {
      console.error("Error updating article:", error);
      res.status(500).json({ error: "Failed to update article" });
    }
  });

  // Delete article - PROTECTED
  app.delete("/api/admin/articles/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteArticle(id);
      
      if (!success) {
        return res.status(404).json({ error: "Article not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting article:", error);
      res.status(500).json({ error: "Failed to delete article" });
    }
  });

  // Publish article - PROTECTED
  app.post("/api/admin/articles/:id/publish", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.updateArticle(id, { isPublished: true });
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      res.json(article);
    } catch (error) {
      console.error("Error publishing article:", error);
      res.status(500).json({ error: "Failed to publish article" });
    }
  });

  // Post article to Facebook - PROTECTED
  app.post("/api/admin/articles/:id/facebook", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.getArticleById(id);
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      if (!article.isPublished) {
        return res.status(400).json({ error: "Only published articles can be posted to Facebook" });
      }

      if (article.facebookPostId) {
        return res.status(400).json({ error: "Article already posted to Facebook" });
      }

      const fbResult = await postArticleToFacebook(article, storage);
      
      if (!fbResult) {
        return res.status(500).json({ error: "Failed to post to Facebook" });
      }

      // Reload article to get updated state (service handles DB update)
      const updatedArticle = await storage.getArticleById(id);

      res.json({
        ...updatedArticle,
        status: fbResult.status,
      });
    } catch (error) {
      console.error("Error posting to Facebook:", error);
      res.status(500).json({ error: "Failed to post to Facebook" });
    }
  });

  // Batch post articles to Facebook - PROTECTED
  app.post("/api/admin/facebook/batch-post", requireAdminAuth, async (req, res) => {
    try {
      // Find all published articles with images that haven't been posted to Facebook
      const allArticles = await storage.getPublishedArticles();
      const articlesToPost = allArticles.filter(
        (article) => article.imageUrl && !article.facebookPostId
      );

      console.log(`📘 Batch posting ${articlesToPost.length} articles to Facebook`);

      const results = {
        total: articlesToPost.length,
        successful: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const articleListItem of articlesToPost) {
        try {
          console.log(`📘 Posting: ${articleListItem.title.substring(0, 60)}...`);
          
          // Fetch full article with content for Facebook posting
          const fullArticle = await storage.getArticleById(articleListItem.id);
          if (!fullArticle) {
            results.failed++;
            results.errors.push(`${articleListItem.title}: Article not found`);
            continue;
          }
          
          const fbResult = await postArticleToFacebook(fullArticle, storage);
          
          if (fbResult) {
            results.successful++;
            if (fbResult.status === 'posted') {
              console.log(`✅ Posted successfully: ${fbResult.postUrl}`);
            } else {
              console.log(`ℹ️  Already posted: ${fbResult.postUrl}`);
            }
          } else {
            results.failed++;
            results.errors.push(`${fullArticle.title}: Failed to post (no result)`);
            console.log(`❌ Failed to post: ${fullArticle.title.substring(0, 60)}...`);
          }
        } catch (error) {
          results.failed++;
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          results.errors.push(`${articleListItem.title}: ${errorMsg}`);
          console.error(`❌ Error posting ${articleListItem.title}:`, error);
        }
      }

      console.log(`📘 Batch post complete: ${results.successful} successful, ${results.failed} failed`);
      res.json(results);
    } catch (error) {
      console.error("Error in batch Facebook posting:", error);
      res.status(500).json({ error: "Failed to batch post to Facebook" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
