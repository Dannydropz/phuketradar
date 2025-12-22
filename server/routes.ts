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
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { pool, db } from "./db";
import { articles, articleMetrics, socialMediaAnalytics } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { autoLinkContent } from "./lib/auto-link-content";
import { getSmartContextStories } from "./services/smart-context";
import { detectTags } from "./lib/tag-detector";
import { TAG_DEFINITIONS } from "@shared/core-tags";
import sharp from "sharp";
import { cache, CACHE_KEYS, CACHE_TTL, withCache, invalidateArticleCaches } from "./lib/cache";

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

import { metaBusinessSuiteService } from "./services/meta-business-suite-client";
import { googleAnalyticsService } from "./services/google-analytics-client";
import { googleSearchConsoleService } from "./services/google-search-console-client";
import { smartLearningService } from "./services/smart-learning-service";

export async function registerRoutes(app: Express): Promise<Server> {


  // Sync Facebook Insights (API key auth for N8N)
  app.post("/api/admin/sync-facebook-insights", requireCronAuth, async (req, res) => {
    try {
      const result = await metaBusinessSuiteService.batchUpdatePostInsights(7);
      res.json(result);
    } catch (error) {
      console.error("Error syncing Facebook insights:", error);
      res.status(500).json({ error: "Failed to sync insights" });
    }
  });

  // Sync Google Analytics (API key auth for N8N)
  app.post("/api/admin/sync-google-analytics", requireCronAuth, async (req, res) => {
    try {
      const result = await googleAnalyticsService.batchSyncArticleMetrics(7);
      res.json(result);
    } catch (error) {
      console.error("Error syncing Google Analytics:", error);
      res.status(500).json({ error: "Failed to sync analytics" });
    }
  });

  // Sync Google Search Console (API key auth for N8N)
  app.post("/api/admin/sync-google-search-console", requireCronAuth, async (req, res) => {
    try {
      const result = await googleSearchConsoleService.batchSyncSearchMetrics(3);
      res.json(result);
    } catch (error) {
      console.error("Error syncing Google Search Console:", error);
      res.status(500).json({ error: "Failed to sync search console" });
    }
  });

  // Recalculate Engagement Scores (API key auth for N8N)
  app.post("/api/admin/recalculate-engagement", requireCronAuth, async (req, res) => {
    try {
      const result = await smartLearningService.recalculateEngagementScores(7);
      res.json(result);
    } catch (error) {
      console.error("Error recalculating engagement scores:", error);
      res.status(500).json({ error: "Failed to recalculate scores" });
    }
  });
  // Article routes

  // Get all published articles (with caching and pagination support)
  app.get("/api/articles", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      // Use server-side cache with pagination parameters in the key
      const articles = await withCache(
        `${CACHE_KEYS.PUBLISHED_ARTICLES}:${limit}:${offset}`,
        CACHE_TTL.ARTICLES_LIST,
        () => storage.getPublishedArticles(limit, offset)
      );

      // Set HTTP cache headers for browser + Cloudflare edge caching
      res.set({
        'Cache-Control': 'public, max-age=30, s-maxage=120, stale-while-revalidate=300',
        'CDN-Cache-Control': 'public, max-age=120',
        'Vary': 'Accept-Encoding',
      });

      res.json(articles);
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  // Get trending articles (based on engagement score)
  app.get("/api/articles/trending", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      // Cache trending articles for 2 minutes
      const articles = await withCache(
        `${CACHE_KEYS.TRENDING_ARTICLES}:${limit}`,
        CACHE_TTL.TRENDING,
        () => smartLearningService.getTrendingArticles(limit)
      );

      res.set({
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        'Vary': 'Accept-Encoding',
      });

      res.json(articles);
    } catch (error) {
      console.error("Error fetching trending articles:", error);
      res.status(500).json({ error: "Failed to fetch trending articles" });
    }
  });

  // Get articles by category with pagination
  app.get("/api/articles/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      // Cache category articles with pagination parameters
      const articles = await withCache(
        `${CACHE_KEYS.CATEGORY_ARTICLES(category)}:${limit}:${offset}`,
        CACHE_TTL.ARTICLES_LIST,
        () => storage.getArticlesByCategory(category, limit, offset)
      );

      res.set({
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        'Vary': 'Accept-Encoding',
      });

      res.json(articles);
    } catch (error) {
      console.error("Error fetching articles by category:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  // Get articles by tag
  app.get("/api/articles/tag/:tag", async (req, res) => {
    try {
      const { tag } = req.params;
      // Convert slug back to tag name (e.g., "patong-beach" -> "Patong Beach")
      const tagName = tag
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      const articles = await storage.getArticlesByTag(tagName);

      res.set({
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        'Vary': 'Accept-Encoding',
      });

      res.json(articles);
    } catch (error) {
      console.error("Error fetching articles by tag:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  // Public Search API for articles
  app.get("/api/articles/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }

      // Cache search results for 5 minutes
      const results = await withCache(
        `search:${query.toLowerCase().trim()}`,
        300, // 5 minutes
        () => storage.searchArticles(query)
      );

      res.set({
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      });

      res.json(results);
    } catch (error) {
      console.error("Error searching articles:", error);
      res.status(500).json({ error: "Failed to search articles" });
    }
  });

  // Get single article by slug or ID (with caching)
  app.get("/api/articles/:slugOrId", async (req, res) => {
    try {
      const { slugOrId } = req.params;

      // Try cache first
      const cacheKeySlug = CACHE_KEYS.ARTICLE_BY_SLUG(slugOrId);
      const cacheKeyId = CACHE_KEYS.ARTICLE_BY_ID(slugOrId);

      let article = cache.get<any>(cacheKeySlug) || cache.get<any>(cacheKeyId);

      if (!article) {
        // Try to find by slug first (preferred for SEO)
        article = await storage.getArticleBySlug(slugOrId);

        // Fall back to ID lookup if not found by slug
        if (!article) {
          article = await storage.getArticleById(slugOrId);
        }

        if (article) {
          // Cache the article by both slug and ID
          cache.set(CACHE_KEYS.ARTICLE_BY_SLUG(article.slug), article, CACHE_TTL.ARTICLE_DETAIL);
          cache.set(CACHE_KEYS.ARTICLE_BY_ID(article.id), article, CACHE_TTL.ARTICLE_DETAIL);
        }
      }

      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      // Apply auto-linking to article content before sending to client
      // We create a copy to avoid mutating the cached version
      const articleResponse = { ...article };

      if (article.tags && article.tags.length > 0) {
        // Filter tags for linking: Select Top 1 Location and Top 1 Topic
        // Since tags are already sorted by relevance (score) from detectTags,
        // we just need to find the first one of each type.

        const tagsToLink: string[] = [];
        let locationFound = false;
        let topicFound = false;

        for (const tagName of article.tags) {
          const def = TAG_DEFINITIONS.find(t => t.name === tagName);
          if (!def) continue;

          if (!locationFound && def.type === 'location') {
            tagsToLink.push(tagName);
            locationFound = true;
          } else if (!topicFound && (def.type !== 'location' && def.type !== 'person')) {
            // Treat everything else (topic, event, crime, etc.) as a topic for linking
            // Exclude 'person' to avoid linking generic terms like "Tourists" unless requested
            tagsToLink.push(tagName);
            topicFound = true;
          }

          if (locationFound && topicFound) break;
        }

        if (tagsToLink.length > 0) {
          articleResponse.content = autoLinkContent(article.content, tagsToLink);
        }
      }

      // Set HTTP cache headers for article pages (1 minute, with stale-while-revalidate)
      res.set({
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        'Vary': 'Accept-Encoding',
      });

      res.json(articleResponse);
    } catch (error) {
      console.error("Error fetching article:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to fetch article", details: errorMessage });
    }
  });

  // Get sidebar articles for article detail page (lightweight - only latest + related)
  // This avoids fetching ALL articles just for the sidebar
  app.get("/api/articles/:id/sidebar", async (req, res) => {
    try {
      const { id } = req.params;

      // Get the current article to determine category
      const article = await storage.getArticleById(id);

      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      // Cache key based on article ID and category
      const cacheKey = `sidebar:${id}:${article.category}`;

      const sidebarData = await withCache(
        cacheKey,
        CACHE_TTL.ARTICLES_LIST,
        async () => {
          // Get latest 6 articles (we'll filter out current in frontend)
          const allArticles = await storage.getPublishedArticles();
          const latestArticles = allArticles
            .filter(a => a.id !== id)
            .slice(0, 5);

          // Get related articles (same category, excluding current)
          const relatedArticles = allArticles
            .filter(a => a.id !== id && a.category === article.category)
            .slice(0, 3);

          return { latestArticles, relatedArticles };
        }
      );

      res.set({
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
        'Vary': 'Accept-Encoding',
      });

      res.json(sidebarData);
    } catch (error) {
      console.error("Error fetching sidebar articles:", error);
      res.status(500).json({ error: "Failed to fetch sidebar articles" });
    }
  });

  // Get smart context for an article
  app.get("/api/articles/:id/smart-context", async (req, res) => {
    try {
      const { id } = req.params;

      // Get the current article
      const article = await storage.getArticleById(id);

      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      // Get smart context stories
      const contextResult = await getSmartContextStories(article, storage);

      res.json(contextResult);
    } catch (error) {
      console.error("Error fetching smart context:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to fetch smart context", details: errorMessage });
    }
  });

  // Track article view (increments view count for trending logic)
  app.post("/api/articles/:id/view", async (req, res) => {
    try {
      const { id } = req.params;

      await storage.incrementArticleViewCount(id);

      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking article view:", error);
      // Don't fail the request if view tracking fails
      res.json({ success: false });
    }
  });

  // Timeline/Story Series routes

  // Get all articles in a timeline/series (public)
  app.get("/api/stories/:seriesId/timeline", async (req, res) => {
    try {
      const { seriesId } = req.params;
      const { getTimelineService } = await import("./services/timeline-service");
      const timelineService = getTimelineService(storage);

      const timelineStories = await timelineService.getTimelineStories(seriesId);
      const parentStory = await timelineService.getParentStory(seriesId);

      res.json({
        seriesId,
        parentStory,
        updates: timelineStories,
        updateCount: timelineStories.length,
      });
    } catch (error) {
      console.error("Error fetching timeline:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to fetch timeline", details: errorMessage });
    }
  });

  // Get all timelines (parent stories only) - PROTECTED
  app.get("/api/admin/timelines", requireAdminAuth, async (req, res) => {
    try {
      const { getTimelineService } = await import("./services/timeline-service");
      const timelineService = getTimelineService(storage);

      const timelines = await timelineService.getAllTimelines();
      res.json(timelines);
    } catch (error) {
      console.error("Error fetching timelines:", error);
      res.status(500).json({ error: "Failed to fetch timelines" });
    }
  });

  // Create a new timeline from an article - PROTECTED
  app.post("/api/admin/stories/timeline", requireAdminAuth, async (req, res) => {
    try {
      const { parentArticleId, seriesTitle, seriesId } = req.body;

      if (!parentArticleId || !seriesTitle) {
        return res.status(400).json({ error: "parentArticleId and seriesTitle are required" });
      }

      const { getTimelineService } = await import("./services/timeline-service");
      const timelineService = getTimelineService(storage);

      const result = await timelineService.createStoryTimeline({
        parentArticleId,
        seriesTitle,
        seriesId,
      });

      res.json(result);
    } catch (error) {
      console.error("Error creating timeline:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to create timeline", details: errorMessage });
    }
  });

  // Add article to existing timeline - PROTECTED
  app.patch("/api/admin/stories/:id/add-to-timeline", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { seriesId } = req.body;

      if (!seriesId) {
        return res.status(400).json({ error: "seriesId is required" });
      }

      const { getTimelineService } = await import("./services/timeline-service");
      const timelineService = getTimelineService(storage);

      await timelineService.addArticleToTimeline(id, seriesId);

      // Return updated article
      const updatedArticle = await storage.getArticleById(id);
      res.json(updatedArticle);
    } catch (error) {
      console.error("Error adding article to timeline:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to add to timeline", details: errorMessage });
    }
  });

  // Remove article from timeline - PROTECTED
  app.delete("/api/admin/stories/:id/remove-from-timeline", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const { getTimelineService } = await import("./services/timeline-service");
      const timelineService = getTimelineService(storage);

      await timelineService.removeArticleFromTimeline(id);

      // Return updated article
      const updatedArticle = await storage.getArticleById(id);
      res.json(updatedArticle);
    } catch (error) {
      console.error("Error removing article from timeline:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to remove from timeline", details: errorMessage });
    }
  });

  // Get AI-suggested articles for timeline - PROTECTED
  app.get("/api/admin/stories/:id/suggest-related", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const minSimilarity = req.query.minSimilarity ? parseFloat(req.query.minSimilarity as string) : undefined;
      const maxSuggestions = req.query.maxSuggestions ? parseInt(req.query.maxSuggestions as string, 10) : undefined;

      const { getTimelineService } = await import("./services/timeline-service");
      const timelineService = getTimelineService(storage);

      const suggestions = await timelineService.suggestRelatedArticles(id, {
        minSimilarity,
        maxSuggestions,
      });

      res.json(suggestions);
    } catch (error) {
      console.error("Error getting timeline suggestions:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to get suggestions", details: errorMessage });
    }
  });

  // Search articles for timeline manual addition - PROTECTED
  app.get("/api/admin/articles/search", requireAdminAuth, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }

      const results = await storage.searchArticles(query);
      res.json(results);
    } catch (error) {
      console.error("Error searching articles:", error);
      res.status(500).json({ error: "Failed to search articles" });
    }
  });

  // Delete entire timeline - PROTECTED
  app.delete("/api/admin/timelines/:seriesId", requireAdminAuth, async (req, res) => {
    try {
      const { seriesId } = req.params;

      const { getTimelineService } = await import("./services/timeline-service");
      const timelineService = getTimelineService(storage);

      await timelineService.deleteTimeline(seriesId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting timeline:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to delete timeline", details: errorMessage });
    }
  });

  // Journalist routes

  // Get all journalists (with caching - they rarely change)
  app.get("/api/journalists", async (req, res) => {
    try {
      const journalists = await withCache(
        CACHE_KEYS.JOURNALISTS,
        CACHE_TTL.JOURNALISTS,
        () => storage.getAllJournalists()
      );

      res.set({
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'Vary': 'Accept-Encoding',
      });

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

  // SEO: Dynamic Sitemap
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const articles = await storage.getPublishedArticles();
      const baseUrl = "https://phuketradar.com";

      // Static pages
      const staticPages = [
        { url: baseUrl, priority: "1.0", changefreq: "hourly" },
        { url: `${baseUrl}/crime`, priority: "0.9", changefreq: "hourly" },
        { url: `${baseUrl}/local`, priority: "0.9", changefreq: "hourly" },
        { url: `${baseUrl}/tourism`, priority: "0.8", changefreq: "daily" },
        { url: `${baseUrl}/politics`, priority: "0.8", changefreq: "daily" },
        { url: `${baseUrl}/economy`, priority: "0.8", changefreq: "daily" },
        { url: `${baseUrl}/traffic`, priority: "0.8", changefreq: "daily" },
        { url: `${baseUrl}/weather`, priority: "0.8", changefreq: "daily" },
      ];

      // Generate XML
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      // Add static pages
      staticPages.forEach(page => {
        xml += "  <url>\n";
        xml += `    <loc>${page.url}</loc>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += "  </url>\n";
      });

      // Add article pages
      articles.forEach(article => {
        const articleUrl = buildArticleUrl(article);
        const lastmod = new Date(article.publishedAt).toISOString();

        xml += "  <url>\n";
        xml += `    <loc>${baseUrl}${articleUrl}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += "  </url>\n";
      });

      xml += "</urlset>";

      res.header("Content-Type", "application/xml");
      res.send(xml);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send("Error generating sitemap");
    }
  });


  // Auto-scraping endpoint - triggered by GitHub Actions every 2 hours
  app.post("/api/cron/scrape", requireCronAuth, async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log("\n".repeat(3) + "=".repeat(80));
    console.log("🚨 AUTO-SCRAPE TRIGGERED 🚨");
    console.log(`Time: ${timestamp}`);
    console.log(`Trigger: AUTOMATED CRON (GitHub Actions)`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log("=".repeat(80) + "\n");

    // Respond immediately
    res.json({
      success: true,
      message: "Auto-scrape started in background",
      timestamp,
    });

    // Process in background (same logic as manual scraping)
    (async () => {
      try {
        // CRITICAL: Acquire scheduler lock to prevent parallel scrapes
        const { acquireSchedulerLock, releaseSchedulerLock } = await import("./lib/scheduler-lock");
        const lockAcquired = await acquireSchedulerLock();

        if (!lockAcquired) {
          console.error(`[AUTO-SCRAPE] ❌ Could not acquire lock - another scrape is already running`);
          return;
        }

        console.log(`[AUTO-SCRAPE] 🔒 Scheduler lock acquired`);
        console.log(`[AUTO-SCRAPE] Starting scrape using runScheduledScrape()`);

        // Import and run the scheduled scrape function
        const { runScheduledScrape } = await import("./scheduler");

        const result = await runScheduledScrape();

        if (result) {
          console.log(`[AUTO-SCRAPE] ✅ Scrape completed successfully`);
          console.log(`[AUTO-SCRAPE] Total posts: ${result.totalPosts}`);
          console.log(`[AUTO-SCRAPE] Articles created: ${result.articlesCreated}`);
          console.log(`[AUTO-SCRAPE] Skipped (duplicates): ${result.skippedSemanticDuplicates}`);
          console.log(`[AUTO-SCRAPE] Skipped (not news/text graphics): ${result.skippedNotNews}`);
        } else {
          console.error(`[AUTO-SCRAPE] ❌ Scrape returned null result`);
        }
      } catch (error) {
        console.error(`[AUTO-SCRAPE] ❌ SCRAPING ERROR:`, error);
      } finally {
        // CRITICAL: Always release the lock
        try {
          const { releaseSchedulerLock } = await import("./lib/scheduler-lock");
          await releaseSchedulerLock();
          console.log(`[AUTO-SCRAPE] 🔓 Scheduler lock released`);
        } catch (lockError) {
          console.error(`[AUTO-SCRAPE] ❌ Error releasing lock:`, lockError);
        }
      }
    })();
  });

  // Enrichment endpoint - triggered by GitHub Actions
  app.post("/api/cron/enrich", requireCronAuth, async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log("\n".repeat(3) + "=".repeat(80));
    console.log("🔄 ENRICHMENT TRIGGERED 🔄");
    console.log(`Time: ${timestamp}`);
    console.log(`Trigger: EXTERNAL CRON SERVICE (GitHub Actions)`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log("=".repeat(80) + "\n");

    try {
      console.log("🔄 Starting enrichment pass...");
      const { StoryEnrichmentCoordinator } = await import("./services/story-enrichment-coordinator");
      const coordinator = new StoryEnrichmentCoordinator();

      const result = await coordinator.enrichDevelopingStories(storage);

      console.log("✅ Enrichment completed successfully");
      console.log("Result:", JSON.stringify(result, null, 2));

      res.json({
        success: true,
        message: "Enrichment completed successfully",
        timestamp: timestamp,
        result: result,
      });
    } catch (error) {
      console.error("❌ Error during enrichment:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      // Always return 200 OK for GitHub Actions (even on errors)
      res.json({
        success: false,
        message: "Enrichment completed with errors",
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

  // Analytics Dashboard Stats
  app.get("/api/admin/analytics/dashboard", requireAdminAuth, async (req, res) => {
    try {
      // 1. Top Articles (Last 7 days)
      // 1. Top Articles (Last 7 days)
      const topArticlesResult = await db.execute(sql`
        WITH metrics_agg AS (
            SELECT article_id, SUM(ga_views) as total_views
            FROM article_metrics
            GROUP BY article_id
        ),
        social_agg AS (
            SELECT article_id, 
                   SUM(reactions) as total_reactions,
                   SUM(comments) as total_comments,
                   SUM(shares) as total_shares
            FROM social_media_analytics
            GROUP BY article_id
        )
        SELECT 
            a.id,
            a.title,
            a.engagement_score as "engagementScore",
            a.published_at as "publishedAt",
            COALESCE(m.total_views, 0) as views,
            COALESCE(s.total_reactions, 0) as "fbReactions",
            COALESCE(s.total_comments, 0) as "fbComments",
            COALESCE(s.total_shares, 0) as "fbShares"
        FROM articles a
        LEFT JOIN metrics_agg m ON a.id = m.article_id
        LEFT JOIN social_agg s ON a.id = s.article_id
        ORDER BY a.engagement_score DESC
        LIMIT 10
      `);

      const topArticles = topArticlesResult.rows;

      // 2. Category Performance
      const categoryStats = await db.execute(sql`
        SELECT 
            category, 
            COUNT(*) as article_count,
            SUM(COALESCE(am.ga_views, 0)) as total_views,
            AVG(COALESCE(a.engagement_score, 0)) as avg_engagement
        FROM articles a
        LEFT JOIN article_metrics am ON a.id = am.article_id
        GROUP BY category
        ORDER BY avg_engagement DESC
      `);

      // 3. Daily Engagement (Last 7 days)
      // Note: FB engagement comes from social_media_analytics (reactions + comments + shares)
      const dailyStats = await db.execute(sql`
        WITH daily_views AS (
            SELECT metric_date, SUM(ga_views) as total_views
            FROM article_metrics
            WHERE metric_date >= NOW() - INTERVAL '7 days'
            GROUP BY metric_date
        ),
        daily_social AS (
            SELECT DATE(last_updated_at) as social_date,
                   SUM(reactions) + SUM(comments) + SUM(shares) as total_engagement
            FROM social_media_analytics
            WHERE last_updated_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(last_updated_at)
        )
        SELECT 
            COALESCE(v.metric_date, s.social_date) as metric_date,
            COALESCE(v.total_views, 0) as total_views,
            COALESCE(s.total_engagement, 0) as total_fb_engagement
        FROM daily_views v
        FULL OUTER JOIN daily_social s ON v.metric_date = s.social_date
        ORDER BY metric_date ASC
      `);

      res.json({
        topArticles,
        categoryStats: categoryStats.rows,
        dailyStats: dailyStats.rows
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
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

      // Auto-detect tags from title and content
      if (articleData.title && articleData.content) {
        articleData.tags = detectTags(articleData.title, articleData.content);
      }

      const article = await storage.createArticle(articleData);
      res.json(article);
    } catch (error) {
      console.error("Error creating article:", error);
      res.status(500).json({ error: "Failed to create article" });
    }
  });


  // Post timeline child article to Facebook with parent link - PROTECTED
  app.post("/api/admin/articles/:id/facebook-timeline", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { parentStoryId } = req.body;

      if (!parentStoryId) {
        return res.status(400).json({ error: "parentStoryId is required" });
      }

      // Get child article
      const article = await storage.getArticleById(id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      // Get parent story to build URL and title
      const parent = await storage.getArticleById(parentStoryId);
      if (!parent) {
        return res.status(404).json({ error: "Parent story not found" });
      }

      // Build parent URL
      const baseUrl = "https://phuketradar.com";
      const parentUrl = `${baseUrl}/${parent.category}/${parent.slug}`;

      // Post the child article to Facebook
      const result = await postArticleToFacebook(article, storage);

      // Add first comment linking to parent timeline
      if (result?.postId && process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
        try {
          const commentText = `📰 Latest update in: ${parent.storySeriesTitle || parent.title}\n👉 ${parentUrl}`;

          const commentResponse = await fetch(
            `https://graph.facebook.com/v18.0/${result.postId}/comments`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: commentText,
                access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
              }),
            }
          );

          if (!commentResponse.ok) {
            console.error("Failed to add comment to Facebook post");
          } else {
            console.log(`✅ Added parent timeline link comment to Facebook post`);
          }
        } catch (commentError) {
          console.error("Error adding comment:", commentError);
          // Don't fail the whole request if comment fails
        }
      }

      res.json(result);
    } catch (error: any) {
      console.error("Error posting timeline child to Facebook:", error);
      res.status(500).json({ error: error?.message || "Failed to post to Facebook" });
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
        // CRITICAL: Acquire scheduler lock to prevent parallel scrapes
        const { acquireSchedulerLock, releaseSchedulerLock } = await import("./lib/scheduler-lock");
        const lockAcquired = await acquireSchedulerLock();

        if (!lockAcquired) {
          console.error(`[Job ${job.id}] ❌ Could not acquire lock - another scrape is already running`);
          scrapeJobManager.markFailed(job.id, "Another scrape is already in progress");
          return;
        }

        console.log(`[Job ${job.id}] 🔒 Scheduler lock acquired`);

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
      } finally {
        // CRITICAL: Always release the scheduler lock to prevent database timeout
        try {
          const { releaseSchedulerLock } = await import("./lib/scheduler-lock");
          await releaseSchedulerLock();
          console.log(`[Job ${job.id}] 🔓 Scheduler lock released`);
        } catch (lockError) {
          console.error(`[Job ${job.id}] Error releasing lock:`, lockError);
        }
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

  // Manual scrape of individual post by URL - PROTECTED
  app.post("/api/admin/scrape/manual", requireAdminAuth, async (req, res) => {
    const timestamp = new Date().toISOString();
    const { postUrl } = req.body;

    if (!postUrl) {
      return res.status(400).json({ error: "Post URL is required" });
    }

    console.log("\n".repeat(3) + "=".repeat(80));
    console.log("🎯 MANUAL SCRAPE TRIGGERED 🎯");
    console.log(`Time: ${timestamp}`);
    console.log(`Trigger: MANUAL (Admin Dashboard)`);
    console.log(`Post URL: ${postUrl}`);
    console.log("=".repeat(80) + "\n");

    // Validate URL is a Facebook post
    if (!postUrl.includes('facebook.com')) {
      return res.status(400).json({ error: "URL must be a Facebook post" });
    }

    // Create job and respond immediately
    const job = scrapeJobManager.createJob();
    console.log(`Created manual scrape job: ${job.id}`);

    res.json({
      success: true,
      jobId: job.id,
      message: "Manual scrape started in background",
    });

    // Process in background
    (async () => {
      try {
        scrapeJobManager.updateJob(job.id, { status: 'processing' });

        console.log(`[Job ${job.id}] Starting manual scrape for: ${postUrl}`);

        // Import runManualPostScrape function
        const { runManualPostScrape } = await import("./scheduler");

        const result = await runManualPostScrape(postUrl, {
          onProgress: (stats: {
            totalPosts: number;
            processedPosts: number;
            createdArticles: number;
            skippedNotNews: number;
          }) => {
            scrapeJobManager.updateProgress(job.id, {
              totalPosts: stats.totalPosts,
              processedPosts: stats.processedPosts,
              createdArticles: stats.createdArticles,
              skippedNotNews: stats.skippedNotNews,
            });
          },
        });

        if (result.success) {
          console.log(`[Job ${job.id}] Manual scrape completed successfully`);
          if (result.article) {
            console.log(`[Job ${job.id}] Created article: ${result.article.title.substring(0, 60)}...`);
          } else {
            console.log(`[Job ${job.id}] Post was skipped: ${result.message}`);
          }
          scrapeJobManager.markCompleted(job.id);
        } else {
          console.error(`[Job ${job.id}] Manual scrape failed: ${result.message}`);
          scrapeJobManager.markFailed(job.id, result.message || "Manual scrape failed");
        }
      } catch (error) {
        console.error(`[Job ${job.id}] MANUAL SCRAPE ERROR:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        scrapeJobManager.markFailed(job.id, errorMessage);
      }
    })();
  });

  // Update article (approve/reject/edit) - PROTECTED
  app.patch("/api/admin/articles/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // SCORE LEARNING: Track manual score adjustments
      if (updates.interestScore !== undefined) {
        // Get current article to compare scores
        const currentArticle = await storage.getArticleById(id);
        if (currentArticle && currentArticle.interestScore !== updates.interestScore) {
          const { scoreLearningService } = await import("./services/score-learning");
          await scoreLearningService.recordAdjustment({
            articleId: id,
            originalScore: currentArticle.interestScore || 3,
            adjustedScore: updates.interestScore,
            adjustmentReason: `Admin manually adjusted score from ${currentArticle.interestScore || 3} to ${updates.interestScore}`,
          });
        }
      }

      // CRITICAL FIX: Sanitize timeline tags to ensure they're separate array elements
      if (updates.timelineTags) {
        console.log(`📝 [PATCH ARTICLE] Raw timelineTags received:`, updates.timelineTags);
        console.log(`   Type: ${typeof updates.timelineTags}, isArray: ${Array.isArray(updates.timelineTags)}`);

        // Ensure each tag is trimmed and separate
        if (Array.isArray(updates.timelineTags)) {
          updates.timelineTags = updates.timelineTags
            .flatMap((tag: any) => {
              // If a tag contains commas, split it
              if (typeof tag === 'string' && tag.includes(',')) {
                return tag.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
              }
              return typeof tag === 'string' ? tag.trim() : tag;
            })
            .filter((tag: any) => tag && tag.length > 0);

          console.log(`   Sanitized to: [${updates.timelineTags.join(', ')}] (${updates.timelineTags.length} separate tags)`);
        }
      }

      const article = await storage.updateArticle(id, updates);

      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      // Invalidate caches after article update
      invalidateArticleCaches();

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

      // Invalidate caches after deletion
      invalidateArticleCaches();

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

      // Auto-generate Switchy short URL for social media tracking
      if (!article.switchyShortUrl) {
        try {
          const { switchyService } = await import("./services/switchy");
          const { buildArticleUrl } = await import("../shared/category-map");
          if (switchyService.isConfigured()) {
            const baseUrl = process.env.REPLIT_DEV_DOMAIN
              ? `https://${process.env.REPLIT_DEV_DOMAIN}`
              : 'https://phuketradar.com';
            const articlePath = buildArticleUrl({ category: article.category, slug: article.slug, id: article.id });
            const fullUrl = `${baseUrl}${articlePath}`;

            const result = await switchyService.createArticleLink(
              fullUrl,
              'bio', // Default to bio link UTMs
              article.facebookHeadline || article.title,
              article.imageUrl || undefined
            );

            if (result.success && result.link?.shortUrl) {
              await storage.updateArticle(id, { switchyShortUrl: result.link.shortUrl });
              console.log(`🔗 [PUBLISH] Generated Switchy short URL: ${result.link.shortUrl}`);
            }
          }
        } catch (switchyError) {
          console.warn(`⚠️  [PUBLISH] Switchy short URL generation failed:`, switchyError);
          // Don't fail the publish if Switchy fails
        }
      }

      // Invalidate caches after publish
      invalidateArticleCaches();

      // Reload article to include the new short URL
      const updatedArticle = await storage.getArticleById(id);
      res.json(updatedArticle || article);
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

  // Generate Switchy short URL for article - PROTECTED
  app.post("/api/admin/articles/:id/switchy", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { platform = 'bio' } = req.body; // Default to bio link

      const article = await storage.getArticleById(id);

      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      if (!article.isPublished) {
        return res.status(400).json({ error: "Only published articles can have short links generated" });
      }

      // Import and use Switchy service
      const { switchyService } = await import("./services/switchy");

      if (!switchyService.isConfigured()) {
        return res.status(500).json({ error: "Switchy API key not configured" });
      }

      // Build the article URL
      const { buildArticleUrl } = await import("../shared/category-map");
      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'https://phuketradar.com';

      const articlePath = buildArticleUrl({ category: article.category, slug: article.slug, id: article.id });
      const fullUrl = `${baseUrl}${articlePath}`;

      // Create short link with platform-specific UTMs
      const result = await switchyService.createArticleLink(
        fullUrl,
        platform as 'instagram' | 'facebook' | 'threads' | 'newsletter' | 'bio',
        article.facebookHeadline || article.title,
        article.imageUrl || undefined
      );

      if (!result.success || !result.link) {
        return res.status(500).json({ error: result.error || "Failed to create short link" });
      }

      // Save the short URL to the article
      await storage.updateArticle(id, {
        switchyShortUrl: result.link.shortUrl,
      });

      console.log(`🔗 [SWITCHY] Created/Returned short URL: ${result.link.shortUrl}`);

      res.json(result);
    } catch (error) {
      console.error("Error generating Short link:", error);
      res.status(500).json({ error: "Failed to generate short URL" });
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

  // Score Learning routes - PROTECTED

  // Get score learning insights
  app.get("/api/admin/score-learning/insights", requireAdminAuth, async (req, res) => {
    try {
      const { scoreLearningService } = await import("./services/score-learning");
      const insights = await scoreLearningService.getLearningInsights();
      const statistics = await scoreLearningService.getStatistics();

      res.json({
        insights,
        statistics,
      });
    } catch (error) {
      console.error("Error getting score learning insights:", error);
      res.status(500).json({ error: "Failed to get insights" });
    }
  });

  // Get score adjustments for a specific category
  app.get("/api/admin/score-learning/category/:category", requireAdminAuth, async (req, res) => {
    try {
      const { category } = req.params;
      const { scoreLearningService } = await import("./services/score-learning");
      const adjustments = await scoreLearningService.getAdjustmentsByCategory(category);

      res.json(adjustments);
    } catch (error) {
      console.error("Error getting category adjustments:", error);
      res.status(500).json({ error: "Failed to get adjustments" });
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

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

  // Configure multer for image uploads
  const storage_multer = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage_multer,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  // Image upload endpoint - PROTECTED
  app.post("/api/admin/upload-image", requireAdminAuth, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const originalPath = req.file.path;
      const filenameWithoutExt = path.parse(req.file.filename).name;
      const newFilename = `${filenameWithoutExt}.webp`;
      const newPath = path.join(path.dirname(originalPath), newFilename);

      // Optimize image: Resize to max 1200px width and convert to WebP (quality 80)
      await sharp(originalPath)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(newPath);

      // Delete original file if it's different from the new one
      if (originalPath !== newPath) {
        await fs.unlink(originalPath);
      }

      // Generate URL for uploaded image - use relative path for both dev and prod
      const imageUrl = `/uploads/${newFilename}`;

      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading image:", error);
      // Clean up file if processing failed
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (e) {
          // Ignore cleanup error
        }
      }
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
