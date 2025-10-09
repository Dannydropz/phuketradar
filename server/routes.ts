import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scraperService } from "./services/scraper";
import { translatorService } from "./services/translator";
import { insertArticleSchema } from "@shared/schema";
import { z } from "zod";

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

  // Get all articles (including unpublished)
  app.get("/api/admin/articles", async (req, res) => {
    try {
      const articles = await storage.getAllArticles();
      res.json(articles);
    } catch (error) {
      console.error("Error fetching all articles:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  // Get pending articles
  app.get("/api/admin/articles/pending", async (req, res) => {
    try {
      const articles = await storage.getPendingArticles();
      res.json(articles);
    } catch (error) {
      console.error("Error fetching pending articles:", error);
      res.status(500).json({ error: "Failed to fetch pending articles" });
    }
  });

  // Scrape and process articles
  app.post("/api/admin/scrape", async (req, res) => {
    try {
      const fbPageUrl = "https://www.facebook.com/PhuketTimeNews";
      
      // Scrape the Facebook page with pagination (fetch 3 pages = ~9 posts)
      console.log("Starting scrape of:", fbPageUrl);
      const scrapedPosts = await scraperService.scrapeFacebookPageWithPagination(fbPageUrl, 3);
      
      console.log(`Found ${scrapedPosts.length} potential posts`);
      
      const processedArticles = [];

      // Process each scraped post
      for (const post of scrapedPosts) {
        try {
          console.log(`\n=== Processing post: ${post.title.substring(0, 50)} ===`);
          console.log(`Content length: ${post.content.length} chars`);
          
          // Translate and rewrite the content
          const translation = await translatorService.translateAndRewrite(
            post.title,
            post.content
          );

          console.log(`Is actual news: ${translation.isActualNews}`);
          
          // Only create article if it's actual news
          if (translation.isActualNews) {
            // Use a data URI placeholder if no image is found from Facebook
            // This creates a simple gray placeholder without external dependencies
            const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='675'%3E%3Crect width='1200' height='675' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' fill='%236b7280'%3EPhuket Radar%3C/text%3E%3C/svg%3E";
            const finalImageUrl = post.imageUrl || placeholderImage;
            
            const article = await storage.createArticle({
              title: translation.translatedTitle,
              content: translation.translatedContent,
              excerpt: translation.excerpt,
              imageUrl: finalImageUrl,
              category: translation.category,
              sourceUrl: post.sourceUrl,
              author: translation.author,
              isPublished: false,
              originalLanguage: "th",
              translatedBy: "openai",
            });

            processedArticles.push(article);
          }
        } catch (error) {
          console.error("Error processing post:", error);
          // Continue with next post
        }
      }

      console.log(`Processed ${processedArticles.length} articles`);
      
      res.json({
        success: true,
        articlesProcessed: processedArticles.length,
        articles: processedArticles,
      });
    } catch (error) {
      console.error("Error during scraping:", error);
      res.status(500).json({ 
        error: "Failed to scrape articles",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update article (approve/reject/edit)
  app.patch("/api/admin/articles/:id", async (req, res) => {
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

  // Delete article
  app.delete("/api/admin/articles/:id", async (req, res) => {
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

  // Publish article
  app.post("/api/admin/articles/:id/publish", async (req, res) => {
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
