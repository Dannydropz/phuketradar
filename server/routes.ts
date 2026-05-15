import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getScraperService } from "./services/scraper";
import { translatorService } from "./services/translator";
import { PLACEHOLDER_IMAGE } from "./lib/placeholders";
import { insertArticleSchema, insertSubscriberSchema, discoveredVideos, insertDiscoveredVideoSchema } from "@shared/schema";
import { z } from "zod";
import { scrapeJobManager } from "./scrape-jobs";
import { checkSemanticDuplicate } from "./lib/semantic-similarity";
import { getEnabledSources } from "./config/news-sources";
import { postArticleToFacebook } from "./lib/facebook-service";
import { postArticleToInstagram } from "./lib/instagram-service";
import { postArticleToPubler } from "./lib/publer-service";
import { postArticleToThreads } from "./lib/threads-service";
import { generateDailyNewsletterHTML } from "./services/newsletter";
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

  // Batch insert discovered videos from n8n
  app.post("/api/internal/discovered-videos/batch", async (req, res) => {
    try {
      const { videos } = req.body;
      
      if (!Array.isArray(videos)) {
        return res.status(400).json({ error: "Videos array is required" });
      }

      if (videos.length === 0) {
        return res.json({ saved: 0, skipped: 0 });
      }

      console.log(`[VIDEO-BATCH] Received ${videos.length} videos for processing`);

      // We'll process them in a way that allows us to count saved vs skipped.
      // Postgres ON CONFLICT DO NOTHING doesn't easily return which ones were skipped in a simple insert.
      // However, the user specifically asked for { saved: N, skipped: M }.
      
      let saved = 0;
      let skipped = 0;

      // To accurately count saved vs skipped with ON CONFLICT DO NOTHING, 
      // we can use common table expression or just do it in one go and check rowCount.
      // But rowCount will only tell us how many were inserted.
      
      const insertResult = await db.insert(discoveredVideos)
        .values(videos.map(v => ({
          videoId: v.video_id,
          platform: v.platform,
          source: v.source,
          videoUrl: v.video_url,
          coverUrl: v.cover_url,
          authorUsername: v.author_username,
          description: v.description,
          likeCount: v.like_count || 0,
          commentCount: v.comment_count || 0,
          shareCount: v.share_count || 0,
          playCount: v.play_count || 0,
          createdAtSource: v.created_at_source ? new Date(v.created_at_source) : null,
          durationSeconds: v.duration_seconds,
          relevanceScore: v.relevance_score || 0,
          incidentType: v.incident_type || 'pending_review',
          involvesForeigner: v.involves_foreigner || 'unknown',
          locationInPhuket: v.location_in_phuket,
          scoreReason: v.score_reason,
          status: v.status || 'queued',
        })))
        .onConflictDoNothing({ target: [discoveredVideos.videoId, discoveredVideos.platform] })
        .returning({ id: discoveredVideos.id });

      saved = insertResult.length;
      skipped = videos.length - saved;

      console.log(`[VIDEO-BATCH] Completed: ${saved} saved, ${skipped} skipped`);
      res.json({ saved, skipped });
    } catch (error) {
      console.error("Error in batch video discovery:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to process video batch", details: errorMessage });
    }
  });

  // Admin Video Review Endpoints
  app.get("/api/admin/discovered-videos", async (req, res) => {
    try {
      const videos = await db.select()
        .from(discoveredVideos)
        .where(eq(discoveredVideos.status, 'queued'))
        .orderBy(desc(discoveredVideos.playCount));
      res.json(videos);
    } catch (error) {
      console.error("Error fetching discovered videos:", error);
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  app.patch("/api/admin/discovered-videos/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      await db.update(discoveredVideos)
        .set({ status: 'approved' })
        .where(eq(discoveredVideos.id, parseInt(id)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error approving video:", error);
      res.status(500).json({ error: "Failed to approve video" });
    }
  });

  app.patch("/api/admin/discovered-videos/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      await db.update(discoveredVideos)
        .set({ status: 'rejected' })
        .where(eq(discoveredVideos.id, parseInt(id)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting video:", error);
      res.status(500).json({ error: "Failed to reject video" });
    }
  });


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
          // Get latest 5 articles for the "Latest" sidebar section (excluding current)
          const allArticles = await storage.getPublishedArticles();
          const latestArticles = allArticles
            .filter(a => a.id !== id)
            .slice(0, 5);

          // Get trending articles for the "Trending in Phuket" section
          // We fetch 4 to ensure we have at least 3 if the current one is in the trending list
          const trendingArticles = await smartLearningService.getTrendingArticles(4);
          const relatedArticles = trendingArticles
            .filter(a => a.id !== id)
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
  // Legacy sitemap route — redirects to the canonical one below
  app.get("/sitemap.xml", (req, res, next) => next());


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

  // Daily Newsletter — triggered by external cron at 6pm Bangkok time (11:00 UTC)
  app.post("/api/cron/newsletter/send", requireCronAuth, async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log("\n".repeat(3) + "=".repeat(80));
    console.log("📨 DAILY NEWSLETTER TRIGGERED 📨");
    console.log(`Time: ${timestamp}`);
    console.log("=".repeat(80) + "\n");

    try {
      // Generate HTML synchronously so errors surface to n8n
      const html = await generateDailyNewsletterHTML();
      if (!html) {
        console.log(`[NEWSLETTER-CRON] ⚠️ No articles found — newsletter not sent`);
        return res.status(404).json({ success: false, error: "No articles found to generate newsletter", timestamp });
      }

      // Save preview for reference
      const previewPath = path.join(process.cwd(), "newsletter_approval_preview.html");
      await fs.writeFile(previewPath, html.html, "utf-8");
      console.log(`[NEWSLETTER-CRON] 📄 Preview saved`);

      // Send via Resend Broadcasts (marketing quota = free unlimited sends to up to 1,000 contacts)
      const { sendResendBroadcast } = await import("./lib/resend-client");
      const subject = html.topStoryTitle;
      const previewText = html.topStoryExcerpt;

      const result = await sendResendBroadcast({ subject, html: html.html, previewText });

      if (result.success) {
        console.log(`[NEWSLETTER-CRON] ✅ Newsletter sent! Broadcast ID: ${result.broadcastId}`);
        return res.json({ success: true, broadcastId: result.broadcastId, subject, timestamp });
      } else {
        console.error(`[NEWSLETTER-CRON] ❌ Resend broadcast failed: ${result.error}`);
        return res.status(500).json({ success: false, error: result.error, timestamp });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[NEWSLETTER-CRON] ❌ ERROR: ${msg}`);
      return res.status(500).json({ success: false, error: msg, timestamp });
    }
  });

  // Newsletter test send — sends to a single email only (never to all subscribers)
  app.post("/api/cron/newsletter/test", requireCronAuth, async (req, res) => {
    const toEmail = (req.body?.email as string) || process.env.ADMIN_EMAIL || "dannyjkeegan@gmail.com";
    console.log(`[NEWSLETTER-TEST] Sending test to: ${toEmail}`);

    try {
      const html = await generateDailyNewsletterHTML();
      if (!html) {
        return res.status(404).json({ error: "No articles found to generate newsletter" });
      }

      const apiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || "newsletter@news.phuketradar.com";
      if (!apiKey) return res.status(500).json({ error: "RESEND_API_KEY not configured" });

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Phuket Radar <${fromEmail}>`,
          to: [toEmail],
          subject: `[TEST] ${html.topStoryTitle}`,
          html: html.html,
        }),
      });
      const data = await response.json() as { id?: string; message?: string };

      if (!response.ok) {
        console.error(`[NEWSLETTER-TEST] ❌ Failed:`, data);
        return res.status(500).json({ error: data.message || "Send failed" });
      }

      console.log(`[NEWSLETTER-TEST] ✅ Test email sent to ${toEmail} (id: ${data.id})`);
      res.json({ success: true, to: toEmail, subject: `[TEST] ${html.topStoryTitle}`, id: data.id });
    } catch (error) {
      console.error("[NEWSLETTER-TEST] ❌ ERROR:", error);
      res.status(500).json({ error: "Internal error" });
    }
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
            GREATEST(a.view_count, COALESCE(m.total_views, 0)) as views,
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
            SUM(GREATEST(COALESCE(a.view_count, 0), COALESCE(am.ga_views, 0))) as total_views,
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

      // 4. Summary Stats (Total 7 days)
      const summaryStats = await db.execute(sql`
        SELECT 
            SUM(GREATEST(COALESCE(a.view_count, 0), COALESCE(v.total_views, 0))) as "totalViews7Days"
        FROM articles a
        LEFT JOIN (
            SELECT article_id, SUM(ga_views) as total_views
            FROM article_metrics
            WHERE metric_date >= NOW() - INTERVAL '7 days'
            GROUP BY article_id
        ) v ON a.id = v.article_id
        WHERE a.published_at >= NOW() - INTERVAL '7 days'
      `);

      res.json({
        topArticles,
        categoryStats: categoryStats.rows,
        dailyStats: dailyStats.rows,
        summary: summaryStats.rows[0]
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Get all articles (including unpublished) - PROTECTED
  // Uses optimized lean query that excludes heavy fields (content, embedding, entities) for fast loading
  app.get("/api/admin/articles", requireAdminAuth, async (req, res) => {
    try {
      // Use lean version that excludes content, embedding, entities for MUCH faster loading
      // These fields can add megabytes of data when there are hundreds of articles
      const articles = await storage.getAllArticlesLean(500, 0);

      // Add cache headers for browser-side caching (short TTL since admin may refresh often)
      res.set({
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      });

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

  // Get single article by ID with full content (for editing) - PROTECTED
  app.get("/api/admin/articles/:id", requireAdminAuth, async (req, res) => {
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

  // Manual scrape of individual post OR entire page by URL - PROTECTED
  app.post("/api/admin/scrape/manual", requireAdminAuth, async (req, res) => {
    const timestamp = new Date().toISOString();
    const { postUrl } = req.body;

    if (!postUrl) {
      return res.status(400).json({ error: "URL or page name is required" });
    }

    console.log("\n".repeat(3) + "=".repeat(80));
    console.log("🎯 MANUAL SCRAPE TRIGGERED 🎯");
    console.log(`Time: ${timestamp}`);
    console.log(`Trigger: MANUAL (Admin Dashboard)`);
    console.log(`Input: ${postUrl}`);
    console.log("=".repeat(80) + "\n");

    // Determine if this is a single post URL or a page URL/name
    // Single posts have: /posts/, /share/, /reel/, /videos/, /watch, pfbid
    const isSinglePostUrl = postUrl.includes('/posts/') ||
      postUrl.includes('/share/') ||
      postUrl.includes('/reel/') ||
      postUrl.includes('/reels/') ||
      postUrl.includes('/videos/') ||
      postUrl.includes('/watch') ||
      postUrl.includes('pfbid');

    // If it's just a page name (no facebook.com) or a bare facebook.com page URL, treat as page scrape
    const isPageScrape = !isSinglePostUrl;

    console.log(`Mode: ${isPageScrape ? 'PAGE SCRAPE (all recent posts)' : 'SINGLE POST SCRAPE'}`);

    // Create job and respond immediately
    const job = scrapeJobManager.createJob();
    console.log(`Created manual scrape job: ${job.id}`);

    res.json({
      success: true,
      jobId: job.id,
      message: isPageScrape
        ? "Scraping page for recent posts in background..."
        : "Scraping single post in background...",
    });

    // Process in background
    (async () => {
      try {
        scrapeJobManager.updateJob(job.id, { status: 'processing' });

        if (isPageScrape) {
          // PAGE SCRAPE - scrape all recent posts from a Facebook page
          console.log(`[Job ${job.id}] Starting manual PAGE scrape for: ${postUrl}`);

          const { runManualPageScrape } = await import("./scheduler");

          const result = await runManualPageScrape(postUrl, {
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
            console.log(`[Job ${job.id}] Manual page scrape completed successfully`);
            console.log(`[Job ${job.id}] Articles created: ${result.articlesCreated}`);
            console.log(`[Job ${job.id}] Posts skipped: ${result.articlesSkipped}`);
            scrapeJobManager.markCompleted(job.id);
          } else {
            console.error(`[Job ${job.id}] Manual page scrape failed: ${result.message}`);
            scrapeJobManager.markFailed(job.id, result.message || "Manual page scrape failed");
          }
        } else {
          // SINGLE POST SCRAPE - scrape just one specific post
          console.log(`[Job ${job.id}] Starting manual SINGLE POST scrape for: ${postUrl}`);

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
            console.log(`[Job ${job.id}] Manual post scrape completed successfully`);
            if (result.article) {
              console.log(`[Job ${job.id}] Created article: ${result.article.title.substring(0, 60)}...`);
            } else {
              console.log(`[Job ${job.id}] Post was skipped: ${result.message}`);
            }
            scrapeJobManager.markCompleted(job.id);
          } else {
            console.error(`[Job ${job.id}] Manual post scrape failed: ${result.message}`);
            scrapeJobManager.markFailed(job.id, result.message || "Manual post scrape failed");
          }
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

      // CRITICAL: Prevent enrichment from overwriting manual edits
      // If admin is editing content, title, or excerpt, disable auto-enrichment
      const contentEditFields = ['content', 'title', 'excerpt'];
      const isContentEdit = contentEditFields.some(field => updates[field] !== undefined);

      if (isContentEdit) {
        console.log(`🔒 [PATCH ARTICLE] Content field edited - disabling isDeveloping to prevent auto-enrichment overwrites`);
        updates.isDeveloping = false;
        // Track when this was manually edited so enrichment knows to skip it
        updates.lastManualEditAt = new Date();
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

  // Manually trigger face blur for an existing article - PROTECTED
  app.post("/api/admin/articles/:id/blur", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.getArticleById(id);

      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      console.log(`🛡️  MANUAL BLUR: Triggered face blur for article: ${article.title}`);

      // We need the original source image to re-process it
      // Since Cloudinary URLs are stored, we can use those as source, 
      // but re-uploading them with the blur transformation
      const { imageDownloaderService } = await import("./services/image-downloader");

      let newImageUrl = article.imageUrl;
      let newImageUrls = article.imageUrls;

      if (article.imageUrl) {
        console.log(`⬇️  Re-processing primary image...`);
        const savedPath = await imageDownloaderService.downloadAndSaveImage(article.imageUrl, "news-blurred", { blurFaces: true });
        if (savedPath) newImageUrl = savedPath;
      }

      if (article.imageUrls && article.imageUrls.length > 0) {
        console.log(`⬇️  Re-processing ${article.imageUrls.length} gallery images...`);
        const savedUrls: string[] = [];
        for (const url of article.imageUrls) {
          const savedPath = await imageDownloaderService.downloadAndSaveImage(url, "news-gallery-blurred", { blurFaces: true });
          savedUrls.push(savedPath || url);
        }
        newImageUrls = savedUrls;
      }

      const updatedArticle = await storage.updateArticle(id, {
        imageUrl: newImageUrl,
        imageUrls: newImageUrls,
      });

      // Invalidate caches
      invalidateArticleCaches();

      res.json({
        success: true,
        message: "Images re-processed with face blurring",
        article: updatedArticle
      });
    } catch (error) {
      console.error("Error blurring article images:", error);
      res.status(500).json({ error: "Failed to blur images" });
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

  // ─── SCRAPER BLOCKLIST ROUTES ───────────────────────────────────────────────
  // GET /api/admin/blocklist — view all blocked entries
  app.get("/api/admin/blocklist", requireAdminAuth, async (req, res) => {
    try {
      const list = await storage.getBlocklist();
      res.json(list);
    } catch (error) {
      console.error("Error fetching blocklist:", error);
      res.status(500).json({ error: "Failed to fetch blocklist" });
    }
  });

  // POST /api/admin/blocklist — manually block a source URL or Facebook post ID
  // Use this for IMMEDIATE fix: block the bomb-threat post RIGHT NOW without needing to delete/re-scrape
  // Body: { sourceUrl?: string, sourceFacebookPostId?: string, reason?: string }
  app.post("/api/admin/blocklist", requireAdminAuth, async (req, res) => {
    try {
      const { sourceUrl, sourceFacebookPostId, reason = "manually_blocked" } = req.body;

      if (!sourceUrl && !sourceFacebookPostId) {
        return res.status(400).json({ error: "At least one of sourceUrl or sourceFacebookPostId is required" });
      }

      await storage.addToBlocklist({
        sourceUrl: sourceUrl || undefined,
        sourceFacebookPostId: sourceFacebookPostId || undefined,
        reason,
        articleTitle: req.body.articleTitle || undefined,
      });

      console.log(`🚫 [BLOCKLIST] Manual block added:`);
      if (sourceUrl) console.log(`   Source URL: ${sourceUrl}`);
      if (sourceFacebookPostId) console.log(`   FB Post ID: ${sourceFacebookPostId}`);
      console.log(`   Reason: ${reason}`);

      res.json({ success: true, message: "Entry added to blocklist — will be skipped on all future scrapes" });
    } catch (error) {
      console.error("Error adding to blocklist:", error);
      res.status(500).json({ error: "Failed to add to blocklist" });
    }
  });

  // Publish article - PROTECTED
  app.post("/api/admin/articles/:id/publish", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.updateArticle(id, {
        isPublished: true,
        facebookPostId: `LOCK:MANUAL:${id}`, // Prevent n8n from auto-posting, button will still appear
        instagramPostId: `IG-LOCK:MANUAL:${id}`,
        threadsPostId: `THREADS-LOCK:MANUAL:${id}`
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

          console.log(`🔗 [PUBLISH] Attempting to generate Switchy short URL for article ${id}...`);

          if (switchyService.isConfigured()) {
            const baseUrl = process.env.REPLIT_DEV_DOMAIN
              ? `https://${process.env.REPLIT_DEV_DOMAIN}`
              : 'https://phuketradar.com';
            const articlePath = buildArticleUrl({ category: article.category, slug: article.slug, id: article.id });
            const fullUrl = `${baseUrl}${articlePath}`;

            console.log(`🔗 [PUBLISH] Article URL: ${fullUrl}`);

            const result = await switchyService.createArticleLink(
              fullUrl,
              'bio', // Default to bio link UTMs
              article.facebookHeadline || article.title,
              article.imageUrl || undefined
            );

            if (result.success && result.link?.shortUrl) {
              await storage.updateArticle(id, { switchyShortUrl: result.link.shortUrl });
              console.log(`✅ [PUBLISH] Generated Switchy short URL: ${result.link.shortUrl}`);
            } else {
              console.warn(`⚠️  [PUBLISH] Switchy generation failed: ${result.error || 'Unknown error'}`);
              console.warn(`⚠️  [PUBLISH] Full Switchy response:`, JSON.stringify(result));
            }
          } else {
            console.warn(`⚠️  [PUBLISH] Switchy not configured (SWITCHY_API_KEY not set)`);
          }
        } catch (switchyError) {
          console.warn(`⚠️  [PUBLISH] Switchy short URL generation exception:`, switchyError);
          // Don't fail the publish if Switchy fails
        }
      } else {
        console.log(`🔗 [PUBLISH] Article already has Switchy URL: ${article.switchyShortUrl}`);
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
  // Supports: { force: true } in body to re-post an already-posted article
  app.post("/api/admin/articles/:id/facebook", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { force, caption } = req.body || {};

      const article = await storage.getArticleById(id);

      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      if (!article.isPublished) {
        return res.status(400).json({ error: "Only published articles can be posted to Facebook" });
      }

      // If already posted and not forcing, return error
      if (article.facebookPostId && !article.facebookPostId.startsWith('LOCK:') && !force) {
        return res.status(400).json({
          error: "Article already posted to Facebook",
          hint: "Use { force: true } in request body to re-post with updated content"
        });
      }

      // If forcing a re-post, clear the old Facebook post ID first
      if (article.facebookPostId && force) {
        console.log(`🔄 [FB-REPOST] Force re-posting article ${id} - clearing old facebookPostId: ${article.facebookPostId}`);
        await storage.updateArticle(id, {
          facebookPostId: null,
          facebookPostUrl: null
        });
        // Reload article after clearing
        const clearedArticle = await storage.getArticleById(id);
        if (!clearedArticle) {
          return res.status(404).json({ error: "Article not found after clearing" });
        }
        // Use the cleared article for posting
        const fbResult = await postArticleToFacebook(clearedArticle, storage, caption || undefined);

        if (!fbResult) {
          return res.status(500).json({ error: "Failed to re-post to Facebook" });
        }

        const updatedArticle = await storage.getArticleById(id);
        console.log(`✅ [FB-REPOST] Successfully re-posted article with new post ID: ${fbResult.postId}`);

        return res.json({
          ...updatedArticle,
          status: fbResult.status,
          reposted: true,
          note: "Article was re-posted to Facebook with updated content"
        });
      }

      const fbResult = await postArticleToFacebook(article, storage, caption || undefined);

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
        (article) => (article.imageUrl || (article.imageUrls && article.imageUrls.length > 0)) && (!article.facebookPostId || article.facebookPostId.startsWith('LOCK:'))
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

      const igResult = await postArticleToPubler(article, storage);

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

  // Upgrade & Enrich article with premium AI - PROTECTED
  // Hard-sealed to OpenAI GPT-4o mini. Anthropic is ONLY used by the Deep Enrich endpoint.
  app.post("/api/admin/articles/:id/upgrade-enrich", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { targetScore = 4 } = req.body; // Default target score is 4

      const article = await storage.getArticleById(id);

      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      // ⛔ HARD-SEALED: upgrade-enrich always uses OpenAI GPT-4o mini.
      // Anthropic is reserved exclusively for the manual Deep Enrich route (/api/admin/articles/:id/enrich-premium).
      console.log(`\n✨ [UPGRADE-ENRICH] Starting premium enrichment for article: ${article.title.substring(0, 60)}...`);
      console.log(`   📊 Current score: ${article.interestScore || 'N/A'} → Target: ${targetScore}`);
      console.log(`   📝 Current content length: ${article.content?.length || 0} chars`);
      console.log(`   🤖 Provider: OpenAI GPT-4o mini`);

      // Run premium enrichment using OpenAI GPT-4o mini
      const enrichmentResult = await translatorService.enrichWithPremiumGPT4({
        title: article.title,
        content: article.content || '',
        excerpt: article.excerpt || '',
        category: article.category,
      }, "gpt-4o-mini"); // forceAnthropic not passed → defaults to OpenAI

      console.log(`   ✅ OpenAI GPT-4o mini enrichment complete`);
      console.log(`   📝 New content length: ${enrichmentResult.enrichedContent?.length || 0} chars`);

      // Generate a new Facebook headline if one doesn't exist
      let facebookHeadline = article.facebookHeadline;
      if (!facebookHeadline && enrichmentResult.enrichedTitle) {
        // Create a CURIOSITY GAP teaser headline that withholds details to drive clicks
        try {
          const { default: OpenAI } = await import("openai");
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

          const headlineResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You generate CURIOSITY GAP teasers for Facebook (max 20 words). 
                
THE GOAL: Hook readers but WITHHOLD key details so they MUST click to learn more.

PATTERNS THAT WORK:
- State outcome but omit cause: "A man has been found dead after..." (click to learn how)
- Hint at drama without details: "Police investigating after incident at..." (what happened?)
- Vague but intriguing: "Tourist arrested after altercation in Patong" (click to learn why)

NEVER reveal the whole story. NEVER use useless CTAs like "see the photos".`,
              },
              {
                role: "user",
                content: `Generate a curiosity-gap teaser for Facebook (withhold key details to force clicks):\n\nFull Title: ${enrichmentResult.enrichedTitle}\nExcerpt: ${enrichmentResult.enrichedExcerpt}`,
              },
            ],
            temperature: 0.7,
            max_tokens: 60,
          });

          facebookHeadline = headlineResponse.choices[0].message.content?.trim().replace(/^["']|["']$/g, '') || enrichmentResult.enrichedTitle;
          console.log(`   📱 Generated curiosity-gap headline: ${facebookHeadline}`);
        } catch (headlineError) {
          console.warn(`   ⚠️  Failed to generate Facebook headline:`, headlineError);
          facebookHeadline = enrichmentResult.enrichedTitle;
        }
      }


      // Record the score adjustment for learning
      if (article.interestScore !== targetScore) {
        const { scoreLearningService } = await import("./services/score-learning");
        await scoreLearningService.recordAdjustment({
          articleId: id,
          originalScore: article.interestScore || 3,
          adjustedScore: targetScore,
          adjustmentReason: `Admin upgraded story with premium GPT-4o enrichment (${article.interestScore || 3} → ${targetScore})`,
        });
      }

      // Update the article with enriched content and new score
      const updatedArticle = await storage.updateArticle(id, {
        title: enrichmentResult.enrichedTitle,
        content: enrichmentResult.enrichedContent,
        excerpt: enrichmentResult.enrichedExcerpt,
        interestScore: targetScore,
        facebookHeadline: facebookHeadline || undefined,
        enrichmentCount: (article.enrichmentCount || 0) + 1,
        lastEnrichedAt: new Date(),
      });

      if (!updatedArticle) {
        return res.status(500).json({ error: "Failed to update article" });
      }

      // Invalidate caches
      invalidateArticleCaches();

      console.log(`   🎉 [UPGRADE-ENRICH] Complete! Article upgraded to score ${targetScore}`);

      res.json({
        success: true,
        article: updatedArticle,
        changes: {
          titleChanged: article.title !== enrichmentResult.enrichedTitle,
          contentEnriched: true,
          excerptChanged: article.excerpt !== enrichmentResult.enrichedExcerpt,
          scoreUpgraded: article.interestScore !== targetScore,
          previousScore: article.interestScore || 3,
          newScore: targetScore,
          facebookHeadlineGenerated: !article.facebookHeadline && !!facebookHeadline,
        },
      });
    } catch (error) {
      console.error("Error upgrading/enriching article:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to upgrade article" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Deep Enrich — Premium Manual Enrichment via Claude Sonnet - PROTECTED
  // Step 1: Fetch fresh comments from original Facebook post (ScrapeCreators)
  // Step 2: Call Claude Sonnet 4-6 directly with full veteran-correspondent prompt
  // Step 3: Return enriched content for review — does NOT auto-save
  // ─────────────────────────────────────────────────────────────────────────────
  app.post("/api/admin/articles/:id/enrich-premium", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { editorNotes } = req.body as { editorNotes?: string };

      const article = await storage.getArticleById(id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      console.log(`\n🚀 [DEEP-ENRICH] Starting premium enrichment for: ${article.title.substring(0, 60)}...`);

      // ── STEP 1: Fetch fresh Facebook comments ─────────────────────────────
      let freshComments: string[] = [];
      let freshCommentCount = 0;

      const sourcePostUrl = article.sourceUrl;
      if (sourcePostUrl && sourcePostUrl.includes('facebook.com')) {
        try {
          console.log(`   💬 [DEEP-ENRICH] Fetching fresh comments from: ${sourcePostUrl.substring(0, 80)}...`);
          const { scrapePostComments } = await import("./services/scraper");
          const comments = await scrapePostComments(sourcePostUrl, 20);
          freshComments = comments.map(c => c.text);
          freshCommentCount = freshComments.length;
          console.log(`   ✅ [DEEP-ENRICH] Got ${freshCommentCount} fresh comments`);
        } catch (commentError) {
          console.warn(`   ⚠️ [DEEP-ENRICH] Comment fetch failed — proceeding without fresh comments:`, commentError);
        }
      } else {
        console.log(`   ℹ️  [DEEP-ENRICH] No Facebook source URL — skipping comment fetch`);
      }

      // ── STEP 2: Build prompt and call Claude Sonnet 4-6 ─────────────────
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured — cannot run Deep Enrich" });
      }

      // Use the original veteran-correspondent Sonnet system prompt
      const sonnetSystemPrompt = `You are a veteran wire-service correspondent who has lived in Phuket for over a decade. You write breaking news for an audience of long-term expats and residents who know the island intimately — they know every soi, every shortcut, every police station. Never explain Phuket to them. Write like an insider talking to insiders.

Your job is to transform raw translated Thai-language source material into a complete, professional English news article. You must:
1. Report ONLY what the source explicitly states — never invent, embellish, or dramatize
2. ADD relevant context and background using the verified reference material provided — but only when it connects specifically to THIS story, not as generic filler
3. Write articles substantial enough to be genuinely useful, even when the source material is brief
4. End every article with an "On the Ground" section — story-specific practical context written in an insider voice (see instructions in user message)

VOICE: You are not writing a travel safety brochure. You are writing for people who live here. They don't need to be told what Bangla Road is or that Thailand drives on the left. They DO want to know which specific police station is handling this case, whether this stretch of road has had similar incidents, or what the actual practical implications are for their daily life.

You produce JSON output only. No markdown, no commentary outside the JSON structure.

NEVER use em-dashes (—) in your writing. Use commas, periods, semicolons, or restructure the sentence instead. This applies to the title, content, and excerpt.`;

      // Build the comments block from fresh comments (or fallback to empty)
      const allComments = freshComments.length > 0 ? freshComments : [];
      const commentsBlock = allComments.length > 0 ? `
## THAI FACEBOOK COMMENTS — READ EVERY ONE CAREFULLY

The comments below are from the original Thai Facebook post. They are a PRIMARY source — as important as the article text itself. You MUST read each comment individually and extract specific details.

REQUIRED: Write a "## Public Reaction" section using ONLY concrete details from the comments below. Follow these rules:

RULE 1 — QUOTE OR PARAPHRASE SPECIFIC COMMENTS
Do NOT write vague summaries like "many commenters expressed frustration" or "several called for stricter measures."
Instead, extract and attribute specific viewpoints:
- BAD: "Commenters called for stricter measures to prevent such incidents."
- GOOD: "One commenter suggested a fine of 10,000 USD, while others demanded the couple's faces be published publicly as a deterrent. Several linked the incident to Thailand's free visa policy, arguing it has attracted tourists who exploit local businesses."

RULE 2 — EXTRACT AT LEAST 4 DISTINCT VIEWPOINTS from the comments. Group by theme: punishments suggested, blame attribution, pattern recognition, policy criticism, eyewitness additions, practical suggestions, emotional reactions.

RULE 3 — INCLUDE ENGAGEMENT NUMBERS if visible (reaction count, comment count, shares).

RULE 4 — PRESERVE SPECIFIC DETAILS: numbers, locations, names, policies mentioned in comments.

RULE 5 — MINIMUM 4 sentences when 50+ comments. Minimum 6 sentences when 200+ comments.

RULE 6 — Comments are in Thai. Translate and incorporate them. Do not skip comments because they are in Thai.

COMMENTS:
${allComments.join('\n')}
` : '';

      // Build editor notes block — only injected when non-empty
      const trimmedEditorNotes = (editorNotes || '').trim();
      const editorNotesBlock = trimmedEditorNotes ? `
EDITOR NOTES (from Phuket Radar editor — treat as trusted local knowledge):
${trimmedEditorNotes}

These notes come from the editor who lives in Phuket and has direct local knowledge. You MUST incorporate any facts provided here into the article. These are more reliable than comment-sourced information and do not need "according to" attribution — they can be stated as fact. If the editor's notes contradict the source material, prioritise the editor's notes and note the discrepancy.
` : '';

      const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok' });

      const CATEGORY_CONTEXT_BLOCKS: Record<string, string> = {
        'Crime': `VERIFIED PHUKET REFERENCE — USE WHEN RELEVANT:\n- Emergency: Tourist Police 1155, Police 191, Ambulance 1669, Fire 199\n- Stations: Phuket has 8 police stations (Phuket City, Chalong, Patong, Kathu, Thalang, Cherng Talay, Kamala, Wichit). Patong handles most tourist nightlife incidents.\n- Legal Context: Foreigners are entitled to consular access. Bail for foreigners is often higher; passport seizure is standard for serious charges.\n- Drugs: Severe penalties; Category 1 (meth, heroin, MDMA) possession can carry 1-10 years; trafficking carries life.`,
        'Traffic': `VERIFIED PHUKET REFERENCE — USE WHEN RELEVANT:\n- Safety: Phuket roads have some of Thailand's highest accident rates, especially for motorbikes.\n- Known Blackspots: Patong Hill (steep/blind curves), Heroines Monument intersection, Thepkrasattri Road, Chalong Circle, Darasamut & Sam Kong intersections.\n- Hospitals: Vachira Phuket Hospital (government trauma center) and Bangkok Hospital Phuket (private, advanced trauma).\n- Rescue: Kusoldharm Rescue Foundation (076-246 301) operates primary first-responder network.`,
        'Accidents': `VERIFIED PHUKET REFERENCE — USE WHEN RELEVANT:\n- Known Blackspots: Patong Hill (steep/blind curves), Heroines Monument intersection, Thepkrasattri Road, Chalong Circle.\n- Hospitals: Vachira Phuket Hospital (main government trauma center), Bangkok Hospital Phuket (best-equipped private trauma).\n- Rescue: Kusoldharm Rescue Foundation (076-246 301) operates primary first-responder network.`,
        'Tourism': `VERIFIED PHUKET REFERENCE — USE WHEN RELEVANT:\n- Demographics: 10-14 million visitors in 2025 (top markets: Russia, India, China).\n- Seasons: High season (Nov-April); Monsoon/low season (May-Oct) brings rough seas and red flags on west coast beaches.\n- Marine: Boat accidents peak in monsoon season. Similan/Surin Islands close May-Oct.`,
        'Nightlife': `VERIFIED PHUKET REFERENCE — USE WHEN RELEVANT:\n- Bangla Road: Primary nightlife strip in Patong, pedestrianized from ~6 PM.\n- Closing Times: Standard venues 2 AM; extended zones (Bangla) 3-4 AM.\n- Safety: "Drink spiking" reported periodically. Common scams include inflated bills and "lady drink" surprises.`,
        'Weather': `VERIFIED PHUKET REFERENCE — USE WHEN RELEVANT:\n- Seasons: Cool/dry (Nov-Feb), Hot (Mar-Apr, 35°C+), Monsoon (May-Oct).\n- Monsoon Impact: Heavy rain and flash flooding in low-lying areas (Patong, Sam Kong, Rassada, Koh Kaew underpass).`,
      };
      const GENERAL_CONTEXT_BLOCK = `VERIFIED PHUKET REFERENCE — USE WHEN RELEVANT:\n- Emergency numbers: Tourist Police 1155, Police 191, Ambulance 1669\n- Phuket is a province of Thailand, not an independent jurisdiction; national laws apply`;
      const contextBlock = CATEGORY_CONTEXT_BLOCKS[article.category] || GENERAL_CONTEXT_BLOCK;

      const GENERAL_LOCATION_CONTEXT = `CRITICAL LOCATION RULES FOR ALL STORIES:\n- "Bangkok Road" (ถนนกรุงเทพ) is a street in PHUKET TOWN. It is NEVER in Bangkok city.\n- "Krabi Road" and "Phang Nga Road" are streets in PHUKET TOWN. They are NOT the neighboring provinces.\n- ALWAYS write "Soi [Name]" (e.g., Soi Bangla). NEVER write "[Name] Soi".\n- "Saphan Hin" = a park in Phuket Town, NOT a bridge.`;

      const userPrompt = `📅 TODAY'S DATE: ${currentDate} (Thailand Time)
ARTICLE CATEGORY: ${article.category}

${contextBlock}

${GENERAL_LOCATION_CONTEXT}

---

SOURCE MATERIAL:

Title: ${article.title}

Content:
${article.content}

Excerpt:
${article.excerpt || ''}

${commentsBlock}

${editorNotesBlock}

---

You must follow ALL instructions below. Do not skip any REQUIRED section.


========================================
STEP 1: CHECKS (apply before writing)
========================================

SPECIFICITY RULES — NEVER VIOLATE THESE

1. NEVER write "a foreign man/woman" or "a tourist" if the nationality is known. Use the nationality: "an Israeli man", "a Russian tourist", "two British women".

2. NEVER write "a beach in Phuket" or "a road in Phuket" if the location name is in the source. Use the name: "Laem Krating beach", "Thaweewong Road in Patong".

3. NEVER write "local authorities" or "police" if the station or unit is named. Use the name: "officers from Patong Police Station", "Kusoldharm Foundation rescue workers".

4. NEVER write "recently" or "earlier this week" if a specific date/time is available. Use it: "at approximately 2:39 AM on Friday".

5. NEVER write "a checkpoint" without the road name if available.

6. If a detail is NOT in the source material, do not invent it — but if it IS there, you MUST include it.

TENSE:
- Past events = past tense. NEVER write "are being rescued" for a completed event.

VEHICLES:
- Thai "รถ" = "vehicle", NOT "car."
- Only write "car" if the source says รถยนต์, รถเก๋ง, or รถ SUV.
- Only write "motorbike" if the source says รถจักรยานยนต์, มอเตอร์ไซค์, or สกู๊ตเตอร์.
- Default: "vehicle."

LOCATIONS:
- "Bangkok Road" in Phuket = a street in Phuket Town, NOT Bangkok city. Same for Krabi Road, Phang Nga Road.
- Write "Soi Bangla" not "Bangla Soi."
- "Saphan Hin" = a park in Phuket Town, NOT a bridge.

FACTS:
- Report ONLY what the source states. Do NOT upgrade language.
- "reckless" does NOT mean "stunts." "disturbing" does NOT mean "caused chaos."
- Do NOT describe areas: "Patong, a bustling tourist area..." — BANNED. Readers live here.

BANNED PHRASES — delete any sentence containing these:
- "underscores concerns", "highlights challenges", "raises questions about", "sparks debate"
- "remains to be seen", "serves as a reminder", "tourists are advised to exercise caution"
- "the incident has raised concerns", "in a country known for...", "the popular tourist destination"
- "the tropical island", "the bustling", "the vibrant", "a wake-up call"

========================================
STEP 2: MINE THE COMMENTS
========================================

${allComments.length > 0 ? `Comments from the Thai Facebook post are provided above. You MUST use them. They often contain more facts than the original post.

Do these four things:

A. SARCASM CHECK:
"นักท่องเที่ยวคุณภาพ" or "Quality tourist" with laughing emojis = SARCASM (means bad behavior).
"555" = Thai laughter, usually mocking.

B. EYEWITNESS DETAILS — find and include ALL of these:
Specific times, corrections, extra details, aftermath info.
Write them as: "Commenters on the original post reported that..." or "According to one commenter who claimed to witness the incident..."

C. LOCAL KNOWLEDGE — find and include ALL of these:
Location history, known problems, practical info.
Weave into the article body naturally.

D. PUBLIC REACTION — you MUST write this section:
Create an <h3>Public Reaction</h3> section in the article.
Summarize the mood: angry? sympathetic? mocking? divided?
List at least 3 different viewpoints or themes from the comments.
Minimum 2 sentences, maximum 4.` : 'No comments provided. Skip this step. Do NOT include a Public Reaction section.'}

========================================
STEP 3: WRITE THE ARTICLE
========================================

Write the article in this exact order:

--- PART 1: DATELINE (REQUIRED) ---
Bold caps location where the event happened.
Example: <p><strong>PATONG, PHUKET —</strong> A British tourist was arrested...</p>

--- PART 2: LEDE (REQUIRED) ---
One paragraph. Who, What, Where, When. Specific details.

--- PART 3: DETAILS (REQUIRED) ---
All remaining facts from the source. Direct quotes if available.${allComments.length > 0 ? ' Include eyewitness details and local knowledge from comments here, attributed properly.' : ''}

--- PART 4: BACKGROUND (INCLUDE if the reference material has facts about THIS specific story. SKIP if you can only write generic facts.) ---
Use facts from the VERIFIED PHUKET REFERENCE section above.
Rule: if the background sentence could appear in ANY Phuket news article, it is too generic. Delete it.

${allComments.length > 0 ? `--- PART 5: PUBLIC REACTION (REQUIRED — you must include this) ---
Heading: <h3>Public Reaction</h3>
Content: Community response from the comments. At least 3 viewpoints. 2-4 sentences.
DO NOT SKIP THIS SECTION.` : '--- PART 5: PUBLIC REACTION — SKIP (no comments provided) ---'}

--- PART 6: ON THE GROUND (REQUIRED — you must include this in every article) ---
Heading: <h3>On the Ground</h3>

This section gives readers specific, practical, insider information about THIS story.

Pick whichever of these apply to this story (skip ones that don't):
• Police station handling the case → name it and give a landmark ("Thalang Police — just past the Heroines Monument heading north")
• Hospital involved → name it ("Vachira is the receiving hospital for this side of the island")
• Location history → mention it ("That section of road is a known blackspot, particularly after dark")
• Action readers can take → state it
• Current status → report it

Write 2-4 sentences. Every sentence must be about THIS story, not general advice.
DO NOT SKIP THIS SECTION.

========================================
STEP 4: FORMAT YOUR OUTPUT
========================================

HTML RULES:
- Wrap every paragraph in <p></p> tags.
- Use <h3> tags for section headings: Background, Public Reaction, On the Ground.
- NEVER return a single block of unformatted text.

WORD COUNT:
- enrichedContent must be at least 200 words.

HEADLINE:
- AP style. Include specific names, places, numbers.
- ✅ GOOD: "Russian Tourist Arrested With 3kg of Cocaine in Cherng Talay"
- ❌ BAD: "Drug Arrest Raises Concerns in Phuket"

EXCERPT:
- 2-3 factual sentences describing what happened.
- NEVER use "highlights concerns" or "raises questions."

OUTPUT FORMAT:
Return ONLY valid JSON. No markdown fences. No text before or after the JSON.

Example:
{"enrichedTitle":"French Tourist Arrested After Patong Bar Brawl","enrichedContent":"<p><strong>PATONG, PHUKET —</strong> A 34-year-old French national was arrested...</p><p>Police said...</p><h3>On the Ground</h3><p>Patong Police are handling the case...</p>","enrichedExcerpt":"A French tourist was arrested following an altercation at a Bangla Road bar early Wednesday morning."}

Your output (valid JSON only):`;

      console.log(`   🤖 [DEEP-ENRICH] Calling Claude Sonnet 4-6...`);
      console.log(`   📊 Comments: ${freshCommentCount}, Editor notes: ${trimmedEditorNotes ? `${trimmedEditorNotes.length} chars` : 'none'}`);

      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        temperature: 0.3,
        system: sonnetSystemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const responseContent = response.content[0];
      if (responseContent.type !== 'text') {
        throw new Error(`Unexpected Anthropic response type: ${responseContent.type}`);
      }

      // Strip markdown fences if present
      let cleaned = responseContent.text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

      let enrichmentResult;
      // Try parsing as-is first
      try {
        enrichmentResult = JSON.parse(cleaned);
      } catch (parseError) {
        // If parsing fails, try to fix common issues:
        // 1. Extract just the JSON object if there's surrounding text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            enrichmentResult = JSON.parse(jsonMatch[0]);
          } catch (innerError) {
            // 2. Last resort: try fixing unescaped newlines in HTML content
            // Replace newlines inside string values that break JSON
            const fixedNewlines = jsonMatch[0].replace(/(?<=:[ ]*"[^"]*)\n(?=[^"]*")/g, '\\n');
            try {
              enrichmentResult = JSON.parse(fixedNewlines);
            } catch (finalError: any) {
              console.error('[DEEP ENRICH] JSON parse failed. Full response:', responseContent.text);
              throw new Error(`Failed to parse Sonnet response as JSON: ${finalError.message}. Raw response (first 500 chars): ${cleaned.substring(0, 500)}`);
            }
          }
        } else {
          console.error('[DEEP ENRICH] JSON parse failed. Full response:', responseContent.text);
          throw new Error(`Sonnet response did not contain a JSON object. Raw response (first 500 chars): ${cleaned.substring(0, 500)}`);
        }
      }

      // Apply paragraph formatting safeguard
      const { ensureProperParagraphFormatting, enforceSoiNamingConvention } = await import("./lib/format-utils");
      const formattedContent = enforceSoiNamingConvention(ensureProperParagraphFormatting(enrichmentResult.enrichedContent || article.content));

      console.log(`   ✅ [DEEP-ENRICH] Sonnet enrichment complete`);
      console.log(`   📝 New content length: ${formattedContent.length} chars`);

      // ── Belt-and-suspenders: strip any surviving em-dashes from Sonnet output ──
      const cleanEmDashes = (text: string) => text.replace(/ — /g, ', ').replace(/—/g, ', ');

      const enrichedTitle = cleanEmDashes(enforceSoiNamingConvention(enrichmentResult.enrichedTitle || article.title));
      const enrichedContent = cleanEmDashes(formattedContent);
      const enrichedExcerpt = cleanEmDashes(enforceSoiNamingConvention(enrichmentResult.enrichedExcerpt || article.excerpt));

      // ── STEP 3: Generate Facebook caption via GPT-4o mini ────────────────────
      let facebookCaption = enrichedExcerpt; // safe fallback
      try {
        const { default: OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const fbCaptionCompletion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You write Facebook post captions for a Phuket news page. Your captions stop the scroll and make people click. You write for expats and tourists who live in or visit Phuket."
            },
            {
              role: "user",
              content: `Write a Facebook caption for this news story. The caption will be posted with images so it needs to hook people into reading.

RULES:
- First line must be a punchy hook that creates curiosity or urgency. No more than 10 words. This is what people see before "See more".
- Second line: 1-2 sentences summarising the key facts. Be specific — names, nationalities, locations, numbers.
- Third line: a call to action or question that drives comments. Examples: "Have you seen this happen before?", "What do you think should happen?", "Tag someone who needs to see this."
- Do NOT use em-dashes (—).
- Do NOT use hashtags (we add those separately).
- Do NOT write "Breaking:" or "BREAKING NEWS" — it looks spammy.
- Keep total length under 280 characters (before the "See more" cutoff).
- Write in a direct, conversational tone. Not formal news language.

STORY TITLE: ${enrichedTitle}

STORY SUMMARY: ${enrichedExcerpt}

Return ONLY the caption text, no JSON, no labels, no quotes.`
            }
          ],
          temperature: 0.7,
          max_tokens: 300,
        });

        facebookCaption = fbCaptionCompletion.choices[0].message.content?.trim() || enrichedExcerpt;
        console.log(`   📱 [DEEP-ENRICH] Facebook caption generated (${facebookCaption.length} chars)`);
      } catch (captionError) {
        console.warn(`   ⚠️ [DEEP-ENRICH] Facebook caption generation failed — using excerpt fallback:`, captionError);
      }

      // Return enriched content for review — does NOT save to DB
      res.json({
        success: true,
        enrichedTitle,
        enrichedContent,
        enrichedExcerpt,
        facebookCaption,
        meta: {
          freshCommentCount,
          hasEditorNotes: !!trimmedEditorNotes,
          model: "claude-sonnet-4-6",
        },
      });

    } catch (error) {
      console.error("Error in Deep Enrich:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Deep enrichment failed" });
    }
  });

  // Regenerate Facebook headline using Curiosity Gap strategy - PROTECTED
  // Generates all 3 headline variants and recommends the best one
  app.post("/api/admin/articles/:id/regenerate-headline", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { angle } = req.body; // Optional: force a specific angle ('whatHappened', 'whoWhy', 'consequence')

      const article = await storage.getArticleById(id);

      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      console.log(`\n📱 [REGENERATE-HEADLINE] Generating Curiosity Gap headlines for: ${article.title.substring(0, 60)}...`);

      // Import the headline generator
      const { generateFacebookHeadlines, validateHeadline } = await import("./services/facebook-headline-generator");

      // Detect available assets from content (kept for context but no longer used to say "see the photos")
      const content = article.content || '';
      const hasVideo = content.toLowerCase().includes('วิดีโอ') ||
        content.toLowerCase().includes('video') ||
        content.toLowerCase().includes('คลิป') ||
        !!article.videoUrl;
      const hasMultipleImages = (article.imageUrls && article.imageUrls.length > 1) ||
        content.includes('ภาพ') ||
        content.includes('รูป');
      const hasCCTV = content.toLowerCase().includes('cctv') ||
        content.toLowerCase().includes('กล้องวงจรปิด');
      const hasMap = content.toLowerCase().includes('map') ||
        content.toLowerCase().includes('แผนที่');

      // Generate all headline variants (now uses story-level curiosity gaps)
      const variants = await generateFacebookHeadlines({
        title: article.title,
        content: content,
        excerpt: article.excerpt || '',
        category: article.category,
        interestScore: article.interestScore || 3,
        hasVideo,
        hasMultipleImages,
        hasCCTV,
        hasMap,
        isDeveloping: article.isDeveloping || false,
      });

      console.log(`   ❓ What Happened: "${variants.whatHappened}"`);
      console.log(`   🔍 Who/Why: "${variants.whoWhy}"`);
      console.log(`   ⚖️  Consequence: "${variants.consequence}"`);
      console.log(`   ✅ Recommended (${variants.recommendedAngle}): "${variants.recommended}"`);

      // Validate all headlines
      const validations = {
        whatHappened: validateHeadline(variants.whatHappened),
        whoWhy: validateHeadline(variants.whoWhy),
        consequence: validateHeadline(variants.consequence),
      };

      // Determine which headline to use
      let selectedHeadline: string;
      let selectedAngle: string;

      const validAngles = ['whatHappened', 'whoWhy', 'consequence'];
      if (angle && validAngles.includes(angle)) {
        // User requested a specific angle
        selectedHeadline = variants[angle as keyof typeof variants] as string;
        selectedAngle = angle;
        console.log(`   🎯 Using requested angle: ${angle}`);
      } else {
        // Use the AI-recommended headline
        selectedHeadline = variants.recommended;
        selectedAngle = variants.recommendedAngle;
      }

      // Update the article with the new headline
      const previousHeadline = article.facebookHeadline;
      const updatedArticle = await storage.updateArticle(id, {
        facebookHeadline: selectedHeadline,
      });

      if (!updatedArticle) {
        return res.status(500).json({ error: "Failed to update article" });
      }

      // Invalidate caches
      invalidateArticleCaches();

      console.log(`   🎉 [REGENERATE-HEADLINE] Complete!`);

      res.json({
        success: true,
        previousHeadline,
        newHeadline: selectedHeadline,
        selectedAngle,
        variants: {
          whatHappened: {
            headline: variants.whatHappened,
            valid: validations.whatHappened.valid,
            issues: validations.whatHappened.issues,
          },
          whoWhy: {
            headline: variants.whoWhy,
            valid: validations.whoWhy.valid,
            issues: validations.whoWhy.issues,
          },
          consequence: {
            headline: variants.consequence,
            valid: validations.consequence.valid,
            issues: validations.consequence.issues,
          },
        },
        recommendation: {
          angle: variants.recommendedAngle,
          reason: variants.recommendingReason,
        },
      });
    } catch (error) {
      console.error("Error regenerating headline:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to regenerate headline" });
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

  // Fix broken video embeds - clears facebookEmbedUrl for non-video posts - PROTECTED
  app.post("/api/admin/fix-video-embeds", requireAdminAuth, async (req, res) => {
    try {
      console.log(`🔧 [ADMIN] Fixing broken video embeds...`);

      // Find all articles with facebookEmbedUrl that is NOT a video URL
      const allArticles = await storage.getAllArticles();
      const brokenArticles = allArticles.filter(article => {
        const embedUrl = (article as any).facebookEmbedUrl;
        if (!embedUrl) return false;

        // Check if it's a valid video URL
        const isValidVideoUrl =
          embedUrl.includes('/reel/') ||
          embedUrl.includes('/reels/') ||
          embedUrl.includes('/videos/') ||
          embedUrl.includes('/watch');

        return !isValidVideoUrl;
      });

      console.log(`Found ${brokenArticles.length} articles with broken video embeds`);

      const fixedArticles = [];
      for (const article of brokenArticles) {
        console.log(`   - Fixing: ${article.title.substring(0, 60)}...`);
        await storage.updateArticle(article.id, { facebookEmbedUrl: null } as any);
        fixedArticles.push({
          id: article.id,
          title: article.title,
          clearedUrl: (article as any).facebookEmbedUrl,
        });
      }

      // Invalidate caches
      invalidateArticleCaches();

      console.log(`✅ [ADMIN] Fixed ${brokenArticles.length} broken video embeds`);

      res.json({
        fixed: brokenArticles.length,
        articles: fixedArticles,
      });
    } catch (error) {
      console.error("Error fixing video embeds:", error);
      res.status(500).json({ error: "Failed to fix video embeds" });
    }
  });

  // Legacy cron route — newsletter is now sent via Beehiiv dashboard
  app.post("/api/cron/newsletter", requireCronAuth, async (req, res) => {
    res.json({
      success: true,
      message: "Newsletter sending is now handled by Beehiiv. Use the Beehiiv dashboard to send newsletters.",
      beehiivDashboard: "https://app.beehiiv.com",
    });
  });

  // Admin Newsletter Preview - PROTECTED
  app.get("/api/admin/newsletter/preview", requireAdminAuth, async (req, res) => {
    try {
      const previewPath = path.join(process.cwd(), "newsletter_approval_preview.html");
      const html = await fs.readFile(previewPath, "utf-8");
      res.header("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      res.status(404).json({ error: "Preview not found. Run the generation script first." });
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
          // Reactivate
          await storage.reactivateSubscriber(existing.id);

          // Re-add to Resend audience
          try {
            const { addResendContact } = await import("./lib/resend-client");
            await addResendContact(existing.email);
          } catch (err) {
            console.error(`❌ Resend reactivation sync error:`, err);
          }

          return res.status(200).json({
            message: "Welcome back! Your subscription has been reactivated.",
            subscriber: { email: existing.email }
          });
        }
      }

      const subscriber = await storage.createSubscriber(result.data);

      // Add to Resend Audience (used for broadcast newsletter sending)
      try {
        const { addResendContact } = await import("./lib/resend-client");
        await addResendContact(subscriber.email);
      } catch (err) {
        console.error(`❌ Resend contact sync error:`, err);
        // Non-fatal — don't block subscription
      }

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
  // Only includes articles with enough content to be worth indexing (excerpt >= 30 words is a
  // reliable proxy for full article word count >= 150), protecting crawl budget.
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'https://phuketradar.com';

      const allArticles = await storage.getPublishedArticles();
      const categories = ["crime", "local", "tourism", "politics", "economy", "traffic", "weather"];

      // Filter out thin articles — excerpt word count < 30 is a reliable proxy for
      // articles that will be noindexed on the page itself (< 150 words in full content).
      const MIN_EXCERPT_WORDS = 30;
      const indexableArticles = allArticles.filter(article => {
        const excerptWords = article.excerpt
          .replace(/<[^>]+>/g, ' ')
          .trim()
          .split(/\s+/)
          .filter(Boolean).length;
        return excerptWords >= MIN_EXCERPT_WORDS;
      });

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

      // Article pages (indexable only)
      for (const article of indexableArticles) {
        const articlePath = buildArticleUrl({ category: article.category, slug: article.slug, id: article.id });
        const url = `${baseUrl}${articlePath}`;
        // Use lastEnrichedAt or lastManualEditAt as modified date when available
        const modifiedDate = article.lastEnrichedAt || article.lastManualEditAt || article.publishedAt;
        const lastmod = new Date(modifiedDate).toISOString().split('T')[0];
        // Slightly higher priority for articles with images (better user experience signal)
        const priority = article.imageUrl || (article.imageUrls && article.imageUrls.length > 0) ? '0.7' : '0.5';

        sitemap += '  <url>\n';
        sitemap += `    <loc>${url}</loc>\n`;
        sitemap += `    <lastmod>${lastmod}</lastmod>\n`;
        sitemap += '    <changefreq>weekly</changefreq>\n';
        sitemap += `    <priority>${priority}</priority>\n`;
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

  // Image upload endpoint - PROTECTED (uploads to Cloudinary)
  app.post("/api/admin/upload-image", requireAdminAuth, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const originalPath = req.file.path;

      // Check if Cloudinary is configured
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error("❌ Cloudinary not configured for image upload");
        // Clean up temp file
        try { await fs.unlink(originalPath); } catch (e) { /* ignore */ }
        return res.status(500).json({ error: "Image storage not configured" });
      }

      console.log(`📤 Processing uploaded image: ${req.file.originalname}`);

      // Optimize image with sharp before uploading to Cloudinary
      const optimizedBuffer = await sharp(originalPath)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      // Clean up temp file after processing
      try { await fs.unlink(originalPath); } catch (e) { /* ignore */ }

      // Import and configure Cloudinary
      const { v2: cloudinary } = await import("cloudinary");
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      // Upload to Cloudinary
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 10);

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "phuketradar",
            public_id: `manual-upload-${timestamp}-${randomSuffix}`,
            resource_type: "image",
            format: "webp",
          },
          (error, result) => {
            if (error) {
              console.error("❌ Cloudinary upload failed:", error.message);
              reject(new Error(`Cloudinary upload failed: ${error.message}`));
            } else if (result?.secure_url) {
              console.log(`✅ Uploaded to Cloudinary: ${result.secure_url}`);
              resolve(result.secure_url);
            } else {
              reject(new Error("No URL returned from Cloudinary"));
            }
          }
        );

        uploadStream.end(optimizedBuffer);
      });

      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading image:", error);
      // Clean up temp file if it exists
      if (req.file) {
        try { await fs.unlink(req.file.path); } catch (e) { /* ignore */ }
      }
      const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Configure multer for video uploads (larger file limit, video mime types)
  const uploadVideo = multer({
    storage: storage_multer,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for videos
    fileFilter: (req, file, cb) => {
      const allowedTypes = /mp4|mov|avi|webm|mkv|m4v/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetypeOk = file.mimetype.startsWith('video/');
      if (mimetypeOk && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only video files are allowed (mp4, mov, avi, webm, mkv)'));
      }
    }
  });

  // Video upload endpoint - PROTECTED (uploads to Cloudinary as video resource)
  app.post("/api/admin/upload-video", requireAdminAuth, uploadVideo.single('video'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const originalPath = req.file.path;

      // Check if Cloudinary is configured
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error("❌ Cloudinary not configured for video upload");
        try { await fs.unlink(originalPath); } catch (e) { /* ignore */ }
        return res.status(500).json({ error: "Video storage not configured" });
      }

      console.log(`📤 Processing uploaded video: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(1)}MB)`);

      // Import and configure Cloudinary
      const { v2: cloudinary } = await import("cloudinary");
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 10);

      // Upload video to Cloudinary using upload (not upload_stream) for large files
      const result = await cloudinary.uploader.upload(originalPath, {
        folder: "phuketradar/videos",
        public_id: `manual-video-${timestamp}-${randomSuffix}`,
        resource_type: "video",
        chunk_size: 6000000, // 6MB chunks for reliability
      });

      // Clean up temp file after upload
      try { await fs.unlink(originalPath); } catch (e) { /* ignore */ }

      if (!result?.secure_url) {
        return res.status(500).json({ error: "No URL returned from Cloudinary" });
      }

      console.log(`✅ Video uploaded to Cloudinary: ${result.secure_url}`);
      res.json({ videoUrl: result.secure_url });
    } catch (error) {
      console.error("Error uploading video:", error);
      if (req.file) {
        try { await fs.unlink(req.file.path); } catch (e) { /* ignore */ }
      }
      const errorMessage = error instanceof Error ? error.message : "Failed to upload video";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Generate Facebook headline using AI - PROTECTED
  app.post("/api/admin/generate-facebook-headline", requireAdminAuth, async (req, res) => {
    try {
      const { title, excerpt } = req.body;

      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a social media headline expert for a Phuket news site. Your job is to create high-CTR Facebook headlines that:
1. Are punchy and attention-grabbing (max 15 words)
2. Use power words: BREAKING, CAUGHT, SHOCKING, WATCH, etc. when appropriate
3. Create curiosity without being clickbait
4. Are written from THIRD-PERSON NEWS REPORTING perspective (never "Join Us", "We", "Our")
5. Focus on emotion, urgency, location, and impact

🎭 CRITICAL - THAI SOCIAL MEDIA CONTEXT:
If the title contains sarcastic/humorous Thai context:
- "Quality tourist" or "Tourist enjoying" with ironic context = DRUNK/MISBEHAVING tourist
- Reference to "embracing street life" or "resting on road" = PASSED OUT DRUNK
- Always report the ACTUAL situation, not the sarcastic framing

Examples:
- "Tourist Found Passed Out on Patong Street" → "WATCH: 'Quality Tourist' Found Sprawled Across Patong Sidewalk as Locals React"
- "Traffic Accident on Patong Hill" → "BREAKING: Multi-Vehicle Crash Closes Patong Hill During Rush Hour"
- "Restaurant Fire in Rawai" → "Dramatic Fire Engulfs Popular Rawai Restaurant – No Injuries Reported"`,
          },
          {
            role: "user",
            content: `Create a high-CTR Facebook headline for this article:

Title: ${title}
Excerpt: ${excerpt || "(no excerpt provided)"}

Respond with ONLY the headline, no quotes or explanation.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      });

      const headline = completion.choices[0].message.content?.trim() || title;

      res.json({ headline });
    } catch (error) {
      console.error("Error generating Facebook headline:", error);
      res.status(500).json({ error: "Failed to generate headline" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
