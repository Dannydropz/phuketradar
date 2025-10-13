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

// Extend session type
declare module "express-session" {
  interface SessionData {
    isAdminAuthenticated?: boolean;
  }
}

// Auth middleware
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  console.log(`[AUTH CHECK] ${req.method} ${req.path} - Session auth: ${req.session.isAdminAuthenticated}`);
  if (req.session.isAdminAuthenticated) {
    console.log(`[AUTH CHECK] Authorized - proceeding`);
    return next();
  }
  console.log(`[AUTH CHECK] Unauthorized - blocking request`);
  return res.status(401).json({ error: "Unauthorized" });
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

  // Get single article by ID
  app.get("/api/articles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.getArticleById(id);
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      
      res.json(article);
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "Failed to fetch article" });
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
    console.log("=== SCRAPE REQUEST RECEIVED ===");
    
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
            3, // max pages to fetch
            checkForDuplicate // stop early if we hit known posts
          );
          
          console.log(`[Job ${job.id}] ${source.name}: Found ${scrapedPosts.length} NEW posts`);
          totalPosts += scrapedPosts.length;
          scrapeJobManager.updateProgress(job.id, { totalPosts });

        // Process each scraped post from this source
        for (const post of scrapedPosts) {
          try {
            console.log(`[Job ${job.id}] Processing post: ${post.title.substring(0, 50)}`);
            
            // STEP 1: Generate embedding from Thai title (before translation - saves money!)
            let titleEmbedding: number[] | undefined;
            try {
              titleEmbedding = await translatorService.generateEmbeddingFromTitle(post.title);
              
              // STEP 2: Check for semantic duplicates
              const duplicateCheck = checkSemanticDuplicate(titleEmbedding, existingEmbeddings, 0.9);
              
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
              await storage.createArticle({
                title: translation.translatedTitle,
                content: translation.translatedContent,
                excerpt: translation.excerpt,
                imageUrl: post.imageUrl || null,
                category: translation.category,
                sourceUrl: post.sourceUrl,
                author: translation.author,
                isPublished: false,
                originalLanguage: "th",
                translatedBy: "openai",
                embedding: translation.embedding,
              });

              createdArticles++;
              
              // Add to existing embeddings so we can catch duplicates within this batch
              if (translation.embedding) {
                existingEmbeddings.push({
                  id: 'temp',
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

  const httpServer = createServer(app);

  return httpServer;
}
