import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getScraperService } from "./services/scraper";
import { translatorService } from "./services/translator";
import { PLACEHOLDER_IMAGE } from "./lib/placeholders";
import { insertArticleSchema, insertSubscriberSchema } from "@shared/schema";
import { z } from "zod";
import { scrapeJobManager } from "./scrape-jobs";
import { checkSemanticDuplicate } from "./lib/semantic-similarity";
import { getEnabledSources } from "./config/news-sources";
import { postArticleToFacebook } from "./lib/facebook-service";
import { postArticleToInstagram } from "./lib/instagram-service";
import { postArticleToThreads } from "./lib/threads-service";
import { sendBulkNewsletter } from "./services/newsletter";
import { subHours } from "date-fns";
import { insightService } from "./services/insight-service";
import { buildArticleUrl } from "@shared/category-map";

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

  // Journalist routes
  
  // Get all journalists
  app.get("/api/journalists", async (req, res) => {
    try {
      const journalists = await storage.getAllJournalists();
      res.json(journalists);
    } catch (error) {
      console.error("Error fetching journalists:", error);
      res.status(500).json({ error: "Failed to fetch journalists" });
    }
  });

  // Get journalist by ID with their articles
  app.get("/api/journalists/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const journalist = await storage.getJournalistById(id);
      
      if (!journalist) {
        return res.status(404).json({ error: "Journalist not found" });
      }
      
      const articles = await storage.getArticlesByJournalistId(id);
      
      res.json({
        ...journalist,
        articles
      });
    } catch (error) {
      console.error("Error fetching journalist:", error);
      res.status(500).json({ error: "Failed to fetch journalist" });
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

  // Get articles needing review - PROTECTED
  app.get("/api/admin/articles/needs-review", requireAdminAuth, async (req, res) => {
    try {
      const articles = await storage.getArticlesNeedingReview();
      res.json(articles);
    } catch (error) {
      console.error("Error fetching articles needing review:", error);
      res.status(500).json({ error: "Failed to fetch articles needing review" });
    }
  });

  // Create new article - PROTECTED
  app.post("/api/admin/articles", requireAdminAuth, async (req, res) => {
    try {
      const articleData = req.body;
      
      // Generate slug from title if not provided
      if (!articleData.slug && articleData.title) {
        articleData.slug = articleData.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
      
      // Mark manually created articles
      articleData.isManuallyCreated = true;
      
      // Set sourceUrl to our domain if not provided (since it's manually created)
      if (!articleData.sourceUrl) {
        articleData.sourceUrl = 'https://phuketradar.com';
      }
      
      const article = await storage.createArticle(articleData);
      res.json(article);
    } catch (error) {
      console.error("Error creating article:", error);
      res.status(500).json({ error: "Failed to create article" });
    }
  });

  // Get all categories - PROTECTED
  app.get("/api/admin/categories", requireAdminAuth, async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Create new category - PROTECTED
  app.post("/api/admin/categories", requireAdminAuth, async (req, res) => {
    try {
      const { name, color, icon } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Category name is required" });
      }
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const category = await storage.createCategory({
        name,
        slug,
        color: color || '#3b82f6',
        icon: icon || null,
        isDefault: false,
      });
      
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // Seed default categories - PROTECTED
  app.post("/api/admin/categories/seed", requireAdminAuth, async (req, res) => {
    try {
      const defaultCategories = [
        { name: "Crime", slug: "crime", color: "#ef4444", icon: null },
        { name: "Local News", slug: "local-news", color: "#3b82f6", icon: null },
        { name: "Tourism", slug: "tourism", color: "#10b981", icon: null },
        { name: "Politics", slug: "politics", color: "#8b5cf6", icon: null },
        { name: "Economy", slug: "economy", color: "#f59e0b", icon: null },
        { name: "Traffic", slug: "traffic", color: "#ec4899", icon: null },
        { name: "Weather", slug: "weather", color: "#06b6d4", icon: null },
        { name: "Guides", slug: "guides", color: "#84cc16", icon: null },
        { name: "Lifestyle", slug: "lifestyle", color: "#f97316", icon: null },
        { name: "Environment", slug: "environment", color: "#22c55e", icon: null },
        { name: "Health", slug: "health", color: "#14b8a6", icon: null },
        { name: "Entertainment", slug: "entertainment", color: "#a855f7", icon: null },
        { name: "Sports", slug: "sports", color: "#f43f5e", icon: null },
      ];

      const existingCategories = await storage.getAllCategories();
      const existingSlugs = new Set(existingCategories.map(c => c.slug));
      
      const created = [];
      for (const cat of defaultCategories) {
        if (!existingSlugs.has(cat.slug)) {
          const category = await storage.createCategory({
            ...cat,
            isDefault: true,
          });
          created.push(category);
        }
      }

      res.json({
        success: true,
        created: created.length,
        total: defaultCategories.length,
        categories: created,
      });
    } catch (error) {
      console.error("Error seeding categories:", error);
      res.status(500).json({ error: "Failed to seed categories" });
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
    
    // Process in background (no await) - use the same runScheduledScrape function as automated scraping
    (async () => {
      try {
        scrapeJobManager.updateJob(job.id, { status: 'processing' });
        
        console.log(`[Job ${job.id}] Starting scrape using runScheduledScrape() with job tracking`);
        
        // Import and run the scheduled scrape function with progress callbacks
        const { runScheduledScrape } = await import("./scheduler");
        
        const result = await runScheduledScrape({
          onProgress: (stats) => {
            scrapeJobManager.updateProgress(job.id, {
              totalPosts: stats.totalPosts,
              processedPosts: stats.processedPosts,
              createdArticles: stats.createdArticles,
              skippedNotNews: stats.skippedNotNews,
            });
          },
        });
        
        if (result) {
          console.log(`[Job ${job.id}] Scrape completed successfully`);
          console.log(`[Job ${job.id}] Total posts: ${result.totalPosts}`);
          console.log(`[Job ${job.id}] Articles created: ${result.articlesCreated}`);
          console.log(`[Job ${job.id}] Skipped (duplicates): ${result.skippedSemanticDuplicates}`);
          console.log(`[Job ${job.id}] Skipped (not news/text graphics): ${result.skippedNotNews}`);
          
          scrapeJobManager.markCompleted(job.id);
        } else {
          console.error(`[Job ${job.id}] Scrape returned null result`);
          scrapeJobManager.markFailed(job.id, "Scrape returned no result");
        }
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
      const article = await storage.updateArticle(id, { 
        isPublished: true,
        facebookPostId: null // Clear any previous posting attempts so button appears
      });
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      // Manual publishes do NOT auto-post to Facebook
      // Use the dedicated POST /api/admin/articles/:id/facebook endpoint to manually post to Facebook
      console.log(`📰 [PUBLISH] Article published manually (not auto-posted to Facebook): ${article.title.substring(0, 60)}...`);

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
        (article) => (article.imageUrl || (article.imageUrls && article.imageUrls.length > 0)) && !article.facebookPostId
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

  // Post article to Instagram - PROTECTED
  app.post("/api/admin/articles/:id/instagram", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.getArticleById(id);
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      if (!article.isPublished) {
        return res.status(400).json({ error: "Only published articles can be posted to Instagram" });
      }

      if (article.instagramPostId && !article.instagramPostId.startsWith('IG-LOCK:')) {
        return res.status(400).json({ error: "Article already posted to Instagram" });
      }

      const igResult = await postArticleToInstagram(article, storage);
      
      if (!igResult) {
        return res.status(500).json({ error: "Failed to post to Instagram" });
      }

      // Reload article to get updated state (service handles DB update)
      const updatedArticle = await storage.getArticleById(id);

      res.json({
        ...updatedArticle,
        status: igResult.status,
      });
    } catch (error) {
      console.error("Error posting to Instagram:", error);
      res.status(500).json({ error: "Failed to post to Instagram" });
    }
  });

  // Post article to Threads - PROTECTED
  app.post("/api/admin/articles/:id/threads", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.getArticleById(id);
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      if (!article.isPublished) {
        return res.status(400).json({ error: "Only published articles can be posted to Threads" });
      }

      if (article.threadsPostId && !article.threadsPostId.startsWith('THREADS-LOCK:')) {
        return res.status(400).json({ error: "Article already posted to Threads" });
      }

      const threadsResult = await postArticleToThreads(article, storage);
      
      if (!threadsResult) {
        return res.status(500).json({ error: "Failed to post to Threads" });
      }

      // Reload article to get updated state (service handles DB update)
      const updatedArticle = await storage.getArticleById(id);

      res.json({
        ...updatedArticle,
        status: threadsResult.status,
      });
    } catch (error) {
      console.error("Error posting to Threads:", error);
      res.status(500).json({ error: "Failed to post to Threads" });
    }
  });

  // Clear stuck Facebook posting locks - PROTECTED
  app.post("/api/admin/facebook/clear-locks", requireAdminAuth, async (req, res) => {
    try {
      console.log(`🔧 [ADMIN] Manually clearing stuck Facebook posting locks...`);
      
      const stuckLocks = await storage.getArticlesWithStuckLocks();
      
      if (stuckLocks.length === 0) {
        console.log(`✅ [ADMIN] No stuck locks found`);
        return res.json({
          cleared: 0,
          articles: [],
        });
      }
      
      console.warn(`⚠️  [ADMIN] Found ${stuckLocks.length} articles with stuck LOCK tokens`);
      
      const clearedArticles = [];
      for (const article of stuckLocks) {
        console.warn(`   - Clearing lock for: ${article.title.substring(0, 60)}... (ID: ${article.id})`);
        await storage.clearStuckFacebookLock(article.id);
        clearedArticles.push({
          id: article.id,
          title: article.title,
          lockToken: article.facebookPostId,
        });
      }
      
      console.log(`✅ [ADMIN] Cleared ${stuckLocks.length} stuck locks`);
      
      res.json({
        cleared: stuckLocks.length,
        articles: clearedArticles,
      });
    } catch (error) {
      console.error("Error clearing stuck Facebook locks:", error);
      res.status(500).json({ error: "Failed to clear stuck locks" });
    }
  });

  // Cron endpoint for daily newsletter
  app.post("/api/cron/newsletter", requireCronAuth, async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log("\n".repeat(3) + "=".repeat(80));
    console.log("📧 NEWSLETTER TRIGGERED 📧");
    console.log(`Time: ${timestamp}`);
    console.log(`Trigger: EXTERNAL CRON SERVICE`);
    console.log("=".repeat(80) + "\n");

    try {
      // Get active subscribers
      const subscribers = await storage.getAllActiveSubscribers();
      
      if (subscribers.length === 0) {
        console.log("ℹ️  No active subscribers - skipping newsletter");
        return res.json({
          success: true,
          message: "No active subscribers",
          sent: 0,
          failed: 0,
        });
      }

      // Get articles from the last 24 hours, published only
      const allArticles = await storage.getPublishedArticles();
      const cutoff = subHours(new Date(), 24);
      
      const recentArticles = allArticles
        .filter(article => new Date(article.publishedAt) >= cutoff)
        .slice(0, 10); // Limit to 10 most recent articles
      
      console.log(`📊 Filtered articles: ${recentArticles.length} from last 24 hours (cutoff: ${cutoff.toISOString()})`);

      if (recentArticles.length === 0) {
        console.log("ℹ️  No articles from the last 24 hours - skipping newsletter");
        return res.json({
          success: true,
          message: "No recent articles to send",
          sent: 0,
          failed: 0,
        });
      }

      console.log(`📧 Sending newsletter with ${recentArticles.length} articles to ${subscribers.length} subscribers`);

      // Send newsletter to all subscribers
      const result = await sendBulkNewsletter(
        subscribers.map(s => ({ email: s.email, unsubscribeToken: s.unsubscribeToken })),
        recentArticles
      );

      console.log(`✅ Newsletter campaign complete: ${result.sent} sent, ${result.failed} failed`);

      res.json({
        success: true,
        message: "Newsletter sent successfully",
        timestamp,
        ...result,
        articles: recentArticles.length,
        subscribers: subscribers.length,
      });
    } catch (error) {
      console.error("❌ Error sending newsletter:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      res.json({
        success: false,
        message: "Newsletter sending failed",
        error: errorMessage,
        timestamp,
      });
    }
  });

  // Newsletter subscription routes
  
  // Subscribe to newsletter
  app.post("/api/subscribe", async (req, res) => {
    try {
      const result = insertSubscriberSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      // Check if already subscribed
      const existing = await storage.getSubscriberByEmail(result.data.email);
      if (existing) {
        if (existing.isActive) {
          return res.status(200).json({ 
            message: "You're already subscribed to Phuket Radar!",
            alreadySubscribed: true 
          });
        } else {
          // Reactivate subscription
          await storage.unsubscribeByToken(existing.unsubscribeToken);
          const reactivated = await storage.createSubscriber(result.data);
          return res.status(200).json({ 
            message: "Welcome back! Your subscription has been reactivated.",
            subscriber: { email: reactivated.email }
          });
        }
      }

      const subscriber = await storage.createSubscriber(result.data);
      res.status(201).json({ 
        message: "Successfully subscribed to Phuket Radar!",
        subscriber: { email: subscriber.email }
      });
    } catch (error) {
      console.error("Error subscribing:", error);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  // Unsubscribe from newsletter
  app.get("/api/unsubscribe/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const success = await storage.unsubscribeByToken(token);
      
      if (!success) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
            <head><title>Unsubscribe - Phuket Radar</title></head>
            <body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 100px auto; text-align: center; padding: 20px;">
              <h1 style="color: #ef4444;">Invalid Link</h1>
              <p>This unsubscribe link is invalid or has already been used.</p>
            </body>
          </html>
        `);
      }

      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Unsubscribed - Phuket Radar</title></head>
          <body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 100px auto; text-align: center; padding: 20px;">
            <h1 style="color: #10b981;">Successfully Unsubscribed</h1>
            <p>You've been unsubscribed from Phuket Radar newsletters.</p>
            <p style="color: #6b7280; margin-top: 40px;">We're sorry to see you go!</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error unsubscribing:", error);
      res.status(500).send("Failed to unsubscribe");
    }
  });

  // Insight Generation routes - PROTECTED
  
  // Generate Insight from breaking news articles
  app.post("/api/admin/insights/generate", requireAdminAuth, async (req, res) => {
    try {
      const { topic, sourceArticleIds, eventType } = req.body;
      
      if (!topic || !sourceArticleIds || sourceArticleIds.length === 0) {
        return res.status(400).json({ error: "Topic and source articles are required" });
      }

      console.log(`\n=== INSIGHT GENERATION REQUESTED ===`);
      console.log(`Topic: ${topic}`);
      console.log(`Source articles: ${sourceArticleIds.length}`);

      // Fetch source articles
      const sourceArticles = await Promise.all(
        sourceArticleIds.map((id: string) => storage.getArticleById(id))
      );
      
      const validArticles = sourceArticles.filter(a => a !== null);
      
      if (validArticles.length === 0) {
        return res.status(404).json({ error: "No valid source articles found" });
      }

      // Generate the Insight
      const insight = await insightService.generateInsight({
        sourceArticles: validArticles,
        topic,
        eventType,
      });

      console.log(`✅ Insight generated: ${insight.title}`);

      res.json({
        success: true,
        insight,
      });
    } catch (error) {
      console.error("Error generating Insight:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to generate Insight", message: errorMessage });
    }
  });

  // Publish an Insight article
  app.post("/api/admin/insights/publish", requireAdminAuth, async (req, res) => {
    try {
      const { title, content, excerpt, relatedArticleIds, sources } = req.body;
      
      if (!title || !content || !excerpt) {
        return res.status(400).json({ error: "Title, content, and excerpt are required" });
      }

      // Create the Insight article
      const article = await storage.createArticle({
        title,
        content,
        excerpt,
        category: "Insight",
        sourceUrl: `https://phuketradar.com/insight-${Date.now()}`,
        isPublished: true,
        originalLanguage: "en",
        translatedBy: "gpt-4",
        imageUrl: null,
        articleType: "insight",
        relatedArticleIds: relatedArticleIds || [],
      });

      console.log(`✅ Published Insight: ${article.title}`);

      res.json({
        success: true,
        article,
      });
    } catch (error) {
      console.error("Error publishing Insight:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to publish Insight", message: errorMessage });
    }
  });

  // XML Sitemap endpoint for SEO
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'https://phuketradar.com';

      const articles = await storage.getPublishedArticles();
      const categories = ["crime", "local", "tourism", "politics", "economy", "traffic", "weather"];
      
      // Build sitemap XML
      let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
      sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      
      // Homepage
      sitemap += '  <url>\n';
      sitemap += `    <loc>${baseUrl}/</loc>\n`;
      sitemap += '    <changefreq>hourly</changefreq>\n';
      sitemap += '    <priority>1.0</priority>\n';
      sitemap += '  </url>\n';
      
      // Category pages (using clean URLs)
      for (const category of categories) {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}/${category}</loc>\n`;
        sitemap += '    <changefreq>hourly</changefreq>\n';
        sitemap += '    <priority>0.8</priority>\n';
        sitemap += '  </url>\n';
      }
      
      // Article pages
      for (const article of articles) {
        const articlePath = buildArticleUrl({ category: article.category, slug: article.slug, id: article.id });
        const url = `${baseUrl}${articlePath}`;
        const lastmod = new Date(article.publishedAt).toISOString().split('T')[0];
        
        sitemap += '  <url>\n';
        sitemap += `    <loc>${url}</loc>\n`;
        sitemap += `    <lastmod>${lastmod}</lastmod>\n`;
        sitemap += '    <changefreq>weekly</changefreq>\n';
        sitemap += '    <priority>0.6</priority>\n';
        sitemap += '  </url>\n';
      }
      
      sitemap += '</urlset>';
      
      res.header('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send('Error generating sitemap');
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
