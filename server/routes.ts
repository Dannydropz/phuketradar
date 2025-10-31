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
import { sendBulkNewsletter } from "./services/newsletter";
import { subHours } from "date-fns";

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

  const httpServer = createServer(app);

  return httpServer;
}
