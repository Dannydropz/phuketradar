var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  articleMetrics: () => articleMetrics,
  articles: () => articles,
  categories: () => categories,
  insertArticleMetricsSchema: () => insertArticleMetricsSchema,
  insertArticleSchema: () => insertArticleSchema,
  insertCategorySchema: () => insertCategorySchema,
  insertJournalistSchema: () => insertJournalistSchema,
  insertSocialMediaAnalyticsSchema: () => insertSocialMediaAnalyticsSchema,
  insertSubscriberSchema: () => insertSubscriberSchema,
  insertUserSchema: () => insertUserSchema,
  journalists: () => journalists,
  schedulerLocks: () => schedulerLocks,
  scoreAdjustments: () => scoreAdjustments,
  session: () => session,
  socialMediaAnalytics: () => socialMediaAnalytics,
  subscribers: () => subscribers,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, real, json, index, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users, journalists, articles, schedulerLocks, session, subscribers, categories, articleMetrics, socialMediaAnalytics, scoreAdjustments, insertUserSchema, insertJournalistSchema, insertArticleSchema, insertSubscriberSchema, insertCategorySchema, insertArticleMetricsSchema, insertSocialMediaAnalyticsSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      username: text("username").notNull().unique(),
      password: text("password").notNull()
    });
    journalists = pgTable("journalists", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      nickname: text("nickname").notNull(),
      fullName: text("full_name").notNull(),
      surname: text("surname").notNull(),
      headshot: text("headshot").notNull(),
      bio: text("bio").notNull(),
      beat: text("beat").notNull(),
      funFact: text("fun_fact").notNull()
    });
    articles = pgTable("articles", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      slug: text("slug").unique(),
      title: text("title").notNull(),
      content: text("content").notNull(),
      excerpt: text("excerpt").notNull(),
      originalTitle: text("original_title"),
      // Thai source title before translation
      originalContent: text("original_content"),
      // Thai source content before translation
      imageUrl: text("image_url"),
      imageUrls: text("image_urls").array(),
      imageHash: text("image_hash"),
      sourceImageUrl: text("source_image_url"),
      // Original CDN image URL before local download (for cross-source duplicate detection)
      sourceImageUrls: text("source_image_urls").array(),
      // All original CDN image URLs before local download
      videoUrl: text("video_url"),
      videoThumbnail: text("video_thumbnail"),
      facebookEmbedUrl: text("facebook_embed_url"),
      // Facebook video/reel URL to embed on article page
      category: text("category").notNull(),
      sourceUrl: text("source_url").notNull(),
      author: text("author"),
      // Deprecated: use journalistId instead
      journalistId: varchar("journalist_id"),
      publishedAt: timestamp("published_at").notNull().defaultNow(),
      isPublished: boolean("is_published").notNull().default(false),
      originalLanguage: text("original_language").default("th"),
      translatedBy: text("translated_by").default("openai"),
      embedding: real("embedding").array(),
      facebookPostId: text("facebook_post_id").unique(),
      // OUR Facebook page post ID (set after posting)
      facebookHeadline: text("facebook_headline"),
      // High-CTR headline for social media
      facebookPostUrl: text("facebook_post_url"),
      // OUR Facebook page post URL
      sourceFacebookPostId: text("source_facebook_post_id").unique(),
      // Original source post ID (for duplicate detection)
      instagramPostId: text("instagram_post_id"),
      // OUR Instagram post ID (set after posting)
      instagramPostUrl: text("instagram_post_url"),
      // OUR Instagram post URL
      threadsPostId: text("threads_post_id"),
      // OUR Threads post ID (set after posting)
      threadsPostUrl: text("threads_post_url"),
      // OUR Threads post URL
      switchyShortUrl: text("switchy_short_url"),
      // Branded short link for social media
      eventType: text("event_type"),
      severity: text("severity"),
      articleType: text("article_type").notNull().default("breaking"),
      interestScore: real("interest_score"),
      engagementScore: real("engagement_score").default(0),
      isPostedToFacebook: boolean("is_posted_to_facebook").default(false),
      relatedArticleIds: text("related_article_ids").array(),
      entities: json("entities"),
      sourceName: text("source_name"),
      // Actual source (e.g., "Phuket Times", "Info Center")
      isDeveloping: boolean("is_developing").default(false),
      // Story has limited details or expecting updates
      isManuallyCreated: boolean("is_manually_created").default(false),
      // True if created via admin UI, false if scraped
      parentStoryId: varchar("parent_story_id"),
      // If this was created from merging stories, points to the main story
      mergedIntoId: varchar("merged_into_id"),
      // If this story was merged into another, points to the merged story
      lastEnrichedAt: timestamp("last_enriched_at"),
      // When the last enrichment pass was done
      lastManualEditAt: timestamp("last_manual_edit_at"),
      // When admin last manually edited content - enrichment will skip
      enrichmentCount: integer("enrichment_count").default(0),
      // Number of times this story has been enriched
      seriesId: varchar("series_id"),
      // Groups related articles that are part of a developing story
      storySeriesTitle: text("story_series_title"),
      // Human-readable title for the timeline (e.g., "Southern Thailand Flooding Crisis")
      isParentStory: boolean("is_parent_story").default(false),
      // TRUE for main story shown on homepage, FALSE for timeline updates
      seriesUpdateCount: integer("series_update_count").default(0),
      // Number of updates in this series (only for parent stories)
      tags: text("tags").array().default(sql`ARRAY[]::text[]`),
      // Auto-detected location/topic tags
      viewCount: integer("view_count").default(0),
      // Tracks article popularity for trending logic
      timelineTags: text("timeline_tags").array().default(sql`ARRAY[]::text[]`),
      // Keywords for auto-matching new stories
      autoMatchEnabled: boolean("auto_match_enabled").default(false),
      // Whether to auto-match stories to this timeline
      reEnrichAt: timestamp("re_enrich_at"),
      // When re-enrichment should run
      reEnrichmentCompleted: boolean("re_enrichment_completed").default(false),
      // Whether re-enrichment has already run for this article
      // TODO: Add these columns once ALTER TABLE completes on production database
      needsReview: boolean("needs_review").default(false),
      // Flagged for manual review
      reviewReason: text("review_reason")
      // Why this needs review (e.g., "truncated text", "low quality")
    });
    schedulerLocks = pgTable("scheduler_locks", {
      lockName: varchar("lock_name").primaryKey(),
      acquiredAt: timestamp("acquired_at").notNull().defaultNow(),
      instanceId: varchar("instance_id")
    });
    session = pgTable("session", {
      sid: varchar("sid").primaryKey(),
      sess: json("sess").notNull(),
      expire: timestamp("expire", { precision: 6 }).notNull()
    }, (table) => ({
      expireIdx: index("IDX_session_expire").on(table.expire)
    }));
    subscribers = pgTable("subscribers", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      email: text("email").notNull().unique(),
      subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
      isActive: boolean("is_active").notNull().default(true),
      unsubscribeToken: varchar("unsubscribe_token").notNull().unique().default(sql`gen_random_uuid()`)
    });
    categories = pgTable("categories", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull().unique(),
      slug: text("slug").notNull().unique(),
      color: text("color").notNull().default("#3b82f6"),
      // Tailwind blue-500
      icon: text("icon"),
      // Optional Lucide icon name
      createdAt: timestamp("created_at").notNull().defaultNow(),
      isDefault: boolean("is_default").notNull().default(false)
      // Prevents deletion of core categories
    });
    articleMetrics = pgTable("article_metrics", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      articleId: text("article_id").notNull(),
      source: text("source").notNull(),
      // 'google_analytics', 'search_console', 'facebook'
      metricDate: date("metric_date").notNull(),
      // Google Analytics metrics
      gaViews: integer("ga_views").default(0),
      gaAvgTimeOnPage: real("ga_avg_time_on_page").default(0),
      gaBounceRate: real("ga_bounce_rate").default(0),
      gaScrollDepth: real("ga_scroll_depth").default(0),
      // Search Console metrics
      scClicks: integer("sc_clicks").default(0),
      scImpressions: integer("sc_impressions").default(0),
      scCtr: real("sc_ctr").default(0),
      scAvgPosition: real("sc_avg_position").default(0),
      // Social media metrics (Facebook)
      fbReach: integer("fb_reach").default(0),
      fbClicks: integer("fb_clicks").default(0),
      fbEngagement: integer("fb_engagement").default(0),
      fbCtr: real("fb_ctr").default(0),
      syncedAt: timestamp("synced_at").defaultNow()
    }, (table) => ({
      uniqueMetric: index("unique_metric_idx").on(table.articleId, table.source, table.metricDate)
    }));
    socialMediaAnalytics = pgTable("social_media_analytics", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      articleId: text("article_id").notNull(),
      platform: text("platform").notNull(),
      postId: text("post_id"),
      headlineVariant: text("headline_variant"),
      impressions: integer("impressions").default(0),
      clicks: integer("clicks").default(0),
      shares: integer("shares").default(0),
      reactions: integer("reactions").default(0),
      comments: integer("comments").default(0),
      postedAt: timestamp("posted_at").notNull().defaultNow(),
      lastUpdatedAt: timestamp("last_updated_at").notNull().defaultNow()
    });
    scoreAdjustments = pgTable("score_adjustments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      articleId: text("article_id").notNull(),
      originalScore: integer("original_score").notNull(),
      adjustedScore: integer("adjusted_score").notNull(),
      adjustmentReason: text("adjustment_reason"),
      articleTitle: text("article_title").notNull(),
      articleCategory: text("article_category").notNull(),
      articleContentSnippet: text("article_content_snippet"),
      thaiKeywords: text("thai_keywords").array(),
      adjustedBy: text("adjusted_by").notNull().default("admin"),
      adjustedAt: timestamp("adjusted_at").notNull().defaultNow()
    }, (table) => ({
      articleIdIdx: index("score_adjustments_article_id_idx").on(table.articleId),
      categoryIdx: index("score_adjustments_category_idx").on(table.articleCategory),
      adjustedAtIdx: index("score_adjustments_adjusted_at_idx").on(table.adjustedAt)
    }));
    insertUserSchema = createInsertSchema(users).pick({
      username: true,
      password: true
    });
    insertJournalistSchema = createInsertSchema(journalists).omit({
      id: true
    });
    insertArticleSchema = createInsertSchema(articles).omit({
      id: true,
      publishedAt: true
    });
    insertSubscriberSchema = createInsertSchema(subscribers).pick({
      email: true
    });
    insertCategorySchema = createInsertSchema(categories).omit({
      id: true,
      createdAt: true
    });
    insertArticleMetricsSchema = createInsertSchema(articleMetrics).omit({
      id: true,
      syncedAt: true
    });
    insertSocialMediaAnalyticsSchema = createInsertSchema(socialMediaAnalytics).omit({
      id: true,
      lastUpdatedAt: true
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
var Pool, dbUrl, dbHost, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    ({ Pool } = pg);
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    dbUrl = new URL(process.env.DATABASE_URL);
    dbHost = dbUrl.hostname;
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      min: 2,
      idleTimeoutMillis: 6e4,
      connectionTimeoutMillis: 1e4,
      // Standard 10s is enough with TCP
      query_timeout: 6e4,
      allowExitOnIdle: false,
      ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
      // Neon/Supabase requires SSL
      // Explicitly set host to force DNS resolution (helps with IPv6 issues on Railway)
      host: dbHost
    });
    pool.on("error", (err) => {
      console.error("[DB POOL] Unexpected database connection error:", err);
    });
    pool.on("connect", () => {
      console.log("[DB POOL] New database connection established");
    });
    pool.on("remove", () => {
      console.log("[DB POOL] Database connection removed from pool");
    });
    db = drizzle(pool, { schema: schema_exports });
  }
});

// shared/category-map.ts
var category_map_exports = {};
__export(category_map_exports, {
  CATEGORY_TO_DB: () => CATEGORY_TO_DB,
  DB_TO_CATEGORY: () => DB_TO_CATEGORY,
  VALID_CATEGORIES: () => VALID_CATEGORIES,
  buildArticleUrl: () => buildArticleUrl,
  isValidCategory: () => isValidCategory,
  resolveDbCategories: () => resolveDbCategories,
  resolveFrontendCategory: () => resolveFrontendCategory
});
function resolveDbCategories(frontendCategory) {
  const categoryLower = frontendCategory.toLowerCase();
  return CATEGORY_TO_DB[categoryLower] || [];
}
function resolveFrontendCategory(dbCategory) {
  const categoryLower = dbCategory.toLowerCase();
  return DB_TO_CATEGORY[categoryLower] || dbCategory.toLowerCase();
}
function buildArticleUrl(article) {
  const frontendCategory = resolveFrontendCategory(article.category);
  const slug = article.slug || article.id;
  return `/${frontendCategory}/${slug}`;
}
function isValidCategory(category) {
  return VALID_CATEGORIES.includes(category);
}
var CATEGORY_TO_DB, DB_TO_CATEGORY, VALID_CATEGORIES;
var init_category_map = __esm({
  "shared/category-map.ts"() {
    "use strict";
    CATEGORY_TO_DB = {
      local: ["Breaking", "Info", "Other", "Events", "Local", "other"],
      tourism: ["Tourism"],
      economy: ["Business", "Economy"],
      weather: ["Weather"],
      crime: ["Breaking", "Crime"],
      politics: ["Breaking", "Politics"],
      traffic: ["Breaking", "Traffic"]
    };
    DB_TO_CATEGORY = {
      "breaking": "local",
      "info": "local",
      "other": "local",
      "events": "local",
      "tourism": "tourism",
      "business": "economy",
      "weather": "weather"
    };
    VALID_CATEGORIES = [
      "crime",
      "local",
      "tourism",
      "politics",
      "economy",
      "traffic",
      "weather"
    ];
  }
});

// server/lib/seo-utils.ts
function generateSlug(title) {
  return title.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "").replace(/\-\-+/g, "-").replace(/^-+|-+$/g, "").substring(0, 100).replace(/-+$/, "");
}
function generateUniqueSlug(title, id) {
  const baseSlug = generateSlug(title);
  const uniqueSuffix = id.substring(0, 8);
  if (!baseSlug || baseSlug.length < 3) {
    return `article-${uniqueSuffix}`;
  }
  if (baseSlug.length < 10) {
    return `${baseSlug}-${uniqueSuffix}`;
  }
  const truncatedSlug = baseSlug.substring(0, 90);
  return `${truncatedSlug}-${uniqueSuffix}`;
}
var init_seo_utils = __esm({
  "server/lib/seo-utils.ts"() {
    "use strict";
    init_category_map();
  }
});

// server/lib/db-retry.ts
async function retryDatabaseOperation(operation, maxRetries = 5, retryDelayMs = 1e3, operationName = "Database operation") {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isRetryable = error.message?.includes("Connection terminated") || error.message?.includes("Connection closed") || error.message?.includes("ECONNRESET") || error.message?.includes("timeout") || error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT";
      if (!isRetryable || attempt === maxRetries) {
        console.error(`[DB-RETRY] ${operationName} failed after ${attempt} attempt(s)`);
        throw error;
      }
      const delay = retryDelayMs * attempt;
      console.warn(`[DB-RETRY] ${operationName} failed (attempt ${attempt}/${maxRetries})`);
      console.warn(`[DB-RETRY] Error: ${error.message}`);
      console.warn(`[DB-RETRY] Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
var init_db_retry = __esm({
  "server/lib/db-retry.ts"() {
    "use strict";
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  DatabaseStorage: () => DatabaseStorage,
  storage: () => storage
});
import { eq, desc, sql as sql2, inArray, and, gte, isNull } from "drizzle-orm";
var LEAN_ARTICLE_FIELDS, DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    init_seo_utils();
    init_db_retry();
    init_category_map();
    LEAN_ARTICLE_FIELDS = {
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      imageUrl: articles.imageUrl,
      imageUrls: articles.imageUrls,
      imageHash: articles.imageHash,
      sourceImageUrl: articles.sourceImageUrl,
      sourceImageUrls: articles.sourceImageUrls,
      videoUrl: articles.videoUrl,
      videoThumbnail: articles.videoThumbnail,
      category: articles.category,
      author: articles.author,
      journalistId: articles.journalistId,
      sourceUrl: articles.sourceUrl,
      publishedAt: articles.publishedAt,
      isPublished: articles.isPublished,
      originalLanguage: articles.originalLanguage,
      translatedBy: articles.translatedBy,
      facebookHeadline: articles.facebookHeadline,
      facebookPostId: articles.facebookPostId,
      facebookPostUrl: articles.facebookPostUrl,
      sourceFacebookPostId: articles.sourceFacebookPostId,
      instagramPostId: articles.instagramPostId,
      instagramPostUrl: articles.instagramPostUrl,
      threadsPostId: articles.threadsPostId,
      threadsPostUrl: articles.threadsPostUrl,
      eventType: articles.eventType,
      severity: articles.severity,
      articleType: articles.articleType,
      interestScore: articles.interestScore,
      relatedArticleIds: articles.relatedArticleIds,
      sourceName: articles.sourceName,
      isDeveloping: articles.isDeveloping,
      isManuallyCreated: articles.isManuallyCreated,
      parentStoryId: articles.parentStoryId,
      mergedIntoId: articles.mergedIntoId,
      lastEnrichedAt: articles.lastEnrichedAt,
      lastManualEditAt: articles.lastManualEditAt,
      enrichmentCount: articles.enrichmentCount,
      seriesId: articles.seriesId,
      storySeriesTitle: articles.storySeriesTitle,
      isParentStory: articles.isParentStory,
      seriesUpdateCount: articles.seriesUpdateCount,
      tags: articles.tags,
      viewCount: articles.viewCount,
      engagementScore: articles.engagementScore,
      isPostedToFacebook: articles.isPostedToFacebook,
      timelineTags: articles.timelineTags,
      autoMatchEnabled: articles.autoMatchEnabled,
      needsReview: articles.needsReview,
      reviewReason: articles.reviewReason,
      facebookEmbedUrl: articles.facebookEmbedUrl,
      switchyShortUrl: articles.switchyShortUrl
    };
    DatabaseStorage = class {
      // User methods
      async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user || void 0;
      }
      async getUserByUsername(username) {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        return user || void 0;
      }
      async createUser(insertUser) {
        const [user] = await db.insert(users).values(insertUser).returning();
        return user;
      }
      // Article methods
      async getAllArticles() {
        return await db.select().from(articles).orderBy(desc(articles.publishedAt));
      }
      // Optimized version of getAllArticles that excludes heavy fields (content, embedding, entities)
      // Use this for admin dashboard and list views where full content isn't needed
      async getAllArticlesLean(limit = 200, offset = 0) {
        return await db.select(LEAN_ARTICLE_FIELDS).from(articles).orderBy(desc(articles.publishedAt)).limit(limit).offset(offset);
      }
      async getArticleById(id) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          return void 0;
        }
        const [article] = await db.select().from(articles).where(eq(articles.id, id));
        return article || void 0;
      }
      async getArticleBySlug(slug) {
        const [article] = await db.select().from(articles).where(eq(articles.slug, slug));
        return article || void 0;
      }
      async getArticleBySourceUrl(sourceUrl) {
        return retryDatabaseOperation(async () => {
          const [article] = await db.select().from(articles).where(eq(articles.sourceUrl, sourceUrl));
          return article || void 0;
        }, 3, 2e3, `getArticleBySourceUrl(${sourceUrl.substring(0, 40)}...)`);
      }
      async getArticleByFacebookPostId(facebookPostId) {
        const [article] = await db.select().from(articles).where(eq(articles.facebookPostId, facebookPostId));
        return article || void 0;
      }
      async getArticleBySourceFacebookPostId(sourceFacebookPostId) {
        return retryDatabaseOperation(async () => {
          const [article] = await db.select().from(articles).where(eq(articles.sourceFacebookPostId, sourceFacebookPostId));
          return article || void 0;
        }, 3, 2e3, `getArticleBySourceFacebookPostId(${sourceFacebookPostId.substring(0, 20)}...)`);
      }
      async getArticleByImageUrl(imageUrl) {
        return retryDatabaseOperation(async () => {
          const [article] = await db.select().from(articles).where(
            sql2`${articles.imageUrl} = ${imageUrl} 
            OR ${imageUrl} = ANY(${articles.imageUrls})
            OR ${articles.sourceImageUrl} = ${imageUrl}
            OR ${imageUrl} = ANY(${articles.sourceImageUrls})`
          );
          return article || void 0;
        }, 3, 2e3, `getArticleByImageUrl(${imageUrl.substring(0, 30)}...)`);
      }
      async getArticlesByCategory(category, limit = 30, offset = 0) {
        const dbCategories = [...resolveDbCategories(category)];
        if (dbCategories.length === 0) {
          return [];
        }
        return await db.select(LEAN_ARTICLE_FIELDS).from(articles).where(
          and(
            eq(articles.isPublished, true),
            inArray(articles.category, dbCategories)
          )
        ).orderBy(desc(articles.publishedAt)).limit(limit).offset(offset);
      }
      async getPublishedArticles(limit = 30, offset = 0) {
        return await db.select(LEAN_ARTICLE_FIELDS).from(articles).where(eq(articles.isPublished, true)).orderBy(desc(articles.publishedAt)).limit(limit).offset(offset);
      }
      async getPendingArticles() {
        return await db.select().from(articles).where(eq(articles.isPublished, false)).orderBy(desc(articles.publishedAt));
      }
      async getArticlesWithEmbeddings() {
        const result = await db.select({
          id: articles.id,
          title: articles.originalTitle,
          // Return Thai original for duplicate detection
          content: articles.originalContent,
          // Return Thai original for duplicate detection
          embedding: articles.embedding,
          entities: articles.entities
        }).from(articles);
        return result.filter((a) => a.title !== null && a.content !== null).map((a) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          embedding: a.embedding,
          entities: a.entities
        }));
      }
      async getRecentArticlesWithEmbeddings(days) {
        const cutoffDate = /* @__PURE__ */ new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const result = await db.select({
          id: articles.id,
          title: articles.originalTitle,
          content: articles.originalContent,
          embedding: articles.embedding,
          entities: articles.entities,
          publishedAt: articles.publishedAt
        }).from(articles).where(gte(articles.publishedAt, cutoffDate));
        return result.filter((a) => a.title !== null && a.content !== null && a.embedding !== null).map((a) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          embedding: a.embedding,
          entities: a.entities
        }));
      }
      async getArticlesWithImageHashes() {
        const result = await db.select({
          id: articles.id,
          title: articles.title,
          imageHash: articles.imageHash
        }).from(articles).orderBy(desc(articles.publishedAt));
        return result;
      }
      async createArticle(insertArticle) {
        let articleData;
        if (!insertArticle.slug) {
          const articleId = insertArticle.id || crypto.randomUUID();
          const slug = generateUniqueSlug(insertArticle.title, articleId);
          articleData = {
            ...insertArticle,
            ...!insertArticle.id && { id: articleId },
            slug
          };
        } else {
          articleData = insertArticle;
        }
        return retryDatabaseOperation(
          async () => {
            try {
              const [article] = await db.insert(articles).values(articleData).returning();
              return article;
            } catch (error) {
              console.error(`
\u274C [STORAGE] Database insertion failed`);
              console.error(`   Error Code: ${error.code || "UNKNOWN"}`);
              console.error(`   Error Message: ${error.message || "No message"}`);
              console.error(`   Error Name: ${error.name || "Unknown"}`);
              console.error(`   PostgreSQL Detail: ${error.detail || "N/A"}`);
              console.error(`   PostgreSQL Hint: ${error.hint || "N/A"}`);
              console.error(`   Constraint: ${error.constraint || "N/A"}`);
              console.error(`   Full Error:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
              console.error(`   Article Title: ${insertArticle.title?.substring(0, 60) || "MISSING"}...`);
              console.error(`   Source URL: ${insertArticle.sourceUrl || "MISSING"}`);
              throw error;
            }
          },
          5,
          1e3,
          `Create article: ${insertArticle.title?.substring(0, 40)}...`
        );
      }
      async updateArticle(id, updates) {
        const [article] = await db.update(articles).set(updates).where(eq(articles.id, id)).returning();
        return article || void 0;
      }
      async claimArticleForFacebookPosting(id, lockToken) {
        const lockValue = `LOCK:${lockToken}`;
        const result = await db.update(articles).set({
          facebookPostId: lockValue
        }).where(sql2`${articles.id} = ${id} AND ${articles.facebookPostId} IS NULL`).returning();
        return result.length > 0;
      }
      async finalizeArticleFacebookPost(id, lockToken, facebookPostId, facebookPostUrl) {
        const lockValue = `LOCK:${lockToken}`;
        const result = await db.update(articles).set({
          facebookPostId,
          facebookPostUrl
        }).where(sql2`${articles.id} = ${id} AND ${articles.facebookPostId} = ${lockValue}`).returning();
        return result.length > 0;
      }
      async releaseFacebookPostLock(id, lockToken) {
        const lockValue = `LOCK:${lockToken}`;
        await db.update(articles).set({
          facebookPostId: null,
          facebookPostUrl: null
        }).where(sql2`${articles.id} = ${id} AND ${articles.facebookPostId} = ${lockValue}`);
      }
      async getArticlesWithStuckLocks() {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1e3);
        const results = await db.select({
          id: articles.id,
          title: articles.title,
          facebookPostId: articles.facebookPostId
        }).from(articles).where(sql2`${articles.facebookPostId} LIKE 'LOCK:%' AND ${articles.publishedAt} < ${fiveMinutesAgo}`);
        return results.map((r) => ({
          id: r.id,
          title: r.title,
          facebookPostId: r.facebookPostId || ""
        }));
      }
      async clearStuckFacebookLock(id) {
        await db.update(articles).set({
          facebookPostId: null,
          facebookPostUrl: null
        }).where(sql2`${articles.id} = ${id} AND ${articles.facebookPostId} LIKE 'LOCK:%'`);
      }
      // Instagram posting methods
      async claimArticleForInstagramPosting(id, lockToken) {
        const lockValue = `IG-LOCK:${lockToken}`;
        const result = await db.update(articles).set({
          instagramPostId: lockValue
        }).where(sql2`${articles.id} = ${id} AND ${articles.instagramPostId} IS NULL`).returning();
        return result.length > 0;
      }
      async updateArticleInstagramPost(id, instagramPostId, instagramPostUrl, lockToken) {
        const lockValue = `IG-LOCK:${lockToken}`;
        await db.update(articles).set({
          instagramPostId,
          instagramPostUrl
        }).where(sql2`${articles.id} = ${id} AND ${articles.instagramPostId} = ${lockValue}`);
      }
      async releaseInstagramPostLock(id, lockToken) {
        const lockValue = `IG-LOCK:${lockToken}`;
        await db.update(articles).set({
          instagramPostId: null,
          instagramPostUrl: null
        }).where(sql2`${articles.id} = ${id} AND ${articles.instagramPostId} = ${lockValue}`);
      }
      // Threads posting methods
      async claimArticleForThreadsPosting(id, lockToken) {
        const lockValue = `THREADS-LOCK:${lockToken}`;
        const result = await db.update(articles).set({
          threadsPostId: lockValue
        }).where(sql2`${articles.id} = ${id} AND ${articles.threadsPostId} IS NULL`).returning();
        return result.length > 0;
      }
      async updateArticleThreadsPost(id, threadsPostId, threadsPostUrl, lockToken) {
        const lockValue = `THREADS-LOCK:${lockToken}`;
        await db.update(articles).set({
          threadsPostId,
          threadsPostUrl
        }).where(sql2`${articles.id} = ${id} AND ${articles.threadsPostId} = ${lockValue}`);
      }
      async releaseThreadsPostLock(id, lockToken) {
        const lockValue = `THREADS-LOCK:${lockToken}`;
        await db.update(articles).set({
          threadsPostId: null,
          threadsPostUrl: null
        }).where(sql2`${articles.id} = ${id} AND ${articles.threadsPostId} = ${lockValue}`);
      }
      async deleteArticle(id) {
        const result = await db.delete(articles).where(eq(articles.id, id));
        return result.rowCount !== null && result.rowCount > 0;
      }
      // Subscriber methods
      async createSubscriber(insertSubscriber) {
        const [subscriber] = await db.insert(subscribers).values(insertSubscriber).returning();
        return subscriber;
      }
      async getSubscriberByEmail(email) {
        const [subscriber] = await db.select().from(subscribers).where(eq(subscribers.email, email));
        return subscriber || void 0;
      }
      async getAllActiveSubscribers() {
        return await db.select().from(subscribers).where(eq(subscribers.isActive, true)).orderBy(desc(subscribers.subscribedAt));
      }
      async unsubscribeByToken(token) {
        const result = await db.update(subscribers).set({ isActive: false }).where(eq(subscribers.unsubscribeToken, token)).returning();
        return result.length > 0;
      }
      async reactivateSubscriber(id) {
        const [subscriber] = await db.update(subscribers).set({
          isActive: true,
          subscribedAt: /* @__PURE__ */ new Date(),
          unsubscribeToken: sql2`gen_random_uuid()`
        }).where(eq(subscribers.id, id)).returning();
        return subscriber;
      }
      // Journalist methods
      async getAllJournalists() {
        return await db.select().from(journalists).orderBy(journalists.nickname);
      }
      async getJournalistById(id) {
        const [journalist] = await db.select().from(journalists).where(eq(journalists.id, id));
        return journalist || void 0;
      }
      async getArticlesByJournalistId(journalistId) {
        return await db.select(LEAN_ARTICLE_FIELDS).from(articles).where(eq(articles.journalistId, journalistId)).orderBy(desc(articles.publishedAt));
      }
      // Category methods
      async getAllCategories() {
        return await db.select().from(categories).orderBy(categories.name);
      }
      async createCategory(insertCategory) {
        const [category] = await db.insert(categories).values(insertCategory).returning();
        return category;
      }
      // Article review methods (disabled until database columns are added)
      async getArticlesNeedingReview() {
        return [];
      }
      // Enrichment methods
      async getDevelopingArticles() {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1e3);
        return await db.select().from(articles).where(
          and(
            eq(articles.isDeveloping, true),
            eq(articles.isPublished, true),
            gte(articles.publishedAt, twentyFourHoursAgo),
            isNull(articles.mergedIntoId)
          )
        ).orderBy(desc(articles.interestScore), desc(articles.publishedAt));
      }
      // Smart Context methods
      async getArticlesBySeriesId(seriesId) {
        return await db.select(LEAN_ARTICLE_FIELDS).from(articles).where(eq(articles.seriesId, seriesId)).orderBy(desc(articles.publishedAt));
      }
      async searchArticles(query) {
        if (!query.trim()) return [];
        const searchPattern = `%${query.trim()}%`;
        return await db.select(LEAN_ARTICLE_FIELDS).from(articles).where(
          and(
            eq(articles.isPublished, true),
            sql2`(${articles.title} ILIKE ${searchPattern} OR ${articles.excerpt} ILIKE ${searchPattern})`
          )
        ).orderBy(desc(articles.publishedAt)).limit(20);
      }
      async getArticlesByTag(tag) {
        if (!tag.trim()) return [];
        return await db.select(LEAN_ARTICLE_FIELDS).from(articles).where(
          and(
            eq(articles.isPublished, true),
            sql2`${tag} = ANY(${articles.tags})`
          )
        ).orderBy(desc(articles.publishedAt));
      }
      async getRecentArticlesByCategory(category, hoursAgo, excludeId) {
        const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1e3);
        const dbCategories = [...resolveDbCategories(category)];
        if (dbCategories.length === 0) {
          return [];
        }
        const conditions = [
          inArray(articles.category, dbCategories),
          eq(articles.isPublished, true),
          gte(articles.publishedAt, cutoffTime)
        ];
        if (excludeId) {
          conditions.push(sql2`${articles.id} != ${excludeId}`);
        }
        return await db.select(LEAN_ARTICLE_FIELDS).from(articles).where(and(...conditions)).orderBy(desc(articles.publishedAt));
      }
      async getTrendingArticles(hoursAgo, limit) {
        const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1e3);
        return await db.select(LEAN_ARTICLE_FIELDS).from(articles).where(
          and(
            eq(articles.isPublished, true),
            gte(articles.publishedAt, cutoffTime),
            sql2`${articles.viewCount} > 0`
            // Only include articles with views
          )
        ).orderBy(desc(articles.viewCount), desc(articles.publishedAt)).limit(limit);
      }
      async incrementArticleViewCount(id) {
        await db.update(articles).set({
          viewCount: sql2`${articles.viewCount} + 1`
        }).where(eq(articles.id, id));
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/lib/format-utils.ts
function ensureProperParagraphFormatting(content) {
  if (!content || content.trim() === "") return content;
  const paragraphTagCount = (content.match(/<p[^>]*>/g) || []).length;
  const hasMultipleParagraphs = paragraphTagCount > 1;
  const isShort = content.length < 200;
  const sentencesCount = content.split(/(?<=[.!?]["']?)\s+/).length;
  const isMinimal = isShort && sentencesCount < 3;
  if (hasMultipleParagraphs || paragraphTagCount === 1 && isMinimal) {
    if (!content.includes("\\n")) {
      return content;
    }
  }
  let formattedContent = content;
  formattedContent = formattedContent.replace(/\\n\\n/g, "\n\n");
  formattedContent = formattedContent.replace(/\\n/g, "\n");
  formattedContent = formattedContent.replace(/\r\n/g, "\n");
  if (paragraphTagCount === 1 && formattedContent.trim().startsWith("<p") && formattedContent.trim().endsWith("</p>")) {
    const singlePRegex = /^<p[^>]*>([\s\S]*)<\/p>$/;
    const match = formattedContent.trim().match(singlePRegex);
    if (match) {
      formattedContent = match[1];
    }
  }
  formattedContent = formattedContent.replace(/\n\n+/g, "</p><p>");
  formattedContent = formattedContent.replace(/\n/g, "</p><p>");
  formattedContent = formattedContent.replace(/<br\s*\/?>/gi, "</p><p>");
  const currentParagraphCount = (formattedContent.match(/<\/p><p>/g) || []).length + 1;
  if (currentParagraphCount < 2) {
    const textContent = formattedContent.replace(/<[^>]*>/g, " ").trim();
    const sentences = textContent.split(/(?<=[.!?]["']?)\s+(?=[A-Z0-9])/);
    if (sentences.length >= 2) {
      const maxSentencesPerPara = sentences.length <= 3 ? 1 : 2;
      const paragraphs = [];
      let currentParagraph = [];
      sentences.forEach((sentence, index2) => {
        currentParagraph.push(sentence);
        const isNaturalBreak = sentence.toLowerCase().includes("meanwhile") || sentence.toLowerCase().includes("however") || sentence.toLowerCase().includes("additionally") || sentence.toLowerCase().includes("according to") || sentence.toLowerCase().includes("officials said");
        if (currentParagraph.length >= maxSentencesPerPara || isNaturalBreak || index2 === sentences.length - 1) {
          paragraphs.push(currentParagraph.join(" "));
          currentParagraph = [];
        }
      });
      formattedContent = paragraphs.join("</p><p>");
    }
  }
  formattedContent = formattedContent.replace(/^\s*<\/p>/, "");
  formattedContent = formattedContent.replace(/<p>\s*$/, "");
  if (!formattedContent.trim().startsWith("<p")) {
    formattedContent = "<p>" + formattedContent;
  }
  if (!formattedContent.trim().endsWith("</p>")) {
    formattedContent = formattedContent + "</p>";
  }
  formattedContent = formattedContent.replace(/<p>\s*<\/p>/g, "").replace(/<p><p>/g, "<p>").replace(/<\/p><\/p>/g, "</p>").replace(/<p>\s*<p>/g, "<p>").replace(/<\/p>\s*<\/p>/g, "</p>");
  formattedContent = formattedContent.replace(/<p>\s*(<h[1-6][^>]*>)/gi, "$1");
  formattedContent = formattedContent.replace(/(<\/h[1-6]>)\s*<\/p>/gi, "$1");
  return formattedContent;
}
function enforceSoiNamingConvention(text2) {
  if (!text2) return text2;
  return text2.replace(/\b([A-Z][a-zA-Z0-9\-\.]{2,})\s+[Ss]oi\b/g, "Soi $1");
}
var init_format_utils = __esm({
  "server/lib/format-utils.ts"() {
    "use strict";
  }
});

// server/services/score-learning.ts
var score_learning_exports = {};
__export(score_learning_exports, {
  ScoreLearningService: () => ScoreLearningService,
  scoreLearningService: () => scoreLearningService
});
import { eq as eq2, desc as desc2 } from "drizzle-orm";
function extractThaiKeywords(text2) {
  if (!text2) return [];
  const importantPatterns = [
    // High-interest indicators
    /ไฟไหม้|จมน้ำ|เสียชีวิต|อุบัติเหตุ|ชน|จับกุม|ตำรวจ|กู้ภัย|โจร|ปล้น|ฆ่า/g,
    // Feel-good indicators  
    /เต่าทะเล|ช่วยเหลือ|กู้ชีพ|วางไข่|อนุรักษ์|สัตว์ป่า|ช้าง|โลมา|ฉลามวาฬ/g,
    // Low-interest indicators
    /ประชุม|มอบหมาย|สัมมนา|แถลงข่าว|โครงการ|ตรวจเยี่ยม|พิธี|เปิดตัว/g,
    // Foreigner/tourist indicators (high interest for expat audience)
    /ฝรั่ง|นักท่องเที่ยว|ต่างชาติ|ชาวต่างประเทศ|ชาวรัสเซีย|ชาวจีน|ชาวอเมริกัน/g,
    // Politics indicators (capped at 3)
    /เลือกตั้ง|ส\.ส\.|นักการเมือง|พรรค|รัฐบาล|รัฐมนตรี/g,
    // Location indicators
    /ภูเก็ต|ป่าตอง|กะตะ|กะรน|ราไวย์|ฉลอง|ถลาง/g
  ];
  const keywords = [];
  for (const pattern of importantPatterns) {
    const matches = text2.match(pattern);
    if (matches) {
      keywords.push(...matches);
    }
  }
  return Array.from(new Set(keywords)).slice(0, 10);
}
var ScoreLearningService, scoreLearningService;
var init_score_learning = __esm({
  "server/services/score-learning.ts"() {
    "use strict";
    init_db();
    init_schema();
    ScoreLearningService = class {
      /**
       * Record a manual score adjustment by an admin with rich context
       */
      async recordAdjustment(params) {
        try {
          const article = await db.query.articles.findFirst({
            where: eq2(articles.id, params.articleId)
          });
          if (!article) {
            console.error(`Article ${params.articleId} not found for score adjustment`);
            return null;
          }
          const originalThaiText = `${article.originalTitle || ""} ${article.originalContent || ""}`;
          const thaiKeywords = extractThaiKeywords(originalThaiText);
          const englishText = `${article.title} ${article.content || ""}`;
          const englishKeywordPatterns = [
            /accident|crash|fire|drown|arrest|crime|rescue|tourist|foreigner|expat/gi,
            /turtle|dolphin|whale|elephant|conservation|wildlife/gi,
            /meeting|ceremony|project|development|investment|launch/gi
          ];
          for (const pattern of englishKeywordPatterns) {
            const matches = englishText.match(pattern);
            if (matches) {
              thaiKeywords.push(...matches.map((m) => m.toLowerCase()));
            }
          }
          const direction = params.adjustedScore < params.originalScore ? "down" : params.adjustedScore > params.originalScore ? "up" : "unchanged";
          const adjustmentContext = direction === "down" ? `AI over-scored: ${params.originalScore} \u2192 ${params.adjustedScore}. Story was less interesting than AI thought.` : direction === "up" ? `AI under-scored: ${params.originalScore} \u2192 ${params.adjustedScore}. Story was more interesting than AI thought.` : "No change";
          const [adjustment] = await db.insert(scoreAdjustments).values({
            articleId: params.articleId,
            originalScore: params.originalScore,
            adjustedScore: params.adjustedScore,
            adjustmentReason: params.adjustmentReason || adjustmentContext,
            articleTitle: article.title,
            articleCategory: article.category,
            articleContentSnippet: article.content?.substring(0, 500),
            thaiKeywords: Array.from(new Set(thaiKeywords)).slice(0, 15) || null,
            adjustedBy: "admin"
          }).returning();
          console.log(
            `\u{1F4CA} [SCORE LEARNING] Recorded adjustment: "${article.title.substring(0, 60)}..." | ${params.originalScore} \u2192 ${params.adjustedScore} (${params.adjustedScore - params.originalScore > 0 ? "+" : ""}${params.adjustedScore - params.originalScore})`
          );
          if (thaiKeywords.length > 0) {
            console.log(`   \u{1F511} Keywords captured: ${thaiKeywords.slice(0, 5).join(", ")}${thaiKeywords.length > 5 ? "..." : ""}`);
          }
          return adjustment;
        } catch (error) {
          console.error("Error recording score adjustment:", error);
          return null;
        }
      }
      /**
       * Get category-specific bias data for prompt injection
       * This tells the model HOW it's been wrong for each category
       */
      async getCategoryBiases() {
        try {
          const adjustments = await db.query.scoreAdjustments.findMany({
            orderBy: [desc2(scoreAdjustments.adjustedAt)],
            limit: 200
            // Use more data for better patterns
          });
          if (adjustments.length === 0) {
            return [];
          }
          const categoryMap = /* @__PURE__ */ new Map();
          for (const adj of adjustments) {
            const bias = adj.originalScore - adj.adjustedScore;
            const existing = categoryMap.get(adj.articleCategory) || {
              totalBias: 0,
              count: 0,
              examples: []
            };
            existing.totalBias += bias;
            existing.count += 1;
            if (existing.examples.length < 3) {
              existing.examples.push({
                title: adj.articleTitle.substring(0, 50),
                from: adj.originalScore,
                to: adj.adjustedScore
              });
            }
            categoryMap.set(adj.articleCategory, existing);
          }
          const biases = [];
          for (const [category, data] of Array.from(categoryMap.entries())) {
            const avgBias = data.totalBias / data.count;
            let recommendation = "";
            if (avgBias > 0.5) {
              recommendation = `REDUCE scores for "${category}" stories by ~${Math.round(avgBias)} point(s). You consistently over-score this category.`;
            } else if (avgBias < -0.5) {
              recommendation = `INCREASE scores for "${category}" stories by ~${Math.round(Math.abs(avgBias))} point(s). You consistently under-score this category.`;
            } else {
              recommendation = `Your "${category}" scoring is well-calibrated.`;
            }
            biases.push({
              category,
              avgBias,
              sampleSize: data.count,
              recommendation
            });
          }
          return biases.sort((a, b) => Math.abs(b.avgBias) - Math.abs(a.avgBias));
        } catch (error) {
          console.error("Error getting category biases:", error);
          return [];
        }
      }
      /**
       * Generate a rich learning context string for injection into GPT prompts
       * This is the main method used by translator.ts
       */
      async generateLearningContext(articleCategory) {
        try {
          const biases = await this.getCategoryBiases();
          let adjustments = await db.query.scoreAdjustments.findMany({
            orderBy: [desc2(scoreAdjustments.adjustedAt)],
            limit: 30
          });
          if (adjustments.length === 0) {
            return "";
          }
          if (articleCategory) {
            const sameCategoryAdj = adjustments.filter((a) => a.articleCategory === articleCategory);
            const otherAdj = adjustments.filter((a) => a.articleCategory !== articleCategory);
            adjustments = [...sameCategoryAdj.slice(0, 5), ...otherAdj.slice(0, 10)];
          } else {
            adjustments = adjustments.slice(0, 15);
          }
          let context = `
\u{1F9E0} SELF-LEARNING SCORING CALIBRATION (CRITICAL - READ AND APPLY):
The admin has corrected AI scoring mistakes. Learn from these patterns to avoid repeating errors:

`;
          const significantBiases = biases.filter((b) => Math.abs(b.avgBias) > 0.3);
          if (significantBiases.length > 0) {
            context += `\u{1F4CA} CATEGORY BIAS CORRECTIONS:
`;
            for (const bias of significantBiases.slice(0, 5)) {
              if (bias.avgBias > 0) {
                context += `\u26A0\uFE0F  ${bias.category.toUpperCase()}: You OVER-SCORE by ~${bias.avgBias.toFixed(1)} points on average. REDUCE scores for this category.
`;
              } else {
                context += `\u26A0\uFE0F  ${bias.category.toUpperCase()}: You UNDER-SCORE by ~${Math.abs(bias.avgBias).toFixed(1)} points on average. INCREASE scores for this category.
`;
              }
            }
            context += `
`;
          }
          context += `\u{1F4DD} SPECIFIC CORRECTION EXAMPLES (DO NOT REPEAT THESE MISTAKES):
`;
          const overscored = adjustments.filter((a) => a.adjustedScore < a.originalScore);
          const underscored = adjustments.filter((a) => a.adjustedScore > a.originalScore);
          if (overscored.length > 0) {
            context += `
\u{1F534} STORIES YOU OVER-SCORED (score too high):
`;
            for (const adj of overscored.slice(0, 5)) {
              const keywords = adj.thaiKeywords?.slice(0, 3).join(", ") || "N/A";
              context += `- "${adj.articleTitle.substring(0, 60)}..." [${adj.articleCategory}]
`;
              context += `  AI gave: ${adj.originalScore} \u2192 Admin corrected to: ${adj.adjustedScore}
`;
              context += `  Keywords: ${keywords}
`;
            }
          }
          if (underscored.length > 0) {
            context += `
\u{1F7E2} STORIES YOU UNDER-SCORED (score too low):
`;
            for (const adj of underscored.slice(0, 5)) {
              const keywords = adj.thaiKeywords?.slice(0, 3).join(", ") || "N/A";
              context += `- "${adj.articleTitle.substring(0, 60)}..." [${adj.articleCategory}]
`;
              context += `  AI gave: ${adj.originalScore} \u2192 Admin corrected to: ${adj.adjustedScore}
`;
              context += `  Keywords: ${keywords}
`;
            }
          }
          const stats = await this.getStatistics();
          if (stats.totalAdjustments > 0) {
            context += `
\u{1F4C8} OVERALL PATTERN: Out of ${stats.totalAdjustments} corrections, you over-scored ${stats.overscored} times (${Math.round(stats.overscored / stats.totalAdjustments * 100)}%) and under-scored ${stats.underscored} times (${Math.round(stats.underscored / stats.totalAdjustments * 100)}%).
`;
            if (stats.overscored > stats.underscored * 1.5) {
              context += `\u26A0\uFE0F  TENDENCY: You tend to OVER-SCORE stories. Be more conservative with your interest scores.
`;
            } else if (stats.underscored > stats.overscored * 1.5) {
              context += `\u26A0\uFE0F  TENDENCY: You tend to UNDER-SCORE stories. Don't be afraid to give higher scores to genuinely interesting content.
`;
            }
          }
          console.log(`   \u{1F9E0} Generated rich learning context with ${adjustments.length} examples and ${significantBiases.length} bias warnings`);
          return context;
        } catch (error) {
          console.error("Error generating learning context:", error);
          return "";
        }
      }
      /**
       * Get learning insights from historical adjustments
       */
      async getLearningInsights() {
        try {
          const adjustments = await db.query.scoreAdjustments.findMany({
            orderBy: [desc2(scoreAdjustments.adjustedAt)],
            limit: 100
            // Last 100 adjustments
          });
          const categoryMap = /* @__PURE__ */ new Map();
          for (const adj of adjustments) {
            const existing = categoryMap.get(adj.articleCategory) || {
              totalAdjustment: 0,
              count: 0,
              titles: []
            };
            existing.totalAdjustment += adj.adjustedScore - adj.originalScore;
            existing.count += 1;
            existing.titles.push(adj.articleTitle);
            categoryMap.set(adj.articleCategory, existing);
          }
          const insights = [];
          for (const [category, data] of Array.from(categoryMap.entries())) {
            const avgAdj = data.totalAdjustment / data.count;
            insights.push({
              category,
              avgAdjustment: avgAdj,
              totalAdjustments: data.count,
              commonPatterns: data.titles.slice(0, 5),
              // Top 5 examples
              biasDirection: avgAdj < -0.3 ? "overscoring" : avgAdj > 0.3 ? "underscoring" : "balanced"
            });
          }
          return insights.sort((a, b) => Math.abs(b.avgAdjustment) - Math.abs(a.avgAdjustment));
        } catch (error) {
          console.error("Error getting learning insights:", error);
          return [];
        }
      }
      /**
       * Get recent adjustments for a specific category
       */
      async getAdjustmentsByCategory(category, limit = 20) {
        try {
          const adjustments = await db.query.scoreAdjustments.findMany({
            where: category === "all" ? void 0 : eq2(scoreAdjustments.articleCategory, category),
            orderBy: [desc2(scoreAdjustments.adjustedAt)],
            limit
          });
          return adjustments;
        } catch (error) {
          console.error(`Error getting adjustments for category ${category}:`, error);
          return [];
        }
      }
      /**
       * Check if an article already has a recorded adjustment
       */
      async hasAdjustment(articleId) {
        try {
          const adjustment = await db.query.scoreAdjustments.findFirst({
            where: eq2(scoreAdjustments.articleId, articleId)
          });
          return !!adjustment;
        } catch (error) {
          console.error("Error checking for existing adjustment:", error);
          return false;
        }
      }
      /**
       * Get adjustment statistics summary
       */
      async getStatistics() {
        try {
          const adjustments = await db.query.scoreAdjustments.findMany();
          if (adjustments.length === 0) {
            return {
              totalAdjustments: 0,
              avgScoreChange: 0,
              overscored: 0,
              underscored: 0
            };
          }
          const totalAdjustments = adjustments.length;
          const scoreChanges = adjustments.map((a) => a.adjustedScore - a.originalScore);
          const avgScoreChange = scoreChanges.reduce((sum, change) => sum + change, 0) / totalAdjustments;
          const overscored = adjustments.filter((a) => a.adjustedScore < a.originalScore).length;
          const underscored = adjustments.filter((a) => a.adjustedScore > a.originalScore).length;
          return {
            totalAdjustments,
            avgScoreChange,
            overscored,
            underscored
          };
        } catch (error) {
          console.error("Error getting adjustment statistics:", error);
          return {
            totalAdjustments: 0,
            avgScoreChange: 0,
            overscored: 0,
            underscored: 0
          };
        }
      }
    };
    scoreLearningService = new ScoreLearningService();
  }
});

// server/services/apify-scraper.ts
var apify_scraper_exports = {};
__export(apify_scraper_exports, {
  ApifyScraperService: () => ApifyScraperService,
  apifyScraperService: () => apifyScraperService
});
var ApifyScraperService, apifyScraperService;
var init_apify_scraper = __esm({
  "server/services/apify-scraper.ts"() {
    "use strict";
    ApifyScraperService = class {
      apiKey = process.env.APIFY_API_KEY;
      actorId = "apify/facebook-posts-scraper";
      // Facebook cookies for authenticated scraping (JSON string of cookies array)
      // Can be exported from browser using Cookie-Editor extension
      facebookCookies = process.env.FACEBOOK_COOKIES;
      // Convert actor ID to URL-safe format (replace / with ~)
      getUrlSafeActorId() {
        return this.actorId.replace("/", "~");
      }
      // Check if authenticated scraping is available
      hasAuthenticatedSession() {
        return !!(this.apiKey && this.facebookCookies);
      }
      // Normalize Facebook post URL to handle different formats
      normalizeFacebookUrl(url) {
        try {
          const postIdMatch = url.match(/\/posts\/([^/?]+)/);
          if (postIdMatch) {
            const postId = postIdMatch[1];
            return `https://www.facebook.com/posts/${postId}`;
          }
          return url;
        } catch (error) {
          console.error("Error normalizing Facebook URL:", error);
          return url;
        }
      }
      async scrapeFacebookPage(pageUrl) {
        try {
          if (!this.apiKey) {
            throw new Error("APIFY_API_KEY is not configured");
          }
          console.log(`[APIFY] Scraping Facebook page: ${pageUrl}`);
          const urlSafeActorId = this.getUrlSafeActorId();
          const runResponse = await fetch(
            `https://api.apify.com/v2/acts/${urlSafeActorId}/runs?token=${this.apiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                startUrls: [{ url: pageUrl }],
                maxPosts: 50,
                // Limit posts to control costs
                scrapePosts: true,
                // Explicitly enable post scraping
                scrapeAbout: false,
                // Don't scrape about section
                scrapeReviews: false,
                // Don't scrape reviews
                maxPostDate: "7 days",
                // Only get posts from last 7 days
                proxyConfiguration: {
                  useApifyProxy: true
                }
              })
            }
          );
          if (!runResponse.ok) {
            const errorText = await runResponse.text();
            console.error(`[APIFY] API error (${runResponse.status}):`, errorText);
            throw new Error(`HTTP error! status: ${runResponse.status}`);
          }
          const runData = await runResponse.json();
          const runId = runData.data.id;
          const defaultDatasetId = runData.data.defaultDatasetId;
          console.log(`[APIFY] Run started: ${runId}`);
          console.log(`[APIFY] Waiting for completion...`);
          const maxAttempts = 60;
          let attempts = 0;
          let runStatus = "RUNNING";
          while (runStatus === "RUNNING" && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 5e3));
            const statusResponse = await fetch(
              `https://api.apify.com/v2/acts/${urlSafeActorId}/runs/${runId}?token=${this.apiKey}`
            );
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              runStatus = statusData.data.status;
              console.log(`[APIFY] Status: ${runStatus} (${attempts + 1}/${maxAttempts})`);
            }
            attempts++;
          }
          if (runStatus !== "SUCCEEDED") {
            throw new Error(`Apify run did not complete successfully. Status: ${runStatus}`);
          }
          console.log(`[APIFY] Run completed successfully!`);
          const datasetResponse = await fetch(
            `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${this.apiKey}`
          );
          if (!datasetResponse.ok) {
            throw new Error(`Failed to fetch dataset: ${datasetResponse.status}`);
          }
          const posts = await datasetResponse.json();
          console.log(`[APIFY] Retrieved ${posts.length} posts from dataset`);
          if (posts.length > 0) {
            console.log("\n\u{1F4CB} APIFY RESPONSE - FIRST 3 POSTS:");
            posts.slice(0, 3).forEach((post, idx) => {
              console.log(`
--- POST ${idx + 1} ---`);
              console.log("Text preview:", post.text?.substring(0, 100));
              console.log("Images field:", post.images);
              console.log("Media field:", JSON.stringify(post.media, null, 2));
              console.log("postUrl:", post.postUrl);
              console.log("url:", post.url);
              console.log("topLevelUrl:", post.topLevelUrl);
              console.log("All keys:", Object.keys(post));
            });
            console.log("\n");
          }
          const scrapedPosts = this.parseApifyResponse(posts);
          console.log(`[APIFY] Successfully parsed ${scrapedPosts.length} posts`);
          return scrapedPosts;
        } catch (error) {
          console.error("[APIFY] Error scraping Facebook page:", error);
          throw new Error("Failed to scrape Facebook page with Apify");
        }
      }
      /**
       * Scrape a single Facebook post using authenticated session (with cookies)
       * This can access login-protected posts that the regular scraper cannot reach.
       * 
       * @param postUrl - The Facebook post URL to scrape
       * @returns The scraped post or null if not found
       */
      async scrapeSinglePostAuthenticated(postUrl) {
        try {
          if (!this.apiKey) {
            throw new Error("APIFY_API_KEY is not configured");
          }
          if (!this.facebookCookies) {
            console.log(`[APIFY-AUTH] \u26A0\uFE0F No Facebook cookies configured - cannot use authenticated scraping`);
            return null;
          }
          console.log(`
\u{1F510} [APIFY-AUTH] Scraping with AUTHENTICATED session: ${postUrl}`);
          let cookies;
          try {
            cookies = JSON.parse(this.facebookCookies);
            console.log(`   \u2705 Cookies parsed: ${cookies.length} cookies available`);
          } catch (e) {
            console.error(`   \u274C Failed to parse FACEBOOK_COOKIES - must be valid JSON array`);
            console.error(`   \u{1F4A1} Export cookies using Cookie-Editor browser extension`);
            return null;
          }
          const formattedCookies = cookies.map((c) => ({
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path || "/",
            httpOnly: c.httpOnly || false,
            secure: c.secure || true
          }));
          console.log(`   \u{1F4CB} Formatted ${formattedCookies.length} cookies for Apify`);
          const authActorId = "apify~facebook-posts-scraper";
          console.log(`   \u26A0\uFE0F Note: Free actor may not support authenticated access`);
          console.log(`   \u{1F4A1} For private posts, consider renting: curious_coder/facebook-profile-scraper`);
          const runResponse = await fetch(
            `https://api.apify.com/v2/acts/${authActorId}/runs?token=${this.apiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                // apify/facebook-posts-scraper expects startUrls
                startUrls: [{ url: postUrl }],
                // Try passing cookies (may not work with this actor)
                cookies: formattedCookies,
                // Maximum number of posts to scrape
                maxPosts: 10,
                scrapePosts: true,
                scrapeAbout: false,
                scrapeReviews: false,
                maxPostDate: "30 days",
                // Proxy configuration
                proxyConfiguration: {
                  useApifyProxy: true
                }
              })
            }
          );
          if (!runResponse.ok) {
            const errorText = await runResponse.text();
            console.error(`[APIFY-AUTH] API error (${runResponse.status}):`, errorText);
            throw new Error(`HTTP error! status: ${runResponse.status}`);
          }
          const runData = await runResponse.json();
          const runId = runData.data.id;
          const defaultDatasetId = runData.data.defaultDatasetId;
          console.log(`   \u{1F680} Run started: ${runId}`);
          console.log(`   \u23F3 Waiting for completion...`);
          const maxAttempts = 36;
          let attempts = 0;
          let runStatus = "RUNNING";
          while (runStatus === "RUNNING" && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 5e3));
            const statusResponse = await fetch(
              `https://api.apify.com/v2/acts/${authActorId}/runs/${runId}?token=${this.apiKey}`
            );
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              runStatus = statusData.data.status;
              if (attempts % 6 === 0) {
                console.log(`   \u23F3 Status: ${runStatus} (${attempts * 5}s elapsed)`);
              }
            }
            attempts++;
          }
          if (runStatus !== "SUCCEEDED") {
            console.error(`   \u274C Run did not complete. Status: ${runStatus}`);
            return null;
          }
          console.log(`   \u2705 Run completed successfully!`);
          const datasetResponse = await fetch(
            `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${this.apiKey}`
          );
          if (!datasetResponse.ok) {
            console.error(`   \u274C Failed to fetch dataset: ${datasetResponse.status}`);
            return null;
          }
          const posts = await datasetResponse.json();
          console.log(`   \u{1F4CB} Retrieved ${posts.length} posts from authenticated scrape`);
          if (posts.length === 0) {
            console.log(`   \u26A0\uFE0F No posts found - the post may be deleted or still not accessible`);
            return null;
          }
          console.log(`   \u{1F4CB} First post structure:`, JSON.stringify(posts[0], null, 2).substring(0, 500) + "...");
          const scrapedPosts = this.parseApifyResponse(posts);
          if (scrapedPosts.length > 0) {
            console.log(`   \u2705 Successfully scraped authenticated post: ${scrapedPosts[0].title.substring(0, 60)}...`);
            return scrapedPosts[0];
          }
          console.log(`   \u26A0\uFE0F Post parsed but no valid content found`);
          return null;
        } catch (error) {
          console.error(`[APIFY-AUTH] Error in authenticated scrape:`, error);
          return null;
        }
      }
      async scrapeSingleFacebookPost(postUrl) {
        try {
          console.log(`[APIFY] Scraping single post: ${postUrl}`);
          const posts = await this.scrapeFacebookPage(postUrl);
          if (posts.length > 0) {
            return posts[0];
          }
          console.log(`[APIFY] Regular scrape returned no results, trying authenticated fallback...`);
          if (this.hasAuthenticatedSession()) {
            const authenticatedPost = await this.scrapeSinglePostAuthenticated(postUrl);
            if (authenticatedPost) {
              console.log(`[APIFY] \u2705 Authenticated fallback successful!`);
              return authenticatedPost;
            }
          } else {
            console.log(`[APIFY] \u26A0\uFE0F No authenticated session configured (set FACEBOOK_COOKIES)`);
          }
          return null;
        } catch (error) {
          console.error(`[APIFY] Error scraping single post:`, error);
          if (this.hasAuthenticatedSession()) {
            console.log(`[APIFY] Trying authenticated fallback after error...`);
            try {
              const authenticatedPost = await this.scrapeSinglePostAuthenticated(postUrl);
              if (authenticatedPost) {
                console.log(`[APIFY] \u2705 Authenticated fallback successful after error!`);
                return authenticatedPost;
              }
            } catch (authError) {
              console.error(`[APIFY] Authenticated fallback also failed:`, authError);
            }
          }
          return null;
        }
      }
      parseApifyResponse(posts) {
        const scrapedPosts = [];
        const seenUrls = /* @__PURE__ */ new Set();
        for (const post of posts) {
          try {
            const postAsAny = post;
            if (postAsAny.error || postAsAny.errorDescription) {
              console.log(`
\u274C [APIFY] API RETURNED ERROR FOR POST:`);
              console.log(`   URL: ${postAsAny.url || "unknown"}`);
              console.log(`   Error: ${postAsAny.error || "no error field"}`);
              console.log(`   Error Description: ${postAsAny.errorDescription || "no description"}`);
              console.log(`   All keys: ${Object.keys(post).join(", ")}`);
              continue;
            }
            if (!post.text || post.text.trim().length === 0) {
              console.log(`[APIFY] Skipping post - no text content`);
              console.log(`   URL: ${post.postUrl || post.url || "unknown"}`);
              console.log(`   Keys present: ${Object.keys(post).join(", ")}`);
              continue;
            }
            const rawSourceUrl = post.postUrl || post.url || post.topLevelUrl;
            if (!rawSourceUrl) {
              console.log(`[APIFY] \u26A0\uFE0F Skipping post - no URL found in postUrl, url, or topLevelUrl fields`);
              console.log(`[APIFY] Post data keys:`, Object.keys(post));
              continue;
            }
            const normalizedSourceUrl = this.normalizeFacebookUrl(rawSourceUrl);
            if (seenUrls.has(normalizedSourceUrl)) {
              console.log(`[APIFY] \u23ED\uFE0F  Skipping duplicate URL in batch: ${normalizedSourceUrl}`);
              continue;
            }
            seenUrls.add(normalizedSourceUrl);
            const lines = post.text.split("\n").filter((line) => line.trim());
            const title = lines[0]?.substring(0, 200) || post.text.substring(0, 100);
            const content = post.text;
            const imageUrls = [];
            if (post.images && post.images.length > 0) {
              for (const img of post.images) {
                if (img.link && !imageUrls.includes(img.link)) {
                  imageUrls.push(img.link);
                }
              }
            }
            if (post.media) {
              if (Array.isArray(post.media)) {
                for (const mediaItem of post.media) {
                  let imgUrl;
                  if (mediaItem.image) {
                    imgUrl = typeof mediaItem.image === "string" ? mediaItem.image : mediaItem.image.uri;
                  } else if (mediaItem.thumbnail) {
                    imgUrl = mediaItem.thumbnail;
                  }
                  if (imgUrl && !imageUrls.includes(imgUrl)) {
                    imageUrls.push(imgUrl);
                  }
                }
              } else {
                if (post.media.image && !imageUrls.includes(post.media.image)) {
                  imageUrls.push(post.media.image);
                }
                if (post.media.album_preview && Array.isArray(post.media.album_preview)) {
                  for (const albumImg of post.media.album_preview) {
                    const imgUrl = typeof albumImg === "string" ? albumImg : albumImg?.url || albumImg?.link;
                    if (imgUrl && !imageUrls.includes(imgUrl)) {
                      imageUrls.push(imgUrl);
                    }
                  }
                }
              }
            }
            if (imageUrls.length === 0) {
              console.log(`[APIFY] \u{1F3A5} Skipping video-only post (no images)`);
              console.log(`[APIFY]    Title: ${title.substring(0, 80)}...`);
              const mediaObj = !Array.isArray(post.media) ? post.media : void 0;
              console.log(`[APIFY]    Has video: ${!!mediaObj?.video}`);
              console.log(`[APIFY]    Has video thumbnail: ${!!mediaObj?.video_thumbnail}`);
              continue;
            }
            const imageUrl = imageUrls[0];
            if (imageUrls.length > 1) {
              console.log(`
\u{1F4F8} MULTI-IMAGE POST DETECTED!`);
              console.log(`   Title: ${title.substring(0, 60)}...`);
              console.log(`   Image count: ${imageUrls.length}`);
              console.log(`   Images:`);
              imageUrls.forEach((url, idx) => {
                console.log(`     ${idx + 1}. ${url.substring(0, 100)}${url.length > 100 ? "..." : ""}`);
              });
              console.log("");
            }
            const publishedAt = post.time ? new Date(post.time) : /* @__PURE__ */ new Date();
            scrapedPosts.push({
              title: title.trim(),
              content: content.trim(),
              imageUrl,
              imageUrls: imageUrls.length > 0 ? imageUrls : void 0,
              sourceUrl: normalizedSourceUrl,
              publishedAt
            });
          } catch (error) {
            console.error(`[APIFY] Error parsing post:`, error);
          }
        }
        return scrapedPosts;
      }
      async scrapeFacebookPageWithPagination(pageUrl, maxPages = 1, checkForDuplicate) {
        const posts = await this.scrapeFacebookPage(pageUrl);
        if (checkForDuplicate) {
          const filteredPosts = [];
          for (const post of posts) {
            const isDuplicate = await checkForDuplicate(post.sourceUrl);
            if (!isDuplicate) {
              filteredPosts.push(post);
            } else {
              console.log(`[APIFY] \u{1F517} Skipping known post: ${post.sourceUrl}`);
            }
          }
          return filteredPosts;
        }
        return posts;
      }
    };
    apifyScraperService = new ApifyScraperService();
  }
});

// server/services/scraper.ts
var scraper_exports = {};
__export(scraper_exports, {
  ScraperService: () => ScraperService,
  getScraperService: () => getScraperService,
  scrapePostComments: () => scrapePostComments,
  scraperService: () => scraperService
});
async function scrapePostComments(postUrl, limit = 15) {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  if (!apiKey) {
    console.log("   \u26A0\uFE0F SCRAPECREATORS_API_KEY not set - skipping comment scraping");
    return [];
  }
  try {
    console.log(`   \u{1F4AC} Fetching top ${limit} comments for story enrichment...`);
    const response = await fetch(
      `https://api.scrapecreators.com/v1/facebook/post/comments?url=${encodeURIComponent(postUrl)}`,
      {
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json"
        }
      }
    );
    if (!response.ok) {
      console.log(`   \u26A0\uFE0F Comments API returned ${response.status} - continuing without comments`);
      return [];
    }
    const data = await response.json();
    if (!data.success || !data.comments || data.comments.length === 0) {
      console.log(`   \u26A0\uFE0F No comments found for this post`);
      return [];
    }
    const comments = data.comments.filter((c) => c.text && c.text.trim().length > 0).map((c) => ({
      id: c.id,
      text: c.text,
      reactionCount: c.reaction_count || 0,
      replyCount: c.reply_count || 0,
      createdAt: c.created_at || ""
    })).sort((a, b) => b.reactionCount - a.reactionCount).slice(0, limit);
    console.log(`   \u2705 Fetched ${comments.length} comments (top by engagement)`);
    if (comments.length > 0) {
      console.log(`   \u{1F4DD} Top comment preview: "${comments[0].text.substring(0, 50)}..." (${comments[0].reactionCount} reactions)`);
    }
    return comments;
  } catch (error) {
    console.error(`   \u26A0\uFE0F Error fetching comments:`, error);
    return [];
  }
}
async function getScraperService() {
  console.log("\u{1F504} Using ScrapeCreators scraper");
  return scraperService;
}
var ScraperService, scraperService;
var init_scraper = __esm({
  "server/services/scraper.ts"() {
    "use strict";
    ScraperService = class {
      scrapeCreatorsApiUrl = "https://api.scrapecreators.com/v1/facebook/profile/posts";
      scrapeCreatorsSinglePostUrl = "https://api.scrapecreators.com/v1/facebook/post";
      apiKey = process.env.SCRAPECREATORS_API_KEY;
      // Extract canonical Facebook post ID - ALWAYS returns numeric ID when available
      // This is critical for deduplication: Facebook has multiple URL/ID formats for the same post,
      // and we must normalize to a SINGLE canonical ID (numeric preferred) to prevent duplicates
      // 
      // Examples of the SAME post with different IDs:
      //   - URL: /posts/1146339707616870  → Returns: "1146339707616870"
      //   - URL: /posts/pfbid0wGs...      → Returns: "1146339707616870" (if apiId is numeric)
      //   - URL: /posts/pfbid0wGs...      → Returns: "pfbid0wGs..." (if no numeric ID available)
      //   - URL: /reel/4117170505095746   → Returns: "4117170505095746" (reels)
      extractFacebookPostId(url, apiId) {
        try {
          if (apiId && /^\d+$/.test(apiId)) {
            return apiId;
          }
          const numericMatch = url.match(/\/(?:posts|reel|reels|videos)\/(\d+)/);
          if (numericMatch) {
            return numericMatch[1];
          }
          if (apiId && apiId.startsWith("pfbid")) {
            return apiId;
          }
          const pfbidMatch = url.match(/\/posts\/(pfbid[\w]+)/);
          if (pfbidMatch) {
            return pfbidMatch[1];
          }
          if (apiId) {
            return apiId;
          }
          return null;
        } catch (error) {
          console.error("Error extracting Facebook post ID:", error);
          return null;
        }
      }
      // Normalize Facebook post URL using the API's post ID
      // This handles the case where Facebook has multiple URL formats for the same post:
      // - pfbid format: /posts/pfbid028JJH...
      // - numeric format: /posts/896507726043641
      // Both are valid URLs for the SAME post, so we use the API's id field as canonical
      normalizeFacebookUrl(postId, fallbackUrl) {
        try {
          if (postId) {
            return `https://www.facebook.com/posts/${postId}`;
          }
          const postIdMatch = fallbackUrl.match(/\/posts\/([^/?]+)/);
          if (postIdMatch) {
            return `https://www.facebook.com/posts/${postIdMatch[1]}`;
          }
          return fallbackUrl;
        } catch (error) {
          console.error("Error normalizing Facebook URL:", error);
          return fallbackUrl;
        }
      }
      // Follow Facebook share URL redirects to get the canonical post URL
      // Share URLs like /share/p/xxx redirect to the actual post with page name
      async resolveShareUrl(url) {
        const urls = [];
        const shareMatch = url.match(/\/share\/(?:p\/)?([A-Za-z0-9]+)/);
        if (!shareMatch) {
          urls.push(url);
          return urls;
        }
        const shareId = shareMatch[1];
        console.log(`\u{1F4DD} Detected share URL with ID: ${shareId}`);
        console.log(`\u{1F517} Following redirect to find canonical URL...`);
        try {
          const response = await fetch(url, {
            redirect: "manual",
            // Don't auto-follow, we want to see the redirect
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
          });
          const location = response.headers.get("location");
          if (location) {
            console.log(`\u2705 Found redirect to: ${location}`);
            const pageMatch = location.match(/facebook\.com\/([^\/]+)\//);
            if (pageMatch) {
              const pageName = pageMatch[1];
              console.log(`\u2705 Extracted page name: ${pageName}`);
              urls.push(`https://www.facebook.com/${pageName}`);
              urls.push(location);
            } else {
              urls.push(location);
            }
          } else {
            console.log(`\u26A0\uFE0F  No redirect found, trying alternative formats...`);
            urls.push(`https://www.facebook.com/${shareId}`);
            urls.push(`https://www.facebook.com/permalink.php?story_fbid=${shareId}`);
          }
        } catch (error) {
          console.error(`Error following redirect:`, error);
          urls.push(`https://www.facebook.com/${shareId}`);
          urls.push(`https://www.facebook.com/permalink.php?story_fbid=${shareId}`);
        }
        urls.push(url);
        return urls;
      }
      async scrapeFacebookPage(pageUrl) {
        try {
          if (!this.apiKey) {
            throw new Error("SCRAPECREATORS_API_KEY is not configured");
          }
          console.log(`Scraping Facebook page: ${pageUrl}`);
          const normalizedUrls = await this.resolveShareUrl(pageUrl);
          for (const url of normalizedUrls) {
            console.log(`Attempting to scrape: ${url}`);
            try {
              const response = await fetch(`${this.scrapeCreatorsApiUrl}?url=${encodeURIComponent(url)}`, {
                headers: {
                  "x-api-key": this.apiKey
                }
              });
              if (!response.ok) {
                const errorText = await response.text();
                console.error(`ScrapeCreators API error (${response.status}) for ${url}:`, errorText);
                continue;
              }
              const data = await response.json();
              console.log(`ScrapeCreators returned ${data.posts?.length || 0} posts`);
              if (data.posts && data.posts.length > 0) {
                console.log("\n\u{1F4CB} FIRST POST STRUCTURE FROM API:");
                console.log(JSON.stringify(data.posts[0], null, 2));
                if (data.posts[0].attachments?.data) {
                  console.log("\n\u{1F4CE} ATTACHMENTS STRUCTURE:");
                  console.log(JSON.stringify(data.posts[0].attachments, null, 2));
                }
                console.log("\n");
              }
              if (!data.success || !data.posts || data.posts.length === 0) {
                console.log(`No posts found for URL format: ${url}`);
                continue;
              }
              const scrapedPosts = this.parseScrapeCreatorsResponse(data.posts, pageUrl);
              console.log(`\u2705 Successfully parsed ${scrapedPosts.length} posts from ${url}`);
              return scrapedPosts;
            } catch (urlError) {
              console.error(`Error with URL ${url}:`, urlError);
              continue;
            }
          }
          console.log("\u274C No posts found with any URL format");
          return [];
        } catch (error) {
          console.error("Error scraping Facebook page:", error);
          throw new Error("Failed to scrape Facebook page");
        }
      }
      /**
       * Scrape a SINGLE Facebook post by its URL
       * This uses the /v1/facebook/post endpoint which is designed for individual posts
       * Supports: share URLs, post permalinks, pfbid URLs, etc.
       */
      async scrapeSingleFacebookPost(postUrl) {
        try {
          if (!this.apiKey) {
            throw new Error("SCRAPECREATORS_API_KEY is not configured");
          }
          console.log(`\u{1F3AF} Scraping SINGLE Facebook post: ${postUrl}`);
          if (postUrl.includes("/share/p/") || postUrl.includes("/share/")) {
            console.log(`   \u{1F4CE} Detected share URL, resolving...`);
            const resolvedUrls = await this.resolveShareUrl(postUrl);
            if (resolvedUrls.length > 0 && resolvedUrls[0] !== postUrl) {
              postUrl = resolvedUrls[0];
              console.log(`   \u2705 Resolved to: ${postUrl}`);
            }
          }
          if (postUrl.includes("/reel/") || postUrl.includes("/reels/")) {
            const reelId = postUrl.match(/\/reels?\/(\d+)/)?.[1];
            console.log(`   \u{1F3AC} Detected Facebook REEL URL`);
            console.log(`   \u{1F3AC} Reel ID: ${reelId || "unknown"}`);
            console.log(`   \u{1F4E1} Sending to ScrapeCreators API (reels are supported)...`);
          }
          let cleanUrl = postUrl;
          try {
            const urlObj = new URL(postUrl);
            urlObj.search = "";
            urlObj.hash = "";
            cleanUrl = urlObj.toString();
            if (cleanUrl !== postUrl) {
              console.log(`   \u{1F9F9} Cleaned URL: ${cleanUrl}`);
            }
          } catch (e) {
            console.log(`   \u26A0\uFE0F Could not parse URL, using original`);
          }
          const response = await fetch(`${this.scrapeCreatorsSinglePostUrl}?url=${encodeURIComponent(cleanUrl)}`, {
            headers: {
              "x-api-key": this.apiKey
            }
          });
          if (!response.ok && response.status === 404) {
            const reelId = cleanUrl.match(/\/reels?\/(\d+)/)?.[1];
            if (reelId) {
              console.log(`   \u274C Direct reel URL failed, trying alternative formats...`);
              const alternativeUrls = [
                `https://www.facebook.com/watch?v=${reelId}`,
                // Watch format
                `https://www.facebook.com/videos/${reelId}`
                // Direct video format
              ];
              for (const altUrl of alternativeUrls) {
                console.log(`   \u{1F504} Trying: ${altUrl}`);
                const altResponse = await fetch(`${this.scrapeCreatorsSinglePostUrl}?url=${encodeURIComponent(altUrl)}`, {
                  headers: {
                    "x-api-key": this.apiKey
                  }
                });
                if (altResponse.ok) {
                  const altData = await altResponse.json();
                  console.log(`   \u2705 Alternative URL worked!`);
                  if (altData && (altData.text || altData.description)) {
                    const post2 = altData;
                    const text3 = post2.text || post2.description || "";
                    const lines2 = text3.split("\n").filter((line) => line.trim());
                    const title2 = lines2[0]?.substring(0, 200) || text3.substring(0, 100);
                    const isVideo2 = true;
                    const videoUrl2 = post2.video_url || post2.video?.hd_url || post2.video?.sd_url || post2.videoDetails?.hdUrl || post2.videoDetails?.sdUrl;
                    const videoThumbnail2 = post2.video?.thumbnail || post2.videoThumbnail || post2.videoDetails?.thumbnail || post2.full_picture || post2.image;
                    const scrapedPost2 = {
                      title: title2.trim(),
                      content: text3.trim(),
                      imageUrl: videoThumbnail2,
                      sourceUrl: postUrl,
                      // Keep original reel URL as source
                      facebookPostId: reelId,
                      publishedAt: post2.creation_time ? new Date(post2.creation_time) : /* @__PURE__ */ new Date(),
                      isVideo: isVideo2,
                      videoUrl: videoUrl2,
                      videoThumbnail: videoThumbnail2,
                      location: post2.place?.name,
                      likeCount: post2.like_count,
                      commentCount: post2.comment_count,
                      shareCount: post2.share_count,
                      viewCount: post2.view_count
                    };
                    console.log(`   \u2705 Successfully scraped reel via alternative URL`);
                    console.log(`      Title: ${scrapedPost2.title.substring(0, 60)}...`);
                    return scrapedPost2;
                  }
                }
              }
              console.log(`   \u274C All alternative URL formats failed`);
            }
          }
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`ScrapeCreators single post API error (${response.status}):`, errorText);
            if (response.status === 404) {
              console.log(`
\u{1F504} Single post API failed, trying fallback: page scraper...`);
              const reelIdMatch = cleanUrl.match(/\/reel\/(\d+)/);
              if (reelIdMatch) {
                console.log(`   \u{1F3AC} Detected REEL URL with ID: ${reelIdMatch[1]}`);
                console.log(`   \u26A0\uFE0F  Reels require direct API support - fallback may not work`);
              }
              const pageMatch = cleanUrl.match(/facebook\.com\/([^\/]+)\//);
              if (pageMatch && pageMatch[1] !== "reel" && pageMatch[1] !== "watch") {
                const pageName = pageMatch[1];
                const pageUrl = `https://www.facebook.com/${pageName}`;
                console.log(`   \u{1F4C4} Scraping page: ${pageUrl} (up to 5 pages to find older posts)`);
                try {
                  const pagePosts = await this.scrapeFacebookPageWithPagination(pageUrl, 5);
                  console.log(`   \u{1F4CB} Found ${pagePosts.length} posts from page`);
                  const pfbidMatch = cleanUrl.match(/pfbid([A-Za-z0-9]+)/);
                  const numericIdMatch = cleanUrl.match(/\/(?:posts|reel|reels|videos)\/(\d+)/);
                  const pfbidSuffix = pfbidMatch ? pfbidMatch[0].slice(-15) : null;
                  console.log(`   \u{1F50D} Looking for: ${pfbidMatch ? pfbidMatch[0].substring(0, 20) + "..." : numericIdMatch?.[1] || "unknown"}`);
                  const matchingPost = pagePosts.find((p) => {
                    if (pfbidMatch && p.sourceUrl?.includes(pfbidMatch[0])) return true;
                    if (pfbidSuffix && p.sourceUrl?.includes(pfbidSuffix)) return true;
                    if (numericIdMatch && p.sourceUrl?.includes(numericIdMatch[1])) return true;
                    if (numericIdMatch && p.facebookPostId === numericIdMatch[1]) return true;
                    return false;
                  });
                  if (matchingPost) {
                    console.log(`   \u2705 Found matching post via page scraper!`);
                    return matchingPost;
                  } else {
                    console.log(`   \u26A0\uFE0F Post not found in ${pagePosts.length} page results`);
                    console.log(`   \u{1F4A1} The post may have been deleted, made private, or is very old`);
                    if (reelIdMatch) {
                      console.log(`   \u{1F3AC} NOTE: Facebook Reels may not appear in regular page feeds`);
                    }
                  }
                } catch (pageError) {
                  console.error(`   \u274C Page scraper fallback failed:`, pageError);
                }
              } else if (reelIdMatch) {
                console.log(`   \u26A0\uFE0F  Cannot determine source page from reel URL`);
                console.log(`   \u{1F4A1} Try using the full URL with page name: facebook.com/PageName/videos/ID`);
              }
            }
            throw new Error(`API error: ${response.status} - ${errorText}`);
          }
          const data = await response.json();
          console.log("\u{1F4CB} SINGLE POST API RESPONSE:");
          console.log(JSON.stringify(data, null, 2));
          if (data.error || data.errorDescription || data.success === false) {
            console.log(`
\u274C SCRAPECREATORS API RETURNED ERROR:`);
            console.log(`   URL: ${postUrl}`);
            console.log(`   Error: ${data.error || "no error field"}`);
            console.log(`   Error Description: ${data.errorDescription || data.message || "no description"}`);
            console.log(`   All keys: ${Object.keys(data).join(", ")}`);
            console.log(`
\u{1F504} Attempting page scraper fallback...`);
            const pageMatch = postUrl.match(/facebook\.com\/([^\/]+)\//);
            if (pageMatch && pageMatch[1] !== "reel" && pageMatch[1] !== "watch") {
              const pageName = pageMatch[1];
              const pageUrl = `https://www.facebook.com/${pageName}`;
              console.log(`   \u{1F4C4} Scraping page: ${pageUrl}`);
              try {
                const pagePosts = await this.scrapeFacebookPageWithPagination(pageUrl, 3);
                console.log(`   \u{1F4CB} Found ${pagePosts.length} posts from page`);
                const pfbidMatch = postUrl.match(/pfbid([A-Za-z0-9]+)/);
                const numericIdMatch = postUrl.match(/\/(?:posts|reel|reels|videos)\/(\d+)/);
                const matchingPost = pagePosts.find((p) => {
                  if (pfbidMatch && p.sourceUrl?.includes(pfbidMatch[0])) return true;
                  if (numericIdMatch && p.sourceUrl?.includes(numericIdMatch[1])) return true;
                  if (numericIdMatch && p.facebookPostId === numericIdMatch[1]) return true;
                  return false;
                });
                if (matchingPost) {
                  console.log(`   \u2705 Found matching post via page scraper fallback!`);
                  return matchingPost;
                } else {
                  console.log(`   \u26A0\uFE0F Post not found in page results`);
                }
              } catch (pageError) {
                console.error(`   \u274C Page scraper fallback failed:`, pageError);
              }
            }
            console.log(`
\u{1F510} Attempting APIFY AUTHENTICATED fallback for login-protected content...`);
            try {
              const { apifyScraperService: apifyScraperService2 } = await Promise.resolve().then(() => (init_apify_scraper(), apify_scraper_exports));
              if (apifyScraperService2.hasAuthenticatedSession()) {
                const authenticatedPost = await apifyScraperService2.scrapeSinglePostAuthenticated(postUrl);
                if (authenticatedPost) {
                  console.log(`   \u2705 Successfully scraped via Apify authenticated session!`);
                  return authenticatedPost;
                } else {
                  console.log(`   \u26A0\uFE0F Apify authenticated scrape returned no results`);
                }
              } else {
                console.log(`   \u26A0\uFE0F Apify authenticated session not configured`);
                console.log(`   \u{1F4A1} Set APIFY_API_KEY and FACEBOOK_COOKIES environment variables`);
                console.log(`   \u{1F4A1} Export cookies from logged-in Facebook session using Cookie-Editor extension`);
              }
            } catch (apifyError) {
              console.error(`   \u274C Apify authenticated fallback failed:`, apifyError);
            }
            return null;
          }
          if (!data || !data.text && !data.description) {
            console.log("\u274C No post data returned from single post endpoint");
            console.log("   Keys available:", Object.keys(data || {}).join(", "));
            return null;
          }
          const post = data;
          const text2 = post.text || post.description || "";
          if (!text2.trim()) {
            console.log("\u274C Post has no text content");
            return null;
          }
          const lines = text2.split("\n").filter((line) => line.trim());
          const title = lines[0]?.substring(0, 200) || text2.substring(0, 100);
          const content = text2;
          let imageUrl;
          let imageUrls;
          if (post.image) {
            imageUrl = post.image;
          } else if (post.full_picture) {
            imageUrl = post.full_picture;
          } else if (post.images && Array.isArray(post.images)) {
            imageUrls = post.images;
            imageUrl = post.images[0];
          }
          if (!imageUrl && post.attachments?.data) {
            for (const attachment of post.attachments.data) {
              if (attachment.media?.image?.src) {
                imageUrl = attachment.media.image.src;
                break;
              }
              if (attachment.subattachments?.data) {
                const subImages = attachment.subattachments.data.map((sub) => sub.media?.image?.src).filter(Boolean);
                if (subImages.length > 0) {
                  imageUrls = subImages;
                  imageUrl = subImages[0];
                  break;
                }
              }
            }
          }
          if (!imageUrl && post.media && Array.isArray(post.media)) {
            const mediaImages = post.media.filter((m) => m.type === "photo" || m.image).map((m) => m.image || m.src || m.url).filter(Boolean);
            if (mediaImages.length > 0) {
              imageUrls = mediaImages;
              imageUrl = mediaImages[0];
            }
          }
          const isUrlVideo = postUrl.includes("/reel/") || postUrl.includes("/reels/") || postUrl.includes("/videos/") || postUrl.includes("/watch");
          const hasVideoAttachment = post.attachments?.data?.some(
            (att) => att.type?.includes("video") || att.type?.includes("reel") || att.media_type === "video"
          );
          const isVideo = !!(post.video_url || post.video?.sd_url || post.video?.hd_url || post.videoDetails?.sdUrl || post.videoDetails?.hdUrl) || isUrlVideo || hasVideoAttachment;
          const videoUrl = post.video_url || post.video?.hd_url || post.video?.sd_url || post.videoDetails?.hdUrl || post.videoDetails?.sdUrl;
          const videoThumbnail = post.video?.thumbnail || post.videoThumbnail || post.videoDetails?.thumbnail || post.image || imageUrl;
          if (isVideo) {
            console.log(`
\u{1F3A5} VIDEO DETECTED (Single Post) via parsing bits:`);
            console.log(`   - Has direct URL: ${!!videoUrl}`);
            console.log(`   - Is URL pattern: ${isUrlVideo}`);
            console.log(`   - Has video attachment: ${hasVideoAttachment}`);
          }
          const facebookPostId = this.extractFacebookPostId(postUrl, post.id || post.post_id);
          const publishedAt = post.creation_time ? new Date(post.creation_time) : post.created_time ? new Date(post.created_time) : /* @__PURE__ */ new Date();
          const location = post.place?.name;
          const textFormatPresetId = post.text_format_preset_id;
          const likeCount = post.like_count;
          const commentCount = post.comment_count;
          const shareCount = post.share_count;
          const viewCount = post.view_count;
          const scrapedPost = {
            title: title.trim(),
            content: content.trim(),
            imageUrl,
            imageUrls: imageUrls && imageUrls.length > 0 ? imageUrls : void 0,
            sourceUrl: postUrl,
            facebookPostId: facebookPostId || void 0,
            publishedAt,
            textFormatPresetId,
            isVideo,
            videoUrl,
            videoThumbnail,
            location,
            likeCount,
            commentCount,
            shareCount,
            viewCount,
            sourceName: post.author?.name || post.page_name
          };
          console.log(`\u2705 Successfully scraped single post`);
          console.log(`   Title: ${scrapedPost.title.substring(0, 60)}...`);
          console.log(`   Images: ${scrapedPost.imageUrls?.length || (scrapedPost.imageUrl ? 1 : 0)}`);
          console.log(`   Is Video: ${scrapedPost.isVideo}`);
          return scrapedPost;
        } catch (error) {
          console.error("Error scraping single Facebook post:", error);
          throw error;
        }
      }
      parseScrapeCreatorsResponse(posts, sourceUrl) {
        const scrapedPosts = [];
        const seenUrls = /* @__PURE__ */ new Set();
        for (const post of posts) {
          try {
            const rawSourceUrl = post.permalink || post.url || sourceUrl;
            const isUrlVideo = rawSourceUrl.includes("/reel/") || rawSourceUrl.includes("/reels/") || rawSourceUrl.includes("/videos/") || rawSourceUrl.includes("/watch") || post.url?.includes("/reel/") || post.permalink?.includes("/reel/");
            const hasVideoAttachment = post.attachments?.data?.some(
              (att) => att.type?.includes("video") || att.type?.includes("reel") || att.media_type === "video"
            );
            const isVideo = !!(post.videoDetails?.sdUrl || post.videoDetails?.hdUrl) || isUrlVideo || hasVideoAttachment;
            const videoUrl = post.videoDetails?.hdUrl || post.videoDetails?.sdUrl;
            const videoThumbnail = post.videoDetails?.thumbnail || post.full_picture || post.image;
            if (!post.text || post.text.trim().length === 0) {
              if (isVideo) {
                console.log(`Allowing video post ${post.id} even without text content`);
              } else {
                console.log(`Skipping post ${post.id} - no text content`);
                continue;
              }
            }
            const facebookPostId = this.extractFacebookPostId(rawSourceUrl, post.id);
            if (facebookPostId && seenUrls.has(facebookPostId)) {
              console.log(`\u23ED\uFE0F  Skipping duplicate post ID in batch: ${facebookPostId}`);
              continue;
            }
            if (facebookPostId) {
              seenUrls.add(facebookPostId);
            }
            const actualSourceUrl = rawSourceUrl;
            const lines = post.text ? post.text.split("\n").filter((line) => line.trim()) : [];
            const title = lines[0]?.substring(0, 200) || post.text?.substring(0, 100) || "Video Story";
            const content = post.text || "";
            const imageUrls = [];
            let imageUrl;
            if (post.images && Array.isArray(post.images) && post.images.length > 0) {
              imageUrls.push(...post.images);
            } else {
              if (post.image) {
                imageUrls.push(post.image);
              }
              if (post.full_picture && post.full_picture !== post.image) {
                imageUrls.push(post.full_picture);
              }
              if (post.attachments?.data) {
                for (const attachment of post.attachments.data) {
                  if (attachment.media?.image?.src && !imageUrls.includes(attachment.media.image.src)) {
                    imageUrls.push(attachment.media.image.src);
                  } else if (attachment.url && (attachment.type === "photo" || attachment.media_type === "photo") && !imageUrls.includes(attachment.url)) {
                    imageUrls.push(attachment.url);
                  }
                  if (attachment.subattachments?.data) {
                    for (const subattachment of attachment.subattachments.data) {
                      if (subattachment.media?.image?.src && !imageUrls.includes(subattachment.media.image.src)) {
                        imageUrls.push(subattachment.media.image.src);
                      }
                    }
                  }
                }
              }
            }
            imageUrl = imageUrls[0];
            if (imageUrls.length > 1) {
              console.log(`
\u{1F4F8} MULTI-IMAGE POST DETECTED!`);
              console.log(`   Title: ${title.substring(0, 60)}...`);
              console.log(`   Image count: ${imageUrls.length}`);
              console.log(`   Images:`);
              imageUrls.forEach((url, idx) => {
                console.log(`     ${idx + 1}. ${url.substring(0, 100)}${url.length > 100 ? "..." : ""}`);
              });
              console.log("");
            }
            const publishedAt = post.created_time ? new Date(post.created_time) : /* @__PURE__ */ new Date();
            if (isVideo) {
              console.log(`
\u{1F3A5} VIDEO DETECTED via parsing bits:`);
              console.log(`   - Has direct URL: ${!!videoUrl}`);
              console.log(`   - Is URL pattern: ${isUrlVideo}`);
              console.log(`   - Has video attachment: ${hasVideoAttachment}`);
            }
            const location = post.place?.name;
            scrapedPosts.push({
              title: title.trim(),
              content: content.trim(),
              imageUrl,
              imageUrls: imageUrls.length > 0 ? imageUrls : void 0,
              sourceUrl: actualSourceUrl,
              facebookPostId: facebookPostId || void 0,
              publishedAt,
              textFormatPresetId: post.text_format_preset_id,
              isVideo,
              videoUrl,
              videoThumbnail,
              location,
              likeCount: post.like_count,
              commentCount: post.comment_count,
              shareCount: post.share_count,
              viewCount: post.view_count,
              sourceName: post.author?.name || post.page_name
            });
          } catch (error) {
            console.error(`Error parsing post ${post.id}:`, error);
          }
        }
        return scrapedPosts;
      }
      /**
       * Enrich a reel post with missing thumbnail/video data by fetching from single post API
       * The page feed API often returns empty videoDetails for reels, while the single post API has full data
       */
      async enrichReelWithDetails(post) {
        if (!post.isVideo || post.videoThumbnail || post.imageUrl) {
          return post;
        }
        const reelUrl = post.sourceUrl;
        if (!reelUrl.includes("/reel/") && !reelUrl.includes("/reels/")) {
          return post;
        }
        console.log(`
\u{1F4F9} ENRICHING REEL: Fetching detailed video data for ${reelUrl.substring(0, 60)}...`);
        try {
          const response = await fetch(`${this.scrapeCreatorsSinglePostUrl}?url=${encodeURIComponent(reelUrl)}`, {
            headers: {
              "x-api-key": this.apiKey
            }
          });
          if (!response.ok) {
            console.log(`   \u26A0\uFE0F Failed to fetch reel details (${response.status})`);
            return post;
          }
          const data = await response.json();
          if (data.error || data.errorDescription) {
            console.log(`   \u26A0\uFE0F API returned error: ${data.error || data.errorDescription}`);
            return post;
          }
          const video = data.video;
          if (video) {
            console.log(`   \u2705 Got video details from single post API`);
            post.videoUrl = video.hd_url || video.sd_url || post.videoUrl;
            post.videoThumbnail = video.thumbnail;
            if (!post.imageUrl && video.thumbnail) {
              post.imageUrl = video.thumbnail;
              post.imageUrls = [video.thumbnail];
              console.log(`   \u{1F4F8} Using video thumbnail as primary image: ${video.thumbnail.substring(0, 60)}...`);
            }
          } else {
            console.log(`   \u26A0\uFE0F No video object in response`);
          }
          return post;
        } catch (error) {
          console.error(`   \u274C Error enriching reel:`, error);
          return post;
        }
      }
      // Method to fetch multiple pages of posts using cursor pagination
      async scrapeFacebookPageWithPagination(pageUrl, maxPages = 3, checkForDuplicate) {
        try {
          if (!this.apiKey) {
            throw new Error("SCRAPECREATORS_API_KEY is not configured");
          }
          let allPosts = [];
          let cursor;
          let pageCount = 0;
          let consecutiveDuplicates = 0;
          let shouldStop = false;
          const REQUIRED_CONSECUTIVE_DUPLICATES = 5;
          while (pageCount < maxPages && !shouldStop) {
            const url = cursor ? `${this.scrapeCreatorsApiUrl}?url=${encodeURIComponent(pageUrl)}&cursor=${cursor}` : `${this.scrapeCreatorsApiUrl}?url=${encodeURIComponent(pageUrl)}`;
            console.log(`
\u{1F4C4} Fetching page ${pageCount + 1}/${maxPages}...`);
            const response = await fetch(url, {
              headers: {
                "x-api-key": this.apiKey
              }
            });
            if (!response.ok) {
              console.error(`Error fetching page ${pageCount + 1}: ${response.status}`);
              break;
            }
            const data = await response.json();
            if (pageCount === 0 && data.posts && data.posts.length > 0) {
              console.log("\n\u{1F4CB} FIRST POST STRUCTURE FROM API:");
              console.log(JSON.stringify(data.posts[0], null, 2));
              if (data.posts[0].attachments?.data) {
                console.log("\n\u{1F4CE} ATTACHMENTS STRUCTURE:");
                console.log(JSON.stringify(data.posts[0].attachments, null, 2));
              }
              console.log("\n\u23F0 POST TIMESTAMPS ON PAGE 1:");
              const now = /* @__PURE__ */ new Date();
              data.posts.slice(0, 5).forEach((post, idx) => {
                if (post.created_time) {
                  const postTime = new Date(post.created_time);
                  const ageMinutes = Math.floor((now.getTime() - postTime.getTime()) / 1e3 / 60);
                  const ageHours = (ageMinutes / 60).toFixed(1);
                  console.log(`   Post ${idx + 1}: ${ageHours}h ago (${post.created_time}) - "${post.text?.substring(0, 60)}..."`);
                } else {
                  console.log(`   Post ${idx + 1}: No timestamp - "${post.text?.substring(0, 60)}..."`);
                }
              });
              console.log("\n");
            }
            if (!data.success || !data.posts || data.posts.length === 0) {
              console.log(`No more posts available at page ${pageCount + 1}`);
              break;
            }
            const parsed = this.parseScrapeCreatorsResponse(data.posts, pageUrl);
            const enrichedParsed = [];
            for (const post of parsed) {
              const enrichedPost = await this.enrichReelWithDetails(post);
              enrichedParsed.push(enrichedPost);
            }
            let newPostsOnThisPage = 0;
            let duplicatesOnThisPage = 0;
            if (checkForDuplicate) {
              for (const post of enrichedParsed) {
                const isDuplicate = await checkForDuplicate(post.sourceUrl);
                if (isDuplicate) {
                  consecutiveDuplicates++;
                  duplicatesOnThisPage++;
                  if (pageCount > 0 && consecutiveDuplicates >= REQUIRED_CONSECUTIVE_DUPLICATES) {
                    console.log(`
\u270B EARLY STOP TRIGGERED`);
                    console.log(`   Page: ${pageCount + 1}`);
                    console.log(`   Consecutive duplicates: ${consecutiveDuplicates}`);
                    console.log(`   Last duplicate: "${post.title.substring(0, 50)}..."`);
                    console.log(`   Stopping pagination to save API credits
`);
                    shouldStop = true;
                    break;
                  }
                } else {
                  consecutiveDuplicates = 0;
                  newPostsOnThisPage++;
                  allPosts.push(post);
                }
              }
            } else {
              allPosts = [...allPosts, ...enrichedParsed];
              newPostsOnThisPage = enrichedParsed.length;
            }
            console.log(`   Posts on page ${pageCount + 1}: ${enrichedParsed.length} total, ${newPostsOnThisPage} new, ${duplicatesOnThisPage} duplicates`);
            if (pageCount === 0) {
              console.log(`   \u2139\uFE0F  Page 1 always fetched completely (ensures latest posts captured)`);
            }
            pageCount++;
            if (shouldStop) {
              console.log("\n\u270B Stopping pagination (early-stop threshold reached)");
              break;
            }
            cursor = data.cursor;
            if (!cursor) {
              console.log("\nNo more pages available (no cursor)");
              break;
            }
          }
          console.log(`Total NEW posts collected: ${allPosts.length} from ${pageCount} page(s)`);
          return allPosts;
        } catch (error) {
          console.error("Error scraping with pagination:", error);
          throw error;
        }
      }
    };
    scraperService = new ScraperService();
  }
});

// server/services/facebook-headline-generator.ts
var facebook_headline_generator_exports = {};
__export(facebook_headline_generator_exports, {
  generateFacebookHeadlines: () => generateFacebookHeadlines,
  generateQuickFacebookHeadline: () => generateQuickFacebookHeadline,
  validateHeadline: () => validateHeadline
});
import OpenAI from "openai";
async function generateFacebookHeadlines(input) {
  const systemPrompt = `You are a senior social media editor for Phuket Radar, a local news site.

Your job is to write Facebook teasers that are FACTUAL and SPECIFIC, while withholding enough detail to encourage clicks.

\u{1F6A8} CRITICAL RULES \u{1F6A8}

1. BE FACTUAL - State what ACTUALLY happened with REAL names, places, and events
   \u2705 "Car crashes into garbage truck in Patong"
   \u2705 "EDM Thailand 2026 kicks off in Thalang with massive crowds"
   \u274C "A collision in Patong raises concerns about traffic safety" (vague, made-up context)
   \u274C "Festival in Thalang attracts unexpected crowds" (if it's a known event, it's not unexpected!)

2. DON'T MAKE UP CONTEXT - Never invent implications or reactions that aren't in the story
   \u274C "...raises concerns about..." (editorializing)
   \u274C "...sparks debate about..." (invented reaction)
   \u274C "...unexpected..." (for known/scheduled events)
   \u274C "...leaves residents wondering..." (invented sentiment)

3. THE PHOTOS ARE ALREADY IN THE POST
   NEVER say "see the photos", "watch the video", "see the footage" - readers can already see them!

\u{1F3AF} THE STRATEGY: STATE THE FACTS, WITHHOLD THE FULL STORY
Describe what happened clearly, but don't reveal everything so readers want the full story:

GOOD PATTERNS:
- "Car crashes into garbage truck on Patong Hill" (readers want to know: injuries? cause? road closed?)
- "Tourist arrested at Patong checkpoint" (readers want to know: what for? nationality?)  
- "Man found dead at Karon hotel" (readers want to know: how? who? foul play?)
- "Fire breaks out at Bangla Road nightclub" (readers want to know: damage? injuries? which club?)

BAD PATTERNS (Too vague/generic):
- "Incident on Patong Hill raises safety concerns" (what incident??)
- "A collision in Patong sparks discussion" (just say what crashed!)
- "Authorities respond to situation in Kata" (what situation??)

BAD PATTERNS (Too complete - no reason to click):
- "Russian tourist arrested for overstaying visa by 45 days at airport" (whole story given)
- "Fire at XYZ Bar destroys building, no injuries reported" (nothing left to learn)

REAL STORY GUIDELINES:
- For EVENTS (festivals, concerts): Name the actual event, don't call it "unexpected" if it's known
- For ACCIDENTS: Say what crashed into what, where (e.g., "Car crashes into garbage truck in Patong")
- For CRIMES: Say who was arrested and where, withhold the specific charge
- For DEATHS: Say where the body was found, withhold cause/identity
- For FIRES: Say what's on fire and where, withhold damage/injuries

\u{1F4DD} STYLE RULES:
- Maximum 15 words (shorter is better for Facebook)
- Third-person news perspective (never "we", "our", "join us")
- Use specific locations (Patong, Kata, Karon, Bangla Road, Thalang, etc.)
- Active voice, present tense preferred for breaking news
- No exclamation marks
- No editorializing or invented reactions`;
  const userPrompt = `Generate 3 Facebook teaser variants for this article:

ARTICLE DETAILS:
- Title: ${input.title}
- Category: ${input.category}
- Excerpt: ${input.excerpt}

CONTENT (summarized):
${input.content.substring(0, 1200)}

TASK: Generate 3 FACTUAL headline variants (each max 15 words):

IMPORTANT: Be specific about what happened! Use real names, places, and events from the article.

1. **WHAT HAPPENED?** - State what occurred clearly, withhold details like cause or injuries
   Example: "Car crashes into garbage truck on Patong Hill"
   Example: "Man found dead at Karon Beach hotel"
   
2. **WHO/WHAT?** - State the event/action, withhold specifics like charges or motive
   Example: "Tourist arrested at Patong checkpoint"
   Example: "EDM Thailand 2026 draws thousands to Thalang"
   
3. **WHERE/WHEN?** - Lead with specific location, withhold full outcome
   Example: "Fire breaks out at Bangla Road nightclub"
   Example: "Motorbike collision closes Kamala Beach road"

REMEMBER: Be FACTUAL. Don't add phrases like "raises concerns", "sparks debate", or "unexpected" unless the article actually says that.

Then recommend which ONE works best - pick the most specific and factual option.

Respond in JSON:
{
  "whatHappened": "Your 'what happened?' teaser here",
  "whoWhy": "Your 'who/why?' teaser here", 
  "consequence": "Your 'consequence?' teaser here",
  "recommended": "Copy of the best teaser from above",
  "recommendedAngle": "whatHappened" | "whoWhy" | "consequence",
  "recommendingReason": "Brief explanation of why this angle creates the most curiosity"
}`;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(completion.choices[0].message.content || "{}");
    const validAngles = ["whatHappened", "whoWhy", "consequence"];
    const recommendedAngle = validAngles.includes(result.recommendedAngle) ? result.recommendedAngle : "whatHappened";
    return {
      whatHappened: result.whatHappened || input.title,
      whoWhy: result.whoWhy || input.title,
      consequence: result.consequence || input.title,
      recommended: result.recommended || result[recommendedAngle] || input.title,
      recommendedAngle,
      recommendingReason: result.recommendingReason || "Default recommendation based on story type"
    };
  } catch (error) {
    console.error("[FB-HEADLINE] Error generating headlines:", error);
    return {
      whatHappened: input.title,
      whoWhy: input.title,
      consequence: input.title,
      recommended: input.title,
      recommendedAngle: "whatHappened",
      recommendingReason: "Fallback due to generation error"
    };
  }
}
async function generateQuickFacebookHeadline(title, content, excerpt, category, interestScore, hasVideo = false, hasMultipleImages = false) {
  const variants = await generateFacebookHeadlines({
    title,
    content,
    excerpt,
    category,
    interestScore,
    hasVideo,
    hasMultipleImages
  });
  console.log(`[FB-HEADLINE] Generated curiosity-gap variants:`);
  console.log(`   \u2753 What Happened: "${variants.whatHappened}"`);
  console.log(`   \u{1F50D} Who/Why: "${variants.whoWhy}"`);
  console.log(`   \u2696\uFE0F  Consequence: "${variants.consequence}"`);
  console.log(`   \u2705 Recommended (${variants.recommendedAngle}): "${variants.recommended}"`);
  console.log(`   \u{1F4A1} Reason: ${variants.recommendingReason}`);
  return variants.recommended;
}
function validateHeadline(headline) {
  const issues = [];
  const uselessCTAs = [
    /see the photos/i,
    /watch the video/i,
    /see the footage/i,
    /click to see/i,
    /see the moment/i,
    /watch the moment/i
  ];
  for (const pattern of uselessCTAs) {
    if (pattern.test(headline)) {
      issues.push(`Contains useless CTA (photos already in post): "${headline.match(pattern)?.[0]}"`);
    }
  }
  const vaguePatterns = [
    /raises concerns/i,
    /sparks debate/i,
    /leaves residents wondering/i,
    /sparks outrage/i,
    /raises questions/i,
    /sparks controversy/i,
    /leaves locals/i,
    /prompts safety concerns/i
  ];
  for (const pattern of vaguePatterns) {
    if (pattern.test(headline)) {
      issues.push(`Contains vague editorializing: "${headline.match(pattern)?.[0]}"`);
    }
  }
  const firstPersonPatterns = [
    /\bjoin us\b/i,
    /\bour\b/i,
    /\bwe\b/i,
    /\bour team\b/i
  ];
  for (const pattern of firstPersonPatterns) {
    if (pattern.test(headline)) {
      issues.push(`Contains first-person language: "${headline.match(pattern)?.[0]}"`);
    }
  }
  const wordCount = headline.split(/\s+/).length;
  if (wordCount > 15) {
    issues.push(`Too long: ${wordCount} words (max 15)`);
  }
  if (headline.includes("!")) {
    issues.push("Contains exclamation mark (spam trigger)");
  }
  return {
    valid: issues.length === 0,
    issues
  };
}
var openai;
var init_facebook_headline_generator = __esm({
  "server/services/facebook-headline-generator.ts"() {
    "use strict";
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
});

// server/services/translator.ts
import OpenAI2 from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { translate } from "@vitalets/google-translate-api";
function isComplexThaiText(thaiText) {
  const complexKeywords = ["\u0E41\u0E16\u0E25\u0E07", "\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48", "\u0E1B\u0E23\u0E30\u0E01\u0E32\u0E28", "\u0E01\u0E23\u0E30\u0E17\u0E23\u0E27\u0E07", "\u0E19\u0E32\u0E22\u0E01\u0E23\u0E31\u0E10\u0E21\u0E19\u0E15\u0E23\u0E35", "\u0E1C\u0E39\u0E49\u0E27\u0E48\u0E32\u0E23\u0E32\u0E0A\u0E01\u0E32\u0E23"];
  return thaiText.length > 400 || complexKeywords.some((keyword) => thaiText.includes(keyword));
}
function enrichWithPhuketContext(text2) {
  let enrichedText = text2;
  for (const [location, context] of Object.entries(PHUKET_CONTEXT_MAP)) {
    if (enrichedText.includes(location)) {
      enrichedText = enrichedText.replace(
        new RegExp(location, "g"),
        `${location} (${context})`
      );
    }
  }
  return enrichedText;
}
var openai2, anthropic, BLOCKED_KEYWORDS, HOT_KEYWORDS, FEEL_GOOD_KEYWORDS, COLD_KEYWORDS, POLITICS_KEYWORDS, LOST_PET_CAP_KEYWORDS, LOCAL_ENTERTAINMENT_CAP_KEYWORDS, PAGEANT_COMPETITION_CAP_KEYWORDS, PHUKET_CONTEXT_MAP, PHUKET_STREET_DISAMBIGUATION, TranslatorService, translatorService;
var init_translator = __esm({
  "server/services/translator.ts"() {
    "use strict";
    init_format_utils();
    openai2 = new OpenAI2({
      apiKey: process.env.OPENAI_API_KEY
    });
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    BLOCKED_KEYWORDS = [
      // Thai royal family terms
      "\u0E1E\u0E23\u0E30\u0E23\u0E32\u0E0A\u0E32",
      // King
      "\u0E43\u0E19\u0E2B\u0E25\u0E27\u0E07",
      // His Majesty (informal)
      "\u0E1E\u0E23\u0E30\u0E1A\u0E32\u0E17\u0E2A\u0E21\u0E40\u0E14\u0E47\u0E08\u0E1E\u0E23\u0E30\u0E40\u0E08\u0E49\u0E32\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E31\u0E27",
      // His Majesty the King (formal)
      "\u0E2A\u0E21\u0E40\u0E14\u0E47\u0E08\u0E1E\u0E23\u0E30\u0E19\u0E32\u0E07\u0E40\u0E08\u0E49\u0E32",
      // Her Majesty the Queen
      "\u0E1E\u0E23\u0E30\u0E23\u0E32\u0E0A\u0E27\u0E07\u0E28\u0E4C",
      // Royal family
      "\u0E20\u0E39\u0E21\u0E34\u0E1E\u0E25\u0E2D\u0E14\u0E38\u0E25\u0E22\u0E40\u0E14\u0E0A",
      // King Bhumibol Adulyadej (Rama IX)
      "\u0E23\u0E31\u0E0A\u0E01\u0E32\u0E25\u0E17\u0E35\u0E48",
      // Reign/Era (usually precedes royal names)
      "\u0E1E\u0E23\u0E30\u0E21\u0E2B\u0E32\u0E01\u0E29\u0E31\u0E15\u0E23\u0E34\u0E22\u0E4C",
      // Monarch
      "\u0E2A\u0E16\u0E32\u0E1A\u0E31\u0E19\u0E1E\u0E23\u0E30\u0E21\u0E2B\u0E32\u0E01\u0E29\u0E31\u0E15\u0E23\u0E34\u0E22\u0E4C",
      // Monarchy institution
      "King Bhumibol",
      // English
      "King Rama",
      // English
      "Thai King",
      // English
      "Thai royal",
      // English
      "monarchy",
      // English
      "majesty"
      // English (usually in royal context)
    ];
    HOT_KEYWORDS = [
      "\u0E44\u0E1F\u0E44\u0E2B\u0E21\u0E49",
      // fire
      "\u0E08\u0E21\u0E19\u0E49\u0E33",
      // drowning
      "\u0E08\u0E31\u0E1A\u0E01\u0E38\u0E21",
      // arrest
      "\u0E1E\u0E32\u0E22\u0E38",
      // storm
      "\u0E1D\u0E19\u0E15\u0E01\u0E2B\u0E19\u0E31\u0E01",
      // heavy rain
      "\u0E42\u0E08\u0E23",
      // thief/robber
      "\u0E40\u0E2A\u0E35\u0E22\u0E0A\u0E35\u0E27\u0E34\u0E15",
      // death/died
      "\u0E1A\u0E32\u0E14\u0E40\u0E08\u0E47\u0E1A",
      // injured
      "\u0E15\u0E32\u0E22",
      // dead
      "\u0E06\u0E48\u0E32",
      // kill
      "\u0E22\u0E34\u0E07",
      // shoot
      "\u0E41\u0E17\u0E07",
      // stab
      "\u0E0A\u0E19",
      // collision/crash
      "\u0E23\u0E16\u0E0A\u0E19",
      // vehicle crash (รถ = vehicle, ชน = collision — NOT specifically car)
      "\u0E02\u0E31\u0E1A\u0E2B\u0E19\u0E35",
      // hit and run
      "\u0E2B\u0E19\u0E35\u0E2B\u0E32\u0E22",
      // fled/escaped
      "\u0E2A\u0E32\u0E2B\u0E31\u0E2A",
      // seriously injured
      "\u0E23\u0E30\u0E40\u0E1A\u0E34\u0E14",
      // explosion
      "\u0E42\u0E08\u0E23\u0E01\u0E23\u0E23\u0E21",
      // robbery
      // FOREIGNER KEYWORDS - These stories go viral with expat audience
      "\u0E15\u0E48\u0E32\u0E07\u0E0A\u0E32\u0E15\u0E34",
      // foreigner
      "\u0E1D\u0E23\u0E31\u0E48\u0E07",
      // farang (Western foreigner)
      "\u0E19\u0E31\u0E01\u0E17\u0E48\u0E2D\u0E07\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27",
      // tourist
      "\u0E0A\u0E32\u0E27\u0E15\u0E48\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28",
      // foreign national
      "\u0E17\u0E30\u0E40\u0E25\u0E32\u0E30\u0E27\u0E34\u0E27\u0E32\u0E17",
      // fight/brawl/quarrel
      "\u0E17\u0E33\u0E23\u0E49\u0E32\u0E22\u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22",
      // assault/physical attack
      "\u0E1B\u0E30\u0E17\u0E30",
      // clash/confrontation
      "\u0E17\u0E30\u0E40\u0E25\u0E32\u0E30",
      // quarrel/argue
      "\u0E0A\u0E01\u0E15\u0E48\u0E2D\u0E22",
      // fistfight
      "\u0E15\u0E1A\u0E15\u0E35",
      // slap/hit fight
      // BOAT/MARITIME KEYWORDS - Critical for Phuket tourism news
      // Many tourist incidents occur on boat tours to Phi Phi, Kai Island, Similan, etc.
      "\u0E40\u0E23\u0E37\u0E2D",
      // boat (general)
      "\u0E40\u0E23\u0E37\u0E2D\u0E40\u0E23\u0E47\u0E27",
      // speedboat
      "\u0E2A\u0E1B\u0E35\u0E14\u0E42\u0E1A\u0E4A\u0E17",
      // speedboat (transliteration)
      "\u0E40\u0E23\u0E37\u0E2D\u0E0A\u0E19",
      // boat collision
      "\u0E40\u0E23\u0E37\u0E2D\u0E25\u0E48\u0E21",
      // boat capsized
      "\u0E40\u0E23\u0E37\u0E2D\u0E08\u0E21",
      // boat sinking
      "\u0E25\u0E48\u0E21",
      // capsized
      "\u0E2D\u0E31\u0E1A\u0E1B\u0E32\u0E07",
      // shipwreck
      "speedboat",
      "boat collision",
      "boat accident",
      "capsized",
      "ferry",
      // ferry incidents
      "longtail",
      // longtail boat accidents
      "\u0E40\u0E23\u0E37\u0E2D\u0E2B\u0E32\u0E07\u0E22\u0E32\u0E27",
      // longtail boat (Thai)
      // EARTHQUAKE / SEISMIC KEYWORDS - Safety-relevant natural events
      // Earthquakes are inherently newsworthy for southern Thailand / Andaman coast readers
      "\u0E41\u0E1C\u0E48\u0E19\u0E14\u0E34\u0E19\u0E44\u0E2B\u0E27",
      // earthquake
      "earthquake",
      "\u0E2A\u0E36\u0E19\u0E32\u0E21\u0E34",
      // tsunami
      "tsunami",
      "\u0E41\u0E23\u0E07\u0E2A\u0E31\u0E48\u0E19\u0E2A\u0E30\u0E40\u0E17\u0E37\u0E2D\u0E19",
      // tremor/vibration
      "tremor",
      "seismic",
      "magnitude",
      "\u0E23\u0E34\u0E01\u0E40\u0E15\u0E2D\u0E23\u0E4C",
      // Richter (Thai)
      "Richter",
      "\u0E2D\u0E32\u0E1F\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E0A\u0E47\u0E2D\u0E01",
      // aftershock (Thai)
      "aftershock",
      // DRUG/CRIME KEYWORDS - Critical for proper context interpretation
      "\u0E22\u0E32\u0E40\u0E2A\u0E1E\u0E15\u0E34\u0E14",
      // drugs/narcotics
      "\u0E42\u0E04\u0E40\u0E04\u0E19",
      // cocaine
      "\u0E22\u0E32\u0E1A\u0E49\u0E32",
      // methamphetamine/yaba
      "\u0E01\u0E31\u0E0D\u0E0A\u0E32",
      // cannabis/marijuana
      "\u0E22\u0E32\u0E44\u0E2D\u0E0B\u0E4C",
      // ice/crystal meth
      "\u0E40\u0E2E\u0E42\u0E23\u0E2D\u0E35\u0E19",
      // heroin
      "\u0E41\u0E01\u0E4A\u0E07",
      // gang
      "\u0E04\u0E49\u0E32\u0E22\u0E32",
      // drug dealing
      "\u0E02\u0E32\u0E22\u0E22\u0E32",
      // selling drugs
      "QR",
      // QR code (often drug-related stickers)
      "\u0E04\u0E34\u0E27\u0E2D\u0E32\u0E23\u0E4C",
      // QR code (Thai)
      "\u0E2A\u0E15\u0E34\u0E4A\u0E01\u0E40\u0E01\u0E2D\u0E23\u0E4C",
      // sticker (often drug ads)
      "\u0E15\u0E34\u0E14\u0E1B\u0E23\u0E30\u0E01\u0E32\u0E28",
      // posting/sticking notices
      "\u0E42\u0E06\u0E29\u0E13\u0E32",
      // advertisement (illegal product ads)
      "Telegram",
      // often drug sales channel
      "\u0E40\u0E17\u0E40\u0E25\u0E41\u0E01\u0E23\u0E21",
      // Telegram (Thai)
      // ENGLISH HOT KEYWORDS (for English sources or translated verification)
      "arrest",
      "arrested",
      "detained",
      "foreigner",
      "farang",
      "tourist",
      "expat",
      "shoot",
      "shooting",
      "killed",
      "death",
      "died",
      "drown",
      "drowning",
      "accident",
      "collision",
      "crash",
      "fire",
      "robbery",
      "theft",
      "fight",
      "brawl",
      "assault",
      "drugs",
      "cocaine",
      "prostitution",
      "work permit",
      "illegal work"
    ];
    FEEL_GOOD_KEYWORDS = [
      // WILDLIFE / ANIMAL CONSERVATION - Always viral
      "\u0E40\u0E15\u0E48\u0E32\u0E17\u0E30\u0E40\u0E25",
      // sea turtle
      "\u0E40\u0E15\u0E48\u0E32",
      // turtle
      "\u0E27\u0E32\u0E07\u0E44\u0E02\u0E48",
      // laying eggs / nesting
      "\u0E1F\u0E31\u0E01\u0E44\u0E02\u0E48",
      // hatching eggs
      "\u0E25\u0E39\u0E01\u0E40\u0E15\u0E48\u0E32",
      // baby turtle
      "\u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E40\u0E15\u0E48\u0E32",
      // releasing turtles
      "\u0E42\u0E25\u0E21\u0E32",
      // dolphin
      "\u0E1B\u0E25\u0E32\u0E27\u0E32\u0E2C",
      // whale
      "\u0E09\u0E25\u0E32\u0E21\u0E27\u0E32\u0E2C",
      // whale shark
      "\u0E01\u0E23\u0E30\u0E40\u0E1A\u0E19\u0E23\u0E32\u0E2B\u0E39",
      // manta ray
      "\u0E0A\u0E49\u0E32\u0E07",
      // elephant
      "\u0E25\u0E34\u0E07",
      // monkey
      "\u0E19\u0E01",
      // bird (general)
      "\u0E19\u0E01\u0E40\u0E07\u0E37\u0E2D\u0E01",
      // hornbill
      "\u0E2A\u0E31\u0E15\u0E27\u0E4C\u0E1B\u0E48\u0E32",
      // wildlife
      "\u0E2A\u0E31\u0E15\u0E27\u0E4C\u0E2B\u0E32\u0E22\u0E32\u0E01",
      // rare animal
      "\u0E2D\u0E19\u0E38\u0E23\u0E31\u0E01\u0E29\u0E4C",
      // conservation
      "\u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E04\u0E37\u0E19\u0E18\u0E23\u0E23\u0E21\u0E0A\u0E32\u0E15\u0E34",
      // release back to nature
      "\u0E0A\u0E48\u0E27\u0E22\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E2A\u0E31\u0E15\u0E27\u0E4C",
      // rescue animal
      "\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C\u0E2B\u0E32\u0E22\u0E32\u0E01",
      // rare species
      "\u0E17\u0E30\u0E40\u0E25\u0E2A\u0E32\u0E1A",
      // lake (often wildlife context)
      "\u0E1B\u0E30\u0E01\u0E32\u0E23\u0E31\u0E07",
      // coral
      "\u0E1F\u0E37\u0E49\u0E19\u0E1F\u0E39\u0E1B\u0E30\u0E01\u0E32\u0E23\u0E31\u0E07",
      // coral restoration
      // English wildlife keywords (from translated content)
      "sea turtle",
      "turtle eggs",
      "turtle nest",
      "turtle nesting",
      "baby turtles",
      "hatchling",
      "dolphin",
      "whale",
      "whale shark",
      "manta ray",
      "elephant",
      "wildlife",
      "conservation",
      "endangered",
      "rare species",
      "coral reef",
      "marine life",
      "marine conservation",
      // GOOD SAMARITAN / RESCUE STORIES
      "\u0E0A\u0E48\u0E27\u0E22\u0E40\u0E2B\u0E25\u0E37\u0E2D",
      // help/rescue (in positive context)
      "\u0E01\u0E39\u0E49\u0E0A\u0E35\u0E1E",
      // rescue (life-saving)
      "\u0E0A\u0E48\u0E27\u0E22\u0E0A\u0E35\u0E27\u0E34\u0E15",
      // save life
      "\u0E04\u0E19\u0E14\u0E35",
      // good person
      "\u0E19\u0E49\u0E33\u0E43\u0E08",
      // kindness/generosity
      "\u0E0A\u0E48\u0E27\u0E22\u0E19\u0E31\u0E01\u0E17\u0E48\u0E2D\u0E07\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27",
      // help tourist
      "\u0E0A\u0E48\u0E27\u0E22\u0E1D\u0E23\u0E31\u0E48\u0E07",
      // help foreigner
      "\u0E2A\u0E48\u0E07\u0E04\u0E37\u0E19",
      // return (lost items)
      "\u0E2A\u0E48\u0E07\u0E01\u0E23\u0E30\u0E40\u0E1B\u0E4B\u0E32\u0E04\u0E37\u0E19",
      // return bag
      "\u0E0B\u0E37\u0E48\u0E2D\u0E2A\u0E31\u0E15\u0E22\u0E4C",
      // honest
      "\u0E44\u0E14\u0E49\u0E04\u0E37\u0E19",
      // got back (lost items)
      "good samaritan",
      "hero",
      "saved",
      "rescued",
      "returned wallet",
      "honest",
      "kindness",
      // POSITIVE FOREIGNER INVOLVEMENT
      "\u0E1D\u0E23\u0E31\u0E48\u0E07\u0E0A\u0E48\u0E27\u0E22",
      // foreigner helps
      "\u0E19\u0E31\u0E01\u0E17\u0E48\u0E2D\u0E07\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27\u0E0A\u0E48\u0E27\u0E22",
      // tourist helps
      "\u0E15\u0E48\u0E32\u0E07\u0E0A\u0E32\u0E15\u0E34\u0E0A\u0E48\u0E27\u0E22",
      // foreigner assists
      "expat hero",
      "tourist saves",
      "foreigner helps",
      "foreign volunteer",
      // COMMUNITY POSITIVE NEWS
      "\u0E02\u0E48\u0E32\u0E27\u0E14\u0E35",
      // good news
      "\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08",
      // success
      "\u0E23\u0E32\u0E07\u0E27\u0E31\u0E25",
      // award (in positive context)
      "\u0E0A\u0E38\u0E21\u0E0A\u0E19\u0E23\u0E27\u0E21\u0E43\u0E08",
      // community unites
      "\u0E19\u0E48\u0E32\u0E23\u0E31\u0E01",
      // cute/lovely (viral animal content)
      "heartwarming",
      "feel-good",
      "viral",
      "amazing",
      "incredible"
    ];
    COLD_KEYWORDS = [
      "\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21",
      // meeting
      "\u0E21\u0E2D\u0E1A\u0E2B\u0E21\u0E32\u0E22",
      // assign/delegate
      "\u0E2A\u0E31\u0E21\u0E21\u0E19\u0E32",
      // seminar
      "\u0E41\u0E16\u0E25\u0E07\u0E02\u0E48\u0E32\u0E27",
      // press conference
      "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23",
      // project/program
      "\u0E2D\u0E1A\u0E23\u0E21",
      // training
      "\u0E21\u0E2D\u0E1A\u0E02\u0E2D\u0E07",
      // giving/donation ceremony
      "\u0E1E\u0E34\u0E18\u0E35",
      // ceremony
      "\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21",
      // conference
      "\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E04\u0E27\u0E32\u0E21\u0E1E\u0E23\u0E49\u0E2D\u0E21",
      // preparation
      "\u0E15\u0E23\u0E27\u0E08\u0E40\u0E22\u0E35\u0E48\u0E22\u0E21",
      // inspection visit
      "\u0E25\u0E07\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48",
      // area visit
      "\u0E41\u0E01\u0E49\u0E44\u0E02\u0E1B\u0E31\u0E0D\u0E2B\u0E32",
      // solve problem/tackle issue
      "\u0E14\u0E39\u0E41\u0E25\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07",
      // take care of/address
      "\u0E17\u0E33\u0E07\u0E32\u0E19\u0E40\u0E1E\u0E37\u0E48\u0E2D",
      // work to/work on
      "\u0E1A\u0E23\u0E23\u0E40\u0E17\u0E32",
      // alleviate/ease
      "\u0E23\u0E48\u0E27\u0E21\u0E01\u0E31\u0E19",
      // together/jointly (often in meeting contexts)
      "\u0E1A\u0E23\u0E34\u0E08\u0E32\u0E04",
      // donate/donation
      "\u0E1A\u0E23\u0E34\u0E08\u0E32\u0E04\u0E42\u0E25\u0E2B\u0E34\u0E15",
      // blood donation
      "\u0E23\u0E31\u0E1A\u0E1A\u0E23\u0E34\u0E08\u0E32\u0E04",
      // receive donation
      "\u0E0A\u0E48\u0E27\u0E22\u0E40\u0E2B\u0E25\u0E37\u0E2D",
      // help/assist (charity context)
      "\u0E01\u0E38\u0E28\u0E25",
      // charity/merit
      // PROMOTIONAL/MALL EVENT KEYWORDS - These are NOT news, just marketing
      "\u0E21\u0E32\u0E2A\u0E04\u0E2D\u0E15",
      // mascot
      "mascot",
      // mascot (English)
      "\u0E2B\u0E49\u0E32\u0E07\u0E2A\u0E23\u0E23\u0E1E\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32",
      // department store/mall
      "\u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E04\u0E49\u0E32",
      // shopping center
      "Jungceylon",
      // Jungceylon mall
      "Central",
      // Central mall
      "Robinson",
      // Robinson mall
      "\u0E42\u0E1B\u0E23\u0E42\u0E21\u0E0A\u0E31\u0E48\u0E19",
      // promotion
      "\u0E25\u0E14\u0E23\u0E32\u0E04\u0E32",
      // sale/discount
      "\u0E40\u0E1B\u0E34\u0E14\u0E15\u0E31\u0E27",
      // launch/unveil (product/mascot)
      "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21",
      // promotional activity
      "\u0E16\u0E48\u0E32\u0E22\u0E23\u0E39\u0E1B",
      // photo opportunity
      "\u0E40\u0E09\u0E25\u0E34\u0E21\u0E09\u0E25\u0E2D\u0E07",
      // celebration
      "\u0E2A\u0E19\u0E38\u0E01\u0E2A\u0E19\u0E32\u0E19",
      // fun/enjoyment (event context)
      "\u0E01\u0E32\u0E23\u0E41\u0E2A\u0E14\u0E07",
      // performance/show
      "Hello Phuket",
      // Hello Phuket event
      "sustainability",
      // sustainability event
      "\u0E04\u0E27\u0E32\u0E21\u0E22\u0E31\u0E48\u0E07\u0E22\u0E37\u0E19",
      // sustainability (Thai)
      // REAL ESTATE / PROPERTY DEVELOPMENT - Business announcements, NOT breaking news
      // Per scoring guide: "Luxury hotel/villa launch" = Score 3 (business news, NOT breaking)
      "villa",
      // villa (English)
      "\u0E27\u0E34\u0E25\u0E25\u0E48\u0E32",
      // villa (Thai)
      "luxury villa",
      // luxury villa development
      "luxury development",
      // luxury development
      "property development",
      // property development
      "real estate",
      // real estate
      "\u0E2D\u0E2A\u0E31\u0E07\u0E2B\u0E32\u0E23\u0E34\u0E21\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C",
      // real estate (Thai)
      "\u0E04\u0E2D\u0E19\u0E42\u0E14",
      // condo
      "condominium",
      // condominium
      "residential",
      // residential development
      "hotel development",
      // hotel development
      "resort development",
      // resort development
      "billion baht",
      // billion baht investment (routine business)
      "\u0E1E\u0E31\u0E19\u0E25\u0E49\u0E32\u0E19",
      // billion (Thai) - large investment announcements
      "investment",
      // investment news
      "\u0E01\u0E32\u0E23\u0E25\u0E07\u0E17\u0E38\u0E19",
      // investment (Thai)
      "transform",
      // area transformation/development
      "premier destination",
      // real estate marketing language
      "high-end",
      // high-end property
      "luxury market",
      // luxury market
      "property launch",
      // property launch
      "groundbreaking",
      // groundbreaking ceremony
      "TITLE",
      // TITLE (real estate developer brand)
      "Boat Pattana",
      // Boat Pattana (developer)
      // UNIVERSITY / STUDENT ANNOUNCEMENT KEYWORDS - Routine academic news, NOT breaking
      // Per: "Students win robotics award" = Score 3 (achievement, NOT urgent)
      "\u0E19\u0E31\u0E01\u0E28\u0E36\u0E01\u0E29\u0E32",
      // student(s)
      "\u0E21\u0E2B\u0E32\u0E27\u0E34\u0E17\u0E22\u0E32\u0E25\u0E31\u0E22",
      // university
      "\u0E23\u0E32\u0E0A\u0E20\u0E31\u0E0F",
      // Rajabhat (university type)
      "\u0E27\u0E34\u0E17\u0E22\u0E32\u0E25\u0E31\u0E22",
      // college
      "internship",
      // internship programs
      "intern",
      // intern placement
      "\u0E1D\u0E36\u0E01\u0E07\u0E32\u0E19",
      // internship/training (Thai)
      "\u0E1D\u0E36\u0E01\u0E1B\u0E23\u0E30\u0E2A\u0E1A\u0E01\u0E32\u0E23\u0E13\u0E4C",
      // gain experience (Thai)
      "staffing",
      // staffing events
      "selected to staff",
      // selected to work at event
      "selected to work",
      // selected for job
      "partnership",
      // university partnership
      "MOU",
      // Memorandum of Understanding (common for academic agreements)
      "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E15\u0E01\u0E25\u0E07",
      // MOU (Thai)
      "students from",
      // students from university
      "university students",
      // university students
      // FOUNDATION / ORGANIZATIONAL / ADMINISTRATIVE NEWS - Routine governance, NOT breaking news
      // Per scoring guide: "Board appointments", "organizational changes" = Score 2-3 (routine administrative)
      "\u0E21\u0E39\u0E25\u0E19\u0E34\u0E18\u0E34",
      // foundation (Thai)
      "foundation",
      // foundation (English)
      "\u0E41\u0E15\u0E48\u0E07\u0E15\u0E31\u0E49\u0E07",
      // appoint/appointment
      "appoint",
      // appoint (English)
      "appointment",
      // appointment
      "\u0E01\u0E23\u0E23\u0E21\u0E01\u0E32\u0E23",
      // director/board member
      "\u0E04\u0E13\u0E30\u0E01\u0E23\u0E23\u0E21\u0E01\u0E32\u0E23",
      // board of directors
      "board of directors",
      // board of directors
      "temporary representative",
      // temporary representative
      "\u0E15\u0E31\u0E27\u0E41\u0E17\u0E19",
      // representative
      "\u0E25\u0E32\u0E2D\u0E2D\u0E01",
      // resign/resignation
      "resignation",
      // resignation
      "\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E2A\u0E20\u0E32",
      // council member
      "\u0E2D\u0E07\u0E04\u0E4C\u0E01\u0E23",
      // organization
      "organizational",
      // organizational
      "governance",
      // governance
      "administrative",
      // administrative
      "anniversary",
      // anniversary celebration
      "\u0E04\u0E23\u0E1A\u0E23\u0E2D\u0E1A",
      // anniversary (Thai)
      "internal",
      // internal organizational matters
      "restructuring",
      // organizational restructuring
      "legal proceedings",
      // legal proceedings (routine)
      "legal dispute",
      // legal dispute (internal org)
      "court case",
      // court case (unless crime)
      // CORPORATE/CEREMONIAL KEYWORDS
      "ceremony",
      "ceremonies",
      "merit-making",
      "merit making",
      "alms-giving",
      "alms giving",
      "alms offering",
      "CSR",
      "corporate social responsibility",
      "charity handover",
      "scholarship handover",
      "donation ceremony",
      "donation drive",
      "opening ceremony",
      "ribbon cutting",
      "ribbon-cutting",
      "groundbreaking",
      "groundbreaking ceremony",
      "gala",
      "gala dinner",
      "awards ceremony",
      "awards night",
      "MOU",
      "MOU signing",
      "memorandum of understanding",
      "milestone",
      "company milestone",
      "corporate milestone",
      "inaugurated",
      "inauguration",
      "\u0E1E\u0E34\u0E18\u0E35",
      "\u0E17\u0E33\u0E1A\u0E38\u0E0D",
      "\u0E04\u0E23\u0E1A\u0E23\u0E2D\u0E1A",
      "\u0E15\u0E31\u0E01\u0E1A\u0E32\u0E15\u0E23",
      "\u0E21\u0E2D\u0E1A\u0E17\u0E38\u0E19",
      "\u0E40\u0E1B\u0E34\u0E14\u0E07\u0E32\u0E19",
      "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E31\u0E07\u0E04\u0E21",
      "\u0E27\u0E32\u0E07\u0E28\u0E34\u0E25\u0E32\u0E24\u0E01\u0E29\u0E4C",
      "\u0E21\u0E2D\u0E1A\u0E23\u0E32\u0E07\u0E27\u0E31\u0E25",
      "\u0E07\u0E32\u0E19\u0E40\u0E25\u0E35\u0E49\u0E22\u0E07"
    ];
    POLITICS_KEYWORDS = [
      // Thai political terms
      "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E15\u0E31\u0E49\u0E07",
      // election
      "\u0E2A.\u0E2A.",
      // MP (Member of Parliament)
      "\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E2A\u0E20\u0E32\u0E1C\u0E39\u0E49\u0E41\u0E17\u0E19\u0E23\u0E32\u0E29\u0E0E\u0E23",
      // Member of Parliament (full)
      "\u0E19\u0E31\u0E01\u0E01\u0E32\u0E23\u0E40\u0E21\u0E37\u0E2D\u0E07",
      // politician
      "\u0E1E\u0E23\u0E23\u0E04",
      // party (political)
      "\u0E2B\u0E32\u0E40\u0E2A\u0E35\u0E22\u0E07",
      // campaign/canvass
      "\u0E1C\u0E39\u0E49\u0E2A\u0E21\u0E31\u0E04\u0E23",
      // candidate
      "\u0E25\u0E07\u0E04\u0E30\u0E41\u0E19\u0E19",
      // vote/voting
      "\u0E01\u0E32\u0E23\u0E40\u0E21\u0E37\u0E2D\u0E07",
      // politics
      "\u0E19\u0E32\u0E22\u0E01",
      // mayor/PM
      "\u0E23\u0E31\u0E10\u0E1A\u0E32\u0E25",
      // government
      "\u0E1D\u0E48\u0E32\u0E22\u0E04\u0E49\u0E32\u0E19",
      // opposition
      "\u0E2A\u0E20\u0E32",
      // parliament/council
      "\u0E2D\u0E1A\u0E08",
      // Provincial Administrative Organization
      "\u0E2D\u0E1A\u0E15",
      // Subdistrict Administrative Organization
      "\u0E40\u0E17\u0E28\u0E1A\u0E32\u0E25",
      // municipality
      "\u0E1B\u0E23\u0E32\u0E28\u0E23\u0E31\u0E22",
      // speech/rally
      "\u0E19\u0E42\u0E22\u0E1A\u0E32\u0E22",
      // policy
      "\u0E04\u0E30\u0E41\u0E19\u0E19\u0E40\u0E2A\u0E35\u0E22\u0E07",
      // votes/ballots
      "\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E44\u0E17\u0E22",
      // Pheu Thai (Thai)
      "\u0E01\u0E49\u0E32\u0E27\u0E44\u0E01\u0E25",
      // Move Forward (Thai)
      "\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E0A\u0E19",
      // People's Party (Thai)
      "\u0E20\u0E39\u0E21\u0E34\u0E43\u0E08\u0E44\u0E17\u0E22",
      // Bhumjaithai (Thai)
      "\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E18\u0E34\u0E1B\u0E31\u0E15\u0E22\u0E4C",
      // Democrat Party (Thai)
      "\u0E1E\u0E25\u0E31\u0E07\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E23\u0E31\u0E10",
      // Palang Pracharath (Thai)
      "\u0E23\u0E27\u0E21\u0E44\u0E17\u0E22\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E0A\u0E32\u0E15\u0E34",
      // United Thai Nation (Thai)
      // English political terms (from translated content)
      "election",
      "campaign",
      "campaign atmosphere",
      // campaign events
      "election campaign",
      "candidate",
      "politician",
      "political party",
      "political event",
      "political rally",
      "mini-speech",
      // "mini-speech" mentioned in user's example
      "Pheu Thai Party",
      // Pheu Thai Party (full name)
      "Pheu Thai",
      // Pheu Thai
      "People's Party",
      // People's Party
      "Move Forward Party",
      // Move Forward
      "Move Forward",
      "Democrat Party",
      // Democrat Party
      "Bhumjaithai Party",
      // Bhumjaithai
      "Bhumjaithai",
      "Palang Pracharath",
      // Palang Pracharath
      "United Thai Nation",
      // UTN
      "MP ",
      // Member of Parliament with space to avoid false matches
      "parliament",
      "voting",
      "vote",
      "voters",
      "ballot",
      "constituency",
      "encouraging residents to vote",
      // campaign messaging
      "encourage to vote"
    ];
    LOST_PET_CAP_KEYWORDS = [
      // Thai keywords
      "\u0E2B\u0E32\u0E22",
      // lost/missing
      "\u0E2A\u0E39\u0E0D\u0E2B\u0E32\u0E22",
      // missing/lost (formal)
      "\u0E2B\u0E32\u0E22\u0E44\u0E1B",
      // disappeared/went missing
      "\u0E15\u0E32\u0E21\u0E2B\u0E32",
      // looking for/searching
      "\u0E0A\u0E48\u0E27\u0E22\u0E15\u0E32\u0E21\u0E2B\u0E32",
      // help find
      "\u0E41\u0E21\u0E27\u0E2B\u0E32\u0E22",
      // cat missing
      "\u0E2B\u0E21\u0E32\u0E2B\u0E32\u0E22",
      // dog missing
      "\u0E2A\u0E38\u0E19\u0E31\u0E02\u0E2B\u0E32\u0E22",
      // dog missing (formal)
      "\u0E2A\u0E31\u0E15\u0E27\u0E4C\u0E40\u0E25\u0E35\u0E49\u0E22\u0E07\u0E2B\u0E32\u0E22",
      // pet missing
      "\u0E2B\u0E25\u0E38\u0E14\u0E08\u0E32\u0E01\u0E1A\u0E49\u0E32\u0E19",
      // escaped from home
      "\u0E27\u0E34\u0E48\u0E07\u0E2B\u0E19\u0E35",
      // ran away
      "\u0E2B\u0E25\u0E07\u0E17\u0E32\u0E07",
      // got lost
      // English keywords (from translated content)
      "missing cat",
      "missing dog",
      "lost cat",
      "lost dog",
      "lost pet",
      "missing pet",
      "help locate",
      "help find",
      "help finding",
      "seeking help locating",
      "family seeks help",
      "owners searching",
      "have you seen",
      "reward for return",
      "escaped from home",
      "ran away from home",
      "beloved pet",
      "furry friend",
      "missing since",
      "last seen wearing",
      // collar description
      "wearing a collar",
      "red collar",
      "lost and found"
    ];
    LOCAL_ENTERTAINMENT_CAP_KEYWORDS = [
      // Thai keywords
      "\u0E04\u0E2D\u0E19\u0E40\u0E2A\u0E34\u0E23\u0E4C\u0E15",
      // concert
      "\u0E44\u0E25\u0E1F\u0E4C\u0E2A\u0E14",
      // live performance
      "\u0E40\u0E25\u0E48\u0E19\u0E2A\u0E14",
      // live music
      "\u0E27\u0E07\u0E14\u0E19\u0E15\u0E23\u0E35",
      // band/music group
      "\u0E28\u0E34\u0E25\u0E1B\u0E34\u0E19",
      // artist/performer
      "\u0E40\u0E27\u0E17\u0E35\u0E14\u0E19\u0E15\u0E23\u0E35",
      // music stage
      "\u0E42\u0E0A\u0E27\u0E4C\u0E2A\u0E14",
      // live show
      "\u0E21\u0E34\u0E19\u0E34\u0E04\u0E2D\u0E19\u0E40\u0E2A\u0E34\u0E23\u0E4C\u0E15",
      // mini concert
      "\u0E04\u0E2D\u0E19\u0E40\u0E2A\u0E34\u0E23\u0E4C\u0E15\u0E2A\u0E14",
      // live concert
      // English keywords (from translated content)
      "live concert",
      "live music",
      "live performance",
      "live show",
      "music event",
      "concert event",
      "mini concert",
      "local band",
      "local act",
      "local artist",
      "performing live",
      "energize",
      // marketing language for small gigs e.g. "Energize Saphan Hin"
      "lively atmosphere",
      // marketing fluff for small events
      "special deals"
      // promotional concert language
    ];
    PAGEANT_COMPETITION_CAP_KEYWORDS = [
      // Thai keywords
      "\u0E1B\u0E23\u0E30\u0E01\u0E27\u0E14",
      // contest/competition/pageant
      "\u0E19\u0E32\u0E07\u0E07\u0E32\u0E21",
      // beauty queen/pageant
      "\u0E19\u0E32\u0E07\u0E2A\u0E32\u0E27",
      // Miss (beauty pageant title)
      "\u0E40\u0E27\u0E17\u0E35\u0E1B\u0E23\u0E30\u0E01\u0E27\u0E14",
      // contest stage
      "\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E01\u0E27\u0E14",
      // the competition/contest
      "\u0E1C\u0E39\u0E49\u0E40\u0E02\u0E49\u0E32\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19",
      // contestant
      "\u0E1C\u0E39\u0E49\u0E40\u0E02\u0E49\u0E32\u0E1B\u0E23\u0E30\u0E01\u0E27\u0E14",
      // contestant (pageant)
      "\u0E04\u0E2D\u0E2A\u0E40\u0E1E\u0E25\u0E22\u0E4C",
      // cosplay
      "\u0E41\u0E1F\u0E19\u0E0B\u0E35",
      // fancy dress
      "\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19",
      // compete/competition
      // English keywords (from translated content)
      "pageant",
      "beauty contest",
      "beauty competition",
      "beauty queen",
      "competition enters",
      "enters competition",
      "cosplay",
      "costume contest",
      "costume competition",
      "fancy dress",
      "talent show",
      "talent competition",
      "contestant",
      "contestants",
      "sailor moon"
      // cosplay character references
    ];
    PHUKET_CONTEXT_MAP = {
      // PHUKET TOWN STREETS - Named after other Thai cities, DO NOT confuse with those cities!
      // These are the ONLY critical disambiguations needed to prevent location errors
      "\u0E16\u0E19\u0E19\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E": "Bangkok Road in PHUKET TOWN (NOT Bangkok city!)",
      "Bangkok Road": "Bangkok Road in PHUKET TOWN (NOT Bangkok city!)",
      "\u0E16\u0E19\u0E19\u0E01\u0E23\u0E30\u0E1A\u0E35\u0E48": "Krabi Road in PHUKET TOWN (NOT Krabi province!)",
      "Krabi Road": "Krabi Road in PHUKET TOWN (NOT Krabi province!)",
      "\u0E16\u0E19\u0E19\u0E1E\u0E31\u0E07\u0E07\u0E32": "Phang Nga Road in PHUKET TOWN (NOT Phang Nga province!)",
      "Phang Nga Road": "Phang Nga Road in PHUKET TOWN (NOT Phang Nga province!)",
      // SAPHAN HIN - "สะพาน" means "bridge" but Saphan Hin is a PLACE NAME, not a bridge!
      // DO NOT translate literally as "bridge" - it's a public park/promenade area in Phuket Town
      "\u0E2A\u0E30\u0E1E\u0E32\u0E19\u0E2B\u0E34\u0E19": "Saphan Hin - a public park and promenade area in PHUKET TOWN (NOT a bridge! \u0E2A\u0E30\u0E1E\u0E32\u0E19 means bridge but this is a PLACE NAME)",
      "\u0E2A\u0E30\u0E1E\u0E32\u0E19\u0E20\u0E39\u0E40\u0E01\u0E47\u0E15": "Saphan Phuket area near Saphan Hin in PHUKET TOWN (NOT a bridge! This is a PLACE NAME - use 'Saphan Hin area')",
      "Saphan Hin": "Saphan Hin - a public park and promenade area in Phuket Town (this is a place name, NOT a bridge)",
      // VEHICLE TYPE DISAMBIGUATION - Prevent "รถ" from being blindly translated as "car"
      // "รถ" alone is ambiguous — only specific compound terms confirm car or motorcycle
      "\u0E23\u0E16\u0E22\u0E19\u0E15\u0E4C": "\u0E23\u0E16\u0E22\u0E19\u0E15\u0E4C (CAR / automobile \u2014 4-wheeled motor vehicle)",
      "\u0E23\u0E16\u0E40\u0E01\u0E4B\u0E07": "\u0E23\u0E16\u0E40\u0E01\u0E4B\u0E07 (SEDAN / passenger car)",
      "\u0E23\u0E16\u0E01\u0E23\u0E30\u0E1A\u0E30": "\u0E23\u0E16\u0E01\u0E23\u0E30\u0E1A\u0E30 (PICKUP TRUCK)",
      "\u0E23\u0E16\u0E1A\u0E23\u0E23\u0E17\u0E38\u0E01": "\u0E23\u0E16\u0E1A\u0E23\u0E23\u0E17\u0E38\u0E01 (TRUCK / lorry)",
      "\u0E23\u0E16\u0E08\u0E31\u0E01\u0E23\u0E22\u0E32\u0E19\u0E22\u0E19\u0E15\u0E4C": "\u0E23\u0E16\u0E08\u0E31\u0E01\u0E23\u0E22\u0E32\u0E19\u0E22\u0E19\u0E15\u0E4C (MOTORCYCLE / motorbike \u2014 NOT a car)",
      "\u0E21\u0E2D\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E44\u0E0B\u0E04\u0E4C": "\u0E21\u0E2D\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E44\u0E0B\u0E04\u0E4C (MOTORBIKE / motorcycle \u2014 NOT a car)",
      "\u0E21\u0E2D\u0E44\u0E0B\u0E04\u0E4C": "\u0E21\u0E2D\u0E44\u0E0B\u0E04\u0E4C (MOTORBIKE / motorcycle \u2014 NOT a car)",
      "\u0E2A\u0E01\u0E39\u0E4A\u0E15\u0E40\u0E15\u0E2D\u0E23\u0E4C": "\u0E2A\u0E01\u0E39\u0E4A\u0E15\u0E40\u0E15\u0E2D\u0E23\u0E4C (SCOOTER / motorbike \u2014 NOT a car)",
      "\u0E23\u0E16\u0E21\u0E2D\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E44\u0E0B\u0E04\u0E4C": "\u0E23\u0E16\u0E21\u0E2D\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E44\u0E0B\u0E04\u0E4C (MOTORCYCLE \u2014 NOT a car)"
    };
    PHUKET_STREET_DISAMBIGUATION = `
\u{1F6A8} CRITICAL - PHUKET STREET NAME DISAMBIGUATION (READ BEFORE WRITING DATELINE):

Phuket Town has many streets NAMED AFTER other Thai cities. These are STREETS IN PHUKET, not locations in those cities:

- "\u0E16\u0E19\u0E19\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E" / "Bangkok Road" / "Thanon Krung Thep" = A street in PHUKET TOWN, NOT Bangkok city
- "\u0E16\u0E19\u0E19\u0E01\u0E23\u0E30\u0E1A\u0E35\u0E48" / "Krabi Road" / "Thanon Krabi" = A street in PHUKET TOWN, NOT Krabi province  
- "\u0E16\u0E19\u0E19\u0E1E\u0E31\u0E07\u0E07\u0E32" / "Phang Nga Road" / "Thanon Phang Nga" = A street in PHUKET TOWN, NOT Phang Nga province
- "\u0E16\u0E19\u0E19\u0E23\u0E31\u0E29\u0E0E\u0E32" / "Rasada Road" = A street in PHUKET TOWN

\u{1F6E3}\uFE0F SOI (ALLEY) NAMING CONVENTION:
- **"Soi" ALWAYS comes BEFORE the name:** In Thai, it is "Soi Bangla", NOT "Bangla Soi". 
- ALWAYS correct instances of "[Name] Soi" to "Soi [Name]" in your output.
- EXAMPLES: "Soi Ta-iad", "Soi Dog", "Soi Bangla", "Soi Romanee".

\u{1F3DE}\uFE0F PLACE NAME vs LITERAL TRANSLATION:
- "\u0E2A\u0E30\u0E1E\u0E32\u0E19\u0E2B\u0E34\u0E19" / "Saphan Hin" = A PUBLIC PARK/PROMENADE in PHUKET TOWN, NOT a bridge! "\u0E2A\u0E30\u0E1E\u0E32\u0E19" means "bridge" in Thai but "Saphan Hin" is a PROPER NOUN / PLACE NAME. NEVER translate as "bridge" or "Phuket Bridge".
- "\u0E2A\u0E30\u0E1E\u0E32\u0E19\u0E20\u0E39\u0E40\u0E01\u0E47\u0E15" = Refers to the Saphan Hin area. Use "Saphan Hin" in English. Do NOT write "Phuket Bridge".
- "\u0E07\u0E32\u0E19\u0E2A\u0E30\u0E1E\u0E32\u0E19\u0E2B\u0E34\u0E19" / "event at Saphan Hin" = An event at Saphan Hin park, NOT a "bridge event".

\u26A0\uFE0F COMMON MISTAKE TO AVOID:
If source says "accident on Bangkok Road" or "\u0E40\u0E01\u0E34\u0E14\u0E40\u0E2B\u0E15\u0E38\u0E17\u0E35\u0E48\u0E16\u0E19\u0E19\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E", the event is in PHUKET TOWN, NOT Bangkok.
The CORRECT dateline is "**PHUKET TOWN, PHUKET \u2013**", NOT "**BANGKOK \u2013**"

\u2705 CORRECT: "A fatal collision occurred on Bangkok Road in Phuket Town..."
\u274C WRONG: "A fatal collision occurred in Bangkok..." (This is FACTUALLY INCORRECT!)

THIS IS A CRITICAL FACTUAL ACCURACY ISSUE - misidentifying the location is a major journalism error.
`;
    TranslatorService = class {
      // Premium GPT-4 enrichment for high-priority stories (score 4-5) or manual scrapes
      async enrichWithPremiumGPT4(params, model = "gpt-4o") {
        const CATEGORY_CONTEXT_BLOCKS = {
          "Crime": `VERIFIED PHUKET REFERENCE \u2014 USE WHEN RELEVANT:
- Emergency: Tourist Police 1155, Police 191, Ambulance 1669, Fire 199
- Stations: Phuket has 8 police stations (Phuket City, Chalong, Patong, Kathu, Thalang, Cherng Talay, Kamala, Wichit). Patong handles most tourist nightlife incidents.
- Legal Context: Foreigners are entitled to consular access. Bail for foreigners is often higher; passport seizure is standard for serious charges.
- Drugs: Severe penalties; Category 1 (meth, heroin, MDMA) possession can carry 1-10 years; trafficking carries life.
- Common Scams/Crimes: Bag snatching (from motorbikes), rental scams, jet ski damage scams, drink spiking.
- Warning: Thai defamation law is criminal. Posting negative reviews can result in criminal charges.
- Naming: If a foreigner is named in a police report, use their nationality ONLY if explicitly stated. Never guess from names.`,
          "Traffic": `VERIFIED PHUKET REFERENCE \u2014 USE WHEN RELEVANT:
- Safety: Phuket roads have some of Thailand's highest accident rates, especially for motorbikes.
- Driving Rules: Drive on the LEFT. International Driving Permit (IDP) or Thai license required for foreigners. Helmets mandatory (driver & passenger); drink driving limit 0.05% BAC.
- Known Blackspots: Patong Hill (steep/blind curves), Heroines Monument intersection, Thepkrasattri Road, Chalong Circle, Darasamut & Sam Kong intersections, Si Ko intersection, Kata Hill, Bypass Road curves.
- Hospitals: Vachira Phuket Hospital (government trauma center) and Bangkok Hospital Phuket (private, advanced trauma).
- Rescue: Kusoldharm Rescue Foundation (076-246 301) operates primary first-responder network.
- Liability: Often the larger vehicle is presumed at fault by police/insurance. Passports may be seized pending fatal accident investigations.`,
          "Accidents": `VERIFIED PHUKET REFERENCE \u2014 USE WHEN RELEVANT:
- Safety: Phuket roads have some of Thailand's highest per-capita accident rates.
- Known Blackspots: Patong Hill (steep/blind curves), Heroines Monument intersection, Thepkrasattri Road, Chalong Circle, Darasamut & Sam Kong intersections, Si Ko intersection.
- Hospitals: Vachira Phuket Hospital (main government trauma center), Bangkok Hospital Phuket (best-equipped private trauma).
- Rescue: Kusoldharm Rescue Foundation (076-246 301) operates primary first-responder network.
- Driving Rules: Helmets mandatory (driver & passenger); foreigners require IDP or Thai license. In accidents, larger vehicles are often presumed at fault.`,
          "Tourism": `VERIFIED PHUKET REFERENCE \u2014 USE WHEN RELEVANT:
- Demographics: 10-14 million visitors in 2025 (top markets: Russia, India, China).
- Seasons: High season (Nov-April); Monsoon/low season (May-Oct) brings rough seas and red flags on west coast beaches. Drownings are a leading cause of tourist death.
- Transport: No Uber/Grab car service. Options: tuk-tuks (often overcharge), private taxis, Bolt, songthaews.
- Marine: Boat accidents peak in monsoon season. Similan/Surin Islands close May-Oct.
- Laws: Alcohol sales prohibited on Buddhist holidays and election days. Cannabis is decriminalized but public consumption is discouraged.
- Visas: 60-day visa-exempt entry for most Westerners (2025 policy).`,
          "Lifestyle": `VERIFIED PHUKET REFERENCE \u2014 USE WHEN RELEVANT:
- Seasons: High season (Nov-April); Monsoon/low season (May-Oct).
- Transport: No Uber/Grab car service. Options: tuk-tuks, private taxis, Bolt, songthaews.
- Laws: Alcohol sales prohibited on Buddhist holidays and election days. Cannabis is decriminalized but public consumption is discouraged.
- Visas: 60-day visa-exempt entry. 30-day extensions at Phuket Immigration Office (Phuket Town) for 1,900 THB. 90-day reporting for long-stay. Overstay fines are 500 THB/day.
- Medical: Government hospitals (Vachira, Patong, Thalang) are cheaper but have long waits. Private (Bangkok Hospital Phuket, Siriroj, Mission) are expensive/best-equipped. Travel insurance critical.
- Real Estate: Foreigners cannot own land (nominee structures common but illegal). Can own up to 49% of condo units.`,
          "Nightlife": `VERIFIED PHUKET REFERENCE \u2014 USE WHEN RELEVANT:
- Bangla Road: Primary nightlife strip in Patong, pedestrianized from ~6 PM.
- Closing Times: Standard venues 2 AM; extended zones (Bangla) 3-4 AM. Unlicensed venues face immediate closure.
- Police Raids: Check for licenses, closing time compliance, underage patrons, drugs, overstay foreigners.
- Safety: "Drink spiking" reported periodically (Tourist Police advise not leaving drinks unattended). Common scams include inflated bills and "lady drink" surprises.
- Alcohol Sales: Legal hours 11:00-14:00 and 17:00-00:00 (often unenforced at licensed venues). Banned on Buddhist holidays/elections.
- Sub-scenes: Phuket Town (Soi Romanee) for upscale cocktails; Rawai/Nai Harn for local expat bars; Bang Tao/Kamala for beach clubs.`,
          "Weather": `VERIFIED PHUKET REFERENCE \u2014 USE WHEN RELEVANT:
- Seasons: Cool/dry (Nov-Feb), Hot (Mar-Apr, 35\xB0C+), Monsoon (May-Oct).
- Monsoon Impact: Heavy rain and flash flooding in low-lying areas (Patong, Sam Kong, Rassada, Koh Kaew underpass). West coast beaches dangerous with rip currents.
- Marine: Phuket Marine Office may suspend boat services in severe weather.
- Dry Season: Water shortages peak March-April, relying heavily on reservoirs.
- Alerts: Thai Meteorological Department (TMD) issues official weather warnings.`,
          "Environment": `VERIFIED PHUKET REFERENCE \u2014 USE WHEN RELEVANT:
- Seasons: Monsoon (May-Oct) brings heavy rain; Dry season peaks Mar-Apr causing localized water shortages.
- Flooding: Flash flooding common in Patong, Sam Kong, Rassada, and Koh Kaew underpass.
- Marine: Coral reef and marine park closures (Similan, Surin) occur annually around May-Oct for recovery. West coast beaches have dangerous rip currents in monsoon season.
- Air Quality: Occasionally affected by agricultural burning haze from mainland SEA (Feb-Apr).`,
          "Infrastructure": `VERIFIED PHUKET REFERENCE \u2014 USE WHEN RELEVANT:
- Transport Hubs: Phuket International Airport (HKT) is the sole airport and Thailand's second busiest. Located in Thalang district at the north of the island.
- Connectivity: The Sarasin Bridge connects Phuket to mainland Thailand (Phang Nga province).
- Roads: Thepkrasattri Road is the single main traffic artery connecting the airport/north to Phuket Town/south. Accidents here cause severe island-wide delays.
- Utilities: Island power is supplied via underwater cables from the mainland; brief outages are common during storms.
- Water: Relies heavily on reservoirs (Bang Wad, Bang Neow Dum); fresh water shortages occur in peak dry season (March-April).`
        };
        const GENERAL_CONTEXT_BLOCK = `VERIFIED PHUKET REFERENCE \u2014 USE WHEN RELEVANT:
- Emergency numbers: Tourist Police 1155, Police 191, Ambulance 1669
- Phuket is a province of Thailand, not an independent jurisdiction; national laws and policies apply
- The island has approximately 400,000 registered residents but the actual population including unregistered workers and long-term visitors is estimated significantly higher
- Phuket's economy is overwhelmingly tourism-dependent`;
        const GENERAL_LOCATION_CONTEXT = `CRITICAL LOCATION RULES FOR ALL STORIES:
- "Bangkok Road" (\u0E16\u0E19\u0E19\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E) is a street in PHUKET TOWN. It is NEVER in Bangkok city.
- "Krabi Road" and "Phang Nga Road" are streets in PHUKET TOWN. They are NOT the neighboring provinces.
- ALWAYS write "Soi [Name]" (e.g., Soi Bangla). NEVER write "[Name] Soi" or "the Soi".
- Thai administrative terms: Moo (village number), Tambon (subdistrict), Amphoe (district - Phuket has 3: Mueang, Kathu, Thalang).
- Key Landmarks: Heroines Monument (border of Thalang/Kathu/Mueang), Central Phuket (bypass road), Jungceylon (Patong), Big Buddha (Nakkerd Hill), Chalong Temple, Saphan Hin (park in Phuket Town), Patong Pier (at the south end of Patong Beach).`;
        const contextBlock = CATEGORY_CONTEXT_BLOCKS[params.category] || GENERAL_CONTEXT_BLOCK;
        const systemPrompt = `You are a veteran wire-service correspondent who has lived in Phuket for over a decade. You write breaking news for an audience of long-term expats and residents who know the island intimately \u2014 they know every soi, every shortcut, every police station. Never explain Phuket to them. Write like an insider talking to insiders.

Your job is to transform raw translated Thai-language source material into a complete, professional English news article. You must:

1. Report ONLY what the source explicitly states \u2014 never invent, embellish, or dramatize
2. ADD relevant context and background using the verified reference material provided \u2014 but only when it connects specifically to THIS story, not as generic filler
3. Write articles substantial enough to be genuinely useful, even when the source material is brief
4. End every article with an "On the Ground" section \u2014 story-specific practical context written in an insider voice (see instructions in user message)

VOICE: You are not writing a travel safety brochure. You are writing for people who live here. They don't need to be told what Bangla Road is or that Thailand drives on the left. They DO want to know which specific police station is handling this case, whether this stretch of road has had similar incidents, or what the actual practical implications are for their daily life.

You produce JSON output only. No markdown, no commentary outside the JSON structure.`;
        const currentDate = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Bangkok" });
        const commentsBlock = params.communityComments && params.communityComments.length > 0 ? `THAI COMMUNITY COMMENTS (mine aggressively \u2014 see instructions below):
${params.communityComments.map((c, i) => `${i + 1}. "${c}"`).join("\n")}` : "";
        const prompt = `\u{1F4C5} CURRENT DATE: ${currentDate} (Thailand Time)
ARTICLE CATEGORY: ${params.category}

${contextBlock}

${GENERAL_LOCATION_CONTEXT}

---

SOURCE MATERIAL TO ENRICH:

Original Title: ${params.title}

Original Content:
${params.content}

Original Excerpt:
${params.excerpt}

${commentsBlock}

---

ENRICHMENT INSTRUCTIONS:

\u23F0 TENSE VERIFICATION:
- Compare any dates in the source to TODAY's date above
- Past events = past tense. Do NOT use present continuous for completed actions.
- If no date is stated, do NOT assume the event is happening right now. Treat as a completed past event.
- NEVER copy future tense from an outdated source if the event has already passed.

\u{1F6A8} FACTUAL ACCURACY:
- Report ONLY what the source explicitly states
- Do NOT embellish or upgrade language ("reckless" \u2260 "stunts", "disturbing" \u2260 "caused chaos", "group" \u2260 "mob")
- Do NOT add generic area descriptions that locals would find patronizing ("Patong, a bustling tourist area..." \u2014 LOCALS KNOW THIS)
- Do NOT use vague filler phrases: "underscores concerns", "highlights challenges", "raises questions about", "sparks debate" \u2014 these are banned. Be specific or say nothing.
- You MAY add facts from the VERIFIED PHUKET REFERENCE section above when they are directly relevant to the story. These are confirmed true. Integrate them naturally \u2014 don't dump them in.

\u{1F697}\u{1F3CD}\uFE0F VEHICLE TYPE ACCURACY (CRITICAL):
- The Thai word "\u0E23\u0E16" (rot) is a GENERIC term meaning "vehicle" \u2014 NOT specifically "car"
- If the already-translated input says "car" but the original Thai only used "\u0E23\u0E16" (without \u0E23\u0E16\u0E22\u0E19\u0E15\u0E4C/\u0E40\u0E01\u0E4B\u0E07), use "vehicle" instead
- Only call it a "car" if the source explicitly says \u0E23\u0E16\u0E22\u0E19\u0E15\u0E4C, \u0E23\u0E16\u0E40\u0E01\u0E4B\u0E07, \u0E23\u0E16 SUV, etc.
- Only call it a "motorbike/motorcycle" if the source says \u0E23\u0E16\u0E08\u0E31\u0E01\u0E23\u0E22\u0E32\u0E19\u0E22\u0E19\u0E15\u0E4C, \u0E21\u0E2D\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E44\u0E0B\u0E04\u0E4C, \u0E2A\u0E01\u0E39\u0E4A\u0E15\u0E40\u0E15\u0E2D\u0E23\u0E4C, etc.
- When unsure, always fall back to: "vehicle", "the vehicle", "the abandoned vehicle" \u2014 never guess

\u{1F30F} LOCATION RULES:
- "Bangkok Road" in a Phuket article = a street in Phuket Town, NOT Bangkok city
- Same for "Krabi Road", "Phang Nga Road" \u2014 these are Phuket Town streets, not the provinces
- Dateline = WHERE THE EVENT HAPPENED, not where the people are from
- Use "Soi Bangla" not "Bangla Soi" \u2014 Soi always comes first
- "Saphan Hin" = a public park/promenade in Phuket Town, NOT a bridge

${params.communityComments && params.communityComments.length > 0 ? `\u{1F3AD} COMMENT MINING (comments provided above \u2014 mine aggressively):

Thai Facebook comments are one of your most valuable sources. They often contain MORE information than the original post.

A. SARCASM & TONE DETECTION:
- "\u0E19\u0E31\u0E01\u0E17\u0E48\u0E2D\u0E07\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E" / "Quality tourist" + \u{1F923} = SARCASM meaning BAD behavior
- "555" = Thai internet laughter, usually mocking
- Use tone of comments to determine the true story when the caption is ambiguous

B. EYEWITNESS DETAILS \u2014 Look for comments that add factual detail:
- Specific times, specific details the post missed, corrections, aftermath updates
- Include these as attributed color: "Commenters on the original post reported that..." or "One commenter who claimed to be at the scene said..."

C. LOCAL KNOWLEDGE \u2014 Look for comments that provide context:
- History of the location ("this junction has had multiple accidents this year")
- Known local issues ("that bar has been raided before")
- Practical info ("the CCTV from the 7-Eleven there will have caught it")
- Integrate naturally into the body or Background section

D. COMMUNITY REACTION \u2014 When the reaction IS the story:
- If comments are overwhelmingly angry, sympathetic, or mocking, that's part of the story
- Summarize sentiment: "The post drew widespread criticism from Thai commenters, many of whom..."

\u26A0\uFE0F CRITICAL RULES FOR COMMENT-SOURCED INFORMATION:
- NEVER present comment claims as confirmed fact. Always attribute: "according to commenters", "one commenter reported", "local residents responding to the post said"
- If a comment CONTRADICTS the original post, note the discrepancy
- Ignore pure reactions (emojis, "wow", single-word responses) \u2014 only mine substantive comments
- Do NOT include names of victims or suspects found only in comments

` : ""}\u{1F4DD} ARTICLE STRUCTURE:

1. **DATELINE**: Bold caps showing where the event happened (e.g., **PATONG, PHUKET \u2014**)

2. **LEDE**: One paragraph answering Who, What, Where, When. Be specific.

3. **DETAILS**: Expand on the lede with all available facts from the source.${params.communityComments && params.communityComments.length > 0 ? " Then mine the comments thoroughly using the rules above \u2014 eyewitness details, corrections, local knowledge, and community reaction can all add substantial depth." : ""} Use direct quotes if the source contains them.

4. **BACKGROUND** (when relevant): Draw on the VERIFIED PHUKET REFERENCE material above, but ONLY facts that connect directly to THIS specific story.

   GOOD example (story-specific): "It's the third motorbike fatality on Patong Hill this year \u2014 the stretch between the Kathu junction and the viewpoint remains one of the island's most dangerous."
   
   BAD example (generic filler): "Phuket has some of the highest road accident rates in Thailand. Foreign drivers are advised to carry an International Driving Permit."
   
   The test: would a long-term Phuket resident learn something from this sentence, or roll their eyes? If they'd roll their eyes, cut it.

5. **ON THE GROUND** (REQUIRED \u2014 include in EVERY article): A short section at the end with an <h3>On the Ground</h3> tag. This is NOT a safety brochure. It's story-specific insider context \u2014 what a well-connected local would tell a friend.

   WHAT THIS SECTION SHOULD SOUND LIKE:
   - "Thalang Police are handling the case \u2014 the station is the one just past the Heroines Monument heading north."
   - "That section of Thepkrasattri is a known blackspot, especially after dark. There's been talk of adding lights since at least 2022."
   - "If you were in the area and have dashcam footage, Patong Police are actively asking for it."
   - "Vachira will be the receiving hospital for anything on this side of the island."

   WHAT THIS SECTION SHOULD NEVER SOUND LIKE:
   - "If you are involved in a traffic accident, remain at the scene and call 191."
   - "Tourists are advised to exercise caution when visiting nightlife areas."
   - "Foreign nationals should ensure they carry a valid International Driving Permit at all times."
   
   2-4 sentences max. Use the reference material to find the relevant fact (which station, which hospital, what the law actually says), then phrase it the way a local would.

6. **DEVELOPING STORY INDICATOR** (conditional): If the source material is very thin (only 1-3 facts available) and you cannot build the article to 150+ words even with Background and On the Ground sections, add this element immediately after the dateline:

<p class="developing-story"><strong>\u26A1 Developing Story</strong> \u2014 Initial reports are limited. This article will be updated as more details become available.</p>

This is BETTER than padding a thin story with generic filler. A 100-word article that's honest about being a breaking alert is more credible than a 200-word article stuffed with "motorists are advised to exercise caution."

TONE: Write like a veteran correspondent who lives in Phuket and files stories for people who also live there. Professional but not sterile. Specific but not padded. You're not writing a travel advisory \u2014 you're writing the news for your neighbors.

MINIMUM LENGTH: The enrichedContent should be at least 150 words. If the source material is thin, Background and On the Ground carry the weight \u2014 but only with genuinely relevant, story-specific content. Never pad with generic advice or area descriptions.

FORMATTING REQUIREMENTS:
- EVERY paragraph MUST be wrapped in <p></p> tags
- Use <h3> tags for section headings (Background, On the Ground, Public Reaction)
- NEVER return content as a single wall of text

OUTPUT FORMAT \u2014 Return ONLY valid JSON, no markdown fences, no commentary:

{
  "enrichedTitle": "Factual AP-style headline. Be specific: names, places, numbers. NEVER use 'raises concerns' or 'sparks debate'. GOOD: 'Russian Tourist Arrested With 3kg of Cocaine in Cherng Talay'. BAD: 'Drug Arrest Raises Concerns in Phuket'.",
  "enrichedContent": "Full HTML article. Use <p> tags for paragraphs, <h3> for section headers. Start with bold DATELINE. Always include the On the Ground section.",
  "enrichedExcerpt": "2-3 sentence factual summary describing what happened. Used for meta descriptions and social sharing \u2014 make it specific and compelling. FORBIDDEN: 'highlights concerns', 'raises questions'."
}`;
        const enrichmentProvider = process.env.ENRICHMENT_PROVIDER || "openai";
        const anthropicModel = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
        let result = {};
        if (enrichmentProvider === "anthropic") {
          if (!process.env.ANTHROPIC_API_KEY) {
            console.warn("   \u26A0\uFE0F  ANTHROPIC_API_KEY not set \u2014 falling back to OpenAI GPT-4o");
            const completion = await openai2.chat.completions.create({
              model,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
              ],
              temperature: 0.3,
              response_format: { type: "json_object" }
            });
            result = JSON.parse(completion.choices[0].message.content || "{}");
          } else {
            console.log(`   \u{1F916} [ANTHROPIC] Enriching with ${anthropicModel}`);
            const response = await anthropic.messages.create({
              model: anthropicModel,
              max_tokens: 3e3,
              temperature: 0.3,
              system: systemPrompt,
              messages: [{ role: "user", content: prompt }]
            });
            const responseContent = response.content[0];
            if (responseContent.type !== "text") {
              throw new Error(`Unexpected Anthropic response type: ${responseContent.type}`);
            }
            const cleaned = responseContent.text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
            result = JSON.parse(cleaned);
          }
        } else {
          const completion = await openai2.chat.completions.create({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ],
            temperature: 0.3,
            response_format: { type: "json_object" }
          });
          result = JSON.parse(completion.choices[0].message.content || "{}");
        }
        const formattedContent = ensureProperParagraphFormatting(result.enrichedContent || params.content);
        return {
          enrichedTitle: enforceSoiNamingConvention(result.enrichedTitle || params.title),
          enrichedContent: enforceSoiNamingConvention(formattedContent),
          enrichedExcerpt: enforceSoiNamingConvention(result.enrichedExcerpt || params.excerpt)
        };
      }
      async translateAndRewrite(title, content, precomputedEmbedding, checkInLocation, communityComments, engagement, assets, sourceUrl) {
        try {
          const enrichedThaiTitle = enrichWithPhuketContext(title);
          const enrichedThaiContent = enrichWithPhuketContext(content);
          const combinedText = `${title} ${content}`.toLowerCase();
          const blockedKeywordFound = BLOCKED_KEYWORDS.some(
            (keyword) => combinedText.includes(keyword.toLowerCase())
          );
          if (blockedKeywordFound) {
            const matchedKeyword = BLOCKED_KEYWORDS.find((kw) => combinedText.includes(kw.toLowerCase()));
            console.log(`   \u{1F6AB} BLOCKED CONTENT DETECTED: Royal family keyword "${matchedKeyword}" found`);
            console.log(`   \u2696\uFE0F  LESE MAJESTE COMPLIANCE: Rejecting story to avoid legal risk`);
            return {
              translatedTitle: title,
              translatedContent: content,
              excerpt: "Story rejected due to editorial policy",
              category: "Politics",
              isActualNews: false,
              // Mark as non-news to prevent publication
              interestScore: 0,
              isDeveloping: false,
              needsReview: false,
              embedding: precomputedEmbedding
            };
          }
          const isComplex = isComplexThaiText(enrichedThaiContent);
          let sourceTextForGPT = `${enrichedThaiTitle}

${enrichedThaiContent}`;
          if (isComplex) {
            try {
              console.log(`\u{1F30D} Complex text detected (${enrichedThaiContent.length} chars) - using Google Translate \u2192 GPT-4o-mini pipeline`);
              const googleResult = await translate(sourceTextForGPT, { to: "en" });
              sourceTextForGPT = googleResult.text;
            } catch (googleError) {
              console.warn("\u26A0\uFE0F  Google Translate failed, falling back to direct GPT-4o-mini:", googleError);
            }
          } else {
            console.log(`\u26A1 Simple text (${enrichedThaiContent.length} chars) - using direct GPT-4o-mini translation`);
          }
          let learningContext = "";
          try {
            const { scoreLearningService: scoreLearningService2 } = await Promise.resolve().then(() => (init_score_learning(), score_learning_exports));
            learningContext = await scoreLearningService2.generateLearningContext();
            if (learningContext) {
              console.log(`   \u{1F9E0} Score learning context injected into prompt`);
            }
          } catch (err) {
            console.warn("   \u26A0\uFE0F Failed to fetch score learning context:", err);
          }
          let engagementContext = "";
          if (engagement && (engagement.viewCount || engagement.likeCount || engagement.commentCount)) {
            engagementContext = `
SOCIAL MEDIA ENGAGEMENT DATA (REAL-WORLD VIRALITY INDICATORS):
- Views: ${engagement.viewCount || "Unknown"}
- Likes: ${engagement.likeCount || "Unknown"}
- Comments: ${engagement.commentCount || engagement.commentCount}
- Shares: ${engagement.shareCount || "Unknown"}

INSTRUCTION: High engagement (especially views > 10,000 or shares > 50) STRONGLY SUGGESTS a score of 5 for local crime or foreigner incidents.
`;
          }
          let commentsContext = "";
          if (communityComments && communityComments.length > 0) {
            commentsContext = `
\u{1F6A8} COMMUNITY COMMENTS FROM FACEBOOK (CRITICAL FOR UNDERSTANDING TRUE CONTEXT):
These comments reveal what the story is ACTUALLY about - Thai captions are often sarcastic, vague, or use euphemisms.

${communityComments.slice(0, 10).map((c, i) => `${i + 1}. "${c}"`).join("\n")}

\u26A0\uFE0F HOW TO USE THESE COMMENTS:
1. **DECODE HIDDEN MEANING**: If caption says "mysterious stickers" but comments mention "drugs", "cocaine", "selling", "Telegram" \u2192 the story is about DRUG ADVERTISING, not just "mysterious stickers"
2. **DETECT SARCASM**: If comments use "555", "\u0E19\u0E31\u0E01\u0E17\u0E48\u0E2D\u0E07\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E" (quality tourist), laughing emojis \u2192 the post is MOCKING the subject
3. **IDENTIFY CRIME/ILLEGAL ACTIVITY**: Look for keywords like \u0E22\u0E32\u0E40\u0E2A\u0E1E\u0E15\u0E34\u0E14 (drugs), \u0E42\u0E04\u0E40\u0E04\u0E19 (cocaine), \u0E02\u0E32\u0E22\u0E22\u0E32 (drug dealing), \u0E41\u0E01\u0E4A\u0E07 (gang), illegal, arrest
4. **CORRECT YOUR INTERPRETATION**: If your initial read seems too innocent but comments suggest crime/scandal, RE-INTERPRET the story correctly
5. **BOOST SCORE APPROPRIATELY**: Drug-related stories, tourist scandals, crime = Score 4-5 (high interest)

\u{1F6AB} DO NOT:
- Write a sanitized "mysterious curiosity" story when comments reveal it's about DRUG SALES
- Score drug/crime stories at 3 just because the caption was vague
- Ignore Thai slang for drugs/illegal activity
`;
            console.log(`   \u{1F4AC} Injected ${communityComments.length} community comments for context analysis`);
          }
          const prompt = `You are a professional news editor for an English-language news site covering Phuket, Thailand. 

Engagement Metrics:
${engagementContext}
${commentsContext}

Your task:
1. Determine if this is actual NEWS content (not promotional posts, greetings, or filler content)
   **IMPORTANT:** Short captions with viral images ARE news! If a post shows a foreigner doing something unusual (wearing a pot as a helmet, sitting dangerously on a scooter, etc.), this IS newsworthy even if the caption is just a few words. These viral foreigner stories get MASSIVE engagement.

2. CRITICAL CONTENT FILTERS - REJECT and mark as NOT news if the content is about:
   \u2696\uFE0F  **LESE MAJESTE COMPLIANCE (ABSOLUTE PRIORITY):**
   - The Thai royal family, monarchy, king, queen, or any member of the royal family
   - King Bhumibol Adulyadej (Rama IX), King Rama X, or ANY Thai monarch (past or present)
   - ANY story mentioning "His Majesty", "Her Majesty", "Royal Family", "\u0E1E\u0E23\u0E30\u0E23\u0E32\u0E0A\u0E32", "\u0E43\u0E19\u0E2B\u0E25\u0E27\u0E07", "\u0E20\u0E39\u0E21\u0E34\u0E1E\u0E25\u0E2D\u0E14\u0E38\u0E25\u0E22\u0E40\u0E14\u0E0A"
   - THIS APPLIES TO ALL ROYAL STORIES - even positive ones like donations, ceremonies, or tributes
   - REASON: Thailand's lese majeste laws make ANY royal family content legally risky. ALWAYS reject.
   
   \u{1F4F0} **OTHER BLOCKED CONTENT:**
   - "Phuket Times" or "Phuket Time News" itself (self-referential content about the news source)

3. If it's acceptable news, ${isComplex ? "polish and rewrite the Google-translated text" : "translate from Thai to English"} in a clear, professional news style.

\u{1F6AB} DO NOT ADD GENERIC AREA DESCRIPTIONS (CRITICAL):
Our readers are LOCAL RESIDENTS and EXPATS who know Phuket extremely well. Writing like a tourist guide is CONDESCENDING. DO NOT add:
- "Patong, a bustling tourist area on Phuket's west coast" - LOCALS KNOW WHAT PATONG IS
- "Bangla Road, Patong's famous nightlife strip" - EVERYONE KNOWS THIS
- "Chalong, known for the Big Buddha" - THIS IS PATRONIZING

Write like you're talking to an INSIDER who reads this site every day, not a clueless tourist.
The ONLY exception for area context: If this story relates to a RECURRING THEME in that area (e.g., "This is the latest in a series of Bangla Road altercations" or "Parking disputes in this soi have been escalating").

PUBLIC SENTIMENT IS PRIORITY:
If community comments are available, readers want to hear what locals are saying about this story - NOT generic tourist-guide descriptions of the area.

\u26A0\uFE0F CRITICAL - ZERO HALLUCINATION POLICY (READ CAREFULLY):
- ONLY write about what is explicitly stated or shown in the source.
- DO NOT INVENT actions, behaviors, or events that aren't described (e.g., "shouted", "appeared agitated", "caused chaos").
- \u{1F6A8} PATONG/BANGLA ROAD HALLUCINATION WARNING: If the source says "Patong", do NOT assume it happened on "Bangla Road". Patong has many other piers, docks, shops, and beaches. Only name Bangla Road if the source EXPLICITLY mentions it.
- If source shows tourists on motorbike being stopped by police, report ONLY that - do NOT add that they "shouted at passersby" unless the source says so.
- DO NOT add generic area fluff like "bustling tourist area" - this is hallucination of a different kind.
- When in doubt, write LESS. A short factual article is better than a long invented one.
- If source is just a video caption like "Farangs showing off at traffic lights, police pulled them over", your article should describe ONLY: tourists on motorbikes at traffic lights, police stopped them. Do NOT add "agitated", "outburst", "disruption" unless source says so.

4. Extract a concise excerpt (2-3 sentences) written from a THIRD-PERSON NEWS REPORTING perspective with perfect grammar. CRITICAL: Never use first-person ('we', 'our', 'join us') or make it sound like the news site is organizing events. Report objectively.
5. Categorize the article by TOPIC (not urgency).
6. Rate reader interest (1-5 scale).


${isComplex ? "Google-Translated Text" : "Original Thai Text"}: ${sourceTextForGPT}
${checkInLocation ? `
OFFICIAL CHECK-IN LOCATION: "${checkInLocation}"
(CRITICAL: Use this location to verify where the event happened. If it says "Hat Yai" or "Songkhla", the event is NOT in Phuket.)` : ""}

Respond in JSON format:
{
  "isActualNews": true/false,
  "translatedTitle": "FACTUAL headline describing what happened. MUST state the actual event with specific details. FORBIDDEN PHRASES that are too vague or editorialize: 'highlights concerns', 'raises concerns', 'sparks debate', 'leaves residents wondering', 'draws attention', 'prompts questions'. GOOD: 'Tourists Fight on Bangla Road', 'Car Crashes Into Garbage Truck in Patong'. BAD: 'Tourist Altercation Highlights Safety Concerns' (too vague, editorializing). Follow AP Style, Title Case.",
  "translatedContent": "professional news article in HTML format. CRITICAL FORMATTING REQUIREMENTS: (1) MUST wrap EVERY paragraph in <p></p> tags, (2) MUST have at least 3-5 separate paragraphs for readability, (3) Use <h3> for section headings like Context, (4) NEVER return a single wall of text without paragraph breaks - this is UNACCEPTABLE and will result in poor user experience",
  "excerpt": "2-3 sentence FACTUAL summary describing what happened. FORBIDDEN: 'highlights concerns', 'raises questions', 'sparks debate', 'draws attention'. MUST describe the actual event, not vague implications. GOOD: 'A street fight between tourists broke out in Patong.' BAD: 'The incident highlights ongoing concerns about tourist behavior.'",
  "category": "Weather|Local|Traffic|Tourism|Business|Politics|Economy|Crime|National",
  "categoryReasoning": "brief explanation of why you chose this category (1 sentence)",
  "interestScore": 1-5 (integer),
  "isDeveloping": true/false (true if story has limited details/developing situation - phrases like "authorities investigating", "more details to follow", "initial reports", "unconfirmed", sparse information, or breaking news with incomplete facts),
  "needsReview": true/false (Set to TRUE if: 1. You are unsure about the location 2. The story seems like a rumor 3. You had to guess any details 4. It mentions a province outside Phuket but you aren't 100% sure if it's relevant 5. The source text is very short or ambiguous),
  "reviewReason": "Explanation of why this needs human review (required if needsReview is true)",
  "facebookHeadline": "FACTUAL TEASER (max 15 words): Describe what happened with real names/places, but withhold full details. MUST BE FACTUAL - state the actual event clearly. FORBIDDEN: 'raises concerns', 'highlights concerns', 'sparks debate', 'unexpected' (for known events). GOOD EXAMPLES: 'Tourists fight on Bangla Road' (factual, readers want details), 'Car crashes into garbage truck in Patong' (factual, readers want to know injuries/cause), 'Man found dead at Karon hotel' (factual, readers want to know how/who). BAD EXAMPLES: 'Collision in Patong raises safety concerns' (vague, made-up context), 'Festival attracts unexpected crowds' (if it's a known event, not unexpected). DON'T over-dramatize or invent context."
}

If this is NOT actual news (promotional content, greetings, ads, royal family content, or self-referential Phuket Times content), set isActualNews to false and leave other fields empty.`;
          const completion = await openai2.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a professional news editor and translator for Phuket Radar, an English-language news site covering Phuket, Thailand.

\u{1F4C5} CURRENT DATE: ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Bangkok" })} (Thailand Time)

\u23F0 CRITICAL - TENSE VERIFICATION & TEMPORAL GROUNDING (READ BEFORE WRITING):
- CHECK EVENT DATES: If the source mentions specific dates for an event, compare them to TODAY's date above.
- PAST EVENTS = PAST TENSE: If an action is complete (e.g., a rescue, an accident, a sinking), write in PAST TENSE ("were rescued", "took place", "occurred").
- NO FALSE PRESENT CONTINUOUS TENSE: DO NOT report completed actions using present continuous tense ("are being rescued"). DO NOT assume events are happening right now just because they are in the news. Assume events are completed past actions unless explicitly stated that they are unfolding currently.
- PREVIOUS EVENTS: If the source states an event happened previously, report it as a past event.
- FUTURE EVENTS = FUTURE TENSE: Only use future tense ("will be held", "is scheduled for") if the event date is AFTER today's date.
- EXAMPLE: If source says "festival on January 16-18" and today is January 21, write: "Students staffed the Electric Daisy Carnival, which took place January 16-18..." NOT "Students will staff..."
- NEVER copy future tense from an outdated source article if the event has already happened.

CRITICAL LOCATION VERIFICATION:
- VERIFY THE LOCATION: Determine EXACTLY where the event happened.
- DO NOT HALLUCINATE PHUKET: If the story mentions Hat Yai, Songkhla, Bangkok, Chiang Mai, or other provinces, DO NOT change the location to Phuket.
- PHUKET SOURCE \u2260 PHUKET STORY: Sources like "Phuket Info Center" often report on Southern Thailand events (Hat Yai, Trang, Narathiwat).
- CHECK LANDMARKS: "Pholphichai Road", "Wat Plakrim", "Wat Phutthikaram" are in HAT YAI, not Phuket.
- CRITICAL: PERSON'S ORIGIN \u2260 EVENT LOCATION: If "Patong Jet Ski team helps with floods", READ CAREFULLY to see WHERE they are helping. They might be FROM Patong but HELPING IN Hat Yai. DO NOT assume the event is in Phuket just because the people are from Phuket.

${PHUKET_STREET_DISAMBIGUATION}

\u{1F6A8} SOI (ALLEY) NAMING CONVENTION (CRITICAL):
- In Thai, "Soi" ALWAYS comes BEFORE the name.
- WRONG: "Bangla Soi", "Ta-iad Soi", "Dog Soi"
- CORRECT: "Soi Bangla", "Soi Ta-iad", "Soi Dog"
- ALWAYS output correctly as "Soi [Name]".

CRITICAL FACTUALITY RULES - ZERO TOLERANCE FOR HALLUCINATIONS:
- DO NOT INVENT FACTS: Do not add details, numbers, quotes, or events not in the source text.
- NO GUESSING: If source says "several people", do NOT change to "five people".
- CONTEXT VS. FICTION: You MAY add context (e.g., "Hat Yai is a major city") but MUST NOT add specific details about the event itself.

\u26A0\uFE0F NEVER INVENT THE FOLLOWING (even if they seem plausible):
- "Authorities were alerted" / "Police responded" - unless source says so
- "The person was detained/arrested" - unless source says so
- "Eyewitnesses described..." - unless source quotes witnesses
- "Calls for stricter enforcement" - unless source says so
- "narrowly avoiding..." / "caused chaos" - unless source describes this
- Specific times ("late afternoon", "Thursday") - unless source provides
- Injuries, damages, or consequences not in source
- Reactions from officials not quoted in source

\u{1F6AB} DO NOT SANITIZE OR CENSOR THE CONTENT:
- If the source says foreigners were "having sex in public" or "engaging in sexual acts", REPORT THIS ACCURATELY (use appropriate news language like "engaging in public indecency" or "allegedly having sex")
- DO NOT replace scandalous content with vague euphemisms like "risky behavior" or "inappropriate conduct" if the source is more specific
- Thai slang translations to know:
  - "\u0E40\u0E2D\u0E32\u0E01\u0E31\u0E19" / "\u0E08\u0E48\u0E2D" / "\u0E02\u0E22\u0E48\u0E21" = having sex (report as "engaging in sexual acts" or "allegedly having sex")
  - "\u0E2D\u0E38\u0E08\u0E32\u0E14\u0E15\u0E32" = obscene/disgusting behavior (report the actual behavior, not just "offensive")
  - "\u0E1D\u0E48\u0E32\u0E18\u0E07\u0E41\u0E14\u0E07" = ignoring red flags (for beach safety)
- The viral/scandalous element is often WHY the story is newsworthy - don't hide it!
- Use professional news language but accurately convey what happened

\u{1F3AF} FOR SHORT/VIRAL POSTS (CRITICAL - READ THIS):
If the source is just a short caption with a video/photo (e.g., "Tourists showing off at traffic lights, police stopped them"):
- Write a SHORT article (2-3 paragraphs max) that describes ONLY what the source says.
- DO NOT dramatize or expand into a full news story with invented scenarios.
- DO NOT add: "shouted at passersby", "appeared agitated", "caused chaos", "disrupted traffic", "onlookers gathered" unless the source says so.
- CORRECT: "Tourists were seen revving their motorbikes at a traffic light. Police officers approached and directed them to pull over."
- WRONG: "A tourist's unruly behavior brought traffic to a standstill. Witnesses reported the individual appeared agitated and shouted at passersby."

THAI SOCIAL MEDIA CONTEXT ANALYSIS (CRITICAL - READ BEFORE INTERPRETING):
Thai social media posts often use SARCASM, HUMOR, and EUPHEMISMS. You MUST analyze the TRUE meaning:

\u{1F3AD} SARCASTIC/HUMOROUS CAPTION PATTERNS:
- "\u0E40\u0E2D\u0E32\u0E17\u0E35\u0E48\u0E2A\u0E1A\u0E32\u0E22\u0E43\u0E08" / "\u0E40\u0E2D\u0E32\u0E17\u0E35\u0E48\u0E1A\u0E32\u0E22\u0E43\u0E08" = "Whatever makes you happy" (SARCASM - they're mocking the person)
- "\u0E19\u0E31\u0E01\u0E17\u0E48\u0E2D\u0E07\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E" = "Quality tourist" (SARCASM - means BADLY-behaving tourist)
- "\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19\u0E2A\u0E27\u0E22" / "\u0E2A\u0E01\u0E34\u0E25\u0E21\u0E32" = "Nice pose" / "Skills" (SARCASM - mocking embarrassing situation)
- "\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E38\u0E02\u0E41\u0E17\u0E49\u0E46" / "\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E38\u0E02" = "True happiness" (SARCASM when someone is in embarrassing position)
- "\u0E44\u0E21\u0E48\u0E40\u0E2B\u0E47\u0E19\u0E27\u0E48\u0E32\u0E08\u0E30\u0E1C\u0E34\u0E14\u0E15\u0E23\u0E07\u0E44\u0E2B\u0E19" = "I don't see anything wrong" (SARCASM - obviously something IS wrong)
- "\u0E1A\u0E23\u0E23\u0E22\u0E32\u0E01\u0E32\u0E28\u0E14\u0E35" = "Nice atmosphere" (SARCASM when situation is clearly bad)
- "555" / "5555" = Thai internet laughter (like "lol") - indicates post is humorous/mocking

\u{1F37A} DRUNK/INTOXICATED TOURIST INDICATORS:
- Person lying flat on street/sidewalk = DRUNK, not "resting" or "enjoying the view"
- "\u0E19\u0E2D\u0E19\u0E02\u0E49\u0E32\u0E07\u0E17\u0E32\u0E07" = "sleeping on the roadside" = PASSED OUT DRUNK
- "\u0E1E\u0E48\u0E2D\u0E43\u0E2B\u0E0D\u0E48" = "big guy" (often sarcastic term for drunk foreigners)
- Reference to watching "\u0E2A\u0E32\u0E27\u0E46" (girls) walking by while lying down = SARCASTIC (they're unconscious)
- Location: Patong + foreigner + lying on ground = 99% DRUNK, not "appreciating street life"
- Use of \u{1F602}\u{1F923} emojis in comments = people are LAUGHING AT, not WITH the person

\u{1F4F8} VISUAL CONTEXT CLUES (If image shows):
- Person horizontal on pavement = INTOXICATED/PASSED OUT
- Police standing near confused tourist = TOURIST IN TROUBLE, not "friendly chat"
- Person in underwear/minimal clothing = DRUNK/DISORDERLY, not "enjoying weather"
- Crowd gathered around = INCIDENT, not "photo opportunity"
- Red face on foreigner = DRUNK, not "sunburn"

\u{1F50D} HOW TO INTERPRET THESE POSTS:
1. NEVER take humorous Thai captions literally
2. LOOK at what the IMAGE actually shows (if described)
3. READ the comments for true context (e.g., "Another quality tourist \u{1F923}" = drunk/bad behavior)
4. If locals are using 555/emojis/sarcasm = it's a MOCKERY post, not praise
5. "Enjoying X" in sarcastic context = DRUNK/MISBEHAVING

\u{1F4DD} HOW TO WRITE THESE STORIES:
- Report the ACTUAL situation, not the sarcastic caption
- Use phrases like "appeared to be intoxicated", "was found lying", "allegedly passed out"
- Keep the humorous/viral angle - these stories are MEANT to be amusing
- DO NOT sanitize drunk behavior into "relaxing" or "resting"
- Match the tone - these are "tourist behaving badly" viral stories

EXAMPLE INTERPRETATION:
\u274C WRONG: "Tourist Enjoys Patong's Vibrant Street Scene" (literal caption interpretation)
\u2705 CORRECT: "Tourist Found Passed Out on Patong Street, Locals React with Amusement"

GRAMMAR & STYLE:
- Follow AP Style for headlines: capitalize main words
- ALWAYS include company suffixes: Co., Ltd., Inc., Corp., Plc.
- Use proper articles (a, an, the)
- Write in active voice when possible

\u{1F697}\u{1F3CD}\uFE0F VEHICLE TYPE DISAMBIGUATION (CRITICAL \u2014 READ BEFORE TRANSLATING ANY VEHICLE STORY):
The Thai word "\u0E23\u0E16" (rot) is a GENERIC WORD meaning "vehicle" \u2014 it does NOT specifically mean "car".
DO NOT translate "\u0E23\u0E16" as "car" unless the source text explicitly uses one of these car-specific terms:
  - \u0E23\u0E16\u0E22\u0E19\u0E15\u0E4C = car / automobile (4-wheel motor vehicle)
  - \u0E23\u0E16\u0E40\u0E01\u0E4B\u0E07 = sedan
  - \u0E23\u0E16SUV / \u0E23\u0E16\u0E01\u0E23\u0E30\u0E1A\u0E30 = SUV / pickup truck
  - \u0E23\u0E16\u0E1A\u0E23\u0E23\u0E17\u0E38\u0E01 = truck

If the source ONLY says "\u0E23\u0E16" without a car-specific modifier, the vehicle type is AMBIGUOUS.
In that case:
  \u2705 USE: "vehicle", "the vehicle", "the abandoned vehicle"
  \u274C AVOID: "car", "automobile" (these are WRONG if source only says "\u0E23\u0E16")

Motorcycle-specific Thai terms (use "motorbike" / "motorcycle" if you see these):
  - \u0E23\u0E16\u0E08\u0E31\u0E01\u0E23\u0E22\u0E32\u0E19\u0E22\u0E19\u0E15\u0E4C = motorcycle
  - \u0E21\u0E2D\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E44\u0E0B\u0E04\u0E4C / \u0E21\u0E2D\u0E44\u0E0B\u0E04\u0E4C = motorbike (slang/colloquial)
  - \u0E2A\u0E01\u0E39\u0E4A\u0E15\u0E40\u0E15\u0E2D\u0E23\u0E4C = scooter
  - \u0E23\u0E16\u0E21\u0E2D\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E44\u0E0B\u0E04\u0E4C = motorcycle

Other vehicle terms:
  - \u0E23\u0E16\u0E15\u0E38\u0E4A\u0E01\u0E15\u0E38\u0E4A\u0E01 = tuk-tuk
  - \u0E23\u0E16\u0E2A\u0E2D\u0E07\u0E41\u0E16\u0E27 = songthaew (shared taxi)
  - \u0E23\u0E16\u0E1A\u0E31\u0E2A = bus
  - \u0E23\u0E16\u0E01\u0E23\u0E30\u0E1A\u0E30 = pickup truck

\u26A0\uFE0F EXAMPLE of what to avoid:
\u274C WRONG: "An abandoned CAR belonging to a foreign national was found at Phuket Airport" \u2014 if source says "\u0E23\u0E16" only
\u2705 CORRECT: "An abandoned VEHICLE belonging to a foreign national was found at Phuket Airport"

This is especially important for headlines and article titles. If vehicle type is uncertain, use a neutral term:
  - "Abandoned Vehicle at Phuket Airport" (not "Abandoned Car")
  - "Vehicle Found at..." (not "Car Found at...")

CATEGORY GUIDE (read full story, not just headline):
- Weather: Natural disasters, typhoons, flooding, landslides, storms (IN PHUKET ONLY)
- Local: Community news, missing persons, drownings, boat accidents, local government
- Traffic: Road accidents (non-criminal), road closures, construction
- Crime: ONLY intentional criminal activity - arrests, theft, assault, scams
- National: Major news from outside Phuket (Bangkok, Hat Yai, Chiang Mai, etc.) AND Southern Thailand floods/disasters that are NOT in Phuket
- WHEN UNCERTAIN: Use "Local" as default

CRITICAL: "Southern Floods" in Hat Yai, Songkhla, Narathiwat, Yala = "National" (NOT "Weather" or "Local")

\u{1F6A8} CATEGORY CRITICAL RULE \u2014 LOCATION OF EVENT, NOT NATIONALITY/ORIGIN:
- Category is determined by WHERE THE EVENT HAPPENED, NOT the nationality of the people involved or whether international agencies are involved.
- A French man arrested IN RAWAI = Category "Crime" (happened in Phuket), NOT "National"
- A Russian tourist caught WITH DRUGS IN PATONG = Category "Crime", NOT "National"
- An Interpol suspect ARRESTED IN PHUKET = Category "Crime", NOT "National"
- Chinese gang BUSTED IN PHUKET = Category "Crime", NOT "National"
- A Thai policeman arrested for corruption IN PHUKET = Category "Crime", NOT "National"
- "National" ONLY means the event occurred OUTSIDE Phuket province. It NEVER means "international" or "involving foreign nationals".

INTEREST SCORE (1-5) - BE VERY STRICT:
**RESERVE 4-5 FOR HIGH-ENGAGEMENT NEWS ONLY:**
- 5 = BREAKING/URGENT: Deaths, drownings, fatal accidents, violent crime with serious injuries, major fires, natural disasters causing casualties
- 5 = FOREIGNER INCIDENTS: ANY story involving foreigners/tourists/expats doing something out of the ordinary - fights, accidents, disturbances, arrests, confrontations with locals. These stories go VIRAL with the expat audience. Keywords: foreigner, tourist, farang, expat, foreign national, American, British, Russian, Chinese tourist, etc.
- 4 = SERIOUS INCIDENTS: Non-fatal accidents with injuries, arrests for serious crimes, active rescue operations, fights/assaults, hit-and-runs, robberies

\u{1F422} **FEEL-GOOD / VIRAL POSITIVE STORIES = SCORE 4-5 (AUTO-POST TO SOCIALS):**
These heartwarming stories GO VIRAL and drive massive engagement. BOOST them:
- **Wildlife/Animal Stories**: Sea turtle nesting/hatching, dolphin sightings, whale shark encounters, elephant rescues, rare wildlife spotted, baby animals, marine life conservation = Score 4-5
- **Conservation Success**: Coral restoration, beach cleanups with visible results, endangered species protection, environmental wins = Score 4-5  
- **Good Samaritan Stories**: Locals helping tourists, honest taxi/tuk-tuk drivers returning lost items, random acts of kindness, rescues = Score 4-5
- **Positive Foreigner Involvement**: Expats volunteering, tourists helping locals, foreigners doing good deeds, cross-cultural positive stories = Score 5 (VERY viral with expat audience)
- **Rescue/Hero Stories**: Lifeguard saves swimmer, local saves drowning tourist, community comes together = Score 4-5

EXAMPLES OF FEEL-GOOD = SCORE 4-5:
- "Sea turtle lays 124 eggs at Karon Beach" = Score 5 (wildlife + family destination = viral)
- "Honest taxi driver returns tourist's wallet with 50,000 baht" = Score 5 (good samaritan + foreigner)
- "Baby turtles released into Andaman Sea" = Score 4-5 (conservation, cute, shareable)
- "Expat organizes beach cleanup, removes 500kg of trash" = Score 5 (foreigner + positive + environmental)
- "Dolphin pod spotted near Phi Phi Islands" = Score 4 (wildlife, tourism, shareable)
- "Local fishermen rescue stranded whale shark" = Score 5 (rescue + rare wildlife)

**CAP ROUTINE NEWS AT 3 OR BELOW:**
- 3 = NOTEWORTHY: Minor accidents (no injuries), infrastructure complaints (potholes, flooding damage), tourism developments, business openings, new property launches, missing persons
- 2 = ROUTINE: Officials inspecting/visiting, meetings, announcements, cultural events, preparations, planning, **community sports events, friendly matches, alumni gatherings, local football/futsal matches**, **small concerts/live music with unknown or local-only acts**
- 1 = TRIVIAL: Ceremonial events, ribbon cuttings, photo ops

**EARTHQUAKE / NATURAL DISASTER SCORING (CRITICAL):**
- Earthquakes ANYWHERE in southern Thailand, Andaman coast, or nearby regions (Surat Thani, Ranong, Phang Nga, Krabi, Myanmar border) = Score 4 MINIMUM
- Earthquakes are safety-relevant events for ALL Phuket residents (earthquake \u2192 potential tsunami risk for Andaman coast)
- Even "small" earthquakes (magnitude 3+) are newsworthy because readers worry about aftershocks and bigger quakes
- Earthquake with casualties or structural damage = Score 5
- EXAMPLES:
  - "Earthquake hits Surat Thani, magnitude 3.2" = Score 4 (nearby seismic event, safety concern)
  - "Series of tremors in southern Thailand" = Score 4 (developing seismic situation)
  - "Strong earthquake near Myanmar border felt in Phuket" = Score 5 (directly affects readers)
  - "Tsunami warning issued" = Score 5 (BREAKING, life-threatening)

**LOCAL CONCERT / ENTERTAINMENT EVENT RULES (CRITICAL - READ THIS):**
- Small concerts, live music events, and local entertainment with mostly unknown or local-only acts = ABSOLUTE MAX SCORE 2
- Ask: "Would an expat reader specifically go out of their way for this?" If the answer is no, cap at 2.
- EXAMPLES of what to CAP at Score 2:
  - "T-Conic Live Concert at Saphan Hin" = Score 2 (local entertainment, unknown acts)
  - "Local band performs at beach bar" = Score 2 (routine entertainment)
  - "Mini concert with local artists" = Score 2 (small-scale event)
  - "Live music night at [venue]" = Score 2 (routine nightlife)
- EXCEPTION: Major international acts, large-scale music festivals (e.g. EDC, Wonderfruit), or events featuring well-known artists = Score 3-4

**CRITICAL DISTINCTIONS:**
- "Road damaged by flooding" = Score 3 (infrastructure complaint, NOT a disaster)
- "Luxury hotel/villa launch" = Score 3 (business news, NOT breaking)
- "Art exhibition/Gallery opening" = Score 3 (cultural event, NOT urgent)
- "Students win robotics award" = Score 3 (achievement, NOT urgent)
- "Road damaged by flooding" = Score 3 (infrastructure complaint, NOT a disaster)
- "Luxury hotel/villa launch" = Score 3 (business news, NOT breaking)
- "Art exhibition/Gallery opening" = Score 3 (cultural event, NOT urgent)
- "Students win robotics award" = Score 3 (achievement, NOT urgent)
- "Tourism boom faces sustainability concerns" = Score 3 (discussion, NOT crisis)
- **"Blood donation drive" = Score 3 MAX (community charity event, NOT urgent)**
- **"Donation ceremony" = Score 2-3 MAX (routine charity, NOT news)**
- **"Fundraiser for flood victims" = Score 3 MAX (charity event, NOT breaking news)**
- **"Community helps disaster victims" = Score 3 MAX (charitable response, NOT the disaster itself)**
- **"Mascot at mall event" = Score 2 MAX (promotional fluff, NOT news)**
- **"Shopping center celebration" = Score 2 MAX (mall marketing, NOT news)**
- **"Hello Phuket event" = Score 2 MAX (promotional event, NOT breaking)**
- **"Sustainability-themed event" = Score 2 MAX (feel-good PR, NOT urgent)**
- **"Alumni football match" = Score 2 MAX (community sports, NOT breaking)**
- **"Friendly match at stadium" = Score 2 MAX (local sports event, NOT urgent)**
- **"Community sports event" = Score 2 MAX (routine local activity)**
- **"Local concert with unknown acts" = Score 2 MAX (routine entertainment, NOT news)**
- **"Beauty pageant/contest" = Score 3 MAX (community entertainment, NOT breaking)**
- **"Cosplay/costume competition" = Score 3 MAX (community entertainment, NOT breaking)**
- **"Contestant enters competition" = Score 3 MAX (community event, NOT breaking)**
- **"Local talent show" = Score 3 MAX (community entertainment, NOT breaking)**
- "Car crash with injuries" = Score 4 (actual incident with victims)
- "Drowning at beach" = Score 5 (death/urgent)
- "Arrest for theft" = Score 4 (crime with action)
- **"Foreigner in fight with locals" = Score 5 (viral expat content)**
- **"Tourist arrested for..." = Score 5 (foreigner incident)**
- **"Expat involved in accident" = Score 5 (foreigner incident)**
- **"Foreigner doing something weird/silly" = Score 5 (viral expat content - pot on head, funny behavior, etc.)**
- **"Sea turtle eggs laid at beach" = Score 5 (wildlife, conservation, family-friendly viral)**
- **"Good samaritan returns lost property" = Score 4-5 (heartwarming, shareable)**

**BEAUTY PAGEANT / COMPETITION / CONTEST RULES (CRITICAL):**
Never score 4 or 5 for the following \u2014 these are score 3 maximum:
- Beauty pageants, beauty contests, Miss/Mr competitions
- Cosplay competitions, costume contests, fancy dress events
- Talent shows, talent competitions, community contests
- Contestants entering or winning local/regional competitions
- "International" in the event name does NOT make it high-interest \u2014 "Phuket International Competition" is still a local community event
- Social media attention on a contestant (e.g., viral cosplay) does NOT elevate it above score 3
- These are community entertainment stories, NOT breaking news

**CORPORATE MILESTONES / CEREMONIAL EVENTS RULES (CRITICAL):**
Never score 4 or 5 for the following \u2014 these are score 2-3 maximum regardless of detail, officials present, or production quality:
- Corporate milestones or company anniversaries
- Merit-making ceremonies or alms-giving events
- CSR activities or charity handovers
- Scholarship donations or foundation events
- Officials attending non-emergency events (inspections, openings, visits)
- Ribbon cuttings, groundbreaking ceremonies, MOU signings
- Gala dinners, awards nights, banquets
Gut check: "Would a foreign resident of Phuket share this in an expat Facebook group?" If the answer is no, it is not a 4.

**CHARITY/DONATION EVENT RULES:**
- Blood drives, donation ceremonies, fundraisers = ABSOLUTE MAX SCORE 3 (they're nice, but NOT high-engagement news)
- Even if honoring someone famous (including royalty) = STILL capped at 3
- Community help efforts = Score 3 (unless it's covering the actual disaster, then use disaster scoring)

**PROMOTIONAL/MALL EVENT RULES:**
- Mascot appearances, mall events, product launches = ABSOLUTE MAX SCORE 2
- Shopping center celebrations, sustainability events = Score 2 (marketing fluff)
- Photo opportunities, performances, festivities = Score 2 (entertainment, NOT news)
- If it sounds like a press release or promotional content = Score 1-2

**UNIVERSITY/STUDENT ANNOUNCEMENT RULES:**
- Students selected to staff/work at events = ABSOLUTE MAX SCORE 2-3 (routine academic news, NOT breaking)
- University internship/training programs = Score 2-3 (educational news, NOT urgent)
- Students win awards/competitions = Score 3 MAX (achievement, nice but NOT breaking)
- University partnerships/MOUs = Score 2 (administrative news)
- Student volunteer programs = Score 2-3 (community news)
- EXAMPLE: "Rajabhat University students selected to staff EDC festival" = Score 2-3 (routine staffing announcement)
- These stories are nice LOCAL news but do NOT warrant social media auto-posting (score 4-5)

**FOUNDATION/COMPANY/ORGANIZATIONAL GOVERNANCE RULES:**
- Foundation board appointments, director changes = ABSOLUTE MAX SCORE 2 (routine organizational news)
- Company board news, corporate governance = Score 2 MAX (business admin, NOT breaking)
- NGO/charity leadership changes, resignations = Score 2 (administrative news, NOT breaking)
- "Legal dispute" or "legal proceedings" involving organizations/foundations = Score 2 MAX (internal organizational matters)
- Organizational restructuring, representative appointments = Score 2 (routine governance)
- Anniversary celebrations of foundations/organizations = Score 2 (ceremonial news)
- EXAMPLES of what to CAP at Score 2:
  - "Foundation appoints temporary representatives" = Score 2 (routine admin)
  - "15 directors resign from foundation board" = Score 2 (organizational change, not a crime/scandal affecting public)
  - "Organization celebrates 135th anniversary" = Score 2 (ceremonial, NOT news)
  - "Company board announces new director" = Score 2 (corporate admin)
  - "Foundation faces legal dispute over governance" = Score 2 (internal org matter)
- EXCEPTION: If foundation/org/company news involves financial fraud, embezzlement, or criminal charges = Score 4-5 (actual crime)

**LOST PET / MISSING ANIMAL RULES (CRITICAL - READ THIS):**
- Missing cats, lost dogs, escaped pets = ABSOLUTE MAX SCORE 2 (community notice-board posts, NOT news)
- "Help find my cat" or "Family seeks help locating pet" = Score 2 MAX
- These are NOT high-interest stories. They are routine community posts.
- DO NOT boost lost pet stories just because they mention cute animals or ask for "help"
- DO NOT confuse "help find my pet" with actual rescue/good samaritan stories
- EXAMPLES of what to CAP at Score 2:
  - "Family Seeks Help Locating Missing Cat" = Score 2 (lost pet notice)
  - "Missing Black Cat in Takua Pa" = Score 2 (lost pet notice)
  - "Lost Dog - Reward Offered" = Score 2 (lost pet notice)
  - "Have You Seen This Cat?" = Score 2 (lost pet notice)
- EXCEPTION: If an animal story involves RESCUE (e.g., "Cat rescued from burning building"), that's newsworthy = Score 4

LOCATION-BASED SCORING:
This is a HYPER-LOCAL PHUKET site.
- Phuket stories: Score normally (1-5)
- Nearby provinces (Phang Nga, Krabi): Score normally if relevant to Phuket
- **BOAT TOUR DESTINATIONS ARE PHUKET-RELEVANT**: Phi Phi Islands, Kai Island (\u0E40\u0E01\u0E32\u0E30\u0E44\u0E01\u0E48), Similan Islands, Racha Island (Raya), James Bond Island (Khao Phing Kan), Koh Yao, Coral Island (Koh Hei) - these are where PHUKET TOURISTS go! Boat accidents, drownings, or incidents at these locations = Score 4-5, NOT "National"
- **SPEEDBOAT/BOAT ACCIDENTS involving tourists = Score 5**: These stories are extremely relevant to Phuket readers as most tourists depart from Phuket piers
- **"Phuket authorities respond" = PHUKET-RELEVANT**: Even if the incident location is technically in Krabi province, if Phuket officials/rescue teams are involved, it's high-interest for Phuket readers
- ALL OTHER LOCATIONS (Hat Yai, Songkhla, Bangkok, etc.): Category="National", ABSOLUTE MAX SCORE=3. NO EXCEPTIONS.
- SPECIFIC BAN: HAT YAI / SOUTHERN FLOODING stories must NEVER be scored above 3. Even if it's a disaster, if it's not in Phuket, it is NOT high interest for this site.

**BOAT ACCIDENT SCORING EXAMPLES:**
- "Speedboat collision near Kai Island injures 11 tourists" = Score 5 (tourists + injuries + boat accident = HIGHLY relevant)
- "Speedboat capsizes near Phi Phi, tourists rescued" = Score 5 (tourist safety, local tour route)
- "Ferry collision at Rassada Pier" = Score 5 (major Phuket pier incident)
- "Tourist drowns during snorkeling trip to Coral Island" = Score 5 (death + tourist + popular destination)

CRITICAL RULES:
- Officials tackle/inspect/discuss = Score 2 (just talk, not action)
- Accident/crash/collision WITH INJURIES = Score 4-5 (actual event with victims)
- Infrastructure damage/complaints = Score 3 (not urgent, just problems)
- Meetings ABOUT disasters \u2260 disasters = Score 2
- Hat Yai floods, Bangkok explosions = Category="National", ABSOLUTE MAX SCORE 3 (Do not auto-post)
- Donation/charity events = ABSOLUTE MAX SCORE 3 (even if related to disasters or honoring VIPs)
- **Politics category = ABSOLUTE MAX SCORE 3 (elections, political parties, government appointments, MPs, political campaigns). While important locally, expat audience has low engagement with Thai politics.**
- **Mascots, mall events, promotional content = ABSOLUTE MAX SCORE 2 (never waste GPT-4o on these)**

${learningContext}

Always output valid JSON.`
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.3,
            // Lower temperature for more consistent, factual output
            response_format: { type: "json_object" }
          });
          const result = JSON.parse(completion.choices[0].message.content || "{}");
          const thaiPattern = /[\u0E00-\u0E7F]/;
          const translatedTitleIsThai = result.translatedTitle && thaiPattern.test(result.translatedTitle);
          const translatedContentIsThai = result.translatedContent && thaiPattern.test(result.translatedContent);
          const translationMissing = !result.translatedTitle || !result.translatedContent;
          if (translationMissing || translatedTitleIsThai || translatedContentIsThai) {
            console.warn(`   \u26A0\uFE0F  TRANSLATION ISSUE DETECTED:`);
            if (translationMissing) {
              console.warn(`      - Missing translation fields (title: ${!!result.translatedTitle}, content: ${!!result.translatedContent})`);
            }
            if (translatedTitleIsThai) {
              console.warn(`      - Title still in Thai: "${result.translatedTitle?.substring(0, 50)}..."`);
            }
            if (translatedContentIsThai) {
              console.warn(`      - Content still in Thai (first 100 chars)`);
            }
            console.warn(`      - Raw GPT response keys: ${Object.keys(result).join(", ")}`);
            console.warn(`      - isActualNews: ${result.isActualNews}, category: ${result.category}`);
            if (result.isActualNews && (translationMissing || translatedTitleIsThai)) {
              console.log(`   \u{1F504} Attempting fallback translation for missing/Thai content...`);
              try {
                const { translate: translate2 } = await import("@vitalets/google-translate-api");
                if (!result.translatedTitle || translatedTitleIsThai) {
                  const titleTranslation = await translate2(title, { to: "en" });
                  result.translatedTitle = titleTranslation.text;
                  console.log(`      \u2705 Fallback title: "${result.translatedTitle.substring(0, 60)}..."`);
                }
                if (!result.translatedContent || translatedContentIsThai) {
                  const contentTranslation = await translate2(content, { to: "en" });
                  result.translatedContent = `<p>${contentTranslation.text}</p>`;
                  console.log(`      \u2705 Fallback content applied (Google Translate)`);
                }
                if (!result.excerpt) {
                  result.excerpt = result.translatedContent.replace(/<[^>]*>/g, "").substring(0, 200);
                }
              } catch (fallbackError) {
                console.error(`      \u274C Fallback translation failed:`, fallbackError);
                result.isActualNews = false;
                console.warn(`      \u26A0\uFE0F  Marking as non-news due to translation failure`);
              }
            }
          }
          if (result.category && result.categoryReasoning) {
            console.log(`   \u{1F3F7}\uFE0F  Category: ${result.category} - ${result.categoryReasoning}`);
          }
          const validCategories = ["Weather", "Local", "Traffic", "Tourism", "Business", "Politics", "Economy", "Crime", "National"];
          const category = result.category && validCategories.includes(result.category) ? result.category : "Local";
          if (result.category && result.category !== category) {
            console.log(`   \u26A0\uFE0F  Invalid category "${result.category}" - defaulting to "Local"`);
          }
          let finalInterestScore = result.interestScore || 3;
          const combinedTextForScoring = `${title} ${content} ${result.translatedTitle || ""} ${result.translatedContent || ""}`.toLowerCase();
          const hasHotKeyword = HOT_KEYWORDS.some(
            (keyword) => combinedTextForScoring.includes(keyword.toLowerCase())
          );
          const isForeignerStory = [
            "foreigner",
            "foreign",
            "tourist",
            "farang",
            "expat",
            "\u0E15\u0E48\u0E32\u0E07\u0E0A\u0E32\u0E15\u0E34",
            "\u0E19\u0E31\u0E01\u0E17\u0E48\u0E2D\u0E07\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27"
          ].some((kw) => combinedTextForScoring.includes(kw.toLowerCase()));
          const isArrestOrAbnormal = [
            "arrest",
            "\u0E08\u0E31\u0E1A\u0E01\u0E38\u0E21",
            "prostitution",
            "\u0E04\u0E49\u0E32\u0E1B\u0E23\u0E30\u0E40\u0E27\u0E13\u0E35",
            "work permit",
            "permit",
            "\u0E41\u0E23\u0E07\u0E07\u0E32\u0E19",
            "illegal",
            "\u0E1C\u0E34\u0E14\u0E01\u0E0E\u0E2B\u0E21\u0E32\u0E22",
            "sexual",
            "indecency",
            "naked",
            "drunk",
            "\u0E40\u0E21\u0E32"
          ].some((kw) => combinedTextForScoring.includes(kw.toLowerCase()));
          if (hasHotKeyword) {
            finalInterestScore = Math.min(5, finalInterestScore + 1);
            console.log(`   \u{1F525} HOT KEYWORD BOOST: ${finalInterestScore - 1} \u2192 ${finalInterestScore}`);
          }
          const nationalityKeywords = [
            "\u0E1D\u0E23\u0E31\u0E48\u0E07",
            "\u0E0A\u0E32\u0E27\u0E23\u0E31\u0E2A\u0E40\u0E0B\u0E35\u0E22",
            "\u0E0A\u0E32\u0E27\u0E08\u0E35\u0E19",
            "\u0E0A\u0E32\u0E27\u0E2D\u0E34\u0E19\u0E40\u0E14\u0E35\u0E22",
            "\u0E0A\u0E32\u0E27\u0E2D\u0E2D\u0E2A\u0E40\u0E15\u0E23\u0E40\u0E25\u0E35\u0E22",
            "\u0E0A\u0E32\u0E27\u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29",
            "\u0E0A\u0E32\u0E27\u0E2D\u0E40\u0E21\u0E23\u0E34\u0E01\u0E31\u0E19",
            "\u0E0A\u0E32\u0E27\u0E40\u0E01\u0E32\u0E2B\u0E25\u0E35",
            "\u0E0A\u0E32\u0E27\u0E22\u0E39\u0E40\u0E04\u0E23\u0E19",
            "\u0E0A\u0E32\u0E27\u0E2D\u0E34\u0E2A\u0E23\u0E32\u0E40\u0E2D\u0E25",
            "\u0E0A\u0E32\u0E27\u0E04\u0E32\u0E0B\u0E31\u0E04\u0E2A\u0E16\u0E32\u0E19",
            "\u0E15\u0E48\u0E32\u0E07\u0E0A\u0E32\u0E15\u0E34",
            "\u0E19\u0E31\u0E01\u0E17\u0E48\u0E2D\u0E07\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27"
          ];
          const hasNationalityKeyword = nationalityKeywords.some(
            (kw) => combinedTextForScoring.includes(kw.toLowerCase())
          );
          if (hasNationalityKeyword) {
            const oldScore = finalInterestScore;
            finalInterestScore = Math.min(5, finalInterestScore + 1);
            if (oldScore !== finalInterestScore) {
              console.log(`   \u{1F30D} NATIONALITY KEYWORD BOOST: ${oldScore} \u2192 ${finalInterestScore} (foreigner/nationality detected)`);
            }
          }
          if (isForeignerStory && isArrestOrAbnormal && finalInterestScore < 4) {
            console.log(`   \u{1F30D} FOREIGNER INCIDENT MINIMUM: ${finalInterestScore} \u2192 4 (foreigner + arrest/abnormal detected)`);
            finalInterestScore = 4;
          }
          const combinedTextForFeelGood = `${title} ${content} ${result.translatedTitle || ""} ${result.translatedContent || ""}`;
          const hasFeelGoodKeyword = FEEL_GOOD_KEYWORDS.some(
            (keyword) => combinedTextForFeelGood.toLowerCase().includes(keyword.toLowerCase())
          );
          const hasPositiveForeignerKeyword = [
            "\u0E1D\u0E23\u0E31\u0E48\u0E07\u0E0A\u0E48\u0E27\u0E22",
            "\u0E19\u0E31\u0E01\u0E17\u0E48\u0E2D\u0E07\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27\u0E0A\u0E48\u0E27\u0E22",
            "\u0E15\u0E48\u0E32\u0E07\u0E0A\u0E32\u0E15\u0E34\u0E0A\u0E48\u0E27\u0E22",
            "expat hero",
            "tourist saves",
            "foreigner helps",
            "foreign volunteer",
            "tourist returned",
            "foreigner returned",
            "honest driver"
          ].some((keyword) => combinedTextForFeelGood.toLowerCase().includes(keyword.toLowerCase()));
          if (hasFeelGoodKeyword) {
            const boostAmount = hasPositiveForeignerKeyword ? 2 : 1;
            const oldScore = finalInterestScore;
            finalInterestScore = Math.min(5, finalInterestScore + boostAmount);
            console.log(`   \u{1F422} FEEL-GOOD KEYWORD BOOST: ${oldScore} \u2192 ${finalInterestScore}${hasPositiveForeignerKeyword ? " (positive foreigner bonus!)" : ""}`);
          }
          const hasColdKeyword = COLD_KEYWORDS.some(
            (keyword) => title.includes(keyword) || content.includes(keyword)
          );
          if (hasColdKeyword) {
            finalInterestScore = Math.max(1, finalInterestScore - 1);
            console.log(`   \u2744\uFE0F  COLD KEYWORD PENALTY: ${finalInterestScore + 1} \u2192 ${finalInterestScore}`);
          }
          const hasPoliticsKeyword = POLITICS_KEYWORDS.some(
            (keyword) => title.toLowerCase().includes(keyword.toLowerCase()) || content.toLowerCase().includes(keyword.toLowerCase()) || result.translatedTitle && result.translatedTitle.toLowerCase().includes(keyword.toLowerCase()) || result.translatedContent && result.translatedContent.toLowerCase().includes(keyword.toLowerCase())
          );
          if ((category === "Politics" || hasPoliticsKeyword) && finalInterestScore > 3 && !isForeignerStory) {
            const reason = category === "Politics" ? "politics category" : `politics keyword detected`;
            console.log(`   \u{1F3DB}\uFE0F  POLITICS CAP: ${finalInterestScore} \u2192 3 (${reason})`);
            finalInterestScore = 3;
          }
          const REAL_ESTATE_CAP_KEYWORDS = [
            "villa",
            "\u0E27\u0E34\u0E25\u0E25\u0E48\u0E32",
            "luxury villa",
            "luxury development",
            "property development",
            "real estate",
            "\u0E2D\u0E2A\u0E31\u0E07\u0E2B\u0E32\u0E23\u0E34\u0E21\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C",
            "hotel development",
            "resort development",
            "billion baht",
            "\u0E1E\u0E31\u0E19\u0E25\u0E49\u0E32\u0E19",
            "property launch",
            "residential development",
            "luxury market",
            "premier destination",
            "high-end villas",
            "TITLE",
            "Boat Pattana",
            "Koh Kaew"
            // Common luxury development area
          ];
          const hasRealEstateKeyword = REAL_ESTATE_CAP_KEYWORDS.some(
            (keyword) => combinedTextForScoring.includes(keyword.toLowerCase())
          );
          if ((category === "Business" || hasRealEstateKeyword) && finalInterestScore > 3 && !isArrestOrAbnormal) {
            const reason = category === "Business" ? "business category" : `real estate/development keyword detected`;
            console.log(`   \u{1F3D7}\uFE0F  BUSINESS/REAL ESTATE CAP: ${finalInterestScore} \u2192 3 (${reason})`);
            finalInterestScore = 3;
          }
          const FOUNDATION_GOVERNANCE_CAP_KEYWORDS = [
            "foundation",
            "\u0E21\u0E39\u0E25\u0E19\u0E34\u0E18\u0E34",
            // foundation
            "board of directors",
            "\u0E04\u0E13\u0E30\u0E01\u0E23\u0E23\u0E21\u0E01\u0E32\u0E23",
            "\u0E01\u0E23\u0E23\u0E21\u0E01\u0E32\u0E23",
            // board/directors
            "appoint",
            "\u0E41\u0E15\u0E48\u0E07\u0E15\u0E31\u0E49\u0E07",
            "appointment",
            // appointment
            "temporary representative",
            "\u0E15\u0E31\u0E27\u0E41\u0E17\u0E19",
            // representative
            "resignation",
            "\u0E25\u0E32\u0E2D\u0E2D\u0E01",
            // resignation
            "organizational",
            "\u0E2D\u0E07\u0E04\u0E4C\u0E01\u0E23",
            // organizational
            "governance",
            "administrative",
            // governance/admin terms
            "anniversary celebration",
            "\u0E04\u0E23\u0E1A\u0E23\u0E2D\u0E1A",
            // anniversary
            "legal dispute",
            "legal proceedings",
            // legal matters (internal org)
            "restructuring"
            // organizational restructuring
          ];
          const hasFoundationGovernanceKeyword = FOUNDATION_GOVERNANCE_CAP_KEYWORDS.some(
            (keyword) => combinedTextForScoring.includes(keyword.toLowerCase())
          );
          if (hasFoundationGovernanceKeyword && finalInterestScore > 2 && !isForeignerStory) {
            console.log(`   \u{1F3DB}\uFE0F  FOUNDATION/ORG/COMPANY BOARD CAP: ${finalInterestScore} \u2192 2 (organizational governance keyword detected)`);
            finalInterestScore = 2;
          }
          const hasLostPetKeyword = LOST_PET_CAP_KEYWORDS.some(
            (keyword) => combinedTextForScoring.includes(keyword.toLowerCase())
          );
          if (hasLostPetKeyword && finalInterestScore > 2 && !isForeignerStory) {
            console.log(`   \u{1F431} LOST PET CAP: ${finalInterestScore} \u2192 2 (missing/lost pet story detected)`);
            finalInterestScore = 2;
          }
          const hasLocalEntertainmentKeyword = LOCAL_ENTERTAINMENT_CAP_KEYWORDS.some(
            (keyword) => title.toLowerCase().includes(keyword.toLowerCase()) || content.toLowerCase().includes(keyword.toLowerCase()) || result.translatedTitle && result.translatedTitle.toLowerCase().includes(keyword.toLowerCase()) || result.translatedContent && result.translatedContent.toLowerCase().includes(keyword.toLowerCase())
          );
          const MAJOR_EVENT_EXCEPTIONS = [
            "EDC",
            "Electric Daisy",
            "Wonderfruit",
            "S2O",
            "Full Moon Party",
            "international music",
            "international festival",
            "international tour",
            "world tour",
            "Grammy",
            "sold out",
            "music festival",
            "international concert",
            "arena tour"
          ];
          const isMajorEvent = MAJOR_EVENT_EXCEPTIONS.some(
            (keyword) => combinedTextForScoring.includes(keyword.toLowerCase())
          );
          if (hasLocalEntertainmentKeyword && !isMajorEvent && finalInterestScore > 2 && !isArrestOrAbnormal) {
            console.log(`   \u{1F3B5} LOCAL ENTERTAINMENT CAP: ${finalInterestScore} \u2192 2 (small concert/local entertainment detected)`);
            finalInterestScore = 2;
          }
          const hasPageantCompetitionKeyword = PAGEANT_COMPETITION_CAP_KEYWORDS.some(
            (keyword) => combinedTextForScoring.includes(keyword.toLowerCase())
          );
          if (hasPageantCompetitionKeyword && finalInterestScore > 3 && !isArrestOrAbnormal) {
            console.log(`   \u{1F3C6} PAGEANT/COMPETITION CAP: ${finalInterestScore} \u2192 3 (beauty pageant/contest/competition detected)`);
            finalInterestScore = 3;
          }
          const canBoost = !(category === "Politics" || hasPoliticsKeyword || category === "Business" || hasRealEstateKeyword || hasFoundationGovernanceKeyword || hasLostPetKeyword || hasLocalEntertainmentKeyword || hasPageantCompetitionKeyword);
          if (assets?.isVideo && canBoost && finalInterestScore < 4) {
            console.log(`   \u{1F3A5} VIDEO BOOST: ${finalInterestScore} \u2192 4 (video stories get premium enrichment)`);
            finalInterestScore = 4;
          }
          const CORPORATE_CEREMONIAL_CAP_KEYWORDS = [
            "ceremony",
            "ceremonies",
            "anniversary",
            "anniversaries",
            "celebrates",
            "marks",
            "years of",
            "merit-making",
            "merit making",
            "alms-giving",
            "alms giving",
            "alms offering",
            "csr",
            "corporate social responsibility",
            "charity handover",
            "scholarship handover",
            "donation ceremony",
            "donation drive",
            "opening ceremony",
            "ribbon cutting",
            "ribbon-cutting",
            "groundbreaking ceremony",
            "groundbreaking",
            "gala dinner",
            "awards ceremony",
            "awards night",
            "mou signing",
            "memorandum of understanding",
            "company milestone",
            "corporate milestone",
            "inaugurated",
            "inauguration",
            "\u0E1E\u0E34\u0E18\u0E35",
            "\u0E17\u0E33\u0E1A\u0E38\u0E0D",
            "\u0E04\u0E23\u0E1A\u0E23\u0E2D\u0E1A",
            "\u0E15\u0E31\u0E01\u0E1A\u0E32\u0E15\u0E23",
            "\u0E21\u0E2D\u0E1A\u0E17\u0E38\u0E19",
            "\u0E40\u0E1B\u0E34\u0E14\u0E07\u0E32\u0E19",
            "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E31\u0E07\u0E04\u0E21",
            "\u0E1A\u0E23\u0E34\u0E08\u0E32\u0E04",
            "\u0E27\u0E32\u0E07\u0E28\u0E34\u0E25\u0E32\u0E24\u0E01\u0E29\u0E4C",
            "\u0E21\u0E2D\u0E1A\u0E23\u0E32\u0E07\u0E27\u0E31\u0E25",
            "\u0E09\u0E25\u0E2D\u0E07",
            "\u0E07\u0E32\u0E19\u0E40\u0E25\u0E35\u0E49\u0E22\u0E07",
            "\u0E40\u0E1B\u0E34\u0E14\u0E15\u0E31\u0E27"
          ];
          const hasCorporateCeremonialKeyword = CORPORATE_CEREMONIAL_CAP_KEYWORDS.some(
            (keyword) => combinedTextForScoring.includes(keyword.toLowerCase())
          );
          if (hasCorporateCeremonialKeyword && finalInterestScore > 3 && !hasHotKeyword && !hasNationalityKeyword) {
            console.log(`   \u{1F454} CORPORATE/CEREMONIAL CAP: ${finalInterestScore} \u2192 3 (corporate/ceremonial event detected)`);
            finalInterestScore = 3;
          }
          finalInterestScore = Math.max(1, Math.min(5, finalInterestScore));
          console.log(`   \u{1F4CA} Final Interest Score: ${finalInterestScore}/5`);
          let enrichedTitle = result.translatedTitle || title;
          let enrichedContent = result.translatedContent || content;
          let enrichedExcerpt = result.excerpt || "";
          if (finalInterestScore >= 4) {
            if ((!communityComments || communityComments.length === 0) && sourceUrl) {
              console.log(`   \u2B50 High interest score (${finalInterestScore}) achieved without initial hot keywords - fetching comments now...`);
              try {
                const { scrapePostComments: scrapePostComments2 } = await Promise.resolve().then(() => (init_scraper(), scraper_exports));
                const comments = await scrapePostComments2(sourceUrl, 15);
                if (comments.length > 0) {
                  communityComments = comments.filter((c) => c.text && c.text.length > 10).map((c) => c.text);
                  console.log(`   \u2705 Got ${communityComments.length} substantive comments for premium enrichment context`);
                }
              } catch (commentError) {
                console.log(`   \u26A0\uFE0F Comment fetch failed (non-critical): ${commentError}`);
              }
            }
            const enrichmentModel = "gpt-4o";
            const activeProvider = process.env.ENRICHMENT_PROVIDER || "openai";
            const activeModelLabel = activeProvider === "anthropic" ? `Anthropic ${process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5"}` : "OpenAI GPT-4o";
            console.log(`   \u2728 HIGH-PRIORITY STORY (score ${finalInterestScore}) - Applying premium enrichment via ${activeModelLabel}...`);
            try {
              const enrichmentResult = await this.enrichWithPremiumGPT4({
                title: enrichedTitle,
                content: enrichedContent,
                excerpt: enrichedExcerpt,
                category,
                communityComments
                // Pass community comments for blending into story
              }, enrichmentModel);
              enrichedTitle = enrichmentResult.enrichedTitle;
              enrichedContent = enrichmentResult.enrichedContent;
              enrichedExcerpt = enrichmentResult.enrichedExcerpt;
              console.log(`   \u2705 GPT-4 enrichment complete - story enhanced with deep journalism`);
            } catch (enrichmentError) {
              console.warn(`   \u26A0\uFE0F  GPT-4 enrichment failed, using GPT-4o-mini version:`, enrichmentError);
            }
          }
          enrichedContent = ensureProperParagraphFormatting(enrichedContent);
          let facebookHeadline = result.facebookHeadline || enrichedTitle;
          if (finalInterestScore >= 4 && result.isActualNews) {
            console.log(`   \u{1F4F1} HIGH-INTEREST STORY - Generating Curiosity Gap headline...`);
            try {
              const { generateQuickFacebookHeadline: generateQuickFacebookHeadline2 } = await Promise.resolve().then(() => (init_facebook_headline_generator(), facebook_headline_generator_exports));
              const hasVideo = assets?.hasVideo ?? assets?.isVideo ?? (content.toLowerCase().includes("\u0E27\u0E34\u0E14\u0E35\u0E42\u0E2D") || content.toLowerCase().includes("video") || content.toLowerCase().includes("\u0E04\u0E25\u0E34\u0E1B"));
              const hasMultipleImages = assets?.hasMultipleImages ?? (content.includes("\u0E20\u0E32\u0E1E") || content.includes("\u0E23\u0E39\u0E1B"));
              if (assets) {
                console.log(`   \u{1F4E6} Assets from scraper: video=${!!assets.hasVideo || !!assets.isVideo}, images=${!!assets.hasMultipleImages}`);
              } else {
                console.log(`   \u26A0\uFE0F  No asset metadata provided - falling back to content-based detection`);
              }
              facebookHeadline = await generateQuickFacebookHeadline2(
                enrichedTitle,
                enrichedContent,
                enrichedExcerpt,
                category,
                finalInterestScore,
                hasVideo,
                hasMultipleImages
              );
              console.log(`   \u2705 Curiosity Gap headline: "${facebookHeadline}"`);
            } catch (headlineError) {
              console.warn(`   \u26A0\uFE0F  Curiosity Gap headline generation failed, using fallback:`, headlineError);
              facebookHeadline = result.facebookHeadline || enrichedTitle;
            }
          }
          const embedding = precomputedEmbedding;
          return {
            translatedTitle: enforceSoiNamingConvention(enrichedTitle),
            translatedContent: enforceSoiNamingConvention(enrichedContent),
            excerpt: enforceSoiNamingConvention(enrichedExcerpt),
            category,
            // Use validated category (defaults to "Local" if invalid)
            isActualNews: result.isActualNews || false,
            interestScore: finalInterestScore,
            isDeveloping: result.isDeveloping || false,
            needsReview: result.needsReview || false,
            reviewReason: result.reviewReason,
            isPolitics: category === "Politics" || hasPoliticsKeyword,
            // Block auto-boosting for categories editorial team finds "boring" even as videos
            autoBoostScore: !(category === "Politics" || hasPoliticsKeyword || category === "Business" || hasRealEstateKeyword || hasFoundationGovernanceKeyword),
            embedding,
            facebookHeadline: enforceSoiNamingConvention(facebookHeadline)
          };
        } catch (error) {
          console.error("Error translating content:", error);
          throw new Error("Failed to translate content");
        }
      }
      async detectLanguage(text2) {
        const thaiPattern = /[\u0E00-\u0E7F]/;
        return thaiPattern.test(text2) ? "th" : "en";
      }
      async generateEmbedding(text2) {
        try {
          const response = await openai2.embeddings.create({
            model: "text-embedding-3-small",
            input: text2
          });
          return response.data[0].embedding;
        } catch (error) {
          console.error("Error generating embedding:", error);
          throw new Error("Failed to generate embedding");
        }
      }
      async generateEmbeddingFromTitle(title) {
        return this.generateEmbedding(title);
      }
      async generateEmbeddingFromContent(title, content) {
        const truncatedContent = content.substring(0, 8e3);
        const combinedText = `${title}

${truncatedContent}`;
        return this.generateEmbedding(combinedText);
      }
      /**
       * Re-enrich an existing article with new factual details from English-language sources
       */
      async reEnrichWithSources(existingTitle, existingContent, existingExcerpt, category, publishedAt, additionalSources, model = "claude-sonnet-4-5") {
        if (additionalSources.length === 0) {
          return {
            enrichedTitle: existingTitle,
            enrichedContent: existingContent,
            enrichedExcerpt: existingExcerpt,
            hasNewInformation: false,
            newFactsSummary: "No additional sources provided."
          };
        }
        const systemPrompt = `You are updating an existing Phuket Radar article with new information from additional reporting by other outlets. You are a veteran correspondent who has lived in Phuket for over a decade, writing for an audience of long-term expats and residents.

Your job is to MERGE new factual details into the existing article while:
1. Preserving the original article's voice, structure, and format
2. Adding ONLY confirmed new facts \u2014 not rewriting what already exists
3. Never copying phrasing from the source articles \u2014 extract facts, rewrite in your own words
4. Maintaining all existing sections (Dateline, Lede, Details, Background, On the Ground)

You produce JSON output only.`;
        const currentDate = (/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
        const updateTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
        let userPrompt = `\u{1F4C5} CURRENT DATE: ${currentDate} (Thailand Time)
ARTICLE CATEGORY: ${category}

---

YOUR EXISTING PUBLISHED ARTICLE:

Title: ${existingTitle}

Content:
${existingContent}

Published at: ${publishedAt.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })}

---

ADDITIONAL REPORTING FROM OTHER OUTLETS:

${additionalSources.map((source) => `SOURCE: ${source.name}
PUBLISHED: ${source.publishedDate}
CONTENT:
${source.extractedText}
`).join("\n---\n")}

---

RE-ENRICHMENT INSTRUCTIONS:

Compare the additional reporting against your existing article. Look for:

1. **New confirmed facts** not in your original:
   - Names of people involved (victims, suspects, officials)
   - Specific injuries or damage details
   - Official statements from police or authorities
   - Timeline details (exact times, sequence of events)
   - Arrest details, charges filed
   - Hospital information (where victims were taken)
   - Vehicle details (make, registration, color)
   - Number of people involved
   - Cause determined by officials

2. **Corrections** to your original:
   - If additional sources contradict your original reporting on a factual point, update to the authoritative version
   - If location details are more specific in additional sources, update

3. **Follow-up developments**:
   - Arrests made after the initial incident
   - Suspect identified or turned themselves in
   - Road reopened / situation resolved
   - Official investigation status

DO NOT:
- Copy or closely paraphrase any sentences from the source articles
- Add speculative information or editorial commentary from other outlets
- Remove or weaken any facts from your original article
- Change the tone or voice of the article
- Add generic context or filler \u2014 only add genuinely new information
- Attribute information to the other outlets by name (don't write "According to The Thaiger..." \u2014 instead use "Police confirmed..." or "Authorities later reported..." or simply state the fact)
- \u{1F6A8} PATONG/BANGLA ROAD HALLUCINATION WARNING: If the source says "Patong", do NOT assume it happened on "Bangla Road". Patong has many other piers, docks, shops, and beaches. Only name Bangla Road if the source EXPLICITLY mentions it.

STRUCTURE OF YOUR UPDATE:
- STRIP OUT any existing Developing Story indicator (<p class="developing-story">...</p>) if it exists in the original content. Do not include it in the updated article.
- Keep the existing Dateline
- Update the Lede if significant new facts change the summary
- Add new details in the Details section (integrate naturally, don't just append at the end)
- Update the Background section if new context is available
- Update the On the Ground section if there are practical developments (road reopened, suspect caught, etc.)
- Add an "Updated" note: include exactly <p class="updated-note"><em>Updated at ${updateTime} with additional details from official sources.</em></p> as the very first element right after the dateline

MINIMUM CHANGE THRESHOLD:
If the additional sources contain NO new factual information beyond what your article already covers, set "hasNewInformation" to false.

OUTPUT FORMAT \u2014 Return ONLY valid JSON, no markdown fences:

{
  "enrichedTitle": "Updated headline if significant new facts warrant it, otherwise the existing headline unchanged",
  "enrichedContent": "Full updated HTML article with new facts integrated and 'Updated at' note",
  "enrichedExcerpt": "Updated 2-3 sentence summary if new facts change the story significantly, otherwise existing excerpt",
  "hasNewInformation": true/false,
  "newFactsSummary": "Brief 1-2 sentence description of what new facts were added, for your internal logging"
}`;
        const enrichmentProvider = process.env.ENRICHMENT_PROVIDER || "openai";
        try {
          let responseText = "";
          if (enrichmentProvider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
            const activeModel = process.env.ANTHROPIC_MODEL || model;
            console.log(`\u{1F504} Calling Claude (${activeModel}) for re-enrichment with ${additionalSources.length} sources...`);
            const response = await anthropic.messages.create({
              model: activeModel,
              max_tokens: 2500,
              temperature: 0.2,
              system: systemPrompt,
              messages: [{ role: "user", content: userPrompt }]
            });
            responseText = response.content[0].type === "text" ? response.content[0].text : "";
          } else {
            const openaiModel = "gpt-4o";
            console.log(`\u{1F504} Calling OpenAI (${openaiModel}) for re-enrichment with ${additionalSources.length} sources...`);
            const response = await openai2.chat.completions.create({
              model: openaiModel,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ],
              temperature: 0.2,
              response_format: { type: "json_object" }
            });
            responseText = response.choices[0].message.content || "";
          }
          try {
            let jsonStr = responseText.trim();
            if (jsonStr.startsWith("```json")) jsonStr = jsonStr.substring(7);
            if (jsonStr.startsWith("```")) jsonStr = jsonStr.substring(3);
            if (jsonStr.endsWith("```")) jsonStr = jsonStr.substring(0, jsonStr.length - 3);
            jsonStr = jsonStr.trim();
            const result = JSON.parse(jsonStr);
            if (result.hasNewInformation && result.enrichedContent) {
              result.enrichedContent = ensureProperParagraphFormatting(result.enrichedContent);
            }
            return result;
          } catch (parseError) {
            console.error("\u274C Failed to parse JSON from AI re-enrichment:\n", responseText);
            return {
              enrichedTitle: existingTitle,
              enrichedContent: existingContent,
              enrichedExcerpt: existingExcerpt,
              hasNewInformation: false,
              newFactsSummary: "Failed to parse AI response"
            };
          }
        } catch (error) {
          console.error("\u274C Error communicating with AI provider for re-enrichment:", error);
          throw error;
        }
      }
    };
    translatorService = new TranslatorService();
  }
});

// server/services/switchy.ts
var switchy_exports = {};
__export(switchy_exports, {
  switchyService: () => switchyService
});
var SwitchyService, switchyService;
var init_switchy = __esm({
  "server/services/switchy.ts"() {
    "use strict";
    SwitchyService = class {
      apiKey;
      domain;
      baseUrl = "https://api.switchy.io/v1";
      constructor() {
        const apiKey = process.env.SWITCHY_API_KEY;
        const domain = process.env.SWITCHY_DOMAIN || "go.phuketradar.com";
        if (!apiKey) {
          console.warn("[SWITCHY] SWITCHY_API_KEY not set. URL shortening will be disabled.");
        }
        this.apiKey = apiKey || "";
        this.domain = domain;
      }
      /**
       * Build a URL with UTM parameters
       */
      buildUrlWithUtm(baseUrl, options) {
        const url = new URL(baseUrl);
        if (options.utmSource) {
          url.searchParams.set("utm_source", options.utmSource);
        }
        if (options.utmMedium) {
          url.searchParams.set("utm_medium", options.utmMedium);
        }
        if (options.utmCampaign) {
          url.searchParams.set("utm_campaign", options.utmCampaign);
        }
        return url.toString();
      }
      /**
       * Extract or construct a short URL from the Switchy API response
       */
      extractShortUrl(data, originalUrl) {
        const linkData = data.link || data;
        if (linkData.shortUrl && linkData.shortUrl !== originalUrl) {
          return linkData.shortUrl;
        }
        if (linkData.domain && linkData.id) {
          return `https://${linkData.domain}/${linkData.id}`;
        }
        return null;
      }
      /**
       * Create a shortened URL with optional UTM parameters and OG overrides
       */
      async createShortLink(originalUrl, options = {}) {
        if (!this.apiKey) {
          return {
            success: false,
            error: "SWITCHY_API_KEY not configured"
          };
        }
        try {
          const urlWithUtm = this.buildUrlWithUtm(originalUrl, options);
          console.log("[SWITCHY] Creating short link for:", urlWithUtm);
          const payload = {
            link: {
              url: urlWithUtm,
              domain: this.domain,
              // Attach the Facebook Pixel automatically
              pixels: [
                { platform: "facebook", value: "831369166474772" }
              ]
            }
          };
          if (options.title) {
            payload.link.title = options.title;
          }
          if (options.description) {
            payload.link.description = options.description;
          }
          if (options.imageUrl) {
            payload.link.image = options.imageUrl;
          }
          if (options.slug) {
            payload.link.slug = options.slug;
          }
          const response = await fetch(`${this.baseUrl}/links/create`, {
            method: "POST",
            headers: {
              "Api-Authorization": this.apiKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            const errorText = await response.text();
            return {
              success: false,
              error: `API error: ${response.status} - ${errorText}`
            };
          }
          let data = await response.json();
          let shortUrl = this.extractShortUrl(data, urlWithUtm);
          if (!shortUrl || shortUrl === urlWithUtm) {
            console.warn("[SWITCHY] First attempt failed. Trying fallback domain switchy.io...");
            if (this.domain !== "switchy.io") {
              const fallbackPayload = {
                link: {
                  ...payload.link,
                  domain: "switchy.io"
                }
              };
              const fbRes = await fetch(`${this.baseUrl}/links/create`, {
                method: "POST",
                headers: { "Api-Authorization": this.apiKey, "Content-Type": "application/json" },
                body: JSON.stringify(fallbackPayload)
              });
              if (fbRes.ok) {
                const fbData = await fbRes.json();
                const fbShortUrl = this.extractShortUrl(fbData, urlWithUtm);
                if (fbShortUrl && fbShortUrl !== urlWithUtm) {
                  data = fbData;
                  shortUrl = fbShortUrl;
                }
              }
            }
          }
          if (!shortUrl || shortUrl === urlWithUtm) {
            return {
              success: false,
              error: "API returned long URL instead of short URL."
            };
          }
          return {
            success: true,
            link: {
              id: data.id || data.link && data.link.id,
              shortUrl,
              originalUrl: urlWithUtm,
              title: options.title,
              createdAt: data.createdAt || (/* @__PURE__ */ new Date()).toISOString()
            }
          };
        } catch (error) {
          console.error("[SWITCHY] Error creating short link:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          };
        }
      }
      /**
       * Create a short link for an article with default UTM parameters for a specific platform
       */
      async createArticleLink(articleUrl, platform, articleTitle, articleImage) {
        const utmMap = {
          instagram: { source: "instagram", medium: "social", campaign: "organic_post" },
          facebook: { source: "facebook", medium: "social", campaign: "organic_post" },
          threads: { source: "threads", medium: "social", campaign: "organic_post" },
          newsletter: { source: "newsletter", medium: "email", campaign: "daily_digest" },
          bio: { source: "instagram", medium: "social", campaign: "bio_link" }
        };
        const utm = utmMap[platform] || utmMap.instagram;
        return this.createShortLink(articleUrl, {
          title: articleTitle,
          imageUrl: articleImage,
          utmSource: utm.source,
          utmMedium: utm.medium,
          utmCampaign: utm.campaign
        });
      }
      /**
       * Check if Switchy is configured and available
       */
      isConfigured() {
        return !!this.apiKey;
      }
    };
    switchyService = new SwitchyService();
  }
});

// server/lib/facebook-service.ts
function generateHashtags(category) {
  const baseHashtag = "#Phuket";
  const categoryHashtags = {
    "Breaking": ["#PhuketNews", "#ThailandNews", "#BreakingNews"],
    "Tourism": ["#PhuketTourism", "#ThailandTravel", "#VisitPhuket"],
    "Business": ["#PhuketBusiness", "#ThailandBusiness", "#PhuketEconomy"],
    "Events": ["#PhuketEvents", "#ThingsToDoInPhuket", "#PhuketLife"],
    "Other": ["#PhuketNews", "#Thailand", "#PhuketLife"]
  };
  const categoryTags = categoryHashtags[category] || categoryHashtags["Other"];
  return `${baseHashtag} ${categoryTags.join(" ")}`;
}
function getArticleUrl(article) {
  const baseUrl = false ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://phuketradar.com";
  const articlePath = buildArticleUrl({ category: article.category, slug: article.slug, id: article.id });
  return `${baseUrl}${articlePath}`;
}
async function postArticleToFacebook(article, storage2) {
  if (false) {
    console.log(`\u{1F6AB} [FB-POST] Facebook posting DISABLED in development environment`);
    console.log(`\u{1F4D8} [FB-POST] Article: ${article.title?.substring(0, 60) ?? "Untitled"}... (would post in production)`);
    return null;
  }
  console.log(`\u{1F4D8} [FB-POST] Starting Facebook post attempt for article: ${article.title?.substring(0, 60) ?? "Untitled"}...`);
  console.log(`\u{1F4D8} [FB-POST] Article ID: ${article.id}`);
  if (!article.title) {
    console.error(`\u274C [FB-POST] Article ${article.id} has no title, cannot post to Facebook`);
    return null;
  }
  if (!article.excerpt) {
    console.error(`\u274C [FB-POST] Article ${article.id} has no excerpt, cannot post to Facebook`);
    return null;
  }
  if (!article.category) {
    console.error(`\u274C [FB-POST] Article ${article.id} has no category, cannot post to Facebook`);
    return null;
  }
  if (!FB_PAGE_ACCESS_TOKEN) {
    console.error("\u274C [FB-POST] FB_PAGE_ACCESS_TOKEN not configured");
    return null;
  }
  const primaryImageUrl = article.imageUrl || article.imageUrls && article.imageUrls[0] || article.videoThumbnail;
  if (!primaryImageUrl) {
    console.error(`\u274C [FB-POST] Article ${article.id} has no image or video thumbnail, skipping Facebook post`);
    return null;
  }
  console.log(`\u{1F4D8} [FB-POST] Using image: ${primaryImageUrl}`);
  const lockToken = `${article.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  console.log(`\u{1F512} [FB-POST] Attempting to claim article for posting (lockToken: ${lockToken.substring(0, 40)}...)...`);
  const claimed = await storage2.claimArticleForFacebookPosting(article.id, lockToken);
  if (!claimed) {
    console.log(`\u23ED\uFE0F  [FB-POST] Could not claim article - already posted or being posted by another process`);
    const freshArticle = await storage2.getArticleById(article.id);
    if (freshArticle?.facebookPostId && !freshArticle.facebookPostId.startsWith("LOCK:")) {
      console.log(`\u2705 [FB-POST] Article already posted (status: already-posted)`);
      console.log(`\u{1F4D8} [FB-POST] Post ID: ${freshArticle.facebookPostId}`);
      return {
        status: "already-posted",
        postId: freshArticle.facebookPostId,
        postUrl: freshArticle.facebookPostUrl || `https://www.facebook.com/${freshArticle.facebookPostId.replace("_", "/posts/")}`
      };
    }
    console.log(`\u26A0\uFE0F  [FB-POST] Article is locked by another process - skipping`);
    return null;
  }
  console.log(`\u2705 [FB-POST] Successfully claimed article - proceeding with Facebook API call...`);
  try {
    const hashtags = generateHashtags(article.category);
    const articleUrl = getArticleUrl(article);
    let headline = article.facebookHeadline;
    if (!headline) {
      console.log(`\u{1F4F1} [FB-POST] No Facebook headline set - generating curiosity-gap teaser...`);
      try {
        const { generateQuickFacebookHeadline: generateQuickFacebookHeadline2 } = await Promise.resolve().then(() => (init_facebook_headline_generator(), facebook_headline_generator_exports));
        headline = await generateQuickFacebookHeadline2(
          article.title,
          article.content || "",
          article.excerpt || "",
          article.category,
          article.interestScore || 3,
          !!article.videoUrl,
          (article.imageUrls?.length || 0) > 1
        );
        console.log(`\u2705 [FB-POST] Generated headline: "${headline}"`);
        await storage2.updateArticle(article.id, { facebookHeadline: headline });
      } catch (genError) {
        console.warn(`\u26A0\uFE0F [FB-POST] Failed to generate headline, using title:`, genError);
        headline = article.title;
      }
    }
    const hasVideo = !!(article.videoUrl || article.facebookEmbedUrl);
    const ctaText = hasVideo ? "\u{1F447} Tap the link in the first comment for the video and full story" : "\u{1F447} Tap the link in the first comment for the full story";
    const postMessage = `${headline}

${ctaText}

${hashtags}`;
    console.log(`\u{1F4D8} [FB-POST] Posting to Facebook API...`);
    console.log(`\u{1F4D8} [FB-POST] Page ID: ${FB_PAGE_ID}`);
    console.log(`\u{1F4D8} [FB-POST] Token length: ${FB_PAGE_ACCESS_TOKEN.length} characters`);
    let postId;
    const imageUrls = article.imageUrls && article.imageUrls.length > 0 ? article.imageUrls : article.imageUrl ? [article.imageUrl] : [];
    if (imageUrls.length > 1) {
      console.log(`\u{1F4D8} [FB-POST] Creating multi-image grid post with ${imageUrls.length} images...`);
      const photoIds = [];
      const successfulImageUrls = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        console.log(`\u{1F4D8} [FB-POST] Uploading image ${i + 1}/${imageUrls.length}: ${imageUrl}`);
        const uploadResponse = await fetch(
          `https://graph.facebook.com/v18.0/${FB_PAGE_ID}/photos?access_token=${FB_PAGE_ACCESS_TOKEN}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              url: imageUrl,
              published: false
            })
          }
        );
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({ error: { message: "Unknown error" } }));
          console.error(`\u274C [FB-POST] Failed to upload image ${i + 1}:`, JSON.stringify(errorData, null, 2));
          continue;
        }
        const uploadData = await uploadResponse.json();
        photoIds.push(uploadData.id);
        successfulImageUrls.push(imageUrl);
        console.log(`\u2705 [FB-POST] Uploaded image ${i + 1}, photo ID: ${uploadData.id}`);
      }
      const fallbackImageUrl = successfulImageUrls.length > 0 ? successfulImageUrls[0] : primaryImageUrl;
      if (photoIds.length === 0) {
        console.warn("\u26A0\uFE0F  [FB-POST] Multi-image upload failed completely, falling back to single-image post");
      } else if (photoIds.length === 1) {
        console.warn("\u26A0\uFE0F  [FB-POST] Only 1 image uploaded successfully, falling back to single-image post");
      }
      if (photoIds.length <= 1) {
        console.log(`\u{1F4D8} [FB-POST] Falling back to single-image post: ${fallbackImageUrl}`);
        const photoResponse = await fetch(`https://graph.facebook.com/v18.0/${FB_PAGE_ID}/photos?access_token=${FB_PAGE_ACCESS_TOKEN}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            url: fallbackImageUrl,
            message: postMessage
          })
        });
        if (!photoResponse.ok) {
          const errorData = await photoResponse.json().catch(() => ({ error: { message: "Unknown error" } }));
          console.error("\u274C [FB-POST] Fallback single-image post also failed:");
          console.error(`\u274C [FB-POST] Status: ${photoResponse.status}`);
          console.error(`\u274C [FB-POST] Response:`, JSON.stringify(errorData, null, 2));
          await storage2.releaseFacebookPostLock(article.id, lockToken);
          return null;
        }
        const photoData = await photoResponse.json();
        postId = photoData.post_id || photoData.id;
        console.log(`\u2705 [FB-POST] Fallback single-image post succeeded, ID: ${postId}`);
      } else {
        console.log(`\u2705 [FB-POST] Successfully uploaded ${photoIds.length} photos, creating grid post...`);
        const feedParams = new URLSearchParams({
          message: postMessage
        });
        photoIds.forEach((photoId, index2) => {
          feedParams.append(`attached_media[${index2}]`, JSON.stringify({ media_fbid: photoId }));
        });
        const feedResponse = await fetch(`https://graph.facebook.com/v18.0/${FB_PAGE_ID}/feed?access_token=${FB_PAGE_ACCESS_TOKEN}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: feedParams.toString()
        });
        if (!feedResponse.ok) {
          const errorData = await feedResponse.json().catch(() => ({ error: { message: "Unknown error" } }));
          console.error("\u274C [FB-POST] Multi-image feed post failed, falling back to single-image:");
          console.error(`\u274C [FB-POST] Status: ${feedResponse.status}`);
          console.error(`\u274C [FB-POST] Response:`, JSON.stringify(errorData, null, 2));
          console.log(`\u{1F4D8} [FB-POST] Attempting fallback to single-image post with: ${fallbackImageUrl}`);
          const photoResponse = await fetch(`https://graph.facebook.com/v18.0/${FB_PAGE_ID}/photos?access_token=${FB_PAGE_ACCESS_TOKEN}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              url: fallbackImageUrl,
              message: postMessage
            })
          });
          if (!photoResponse.ok) {
            const fallbackErrorData = await photoResponse.json().catch(() => ({ error: { message: "Unknown error" } }));
            console.error("\u274C [FB-POST] Fallback single-image post also failed:");
            console.error(`\u274C [FB-POST] Status: ${photoResponse.status}`);
            console.error(`\u274C [FB-POST] Response:`, JSON.stringify(fallbackErrorData, null, 2));
            await storage2.releaseFacebookPostLock(article.id, lockToken);
            return null;
          }
          const photoData = await photoResponse.json();
          postId = photoData.post_id || photoData.id;
          console.log(`\u2705 [FB-POST] Fallback single-image post succeeded, ID: ${postId}`);
        } else {
          const feedData = await feedResponse.json();
          postId = feedData.id;
          console.log(`\u2705 [FB-POST] Created multi-image grid post, ID: ${postId}`);
        }
      }
    } else {
      console.log(`\u{1F4D8} [FB-POST] Creating single-image post: ${primaryImageUrl}`);
      const photoResponse = await fetch(`https://graph.facebook.com/v18.0/${FB_PAGE_ID}/photos?access_token=${FB_PAGE_ACCESS_TOKEN}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: primaryImageUrl,
          message: postMessage
        })
      });
      if (!photoResponse.ok) {
        const errorData = await photoResponse.json().catch(() => ({ error: { message: "Unknown error" } }));
        console.error("\u274C [FB-POST] Facebook photo post failed:");
        console.error(`\u274C [FB-POST] Status: ${photoResponse.status}`);
        console.error(`\u274C [FB-POST] Response:`, JSON.stringify(errorData, null, 2));
        await storage2.releaseFacebookPostLock(article.id, lockToken);
        return null;
      }
      const photoData = await photoResponse.json();
      postId = photoData.post_id || photoData.id;
      console.log(`\u2705 [FB-POST] Created single-image photo post, ID: ${postId}`);
    }
    console.log(`\u2705 [FB-POST] Posted to Facebook successfully!`);
    console.log(`\u2705 [FB-POST] Post ID: ${postId}`);
    let commentUrl = articleUrl;
    try {
      console.log(`\u{1F50D} [FB-POST] Checking for Switchy short URL for article ${article.id}`);
      if (article.switchyShortUrl) {
        commentUrl = article.switchyShortUrl;
        console.log(`\u{1F4D8} [FB-POST] Using existing Switchy short URL: ${commentUrl}`);
      } else {
        console.log(`\u{1F680} [FB-POST] No existing Switchy URL, attempting to generate one...`);
        const { switchyService: switchyService2 } = await Promise.resolve().then(() => (init_switchy(), switchy_exports));
        const isConfigured = switchyService2.isConfigured();
        console.log(`\u2699\uFE0F  [FB-POST] Switchy configured: ${isConfigured}`);
        if (isConfigured) {
          const shortLinkResult = await switchyService2.createArticleLink(
            articleUrl,
            "facebook",
            article.facebookHeadline || article.title,
            article.imageUrl || void 0
          );
          console.log(`\u{1F4E1} [FB-POST] Switchy result:`, JSON.stringify(shortLinkResult));
          if (shortLinkResult.success && shortLinkResult.link?.shortUrl) {
            commentUrl = shortLinkResult.link.shortUrl;
            await storage2.updateArticle(article.id, { switchyShortUrl: commentUrl });
            console.log(`\u{1F517} [FB-POST] Generated and saved Switchy short URL: ${commentUrl}`);
          } else {
            console.warn(`\u26A0\uFE0F  [FB-POST] Switchy generation unsuccessful: ${shortLinkResult.error || "Unknown error"}`);
          }
        } else {
          console.warn(`\u26A0\uFE0F  [FB-POST] Switchy not configured (missing API key), skipping generation`);
        }
      }
    } catch (switchyError) {
      console.warn(`\u274C [FB-POST] Switchy short link exception, using direct URL:`, switchyError);
    }
    console.log(`\u{1F4DD} [FB-POST] Comment will include URL: ${commentUrl}`);
    const commentResponse = await fetch(`https://graph.facebook.com/v18.0/${postId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Read the full story: ${commentUrl}`,
        access_token: FB_PAGE_ACCESS_TOKEN
      })
    });
    if (commentResponse.ok) {
      const commentData = await commentResponse.json();
      console.log(`\u2705 [FB-POST] Added comment to post: ${commentData.id}`);
      const pinResponse = await fetch(`https://graph.facebook.com/v18.0/${commentData.id}?is_pinned=true&access_token=${FB_PAGE_ACCESS_TOKEN}`, {
        method: "POST"
      });
      if (pinResponse.ok) {
        const pinData = await pinResponse.json();
        console.log(`\u{1F4CC} [FB-POST] Pinned comment successfully:`, pinData);
      } else {
        const pinError = await pinResponse.text();
        console.warn(`\u26A0\uFE0F  [FB-POST] Failed to pin comment (status ${pinResponse.status}): ${pinError}`);
      }
    } else {
      const commentError = await commentResponse.text();
      console.warn(`\u26A0\uFE0F  [FB-POST] Failed to add comment to Facebook post (status ${commentResponse.status}): ${commentError}`);
    }
    const postUrl = `https://www.facebook.com/${postId.replace("_", "/posts/")}`;
    console.log(`\u2705 [FB-POST] Facebook API call successful!`);
    console.log(`\u{1F4D8} [FB-POST] Post ID: ${postId}`);
    console.log(`\u{1F4D8} [FB-POST] Post URL: ${postUrl}`);
    console.log(`\u{1F4BE} [FB-POST] Finalizing database with real post ID...`);
    const finalized = await storage2.finalizeArticleFacebookPost(article.id, lockToken, postId, postUrl);
    if (finalized) {
      console.log(`\u2705 [FB-POST] Successfully finalized post in database (status: posted)`);
      console.log(`\u2705 [FB-POST] Completed Facebook posting for article ${article.id}`);
      return {
        status: "posted",
        postId,
        postUrl
      };
    } else {
      console.error(`\u26A0\uFE0F  [FB-POST] Failed to finalize - lock was lost or stolen`);
      console.error(`\u26A0\uFE0F  [FB-POST] This indicates a critical error in the locking mechanism`);
      await storage2.releaseFacebookPostLock(article.id, lockToken);
      console.warn(`\u26A0\uFE0F  [FB-POST] Orphaned Facebook post created: ${postId}`);
      return null;
    }
  } catch (error) {
    console.error("\u274C [FB-POST] Error during Facebook posting:", error);
    console.log(`\u{1F513} [FB-POST] Releasing lock due to error...`);
    await storage2.releaseFacebookPostLock(article.id, lockToken);
    return null;
  }
}
var FB_PAGE_ACCESS_TOKEN, FB_PAGE_ID;
var init_facebook_service = __esm({
  "server/lib/facebook-service.ts"() {
    "use strict";
    init_category_map();
    FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
    FB_PAGE_ID = "786684811203574";
  }
});

// shared/core-tags.ts
function tagToSlug(tag) {
  return tag.toLowerCase().replace(/\s+/g, "-");
}
function getTagUrl(tag) {
  return `/tag/${tagToSlug(tag)}`;
}
var TAG_DEFINITIONS, ALL_TAGS;
var init_core_tags = __esm({
  "shared/core-tags.ts"() {
    "use strict";
    TAG_DEFINITIONS = [
      // 1. Geography & Locations
      // 1.1 Province-level / General
      { name: "Phuket", keywords: ["phuket"], type: "location", priority: 1 },
      { name: "Phuket Town", keywords: ["phuket town", "old town", "phuket old town"], type: "location", priority: 2 },
      { name: "Greater Phuket", keywords: ["greater phuket"], type: "location" },
      { name: "Andaman Coast", keywords: ["andaman coast", "andaman sea"], type: "location" },
      { name: "Southern Thailand", keywords: ["southern thailand"], type: "location" },
      // 1.2 Districts (Amphoe)
      { name: "Mueang Phuket", keywords: ["mueang phuket", "mueang district"], type: "location" },
      { name: "Kathu", keywords: ["kathu"], type: "location" },
      { name: "Thalang", keywords: ["thalang"], type: "location" },
      // 1.3 Subdistricts / Key Areas
      { name: "Patong", keywords: ["patong"], type: "location", priority: 2 },
      { name: "Karon", keywords: ["karon"], type: "location", priority: 2 },
      { name: "Kata", keywords: ["kata"], type: "location", priority: 2 },
      { name: "Kata Noi", keywords: ["kata noi"], type: "location", priority: 2 },
      { name: "Kamala", keywords: ["kamala"], type: "location", priority: 2 },
      { name: "Surin", keywords: ["surin"], type: "location", priority: 2 },
      { name: "Bang Tao", keywords: ["bang tao", "bangtao"], type: "location", priority: 2 },
      { name: "Cherng Talay", keywords: ["cherng talay", "cherngtalay", "choeng thale"], type: "location", priority: 2 },
      { name: "Laguna", keywords: ["laguna"], type: "location", priority: 2 },
      { name: "Nai Thon", keywords: ["nai thon", "naithon"], type: "location", priority: 2 },
      { name: "Nai Yang", keywords: ["nai yang", "naiyang"], type: "location", priority: 2 },
      { name: "Mai Khao", keywords: ["mai khao", "maikhao"], type: "location", priority: 2 },
      { name: "Rawai", keywords: ["rawai"], type: "location", priority: 2 },
      { name: "Nai Harn", keywords: ["nai harn", "naiharn"], type: "location", priority: 2 },
      { name: "Chalong", keywords: ["chalong"], type: "location", priority: 2 },
      { name: "Wichit", keywords: ["wichit"], type: "location" },
      { name: "Koh Kaew", keywords: ["koh kaew"], type: "location" },
      { name: "Koh Siray", keywords: ["koh siray", "sirey"], type: "location" },
      { name: "Pa Khlok", keywords: ["pa khlok", "pakhlok"], type: "location" },
      { name: "Thepkrasattri", keywords: ["thepkrasattri"], type: "location" },
      { name: "Srisoonthorn", keywords: ["srisoonthorn"], type: "location" },
      { name: "Sakhu", keywords: ["sakhu"], type: "location" },
      { name: "Bang Jo", keywords: ["bang jo", "bangjo"], type: "location", priority: 3 },
      // User requested high priority
      { name: "Rassada", keywords: ["rassada"], type: "location" },
      // 1.4 Roads & Transport Nodes
      { name: "Thepkrasattri Road", keywords: ["thepkrasattri road"], type: "location" },
      { name: "Chao Fah West Road", keywords: ["chao fah west"], type: "location" },
      { name: "Chao Fah East Road", keywords: ["chao fah east"], type: "location" },
      { name: "Bypass Road", keywords: ["bypass road"], type: "location" },
      { name: "Patong Hill", keywords: ["patong hill"], type: "location" },
      { name: "Kata Hill", keywords: ["kata hill"], type: "location" },
      { name: "Karon Hill", keywords: ["karon hill"], type: "location" },
      { name: "Airport Road", keywords: ["airport road"], type: "location" },
      { name: "Heroines Monument", keywords: ["heroines monument"], type: "location" },
      { name: "Sarasin Bridge", keywords: ["sarasin bridge"], type: "location" },
      { name: "Phuket International Airport", keywords: ["phuket international airport", "hkt", "airport"], type: "location", priority: 2 },
      { name: "Rassada Pier", keywords: ["rassada pier"], type: "location" },
      { name: "Chalong Pier", keywords: ["chalong pier"], type: "location" },
      { name: "Bang Rong Pier", keywords: ["bang rong pier"], type: "location" },
      { name: "Ao Po Pier", keywords: ["ao po pier"], type: "location" },
      // 1.5 Beaches
      { name: "Patong Beach", keywords: ["patong beach"], type: "location", priority: 3 },
      { name: "Karon Beach", keywords: ["karon beach"], type: "location", priority: 3 },
      { name: "Kata Beach", keywords: ["kata beach"], type: "location", priority: 3 },
      { name: "Kata Noi Beach", keywords: ["kata noi beach"], type: "location", priority: 3 },
      { name: "Kamala Beach", keywords: ["kamala beach"], type: "location", priority: 3 },
      { name: "Surin Beach", keywords: ["surin beach"], type: "location", priority: 3 },
      { name: "Bang Tao Beach", keywords: ["bang tao beach"], type: "location", priority: 3 },
      { name: "Layan Beach", keywords: ["layan beach"], type: "location", priority: 3 },
      { name: "Nai Thon Beach", keywords: ["nai thon beach"], type: "location", priority: 3 },
      { name: "Nai Yang Beach", keywords: ["nai yang beach"], type: "location", priority: 3 },
      { name: "Mai Khao Beach", keywords: ["mai khao beach"], type: "location", priority: 3 },
      { name: "Nai Harn Beach", keywords: ["nai harn beach"], type: "location", priority: 3 },
      { name: "Ao Yon Beach", keywords: ["ao yon beach"], type: "location", priority: 3 },
      { name: "Panwa Beach", keywords: ["panwa beach"], type: "location", priority: 3 },
      { name: "Freedom Beach", keywords: ["freedom beach"], type: "location", priority: 3 },
      { name: "Paradise Beach", keywords: ["paradise beach"], type: "location", priority: 3 },
      { name: "Ya Nui Beach", keywords: ["ya nui beach"], type: "location", priority: 3 },
      { name: "Laem Sing Beach", keywords: ["laem sing beach"], type: "location", priority: 3 },
      // 1.6 Islands near Phuket
      { name: "Phi Phi Islands", keywords: ["phi phi islands", "koh phi phi"], type: "location", priority: 2 },
      { name: "Phang Nga Bay", keywords: ["phang nga bay"], type: "location", priority: 2 },
      { name: "James Bond Island", keywords: ["james bond island", "khao phing kan"], type: "location", priority: 2 },
      { name: "Similan Islands", keywords: ["similan islands"], type: "location", priority: 2 },
      { name: "Surin Islands", keywords: ["surin islands"], type: "location", priority: 2 },
      { name: "Koh Racha", keywords: ["koh racha", "racha yai", "racha noi"], type: "location", priority: 2 },
      { name: "Coral Island", keywords: ["coral island", "koh hey"], type: "location", priority: 2 },
      { name: "Koh Maiton", keywords: ["koh maiton"], type: "location" },
      { name: "Koh Yao Yai", keywords: ["koh yao yai"], type: "location" },
      { name: "Koh Yao Noi", keywords: ["koh yao noi"], type: "location" },
      { name: "Koh Lone", keywords: ["koh lone"], type: "location" },
      { name: "Coconut Island", keywords: ["coconut island", "koh maphrao"], type: "location" },
      { name: "Koh Khai", keywords: ["koh khai"], type: "location" },
      // 1.7 Venues & Zones
      { name: "Bangla Road", keywords: ["bangla road", "soi bangla"], type: "location", priority: 2 },
      { name: "OTOP Market", keywords: ["otop market"], type: "location" },
      { name: "Phuket Walking Street", keywords: ["phuket walking street", "lard yai"], type: "location" },
      { name: "Phuket Weekend Market", keywords: ["phuket weekend market", "naka market"], type: "location" },
      { name: "Chillva Market", keywords: ["chillva market"], type: "location" },
      { name: "Boat Avenue", keywords: ["boat avenue"], type: "location" },
      { name: "Porto de Phuket", keywords: ["porto de phuket"], type: "location" },
      { name: "Central Phuket", keywords: ["central phuket", "central floresta", "central festival"], type: "location" },
      { name: "Jungceylon", keywords: ["jungceylon"], type: "location" },
      { name: "Yacht Haven Marina", keywords: ["yacht haven marina"], type: "location" },
      { name: "Ao Po Grand Marina", keywords: ["ao po grand marina"], type: "location" },
      { name: "Royal Phuket Marina", keywords: ["royal phuket marina"], type: "location" },
      { name: "Boat Lagoon", keywords: ["boat lagoon"], type: "location" },
      // 2. Events, Festivals & Seasons
      { name: "Vegetarian Festival", keywords: ["vegetarian festival", "nine emperor gods"], type: "event", priority: 2 },
      { name: "Songkran", keywords: ["songkran"], type: "event", priority: 2 },
      { name: "Loy Krathong", keywords: ["loy krathong"], type: "event", priority: 2 },
      { name: "Chinese New Year", keywords: ["chinese new year"], type: "event" },
      { name: "Old Town Festival", keywords: ["old town festival"], type: "event" },
      { name: "Phuket Pride", keywords: ["phuket pride"], type: "event" },
      { name: "Patong Carnival", keywords: ["patong carnival"], type: "event" },
      { name: "King\u2019s Cup Regatta", keywords: ["king\u2019s cup regatta", "kings cup"], type: "event" },
      { name: "Phuket Yacht Show", keywords: ["phuket yacht show"], type: "event" },
      { name: "Phuket Raceweek", keywords: ["phuket raceweek"], type: "event" },
      { name: "Laguna Phuket Marathon", keywords: ["laguna phuket marathon"], type: "event" },
      { name: "Phuket Bike Week", keywords: ["phuket bike week", "bike week"], type: "event" },
      { name: "Red Cross Fair", keywords: ["red cross fair"], type: "event" },
      { name: "High Season", keywords: ["high season", "peak season"], type: "event" },
      { name: "Low Season", keywords: ["low season", "rainy season", "monsoon season"], type: "event" },
      // 3. News Topic Categories
      // 3.1 Core News Sections
      // NOTE: Removed 'Tourism', 'Crime', 'Politics', 'Weather', 'Traffic', 'Business', 'Economy' tags
      // to avoid overlap with categories per SEO best practices
      { name: "Breaking News", keywords: ["breaking news"], type: "topic" },
      { name: "Local News", keywords: ["local news"], type: "topic" },
      { name: "Community", keywords: ["community", "community news"], type: "topic" },
      { name: "Environment", keywords: ["environment", "environment news"], type: "topic" },
      { name: "Health", keywords: ["health", "health news"], type: "topic" },
      { name: "Education", keywords: ["education", "education news"], type: "topic" },
      { name: "Court News", keywords: ["court news", "court case"], type: "topic" },
      { name: "Infrastructure", keywords: ["infrastructure"], type: "topic" },
      { name: "Immigration", keywords: ["immigration", "visa"], type: "topic" },
      { name: "Marine", keywords: ["marine", "maritime"], type: "topic" },
      // 3.2 Tourism / Lifestyle
      { name: "Travel", keywords: ["travel"], type: "topic" },
      { name: "Hotels", keywords: ["hotels", "resorts"], type: "topic" },
      { name: "Villas", keywords: ["villas"], type: "topic" },
      { name: "Rentals", keywords: ["rentals", "airbnb"], type: "topic" },
      { name: "Restaurants", keywords: ["restaurants", "dining"], type: "topic" },
      { name: "Nightlife", keywords: ["nightlife", "bars", "clubs"], type: "topic" },
      { name: "Shopping", keywords: ["shopping", "malls"], type: "topic" },
      { name: "Wellness", keywords: ["wellness", "spas", "massage"], type: "topic" },
      { name: "Fitness", keywords: ["fitness", "gyms", "muay thai"], type: "topic" },
      { name: "Diving", keywords: ["diving", "snorkeling"], type: "topic" },
      { name: "Golf", keywords: ["golf"], type: "topic" },
      { name: "Expats", keywords: ["expats", "digital nomads", "retirement"], type: "topic" },
      { name: "Cost of Living", keywords: ["cost of living"], type: "topic" },
      // 3.3 Business & Economy (Note: removed 'Economy' tag as it duplicates category)
      { name: "Real Estate", keywords: ["real estate", "property market", "condos", "land"], type: "topic" },
      { name: "Construction", keywords: ["construction"], type: "topic" },
      { name: "Investment", keywords: ["investment"], type: "topic" },
      { name: "Aviation", keywords: ["aviation", "airlines"], type: "topic" },
      { name: "Banking", keywords: ["banking", "cryptocurrency"], type: "topic" },
      // 3.4 Society & Community
      { name: "Local Government", keywords: ["local government", "municipality", "provincial hall"], type: "topic" },
      { name: "Charity", keywords: ["charity", "fundraising", "volunteers", "ngos"], type: "topic" },
      { name: "Religion", keywords: ["religion", "buddhism", "temples", "wats", "shrines", "mosques"], type: "topic" },
      { name: "Culture", keywords: ["culture", "heritage", "art"], type: "topic" },
      // 3.5 Law, Crime & Safety
      { name: "Drugs", keywords: ["drugs", "drug trafficking", "drug possession", "drug bust"], type: "topic", priority: 2 },
      { name: "Scams", keywords: ["scam", "fraud", "money laundering", "cybercrime"], type: "topic", priority: 2 },
      { name: "Corruption", keywords: ["corruption"], type: "topic", priority: 2 },
      { name: "Violence", keywords: ["violence", "assault", "fight", "brawl", "stabbing", "shooting"], type: "topic", priority: 2 },
      { name: "Theft", keywords: ["theft", "robbery", "burglary", "pickpocket", "mugging"], type: "topic", priority: 2 },
      { name: "Murder", keywords: ["murder", "homicide"], type: "topic", priority: 3 },
      { name: "Sexual Assault", keywords: ["sexual assault", "harassment", "rape"], type: "topic", priority: 3 },
      { name: "Police", keywords: ["police", "police investigation", "police raid", "arrest"], type: "topic", priority: 2 },
      { name: "Road Safety", keywords: ["road safety", "helmet campaign", "drink driving"], type: "topic" },
      { name: "Marine Safety", keywords: ["marine safety", "lifeguards"], type: "topic" },
      { name: "Fire Safety", keywords: ["fire safety"], type: "topic" },
      // 4. Incident / Event-Type Tags
      // 4.1 Road & Transport Incidents
      { name: "Accident", keywords: ["accident", "crash", "collision"], type: "topic", priority: 2 },
      { name: "Road Accident", keywords: ["road accident", "car accident", "motorbike accident", "scooter accident"], type: "topic", priority: 3 },
      { name: "DUI", keywords: ["dui", "drink driving", "drunk driving"], type: "topic", priority: 2 },
      { name: "Traffic Jam", keywords: ["traffic jam", "congestion", "heavy traffic"], type: "topic" },
      { name: "Roadworks", keywords: ["roadworks", "road closure"], type: "topic" },
      // 4.2 Marine & Beach Incidents
      { name: "Drowning", keywords: ["drowning", "near-drowning", "missing swimmer"], type: "topic", priority: 3 },
      { name: "Boat Accident", keywords: ["boat accident", "speedboat accident", "ferry accident", "capsize"], type: "topic", priority: 3 },
      { name: "Marine Life Incident", keywords: ["marine life incident", "jellyfish", "shark sighting"], type: "topic", priority: 2 },
      // 4.4 Fire / Disaster
      { name: "Fire", keywords: ["fire", "house fire", "hotel fire", "wildfire"], type: "topic", priority: 3 },
      { name: "Flooding", keywords: ["flood", "floods", "flooding", "flash flood", "inundation"], type: "topic", priority: 3 },
      { name: "Landslide", keywords: ["landslide"], type: "topic", priority: 3 },
      { name: "Storm", keywords: ["storm", "heavy rain", "strong wind"], type: "topic", priority: 2 },
      { name: "Earthquake", keywords: ["earthquake", "tsunami alert"], type: "topic", priority: 3 },
      // 4.5 Health
      { name: "Disease Outbreak", keywords: ["outbreak", "dengue", "covid-19", "virus"], type: "topic", priority: 3 },
      // 5. People / Demographics
      { name: "Tourists", keywords: ["tourist", "tourists", "foreign tourist"], type: "person" },
      { name: "Locals", keywords: ["local resident", "locals", "thais"], type: "person" },
      { name: "Russians", keywords: ["russian", "russians"], type: "person" },
      { name: "Chinese", keywords: ["chinese"], type: "person" },
      { name: "Indians", keywords: ["indian", "indians"], type: "person" },
      { name: "Australians", keywords: ["australian", "australians"], type: "person" },
      { name: "British", keywords: ["british", "britons", "uk nationals"], type: "person" },
      // 7. Environment & Animals
      { name: "Conservation", keywords: ["conservation", "national park", "marine park"], type: "topic" },
      { name: "Pollution", keywords: ["pollution", "waste", "trash", "plastic"], type: "topic" },
      { name: "Marine Life", keywords: ["marine life", "sea turtles", "dolphins", "whales", "sharks"], type: "topic" },
      { name: "Animals", keywords: ["animals", "stray dogs", "soi dogs", "monkeys", "elephants", "snakes"], type: "topic" },
      // 8. Lifestyle & Misc
      { name: "Food", keywords: ["food", "thai food", "street food"], type: "topic" },
      { name: "Cannabis", keywords: ["cannabis", "marijuana", "weed", "dispensary"], type: "topic" },
      { name: "Technology", keywords: ["technology", "social media", "viral video"], type: "topic" }
    ];
    ALL_TAGS = TAG_DEFINITIONS.map((t) => t.name);
  }
});

// server/lib/tag-detector.ts
function detectTags(title, content, category) {
  const tagScores = /* @__PURE__ */ new Map();
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();
  const combinedText = `${titleLower} ${contentLower}`;
  for (const def of TAG_DEFINITIONS) {
    let score = 0;
    let matched = false;
    for (const keyword of def.keywords) {
      const keywordLower = keyword.toLowerCase();
      const escapedKeyword = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, "i");
      if (regex.test(titleLower)) {
        score += 10;
        matched = true;
      } else if (regex.test(contentLower)) {
        score += 1;
        matched = true;
      }
      if (matched) {
        const currentScore = tagScores.get(def.name) || 0;
        tagScores.set(def.name, Math.max(currentScore, score));
        break;
      }
    }
  }
  if (category === "National") {
    const filteredScores = /* @__PURE__ */ new Map();
    Array.from(tagScores.entries()).forEach(([tagName, score]) => {
      const tagDef = TAG_DEFINITIONS.find((t) => t.name === tagName);
      if (tagDef?.type !== "location" || !isPhuketAreaTag(tagDef.name)) {
        filteredScores.set(tagName, score);
      }
    });
    tagScores.clear();
    Array.from(filteredScores.entries()).forEach(([key, value]) => {
      tagScores.set(key, value);
    });
  }
  return Array.from(tagScores.entries()).sort((a, b) => {
    const scoreDiff = b[1] - a[1];
    if (scoreDiff !== 0) return scoreDiff;
    const defA = TAG_DEFINITIONS.find((t) => t.name === a[0]);
    const defB = TAG_DEFINITIONS.find((t) => t.name === b[0]);
    const priorityA = defA?.priority || 0;
    const priorityB = defB?.priority || 0;
    if (priorityA !== priorityB) return priorityB - priorityA;
    return b[0].length - a[0].length;
  }).map((entry) => entry[0]);
}
function isPhuketAreaTag(tagName) {
  const phuketAreaTags = [
    "Phuket",
    "Phuket Town",
    "Greater Phuket",
    "Mueang Phuket",
    "Kathu",
    "Thalang",
    "Patong",
    "Karon",
    "Kata",
    "Kata Noi",
    "Kamala",
    "Surin",
    "Bang Tao",
    "Cherng Talay",
    "Laguna",
    "Nai Thon",
    "Nai Yang",
    "Mai Khao",
    "Rawai",
    "Nai Harn",
    "Chalong",
    "Wichit",
    "Koh Kaew",
    "Koh Siray",
    "Pa Khlok",
    "Thepkrasattri",
    "Srisoonthorn",
    "Sakhu",
    "Bang Jo",
    "Rassada",
    // Roads and transport
    "Thepkrasattri Road",
    "Chao Fah West Road",
    "Chao Fah East Road",
    "Bypass Road",
    "Patong Hill",
    "Kata Hill",
    "Karon Hill",
    "Airport Road",
    "Heroines Monument",
    "Sarasin Bridge",
    "Phuket International Airport",
    "Rassada Pier",
    "Chalong Pier",
    "Bang Rong Pier",
    "Ao Po Pier",
    // Beaches
    "Patong Beach",
    "Karon Beach",
    "Kata Beach",
    "Kata Noi Beach",
    "Kamala Beach",
    "Surin Beach",
    "Bang Tao Beach",
    "Layan Beach",
    "Nai Thon Beach",
    "Nai Yang Beach",
    "Mai Khao Beach",
    "Nai Harn Beach",
    "Ao Yon Beach",
    "Panwa Beach",
    "Freedom Beach",
    "Paradise Beach",
    "Ya Nui Beach",
    "Laem Sing Beach",
    // Venues
    "Bangla Road",
    "OTOP Market",
    "Phuket Walking Street",
    "Phuket Weekend Market",
    "Chillva Market",
    "Boat Avenue",
    "Porto de Phuket",
    "Central Phuket",
    "Jungceylon",
    "Yacht Haven Marina",
    "Ao Po Grand Marina",
    "Royal Phuket Marina",
    "Boat Lagoon"
  ];
  return phuketAreaTags.includes(tagName);
}
var init_tag_detector = __esm({
  "server/lib/tag-detector.ts"() {
    "use strict";
    init_core_tags();
  }
});

// server/lib/semantic-similarity.ts
var semantic_similarity_exports = {};
__export(semantic_similarity_exports, {
  checkSemanticDuplicate: () => checkSemanticDuplicate,
  cosineSimilarity: () => cosineSimilarity,
  getTopSimilarArticles: () => getTopSimilarArticles
});
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  return dotProduct / (magnitudeA * magnitudeB);
}
function checkSemanticDuplicate(embedding, existingEmbeddings, threshold = 0.7) {
  let maxSimilarity = 0;
  let matchedArticle = null;
  for (const existing of existingEmbeddings) {
    if (!existing.embedding) {
      continue;
    }
    const similarity = cosineSimilarity(embedding, existing.embedding);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      matchedArticle = { id: existing.id, title: existing.title, content: existing.content };
    }
  }
  return {
    isDuplicate: maxSimilarity >= threshold,
    similarity: maxSimilarity,
    matchedArticleId: matchedArticle?.id,
    matchedArticleTitle: matchedArticle?.title,
    matchedArticleContent: matchedArticle?.content
  };
}
function getTopSimilarArticles(embedding, existingEmbeddings, topN = 5) {
  const similarities = [];
  for (const existing of existingEmbeddings) {
    if (!existing.embedding) {
      continue;
    }
    const similarity = cosineSimilarity(embedding, existing.embedding);
    similarities.push({
      id: existing.id,
      title: existing.title,
      content: existing.content,
      similarity
    });
  }
  return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topN);
}
var init_semantic_similarity = __esm({
  "server/lib/semantic-similarity.ts"() {
    "use strict";
  }
});

// server/services/timeline-service.ts
var timeline_service_exports = {};
__export(timeline_service_exports, {
  TimelineService: () => TimelineService,
  getTimelineService: () => getTimelineService
});
import { eq as eq7, desc as desc4, and as and6, or, isNotNull } from "drizzle-orm";
function getTimelineService(storage2) {
  if (!timelineServiceInstance) {
    timelineServiceInstance = new TimelineService(storage2);
  }
  return timelineServiceInstance;
}
var TimelineService, timelineServiceInstance;
var init_timeline_service = __esm({
  "server/services/timeline-service.ts"() {
    "use strict";
    init_db();
    init_schema();
    TimelineService = class {
      constructor(storage2) {
        this.storage = storage2;
      }
      /**
       * Create a new story timeline from a parent article
       */
      async createStoryTimeline(params) {
        const { parentArticleId, seriesTitle, seriesId: providedSeriesId } = params;
        const parentArticle = await this.storage.getArticleById(parentArticleId);
        if (!parentArticle) {
          throw new Error(`Parent article not found: ${parentArticleId}`);
        }
        const seriesId = providedSeriesId || `series-${Date.now()}-${parentArticleId.substring(0, 8)}`;
        await this.storage.updateArticle(parentArticleId, {
          seriesId,
          storySeriesTitle: seriesTitle,
          isParentStory: true,
          isDeveloping: true,
          seriesUpdateCount: 0
        });
        const updatedParent = await this.storage.getArticleById(parentArticleId);
        if (!updatedParent) {
          throw new Error("Failed to update parent article");
        }
        console.log(`\u{1F4F0} [TIMELINE] Created new timeline: "${seriesTitle}" (${seriesId})`);
        return { seriesId, parentArticle: updatedParent };
      }
      /**
       * Add an article to an existing timeline
       */
      async addArticleToTimeline(articleId, seriesId) {
        const article = await this.storage.getArticleById(articleId);
        if (!article) {
          throw new Error(`Article not found: ${articleId}`);
        }
        const parentStory = await this.getParentStory(seriesId);
        if (!parentStory) {
          throw new Error(`Timeline series not found: ${seriesId}`);
        }
        if (article.isParentStory && article.seriesId !== seriesId) {
          throw new Error("Cannot add a parent story from another timeline");
        }
        await this.storage.updateArticle(articleId, {
          seriesId,
          storySeriesTitle: parentStory.storySeriesTitle,
          isParentStory: false,
          // Updates are never parent stories
          isDeveloping: true
        });
        const currentCount = parentStory.seriesUpdateCount || 0;
        await this.storage.updateArticle(parentStory.id, {
          seriesUpdateCount: currentCount + 1
        });
        console.log(`\u{1F4F0} [TIMELINE] Added article to timeline: ${article.title.substring(0, 60)}... \u2192 ${parentStory.storySeriesTitle}`);
      }
      /**
       * Remove an article from a timeline
       */
      async removeArticleFromTimeline(articleId) {
        const article = await this.storage.getArticleById(articleId);
        if (!article || !article.seriesId) {
          throw new Error("Article not in a timeline");
        }
        if (article.isParentStory) {
          throw new Error("Cannot remove parent story. Delete the entire timeline instead.");
        }
        const seriesId = article.seriesId;
        await this.storage.updateArticle(articleId, {
          seriesId: null,
          storySeriesTitle: null,
          isParentStory: false,
          isDeveloping: false
        });
        const parentStory = await this.getParentStory(seriesId);
        if (parentStory) {
          const currentCount = parentStory.seriesUpdateCount || 0;
          await this.storage.updateArticle(parentStory.id, {
            seriesUpdateCount: Math.max(0, currentCount - 1)
          });
        }
        console.log(`\u{1F4F0} [TIMELINE] Removed article from timeline: ${article.title.substring(0, 60)}...`);
      }
      /**
       * Get all articles in a timeline, sorted chronologically (newest first)
       */
      async getTimelineStories(seriesId) {
        const timelineArticles = await db.select().from(articles).where(eq7(articles.seriesId, seriesId)).orderBy(desc4(articles.publishedAt));
        return timelineArticles;
      }
      /**
       * Get the parent story of a timeline
       */
      async getParentStory(seriesId) {
        const [parentStory] = await db.select().from(articles).where(
          and6(
            or(
              eq7(articles.seriesId, seriesId),
              eq7(articles.slug, seriesId)
              // Also check slug
            ),
            eq7(articles.isParentStory, true)
          )
        );
        return parentStory || void 0;
      }
      /**
       * Get all timeline series (parent stories only)
       */
      async getAllTimelines() {
        const timelines = await db.select().from(articles).where(
          and6(
            eq7(articles.isParentStory, true),
            isNotNull(articles.seriesId)
          )
        ).orderBy(desc4(articles.publishedAt));
        return timelines;
      }
      /**
      * AI-suggested: Find articles that might belong in the same timeline
      * Uses semantic similarity to suggest related articles
      */
      async suggestRelatedArticles(articleId, options = {}) {
        const {
          minSimilarity = 0.75,
          // High threshold for timeline grouping
          maxSuggestions = 10,
          timeWindowHours = 72
          // Look at articles from last 3 days
        } = options;
        const article = await this.storage.getArticleById(articleId);
        if (!article || !article.embedding) {
          throw new Error(`Article not found or has no embedding: ${articleId}`);
        }
        if (article.seriesId && !article.isParentStory) {
          return [];
        }
        const cutoffDate = /* @__PURE__ */ new Date();
        cutoffDate.setHours(cutoffDate.getHours() - timeWindowHours);
        const allArticlesWithEmbeddings = await this.storage.getArticlesWithEmbeddings();
        const recentCandidates = allArticlesWithEmbeddings.filter((a) => {
          return a.id !== articleId && a.embedding !== null;
        });
        const { checkSemanticDuplicate: checkSemanticDuplicate2 } = await Promise.resolve().then(() => (init_semantic_similarity(), semantic_similarity_exports));
        const result = checkSemanticDuplicate2(
          article.embedding,
          recentCandidates,
          minSimilarity
        );
        const suggestions = [];
        if (result.isDuplicate && result.matchedArticleId) {
          const matchedArticle = await this.storage.getArticleById(result.matchedArticleId);
          if (matchedArticle && new Date(matchedArticle.publishedAt) >= cutoffDate && !matchedArticle.seriesId) {
            suggestions.push({
              articleId: matchedArticle.id,
              title: matchedArticle.title,
              publishedAt: new Date(matchedArticle.publishedAt),
              similarityScore: result.similarity,
              reasoning: result.similarity >= 0.9 ? "Very high similarity - likely the same developing story" : "High similarity - possibly related to developing story"
            });
          }
        }
        const { getTopSimilarArticles: getTopSimilarArticles2 } = await Promise.resolve().then(() => (init_semantic_similarity(), semantic_similarity_exports));
        const topSimilar = getTopSimilarArticles2(article.embedding, recentCandidates, maxSuggestions * 2);
        for (const similar of topSimilar) {
          if (similar.similarity < minSimilarity || suggestions.some((s) => s.articleId === similar.id)) {
            continue;
          }
          const candidateArticle = await this.storage.getArticleById(similar.id);
          if (!candidateArticle || candidateArticle.seriesId) {
            continue;
          }
          if (new Date(candidateArticle.publishedAt) >= cutoffDate) {
            suggestions.push({
              articleId: candidateArticle.id,
              title: candidateArticle.title,
              publishedAt: new Date(candidateArticle.publishedAt),
              similarityScore: similar.similarity,
              reasoning: similar.similarity >= 0.85 ? "Strong similarity - likely part of same story" : "Moderate similarity - possibly related"
            });
            if (suggestions.length >= maxSuggestions) {
              break;
            }
          }
        }
        if (suggestions.length > 0) {
          console.log(`\u{1F916} [TIMELINE-AI] Found ${suggestions.length} suggested articles for: ${article.title.substring(0, 60)}...`);
        }
        return suggestions;
      }
      /**
       * Find a matching timeline for a new article based on tags
       * Uses smart keyword grouping to avoid counting variations (flood/floods/flooding) as multiple matches
       * Returns detailed match information for publish vs draft decision
       */
      async findMatchingTimeline(article) {
        console.log(`\u{1F50D} [AUTO-MATCH BEGIN] Checking article: "${article.title.substring(0, 60)}..."`);
        const activeTimelines = await db.select().from(articles).where(
          and6(
            eq7(articles.isParentStory, true),
            eq7(articles.autoMatchEnabled, true),
            isNotNull(articles.seriesId)
          )
        );
        console.log(`\u{1F50D} [AUTO-MATCH] Found ${activeTimelines.length} timelines with auto-match enabled`);
        if (activeTimelines.length === 0) {
          console.log(`\u26A0\uFE0F [AUTO-MATCH] No timelines with auto-match enabled - skipping`);
          return {
            matched: false,
            seriesId: null,
            matchedKeywords: [],
            matchCount: 0,
            shouldAutoPublish: false
          };
        }
        const titleLower = article.title.toLowerCase();
        const contentLower = article.content.toLowerCase();
        const originalTitleLower = (article.originalTitle || "").toLowerCase();
        const originalContentLower = (article.originalContent || "").toLowerCase();
        console.log(`\u{1F50D} [AUTO-MATCH] Article title (lowercase): "${titleLower.substring(0, 80)}..."`);
        console.log(`\u{1F50D} [AUTO-MATCH] Article content length: ${contentLower.length} chars`);
        console.log(`\u{1F50D} [AUTO-MATCH] Also checking original Thai text: ${originalTitleLower ? "Yes" : "No"}`);
        for (const timeline of activeTimelines) {
          if (!timeline.timelineTags || timeline.timelineTags.length === 0) {
            console.log(`\u26A0\uFE0F [AUTO-MATCH] Timeline "${timeline.storySeriesTitle}" has no tags - skipping`);
            continue;
          }
          let tagsArray;
          if (typeof timeline.timelineTags === "string") {
            console.log(`\u26A0\uFE0F [AUTO-MATCH] Tags stored as STRING, not array! Converting...`);
            console.log(`   Raw value: "${timeline.timelineTags}"`);
            tagsArray = timeline.timelineTags.split(",").map((t) => t.trim());
          } else if (Array.isArray(timeline.timelineTags)) {
            tagsArray = timeline.timelineTags;
          } else {
            console.log(`\u274C [AUTO-MATCH] Invalid tag type: ${typeof timeline.timelineTags}`);
            continue;
          }
          console.log(`\u{1F50D} [AUTO-MATCH] Checking timeline: "${timeline.storySeriesTitle}" with ${tagsArray.length} tags: [${tagsArray.join(", ")}]`);
          const keywordGroups = this.groupSimilarKeywords(tagsArray);
          console.log(`   Grouped into ${keywordGroups.length} unique keyword groups`);
          const matchedGroups = [];
          const matchResults = [];
          for (const group of keywordGroups) {
            let groupMatched = false;
            for (const tag of group.keywords) {
              const tagLower = tag.toLowerCase();
              const inTitle = titleLower.includes(tagLower);
              const inContent = contentLower.includes(tagLower);
              const inOriginalTitle = originalTitleLower.includes(tagLower);
              const inOriginalContent = originalContentLower.includes(tagLower);
              if (inTitle || inContent || inOriginalTitle || inOriginalContent) {
                const location = inTitle ? "title" : inContent ? "content" : inOriginalTitle ? "Thai title" : "Thai content";
                matchResults.push(`\u2705 "${tag}" found in ${location}`);
                groupMatched = true;
                break;
              }
            }
            if (groupMatched) {
              matchedGroups.push(group.representative);
            } else {
              matchResults.push(`\u274C "${group.representative}" group (${group.keywords.length} variations) not found`);
            }
          }
          matchResults.forEach((result) => console.log(`     ${result}`));
          const uniqueMatchCount = matchedGroups.length;
          console.log(`
   \u{1F4CA} MATCH SUMMARY: ${uniqueMatchCount} unique keyword groups matched: [${matchedGroups.join(", ")}]`);
          if (uniqueMatchCount > 0 && timeline.seriesId) {
            const shouldAutoPublish = uniqueMatchCount >= 2;
            console.log(`\u2705 [AUTO-MATCH SUCCESS] Matched to timeline "${timeline.storySeriesTitle}"`);
            console.log(`   Decision: ${shouldAutoPublish ? "\u2705 AUTO-PUBLISH (2+ keywords)" : "\u26A0\uFE0F  DRAFT + REVIEW (1 keyword)"}
`);
            return {
              matched: true,
              seriesId: timeline.seriesId,
              matchedKeywords: matchedGroups,
              matchCount: uniqueMatchCount,
              shouldAutoPublish
            };
          }
        }
        console.log(`\u274C [AUTO-MATCH] No matching timeline found for: "${article.title.substring(0, 60)}..."`);
        return {
          matched: false,
          seriesId: null,
          matchedKeywords: [],
          matchCount: 0,
          shouldAutoPublish: false
        };
      }
      /**
       * Group similar keywords to avoid counting "flood", "floods", "flooding" as 3 matches
       * Returns array of groups with a representative keyword
       */
      groupSimilarKeywords(tags) {
        const groups = /* @__PURE__ */ new Map();
        for (const tag of tags) {
          const normalized = tag.toLowerCase().trim();
          let stem = normalized.replace(/s$/, "").replace(/ing$/, "").replace(/ed$/, "");
          if (!groups.has(stem)) {
            groups.set(stem, []);
          }
          groups.get(stem).push(tag);
        }
        return Array.from(groups.entries()).map(([stem, keywords]) => ({
          representative: keywords.sort((a, b) => a.length - b.length)[0],
          // Use shortest as representative
          keywords
        }));
      }
      /**
       * Delete an entire timeline (removes all articles from series)
       */
      async deleteTimeline(seriesId) {
        const timelineArticles = await this.getTimelineStories(seriesId);
        for (const article of timelineArticles) {
          await this.storage.updateArticle(article.id, {
            seriesId: null,
            storySeriesTitle: null,
            isParentStory: false,
            seriesUpdateCount: 0,
            isDeveloping: false
          });
        }
        console.log(`\u{1F4F0} [TIMELINE] Deleted timeline: ${seriesId} (${timelineArticles.length} articles freed)`);
      }
    };
    timelineServiceInstance = null;
  }
});

// server/lib/scheduler-lock.ts
var scheduler_lock_exports = {};
__export(scheduler_lock_exports, {
  acquireSchedulerLock: () => acquireSchedulerLock,
  releaseSchedulerLock: () => releaseSchedulerLock,
  withSchedulerLock: () => withSchedulerLock
});
async function ensureLocksTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduler_locks (
        lock_name VARCHAR(255) PRIMARY KEY,
        acquired_at TIMESTAMP NOT NULL DEFAULT NOW(),
        instance_id VARCHAR(255)
      )
    `);
  } catch (error) {
    console.error("Error creating scheduler_locks table:", error);
  }
}
async function cleanStaleLocks() {
  try {
    const staleThreshold = new Date(Date.now() - STALE_LOCK_TIMEOUT_MS);
    await pool.query(
      `DELETE FROM scheduler_locks WHERE acquired_at < $1`,
      [staleThreshold]
    );
  } catch (error) {
    console.error("Error cleaning stale locks:", error);
  }
}
async function acquireSchedulerLock() {
  try {
    await ensureLocksTable();
    await cleanStaleLocks();
    const instanceId = `${process.pid}-${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO scheduler_locks (lock_name, instance_id, acquired_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (lock_name) DO NOTHING
       RETURNING lock_name`,
      [LOCK_NAME, instanceId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error("Error acquiring scheduler lock:", error);
    return false;
  }
}
async function releaseSchedulerLock() {
  try {
    await pool.query(
      `DELETE FROM scheduler_locks WHERE lock_name = $1`,
      [LOCK_NAME]
    );
  } catch (error) {
    console.error("Error releasing scheduler lock:", error);
  }
}
async function withSchedulerLock(fn, onSkip) {
  const lockAcquired = await acquireSchedulerLock();
  if (!lockAcquired) {
    if (onSkip) {
      onSkip();
    }
    return null;
  }
  try {
    const result = await fn();
    return result;
  } finally {
    await releaseSchedulerLock();
  }
}
var LOCK_NAME, STALE_LOCK_TIMEOUT_MS;
var init_scheduler_lock = __esm({
  "server/lib/scheduler-lock.ts"() {
    "use strict";
    init_db();
    LOCK_NAME = "scheduler_scrape";
    STALE_LOCK_TIMEOUT_MS = 15 * 60 * 1e3;
  }
});

// server/services/classifier.ts
import OpenAI4 from "openai";
var openai4, EVENT_TYPES, SEVERITY_LEVELS, ClassificationService, classificationService;
var init_classifier = __esm({
  "server/services/classifier.ts"() {
    "use strict";
    openai4 = new OpenAI4({
      apiKey: process.env.OPENAI_API_KEY
    });
    EVENT_TYPES = [
      "Accident",
      "Crime",
      "Weather",
      "Health",
      "Public Order",
      "Tourism",
      "Infrastructure",
      "Government",
      "Environment",
      "Other"
    ];
    SEVERITY_LEVELS = [
      "Critical",
      // Immediate threat to life/safety
      "High",
      // Significant impact, developing situation
      "Medium",
      // Notable news, local impact
      "Low",
      // Minor incident, routine news
      "Info"
      // General information, announcements
    ];
    ClassificationService = class {
      /**
       * Classify a news article by event type and severity using GPT-4o-mini
       * Optimized for cost: uses minimal input tokens and structured output
       */
      async classifyArticle(title, excerpt) {
        try {
          const shortExcerpt = excerpt.substring(0, 200);
          const inputText = `${title}

${shortExcerpt}`;
          const systemPrompt = `You are a news classifier for Phuket Radar, a news site covering Phuket, Thailand.

Classify each story by EVENT TYPE and SEVERITY.

EVENT TYPES: ${EVENT_TYPES.join(", ")}
SEVERITY: ${SEVERITY_LEVELS.join(", ")}

Rules:
- Accident: Traffic crashes, injuries, falls, drownings
- Crime: Theft, assault, arrests, illegal activities
- Weather: Storms, flooding, monsoons, climate
- Health: Disease outbreaks, hospital news, medical emergencies
- Public Order: Protests, demonstrations, curfews, police operations
- Tourism: Tourist incidents, attractions, festivals, visitor services
- Infrastructure: Roads, utilities, construction, public works
- Government: Policy, elections, official announcements
- Environment: Pollution, conservation, wildlife, beaches
- Other: Everything else

SEVERITY:
- Critical: Deaths, major disasters, immediate safety threats
- High: Serious injuries, major crimes, developing emergencies
- Medium: Moderate incidents, local disruptions, ongoing issues
- Low: Minor problems, routine police work, small accidents
- Info: Announcements, schedules, general information

Return ONLY valid JSON: {"eventType": "...", "severity": "..."}`;
          const response = await openai4.chat.completions.create({
            model: "gpt-4o-mini",
            // Cost-effective model for classification
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: `Classify this Phuket news story:

${inputText}`
              }
            ],
            response_format: { type: "json_object" },
            // Force JSON output
            temperature: 0.3,
            // Lower temperature for consistent classification
            max_tokens: 50
            // Limit response to minimize cost
          });
          const content = response.choices[0].message.content;
          if (!content) {
            throw new Error("Empty response from OpenAI");
          }
          const classification = JSON.parse(content);
          if (!EVENT_TYPES.includes(classification.eventType)) {
            console.warn(`Invalid event type: ${classification.eventType}, defaulting to Other`);
            classification.eventType = "Other";
          }
          if (!SEVERITY_LEVELS.includes(classification.severity)) {
            console.warn(`Invalid severity: ${classification.severity}, defaulting to Info`);
            classification.severity = "Info";
          }
          console.log(`[CLASSIFIER] Classified as ${classification.eventType} / ${classification.severity}: "${title.substring(0, 60)}..."`);
          return classification;
        } catch (error) {
          console.error("Error classifying article:", error);
          return {
            eventType: "Other",
            severity: "Info"
          };
        }
      }
      /**
       * Batch classify multiple articles efficiently
       * Uses parallel API calls for speed
       */
      async classifyBatch(articles2) {
        const promises = articles2.map(
          (article) => this.classifyArticle(article.title, article.excerpt)
        );
        return Promise.all(promises);
      }
    };
    classificationService = new ClassificationService();
  }
});

// server/config/news-sources.ts
function getEnabledSources() {
  return NEWS_SOURCES.filter((source) => source.enabled);
}
var NEWS_SOURCES;
var init_news_sources = __esm({
  "server/config/news-sources.ts"() {
    "use strict";
    NEWS_SOURCES = [
      {
        name: "The Phuket Times",
        url: "https://www.facebook.com/PhuketTimeNews",
        enabled: true
      },
      {
        name: "Phuket Info Center",
        url: "https://www.facebook.com/phuketinfocenter",
        enabled: true
      },
      {
        name: "Phuket Hot News",
        url: "https://www.facebook.com/phukethotnews",
        enabled: false,
        // DISABLED: Posts graphic teaser images (red blob) that bypass image filters
        // Re-enable once the deployed scheduler confirms strictImageFilter + teaser-phrase filter is working
        strictImageFilter: true
      },
      {
        name: "Newshawk Phuket",
        url: "https://www.facebook.com/NewshawkPhuket",
        enabled: true
      },
      {
        name: "Phuket Times English",
        url: "https://www.facebook.com/PhuketTimes.News",
        enabled: true
      }
    ];
  }
});

// server/services/entity-extraction.ts
var entity_extraction_exports = {};
__export(entity_extraction_exports, {
  EntityExtractionService: () => EntityExtractionService,
  entityExtractionService: () => entityExtractionService
});
import OpenAI5 from "openai";
var openai5, EntityExtractionService, entityExtractionService;
var init_entity_extraction = __esm({
  "server/services/entity-extraction.ts"() {
    "use strict";
    openai5 = new OpenAI5({
      apiKey: process.env.OPENAI_API_KEY
    });
    EntityExtractionService = class {
      /**
       * Extract entities from Thai text using GPT-4o-mini
       * Focuses on: people names, locations, crime types, organizations, and KEY NUMBERS
       * 
       * Now uses BOTH title and content for better cross-source duplicate detection.
       * Numbers (quantities, amounts) are especially important for catching duplicates
       * where different sources report the same story with different headlines.
       */
      async extractEntities(thaiTitle, thaiContent) {
        try {
          const textToAnalyze = thaiContent ? `${thaiTitle}

${thaiContent.substring(0, 500)}` : thaiTitle;
          const response = await openai5.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are an entity extraction system for Thai news articles. Extract key entities from Thai text.

Output ONLY a JSON object with these fields:
- people: array of person names (suspects, victims, officials)
- locations: array of locations (cities, districts, landmarks, street names, soi names)
- crimeTypes: array of crime/incident types (theft, assault, drugs, smuggling, tax evasion, etc)
- organizations: array of organizations (police stations, companies, government bodies)
- numbers: array of KEY QUANTITIES mentioned (number of items seized, money amounts, victim counts, etc.)
  - Format numbers consistently: "734 packs", "3 million baht", "2 dead", "5 injured"
  - Only include significant quantities, not dates/times

Rules:
1. Normalize similar entities (e.g., "\u0E15\u0E33\u0E23\u0E27\u0E08\u0E09\u0E25\u0E2D\u0E07" and "\u0E2A\u0E19.\u0E09\u0E25\u0E2D\u0E07" both become "Chalong Police")
2. Extract both Thai and transliterated English forms when present
3. For locations, include street names and soi names - they are very specific!
4. For crimes, use general categories (drugs, assault, theft, fraud, smuggling)
5. For numbers, normalize to a consistent format e.g., "over 700 packs" \u2192 "700+ packs", "734 packets" \u2192 "734 packs"
6. Return empty arrays if no entities found in a category

Example input: "\u0E15\u0E33\u0E23\u0E27\u0E08\u0E09\u0E25\u0E2D\u0E07\u0E08\u0E31\u0E1A\u0E1C\u0E39\u0E49\u0E15\u0E49\u0E2D\u0E07\u0E2B\u0E32\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E22\u0E32\u0E1A\u0E49\u0E32 734 \u0E40\u0E21\u0E47\u0E14\u0E21\u0E39\u0E25\u0E04\u0E48\u0E32 50,000 \u0E1A\u0E32\u0E17"
Example output:
{
  "people": [],
  "locations": ["Chalong", "\u0E09\u0E25\u0E2D\u0E07"],
  "crimeTypes": ["drugs", "methamphetamine"],
  "organizations": ["Chalong Police", "\u0E15\u0E33\u0E23\u0E27\u0E08\u0E09\u0E25\u0E2D\u0E07"],
  "numbers": ["734 pills", "50000 baht"]
}`
              },
              {
                role: "user",
                content: textToAnalyze
              }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
          });
          const content = response.choices[0].message.content;
          if (!content) {
            throw new Error("No response from GPT");
          }
          const parsed = JSON.parse(content);
          return {
            people: parsed.people || [],
            locations: parsed.locations || [],
            crimeTypes: parsed.crimeTypes || [],
            organizations: parsed.organizations || [],
            numbers: parsed.numbers || [],
            rawText: thaiTitle
          };
        } catch (error) {
          console.error("Entity extraction failed:", error);
          return {
            people: [],
            locations: [],
            crimeTypes: [],
            organizations: [],
            numbers: [],
            rawText: thaiTitle
          };
        }
      }
      /**
       * Compare two entity sets and calculate match score (0-100%)
       * Higher score = more likely to be the same story
       * 
       * Numbers (quantities) are now the STRONGEST signal because they catch
       * cross-source duplicates like "734 packs seized" vs "over 700 packs seized"
       */
      compareEntities(entities1, entities2) {
        const normalize = (str) => str.toLowerCase().trim();
        const peopleMatches = this.countMatches(entities1.people, entities2.people, normalize);
        const locationMatches = this.countMatches(entities1.locations, entities2.locations, normalize);
        const crimeMatches = this.countMatches(entities1.crimeTypes, entities2.crimeTypes, normalize);
        const orgMatches = this.countMatches(entities1.organizations, entities2.organizations, normalize);
        const numberMatches = this.countNumberMatches(
          entities1.numbers || [],
          entities2.numbers || []
        );
        const totalEntities = Math.max(
          entities1.people.length + entities1.locations.length + entities1.crimeTypes.length + entities1.organizations.length + (entities1.numbers?.length || 0),
          entities2.people.length + entities2.locations.length + entities2.crimeTypes.length + entities2.organizations.length + (entities2.numbers?.length || 0),
          1
          // Minimum 1 to avoid division by zero
        );
        let weightedScore = 0;
        weightedScore += numberMatches * 40;
        weightedScore += crimeMatches * 30;
        weightedScore += locationMatches * 25;
        weightedScore += peopleMatches * 20;
        weightedScore += orgMatches * 15;
        const score = Math.min(100, weightedScore);
        return {
          score,
          matchedPeople: peopleMatches,
          matchedLocations: locationMatches,
          matchedCrimeTypes: crimeMatches,
          matchedOrganizations: orgMatches,
          matchedNumbers: numberMatches,
          totalEntities
        };
      }
      /**
       * Count number matches with fuzzy tolerance for approximate values
       * "734 packs" matches "over 700 packs" or "700+ packs"
       */
      countNumberMatches(numbers1, numbers2) {
        if (numbers1.length === 0 || numbers2.length === 0) {
          return 0;
        }
        let matches = 0;
        for (const num1 of numbers1) {
          const extracted1 = this.extractNumericValue(num1);
          if (extracted1 === null) continue;
          for (const num2 of numbers2) {
            const extracted2 = this.extractNumericValue(num2);
            if (extracted2 === null) continue;
            const tolerance = Math.max(extracted1, extracted2) * 0.1;
            if (Math.abs(extracted1 - extracted2) <= tolerance) {
              matches++;
              break;
            }
          }
        }
        return matches;
      }
      /**
       * Extract numeric value from a string like "734 packs" or "3 million baht"
       */
      extractNumericValue(str) {
        const millionMatch = str.match(/(\d+(?:\.\d+)?)\s*(million|ล้าน)/i);
        if (millionMatch) {
          return parseFloat(millionMatch[1]) * 1e6;
        }
        const thousandMatch = str.match(/(\d+(?:\.\d+)?)\s*(thousand|พัน)/i);
        if (thousandMatch) {
          return parseFloat(thousandMatch[1]) * 1e3;
        }
        const simpleMatch = str.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
        if (simpleMatch) {
          return parseFloat(simpleMatch[0]);
        }
        return null;
      }
      /**
       * Count how many items from list1 appear in list2 (case-insensitive, normalized)
       */
      countMatches(list1, list2, normalize) {
        if (list1.length === 0 || list2.length === 0) {
          return 0;
        }
        const normalized2 = list2.map(normalize);
        let matches = 0;
        for (const item of list1) {
          const norm1 = normalize(item);
          if (normalized2.some(
            (norm2) => norm2 === norm1 || norm2.includes(norm1) || norm1.includes(norm2)
          )) {
            matches++;
          }
        }
        return matches;
      }
      /**
       * Determine if two articles are duplicates based on entity matching
       * Returns true if entity match score >= threshold
       */
      isDuplicateByEntities(entities1, entities2, threshold = 50) {
        const matchScore = this.compareEntities(entities1, entities2);
        return matchScore.score >= threshold;
      }
    };
    entityExtractionService = new EntityExtractionService();
  }
});

// server/services/image-hash.ts
import sharp from "sharp";
import { bmvbhash } from "blockhash-core";
var ImageHashService, imageHashService;
var init_image_hash = __esm({
  "server/services/image-hash.ts"() {
    "use strict";
    ImageHashService = class {
      async generatePerceptualHash(imageUrl) {
        try {
          console.log(`[IMAGE-HASH] Generating perceptual hash for: ${imageUrl.substring(0, 80)}...`);
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          const imageBuffer = Buffer.from(await response.arrayBuffer());
          const { data, info } = await sharp(imageBuffer).resize(16, 16, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
          const hash = bmvbhash({ data, width: info.width, height: info.height }, 4);
          console.log(`[IMAGE-HASH] Generated hash: ${hash}`);
          return hash;
        } catch (error) {
          console.error(`[IMAGE-HASH] Error generating hash for ${imageUrl}:`, error);
          throw error;
        }
      }
      hammingDistance(hash1, hash2) {
        if (hash1.length !== hash2.length) {
          throw new Error("Hashes must be the same length");
        }
        let distance = 0;
        for (let i = 0; i < hash1.length; i++) {
          const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
          distance += this.countBits(xor);
        }
        return distance;
      }
      areSimilar(hash1, hash2, threshold = 10) {
        const distance = this.hammingDistance(hash1, hash2);
        console.log(`[IMAGE-HASH] Hamming distance: ${distance} (threshold: ${threshold})`);
        return distance <= threshold;
      }
      countBits(n) {
        let count = 0;
        while (n) {
          count += n & 1;
          n >>= 1;
        }
        return count;
      }
    };
    imageHashService = new ImageHashService();
  }
});

// server/services/image-analysis.ts
import sharp2 from "sharp";
var ImageAnalysisService, imageAnalysisService;
var init_image_analysis = __esm({
  "server/services/image-analysis.ts"() {
    "use strict";
    ImageAnalysisService = class {
      /**
       * Safe image fetch with size and metadata checks
       * Returns structured result instead of throwing
       *
       * @param imageUrl - URL of the image to analyze
       * @param options.strictMode - When true, uses tighter thresholds suited for sources
       *   known to post text-overlay graphics (e.g. Phuket Hot News red-blob posts):
       *   - File size limit raised to 400KB (catches larger graphic files)
       *   - Low-variety detection: < 8 clusters + > 50% dominance (catches gradient blobs)
       */
      async analyzeImageSafely(imageUrl, options) {
        const strictMode = options?.strictMode ?? false;
        const fileSizeThreshold = strictMode ? 4e5 : 15e4;
        try {
          const headResponse = await fetch(imageUrl, { method: "HEAD" });
          if (!headResponse.ok) {
            return {
              status: "download_failed",
              confidence: "low",
              reason: `Download failed (${headResponse.status}) - accepting post (CDN error shouldn't block)`
            };
          }
          const contentLength = headResponse.headers.get("content-length");
          const fileSize = contentLength ? parseInt(contentLength, 10) : 0;
          if (fileSize > 0 && fileSize < fileSizeThreshold) {
            const getResponse = await fetch(imageUrl);
            if (!getResponse.ok) {
              return {
                status: "download_failed",
                confidence: "low",
                reason: `Small file (${Math.round(fileSize / 1024)}KB) but download failed - accepting`,
                metadata: { fileSize }
              };
            }
            const imageBuffer = Buffer.from(await getResponse.arrayBuffer());
            const colorResult = await this.analyzeColorDominance(imageBuffer);
            const isHighDominance = colorResult.dominancePercentage > 75;
            const isLowVariety = strictMode ? colorResult.uniqueColorClusters < 8 && colorResult.dominancePercentage > 50 : colorResult.uniqueColorClusters < 5 && colorResult.dominancePercentage > 60;
            if (isHighDominance || isLowVariety) {
              const detectionMethod = isHighDominance ? "solid color" : "low color variety (gradient)";
              return {
                status: "solid_background",
                confidence: "high",
                reason: `File ${Math.round(fileSize / 1024)}KB, ${colorResult.dominancePercentage.toFixed(1)}% dominant color, ${colorResult.uniqueColorClusters} color clusters = ${detectionMethod} text graphic`,
                metadata: {
                  fileSize,
                  dominancePercentage: colorResult.dominancePercentage,
                  dominantColor: colorResult.dominantColor
                }
              };
            } else {
              return {
                status: "real_photo",
                confidence: "medium",
                reason: `File ${Math.round(fileSize / 1024)}KB with ${colorResult.uniqueColorClusters} color clusters (${colorResult.dominancePercentage.toFixed(1)}% dominant) - accepting as real photo`,
                metadata: {
                  fileSize,
                  dominancePercentage: colorResult.dominancePercentage
                }
              };
            }
          } else if (fileSize > 0) {
            return {
              status: "real_photo",
              confidence: "high",
              reason: `Large file (${Math.round(fileSize / 1024)}KB) - real photo`,
              metadata: { fileSize }
            };
          } else {
            const getResponse = await fetch(imageUrl);
            if (!getResponse.ok) {
              return {
                status: "download_failed",
                confidence: "low",
                reason: `No size header and download failed - accepting (CDN error)`
              };
            }
            const imageBuffer = Buffer.from(await getResponse.arrayBuffer());
            const actualSize = imageBuffer.length;
            if (actualSize < fileSizeThreshold) {
              const colorResult = await this.analyzeColorDominance(imageBuffer);
              const isHighDominance = colorResult.dominancePercentage > 75;
              const isLowVariety = strictMode ? colorResult.uniqueColorClusters < 8 && colorResult.dominancePercentage > 50 : colorResult.uniqueColorClusters < 5 && colorResult.dominancePercentage > 60;
              if (isHighDominance || isLowVariety) {
                const detectionMethod = isHighDominance ? "solid color" : "low color variety (gradient)";
                return {
                  status: "solid_background",
                  confidence: "high",
                  reason: `File ${Math.round(actualSize / 1024)}KB, ${colorResult.uniqueColorClusters} color clusters = ${detectionMethod} text graphic`,
                  metadata: {
                    fileSize: actualSize,
                    dominancePercentage: colorResult.dominancePercentage,
                    dominantColor: colorResult.dominantColor
                  }
                };
              }
            }
            return {
              status: "real_photo",
              confidence: "medium",
              reason: `Downloaded and analyzed - appears to be real photo`,
              metadata: { fileSize: actualSize }
            };
          }
        } catch (error) {
          return {
            status: "analysis_error",
            confidence: "low",
            reason: `Analysis error: ${error instanceof Error ? error.message : "Unknown"} - accepting post`
          };
        }
      }
      /**
       * Analyze color dominance of an image buffer
       * Returns percentage of pixels that are the dominant color
       */
      async analyzeColorDominance(imageBuffer) {
        const { data, info } = await sharp2(imageBuffer).resize(32, 32, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
        const colorCounts = /* @__PURE__ */ new Map();
        const tolerance = 50;
        for (let i = 0; i < data.length; i += info.channels) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          let matched = false;
          for (const [colorKey, count] of Array.from(colorCounts.entries())) {
            const [cr, cg, cb] = colorKey.split(",").map(Number);
            const distance = Math.sqrt(
              Math.pow(r - cr, 2) + Math.pow(g - cg, 2) + Math.pow(b - cb, 2)
            );
            if (distance < tolerance) {
              colorCounts.set(colorKey, count + 1);
              matched = true;
              break;
            }
          }
          if (!matched) {
            colorCounts.set(`${r},${g},${b}`, 1);
          }
        }
        const totalPixels = data.length / info.channels;
        let maxCount = 0;
        let dominantColor = "";
        for (const [color, count] of Array.from(colorCounts.entries())) {
          if (count > maxCount) {
            maxCount = count;
            dominantColor = color;
          }
        }
        const dominancePercentage = maxCount / totalPixels * 100;
        const uniqueColorClusters = colorCounts.size;
        return { dominancePercentage, dominantColor, uniqueColorClusters };
      }
      /**
       * Batch analysis of multiple images
       * Returns summary: are ALL images text graphics?
       */
      async analyzeMultipleImages(imageUrls, options) {
        const results = await Promise.all(
          imageUrls.map(async (url) => ({
            url,
            analysis: await this.analyzeImageSafely(url, options)
          }))
        );
        const allTextGraphics = results.every(
          (r) => r.analysis.status === "solid_background" && r.analysis.confidence === "high"
        );
        const anyRealPhotos = results.some(
          (r) => r.analysis.status === "real_photo" || r.analysis.status === "download_failed" || r.analysis.status === "analysis_error"
        );
        const realPhotoCount = results.filter(
          (r) => r.analysis.status === "real_photo" && r.analysis.confidence !== "low"
        ).length;
        const multipleRealPhotos = realPhotoCount >= 2;
        return { allTextGraphics, anyRealPhotos, multipleRealPhotos, results };
      }
    };
    imageAnalysisService = new ImageAnalysisService();
  }
});

// server/services/duplicate-verifier.ts
import OpenAI6 from "openai";
var openai6, DuplicateVerifierService;
var init_duplicate_verifier = __esm({
  "server/services/duplicate-verifier.ts"() {
    "use strict";
    openai6 = new OpenAI6({
      apiKey: process.env.OPENAI_API_KEY
    });
    DuplicateVerifierService = class {
      /**
       * Use GPT-4o-mini to analyze two stories and determine if they're about the same event
       * This is used for borderline cases (70-85% embedding similarity) where we need
       * deeper semantic understanding
       * 
       * Now analyzes FULL CONTENT, not just titles, for accurate duplicate detection
       */
      async verifyDuplicate(newTitle, newContent, existingTitle, existingContent, similarityScore) {
        try {
          const response = await openai6.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a news editor analyzing whether two news stories describe the same event.

Your task is to:
1. Read the FULL CONTENT of both stories carefully
2. Extract key information from both stories
3. Determine if they're reporting on the SAME EVENT (not just similar topics)
4. Provide clear reasoning for your decision

Two stories are DUPLICATES if they report on the same specific incident, even if:
- They have different framing or angles
- Different sources posted them
- The headlines emphasize different aspects
- The wording is completely different
- One focuses on the rescue, the other on the stranding
- They have conflicting initial facts (e.g., one reports 1 injured, the other reports 3 detained, one mentions the boat sinking, the other omits it). conflicting initial details are very common in breaking news from different sources but refer to the same event.

Two stories are NOT DUPLICATES if they:
- Report on entirely different incidents (even of the same type)
- Occurred at different times or dates
- Involve different people or locations
- Are general updates vs. specific events

IMPORTANT: Read the full story content, not just the titles. Many duplicates have different titles but identical facts in the body.

Return your analysis in JSON format.`
              },
              {
                role: "user",
                content: `Analyze these two news stories and determine if they're about the same event:

**New Story:**
Title: "${newTitle}"
Content: "${newContent.substring(0, 1500)}" ${newContent.length > 1500 ? "...(truncated)" : ""}

**Existing Story:**
Title: "${existingTitle}"
Content: "${existingContent.substring(0, 1500)}" ${existingContent.length > 1500 ? "...(truncated)" : ""}

**Embedding Similarity:** ${(similarityScore * 100).toFixed(1)}%

Return a JSON object with:
{
  "isDuplicate": boolean,
  "confidence": number (0-1),
  "reasoning": "detailed explanation",
  "newStoryAnalysis": {
    "eventType": "type of event (rescue, accident, crime, etc.)",
    "location": ["specific locations mentioned"],
    "people": ["people, groups, or entities involved"],
    "timing": "when it happened (if mentioned)",
    "coreFacts": ["key facts about what happened"]
  },
  "existingStoryAnalysis": {
    "eventType": "type of event",
    "location": ["specific locations mentioned"],
    "people": ["people, groups, or entities involved"],
    "timing": "when it happened (if mentioned)",
    "coreFacts": ["key facts about what happened"]
  }
}`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1
            // Low temperature for consistent analysis
          });
          const result = JSON.parse(response.choices[0].message.content || "{}");
          return {
            isDuplicate: result.isDuplicate || false,
            confidence: result.confidence || 0,
            reasoning: result.reasoning || "No reasoning provided",
            newStoryAnalysis: result.newStoryAnalysis || {
              eventType: "unknown",
              location: [],
              people: [],
              timing: "unknown",
              coreFacts: []
            },
            existingStoryAnalysis: result.existingStoryAnalysis || {
              eventType: "unknown",
              location: [],
              people: [],
              timing: "unknown",
              coreFacts: []
            }
          };
        } catch (error) {
          console.error("Error verifying duplicate:", error);
          return {
            isDuplicate: true,
            confidence: 0.5,
            reasoning: "Error occurred during verification - defaulting to duplicate for safety",
            newStoryAnalysis: {
              eventType: "unknown",
              location: [],
              people: [],
              timing: "unknown",
              coreFacts: []
            },
            existingStoryAnalysis: {
              eventType: "unknown",
              location: [],
              people: [],
              timing: "unknown",
              coreFacts: []
            }
          };
        }
      }
    };
  }
});

// server/services/image-downloader.ts
var image_downloader_exports = {};
__export(image_downloader_exports, {
  ImageDownloaderService: () => ImageDownloaderService,
  imageDownloaderService: () => imageDownloaderService
});
import fs2 from "fs/promises";
import path2 from "path";
import crypto2 from "crypto";
import sharp3 from "sharp";
import { v2 as cloudinary } from "cloudinary";
var ImageDownloaderService, imageDownloaderService;
var init_image_downloader = __esm({
  "server/services/image-downloader.ts"() {
    "use strict";
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    ImageDownloaderService = class {
      uploadDir;
      publicPath;
      constructor() {
        this.uploadDir = path2.join(process.cwd(), "public", "uploads");
        this.publicPath = "/uploads";
      }
      /**
       * Ensure the upload directory exists (legacy support)
       */
      async ensureUploadDir() {
        try {
          await fs2.access(this.uploadDir);
        } catch {
          await fs2.mkdir(this.uploadDir, { recursive: true });
        }
      }
      /**
       * Download an image from a URL, optimize it, and upload to Cloudinary.
       * Returns the secure Cloudinary URL.
       */
      async downloadAndSaveImage(url, prefix = "img", options = {}) {
        try {
          if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            console.warn("\u26A0\uFE0F Cloudinary not configured. Falling back to local storage.");
            return this.downloadAndSaveImageLocal(url, prefix, options);
          }
          console.log(`\u2B07\uFE0F  Downloading image: ${url}`);
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
          if (!response.ok) {
            console.error(`Failed to fetch image: ${response.statusText} (${url})`);
            return null;
          }
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const optimizedBuffer = await sharp3(buffer).resize({ width: 1e3, withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();
          return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: "phuketradar",
                public_id: `${prefix}-${Date.now()}-${crypto2.randomBytes(4).toString("hex")}`,
                resource_type: "image",
                // Apply face blur effect if requested
                transformation: options.blurFaces ? [
                  { width: 1e3, crop: "limit" },
                  { effect: "blur_faces:2000" },
                  // High blur for privacy
                  { quality: "auto" }
                ] : void 0
              },
              (error, result) => {
                if (error) {
                  console.error("\u274C Cloudinary upload failed:", {
                    message: error.message,
                    name: error.name,
                    http_code: error.http_code
                  });
                  console.warn("\u26A0\uFE0F  Falling back to original URL");
                  resolve(url);
                } else {
                  if (options.blurFaces) {
                    console.log(`\u2705 Uploaded to Cloudinary with FACE BLUR: ${result?.secure_url}`);
                  } else {
                    console.log(`\u2705 Uploaded to Cloudinary: ${result?.secure_url}`);
                  }
                  resolve(result?.secure_url || null);
                }
              }
            );
            uploadStream.end(optimizedBuffer);
          });
        } catch (error) {
          console.error(`Error processing image (${url}):`, error);
          return null;
        }
      }
      /**
       * Legacy local download method (Fallback)
       */
      async downloadAndSaveImageLocal(url, prefix = "img", options = {}) {
        try {
          await this.ensureUploadDir();
          const response = await fetch(url);
          if (!response.ok) return null;
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const timestamp2 = Date.now();
          const random = crypto2.randomBytes(4).toString("hex");
          const filename = `${prefix}-${timestamp2}-${random}.webp`;
          const filepath = path2.join(this.uploadDir, filename);
          let sharpInstance = sharp3(buffer).resize({ width: 1e3, withoutEnlargement: true });
          if (options.blurFaces) {
            console.warn("\u26A0\uFE0F Local face blurring not implemented. Image saved without blur.");
          }
          await sharpInstance.webp({ quality: 75 }).toFile(filepath);
          console.log(`\u2705 Image saved locally: ${filename}`);
          return `${this.publicPath}/${filename}`;
        } catch (error) {
          console.error(`Error saving local image:`, error);
          return null;
        }
      }
    };
    imageDownloaderService = new ImageDownloaderService();
  }
});

// server/services/duplicate-detection.ts
import OpenAI7 from "openai";
var openai7, DuplicateDetectionService;
var init_duplicate_detection = __esm({
  "server/services/duplicate-detection.ts"() {
    "use strict";
    init_semantic_similarity();
    openai7 = new OpenAI7({ apiKey: process.env.OPENAI_API_KEY });
    DuplicateDetectionService = class {
      /**
       * Main duplicate detection method - uses multi-layer approach
       * CRITICAL: GPT verification is ALWAYS run on embedding matches to catch
       * semantically-same stories with different wording (e.g., "iron rods" vs "steel pipe")
       */
      async findDuplicates(article, storage2) {
        console.log("[DUPLICATE DETECTION] Starting multi-layer detection...");
        if (!article.embedding) {
          console.log("[DUPLICATE DETECTION] No embedding provided, skipping semantic detection");
          return [];
        }
        const embeddingMatches = await this.findByEmbedding(article.embedding, storage2);
        console.log(`[DUPLICATE DETECTION] Embedding layer found ${embeddingMatches.length} potential matches`);
        if (embeddingMatches.length === 0) {
          return [];
        }
        const titleMatches = this.findByTitleSimilarity(article.title, embeddingMatches);
        if (titleMatches.length > 0) {
          console.log(`[DUPLICATE DETECTION] Title similarity layer found ${titleMatches.length} strong matches - returning immediately`);
          return titleMatches.map((match) => ({
            isDuplicate: true,
            confidence: match.similarity,
            matchedArticle: match.article,
            reason: `Title similarity: ${(match.similarity * 100).toFixed(0)}% match with "${match.article.title.substring(0, 50)}..."`
          }));
        }
        const entityMatches = await this.filterByEntities(article, embeddingMatches);
        console.log(`[DUPLICATE DETECTION] Entity layer filtered to ${entityMatches.length} candidates`);
        const candidatesForGPT = entityMatches.length > 0 ? entityMatches : embeddingMatches.slice(0, 3);
        if (candidatesForGPT.length === 0) {
          return [];
        }
        console.log(`[DUPLICATE DETECTION] Running GPT verification on ${candidatesForGPT.length} candidates...`);
        const verifiedMatches = await this.verifyWithGPT4(article, candidatesForGPT);
        console.log(`[DUPLICATE DETECTION] GPT-4 verification confirmed ${verifiedMatches.length} duplicates`);
        return verifiedMatches;
      }
      async findRelatedStories(article, storage2) {
        console.log(`[RELATED STORY SEARCH] Looking for updates/related stories for: "${article.title}"`);
        if (!article.embedding) {
          console.log(`[RELATED STORY SEARCH] No embedding for article, skipping related search`);
          return [];
        }
        const candidates = await this.findByEmbedding(article.embedding, storage2, 0.35);
        if (candidates.length === 0) return [];
        const entityMatches = await this.filterByEntities({
          title: article.title,
          content: article.content,
          originalTitle: article.originalTitle || void 0,
          originalContent: article.originalContent || void 0
        }, candidates);
        if (entityMatches.length === 0) return [];
        const relatedStories = [];
        for (const candidate of entityMatches) {
          if (candidate.id === article.id) continue;
          try {
            const isRelated = await this.checkIfRelated(article, candidate);
            if (isRelated) {
              relatedStories.push(candidate);
            }
          } catch (error) {
            console.error(`[RELATED STORY SEARCH] Error checking relation:`, error);
          }
        }
        console.log(`[RELATED STORY SEARCH] Found ${relatedStories.length} related stories`);
        return relatedStories;
      }
      /**
       * Check if two articles are related (updates of each other)
       */
      async checkIfRelated(article1, article2) {
        const systemPrompt = `You are a news editor determining if two articles are about the SAME evolving event.
    
    They are related if:
    - They describe the same event (e.g. "Landslide in Patong")
    - One is an update to the other
    - They cover different aspects of the same specific incident
    
    Return JSON: { "isRelated": true/false, "reason": "..." }`;
        const userPrompt = `Article 1: "${article1.title}"
${article1.content.substring(0, 500)}

Article 2: "${article2.title}"
${article2.content.substring(0, 500)}`;
        const response = await openai7.chat.completions.create({
          model: "gpt-4o-mini",
          // Cost optimization: mini is sufficient for duplicate detection
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1
        });
        const result = JSON.parse(response.choices[0].message.content || "{}");
        return result.isRelated === true;
      }
      /**
       * Layer 1.5: Find articles with similar titles + matching key terms
       * This catches obvious duplicates like "Fire at Chalong Bay" vs "Fire Breaks Out at Chalong Bay"
       * that might have lower embedding similarity due to different wording
       */
      findByTitleSimilarity(newTitle, candidates) {
        const matches = [];
        const newTokens = this.tokenizeTitle(newTitle);
        const newBigrams = this.getBigrams(newTokens);
        for (const candidate of candidates) {
          const candidateTokens = this.tokenizeTitle(candidate.title);
          const candidateBigrams = this.getBigrams(candidateTokens);
          const similarity = this.jaccardSimilarity(newBigrams, candidateBigrams);
          const keyTermOverlap = this.calculateKeyTermOverlap(newTokens, candidateTokens);
          const combinedScore = Math.max(similarity, similarity * 0.7 + keyTermOverlap * 0.3);
          if (combinedScore >= 0.65) {
            console.log(`[DUPLICATE DETECTION] Title match found:`);
            console.log(`   New: "${newTitle.substring(0, 60)}..."`);
            console.log(`   Existing: "${candidate.title.substring(0, 60)}..."`);
            console.log(`   Bigram similarity: ${(similarity * 100).toFixed(0)}%, Key terms: ${(keyTermOverlap * 100).toFixed(0)}%, Combined: ${(combinedScore * 100).toFixed(0)}%`);
            matches.push({ article: candidate, similarity: combinedScore });
          }
        }
        return matches;
      }
      /**
       * Tokenize a title into lowercase words, removing common articles/prepositions
       */
      tokenizeTitle(title) {
        const stopWords = /* @__PURE__ */ new Set([
          "a",
          "an",
          "the",
          "in",
          "on",
          "at",
          "to",
          "for",
          "of",
          "and",
          "or",
          "by",
          "with",
          "as",
          "is",
          "are",
          "was",
          "were",
          "be",
          "been",
          "being",
          "after",
          "before",
          "during",
          "while",
          "about",
          "into",
          "through"
        ]);
        return title.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((word) => word.length > 2 && !stopWords.has(word));
      }
      /**
       * Generate bigrams from tokens for more robust matching
       */
      getBigrams(tokens) {
        const bigrams = /* @__PURE__ */ new Set();
        for (let i = 0; i < tokens.length - 1; i++) {
          bigrams.add(`${tokens[i]}_${tokens[i + 1]}`);
        }
        const importantPatterns = /^(fire|accident|crash|rescue|drowning|dead|killed|injured|arrest|police|phuket|patong|chalong|karon|kata|rawai|kamala|mai\s*khao|airport|beach|pier|bay|road|hospital|crane|construction|condo|building|collapse|fall|falls|fell|pipe|steel|iron|rods|roof|damage)/i;
        for (const token of tokens) {
          if (importantPatterns.test(token)) {
            bigrams.add(`_key_${token}`);
          }
        }
        return bigrams;
      }
      /**
       * Calculate Jaccard similarity between two sets
       */
      jaccardSimilarity(setA, setB) {
        if (setA.size === 0 && setB.size === 0) return 0;
        const intersection = new Set(Array.from(setA).filter((x) => setB.has(x)));
        const union = /* @__PURE__ */ new Set([...Array.from(setA), ...Array.from(setB)]);
        return intersection.size / union.size;
      }
      /**
       * Calculate overlap of key terms (locations, event types, numbers)
       */
      calculateKeyTermOverlap(tokensA, tokensB) {
        const locations = /* @__PURE__ */ new Set([
          "phuket",
          "patong",
          "chalong",
          "karon",
          "kata",
          "rawai",
          "kamala",
          "surin",
          "bang",
          "tao",
          "nai",
          "harn",
          "mai",
          "khao",
          "airport",
          "town",
          "pier",
          "bay",
          "beach",
          "road",
          "hospital",
          "school",
          "temple",
          "market",
          "koh",
          "lipe",
          "phi",
          "island",
          "sea",
          "ocean",
          "phang",
          "nga",
          "krabi",
          "satun"
        ]);
        const eventTypes = /* @__PURE__ */ new Set([
          "fire",
          "accident",
          "crash",
          "rescue",
          "drowning",
          "dead",
          "death",
          "killed",
          "injured",
          "arrest",
          "arrested",
          "police",
          "robbery",
          "theft",
          "assault",
          "flood",
          "storm",
          "landslide",
          "collapse",
          "explosion",
          "shooting",
          // Construction-related (for crane/building accidents)
          "crane",
          "construction",
          "condo",
          "building",
          "tower",
          "site",
          "fall",
          "falls",
          "fell",
          "pipe",
          "steel",
          "iron",
          "rods",
          "roof",
          "home",
          "house",
          "damage",
          // Marine-related
          "boat",
          "vessel",
          "ship",
          "speedboat",
          "ferry",
          "yacht",
          "navy",
          "marine"
        ]);
        const keyTermsA = new Set(tokensA.filter((t) => locations.has(t) || eventTypes.has(t)));
        const keyTermsB = new Set(tokensB.filter((t) => locations.has(t) || eventTypes.has(t)));
        if (keyTermsA.size === 0 || keyTermsB.size === 0) return 0;
        const intersection = new Set(Array.from(keyTermsA).filter((x) => keyTermsB.has(x)));
        const minSize = Math.min(keyTermsA.size, keyTermsB.size);
        return intersection.size / minSize;
      }
      /**
       * Layer 1: Find articles with similar embeddings
       */
      async findByEmbedding(embedding, storage2, threshold = 0.4) {
        if (!embedding || embedding.length === 0) {
          console.log("[DUPLICATE DETECTION] No embedding provided, skipping embedding search");
          return [];
        }
        try {
          const recentCandidates = await storage2.getRecentArticlesWithEmbeddings(3);
          if (recentCandidates.length === 0) {
            return [];
          }
          const matches = [];
          for (const candidate of recentCandidates) {
            if (!candidate.embedding) continue;
            const similarity = cosineSimilarity(embedding, candidate.embedding);
            if (similarity >= threshold) {
              const fullArticle = await storage2.getArticleById(candidate.id);
              if (fullArticle) {
                matches.push(fullArticle);
              }
            }
          }
          return matches;
        } catch (error) {
          console.error("[DUPLICATE DETECTION] Embedding search failed:", error);
          return [];
        }
      }
      /**
       * Layer 2: Extract entities and filter by matching location/time
       */
      async filterByEntities(article, candidates) {
        try {
          const entities = await this.extractEntities(article.originalTitle || article.title, article.originalContent || article.content);
          if (entities.length === 0) {
            return candidates;
          }
          const filtered = candidates.filter((candidate) => {
            const candidateText = `${candidate.originalTitle || candidate.title} ${candidate.originalContent || candidate.content}`;
            const locationEntities = entities.filter((e) => e.type === "location");
            if (locationEntities.length > 0) {
              const hasMatchingLocation = locationEntities.some(
                (entity) => candidateText.toLowerCase().includes(entity.value.toLowerCase())
              );
              if (hasMatchingLocation) {
                return true;
              }
            }
            const eventEntities = entities.filter((e) => e.type === "event" || e.type === "person");
            if (eventEntities.length > 0) {
              const matchCount = eventEntities.filter(
                (entity) => candidateText.toLowerCase().includes(entity.value.toLowerCase())
              ).length;
              if (matchCount / eventEntities.length >= 0.3) {
                return true;
              }
            }
            return false;
          });
          return filtered.length > 0 ? filtered : candidates.slice(0, 5);
        } catch (error) {
          console.error("[DUPLICATE DETECTION] Error in entity filtering:", error);
          return candidates;
        }
      }
      /**
       * Extract key entities from text using GPT-4
       */
      async extractEntities(title, content) {
        try {
          const text2 = title + "\n\n" + content.substring(0, 500);
          const systemPrompt = "Extract key entities from this Thai news article. Return a JSON array of entities with type (location, person, organization, event) and value. Focus on specific locations (beaches, roads, districts), event types (accident, rescue, drowning), and key people/organizations.";
          const response = await openai7.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: text2
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3
          });
          const result = JSON.parse(response.choices[0].message.content || '{"entities":[]}');
          return result.entities || [];
        } catch (error) {
          console.error("[DUPLICATE DETECTION] Error extracting entities:", error);
          return [];
        }
      }
      /**
       * Layer 3: Use GPT-4 to verify if articles are about the same incident
       */
      async verifyWithGPT4(article, candidates) {
        const results = [];
        for (const candidate of candidates) {
          try {
            const systemPrompt = `You are analyzing if two news articles report on the SAME incident or event. 

Consider them the same if:
- They describe the same specific event/incident at the same general location and time.
- They may be at different stages of the event (e.g., search -> rescue -> body found).
- They have conflicting initial reports or details (e.g., one says 1 injured, another says 3 detained; one says boat sank, another doesn't mention it). This is EXTREMELY common in breaking news from different sources. As long as the core incident is the same, they are duplicates.

Consider them different if:
- They are about different incidents entirely or occurred on different dates.
- They are about recurring but separate events (e.g., two different beach drownings on different days).

Return JSON with:
{
  "isSameIncident": true/false,
  "confidence": 0-100,
  "reason": "brief explanation"
}`;
            const article1Title = article.originalTitle || article.title;
            const article1Content = (article.originalContent || article.content).substring(0, 800);
            const article2Title = candidate.originalTitle || candidate.title;
            const article2Content = (candidate.originalContent || candidate.content).substring(0, 800);
            const userPrompt = `Article 1 (NEW):
Title: ${article1Title}
Content: ${article1Content}

Article 2 (EXISTING):
Title: ${article2Title}
Content: ${article2Content}

Are these about the same incident?`;
            const response = await openai7.chat.completions.create({
              model: "gpt-4o-mini",
              // Cost optimization: mini is sufficient for duplicate verification
              messages: [
                {
                  role: "system",
                  content: systemPrompt
                },
                {
                  role: "user",
                  content: userPrompt
                }
              ],
              response_format: { type: "json_object" },
              temperature: 0.2
            });
            const result = JSON.parse(response.choices[0].message.content || "{}");
            if (result.isSameIncident && result.confidence >= 60) {
              console.log(`[DUPLICATE DETECTION] GPT confirmed duplicate (${result.confidence}% confidence): "${candidate.title?.substring(0, 50)}..." [${candidate.sourceName || "Unknown source"}]`);
              results.push({
                isDuplicate: true,
                confidence: result.confidence / 100,
                matchedArticle: candidate,
                reason: result.reason
              });
            } else if (result.isSameIncident) {
              console.log(`[DUPLICATE DETECTION] GPT found possible duplicate but confidence too low (${result.confidence}% < 60%): "${candidate.title?.substring(0, 50)}..."`);
            }
          } catch (error) {
            console.error("[DUPLICATE DETECTION] Error in GPT-4 verification:", error);
          }
        }
        return results;
      }
    };
  }
});

// server/services/story-merger.ts
import OpenAI8 from "openai";
var openai8, StoryMergerService;
var init_story_merger = __esm({
  "server/services/story-merger.ts"() {
    "use strict";
    init_format_utils();
    openai8 = new OpenAI8({ apiKey: process.env.OPENAI_API_KEY });
    StoryMergerService = class {
      /**
       * Merge multiple duplicate articles into one comprehensive story
       */
      async mergeStories(stories) {
        if (stories.length === 0) {
          throw new Error("Cannot merge zero stories");
        }
        if (stories.length === 1) {
          return {
            title: stories[0].title,
            content: stories[0].content,
            excerpt: stories[0].excerpt,
            isDeveloping: stories[0].isDeveloping || false,
            combinedDetails: "No merge required - single story"
          };
        }
        console.log(`[STORY MERGER] Merging ${stories.length} duplicate stories using GPT-4...`);
        try {
          const systemPrompt = `You are a news editor combining multiple reports about the SAME incident into one comprehensive, well-researched article.

Your goal is to:
1. Extract ALL unique details from each report - specific names, ages, quantities, times, locations
2. Reconcile different terminology that refers to the same thing (e.g., "iron rods" and "steel pipe" may be the same object)
3. Cross-reference information from different sources to build the most complete picture
4. Identify which source has the most specific/accurate information for each detail
5. Create a single, cohesive article that reads as if from a single well-informed source
6. Use active, journalistic writing style with specific details (not vague)
7. Preserve all Thai names, numbers, and specific locations

IMPORTANT FOR ACCURACY:
- If sources differ on a specific detail (e.g., location name), use the MORE SPECIFIC one
- If sources use different words for the same thing, combine them: "Large iron rods (steel pipes) from a crane..."
- Include ALL specific quantities, distances, times mentioned by any source
- Mark the story as "developing" ONLY if critical info is genuinely missing

Return JSON with:
{
  "title": "Most comprehensive headline with specific location and key detail",
  "content": "Full article combining ALL unique information from every source",
  "excerpt": "Compelling 1-2 sentence summary with key facts",
  "isDeveloping": true/false,
  "combinedDetails": "Brief note on what unique details each source contributed"
}`;
          const storiesText = stories.map((story, index2) => {
            const timeAgo = this.getTimeAgo(story.publishedAt);
            const source = story.sourceName || "Unknown";
            return `--- Story ${index2 + 1} (Source: ${source}, published ${timeAgo}) ---
Title: ${story.originalTitle || story.title}
Content: ${(story.originalContent || story.content).substring(0, 2e3)}
`;
          }).join("\n\n");
          const userPrompt = `Merge these ${stories.length} reports about the same incident into one comprehensive article.
Extract and combine ALL specific details (names, ages, times, locations, quantities) from each source:

${storiesText}

Create a single, complete article that is MORE detailed than any individual source.
Note: This story is compiled from ${stories.length} different sources: ${stories.map((s) => s.sourceName || "Unknown").join(", ")}.`;
          const response = await openai8.chat.completions.create({
            model: "gpt-4o-mini",
            // Cost optimization: mini is sufficient for merging stories
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: userPrompt
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.4
          });
          const result = JSON.parse(response.choices[0].message.content || "{}");
          console.log(`[STORY MERGER] Successfully merged stories into: "${result.title}"`);
          console.log(`[STORY MERGER] Combined details: ${result.combinedDetails}`);
          console.log(`[STORY MERGER] Developing status: ${result.isDeveloping}`);
          return {
            title: result.title || stories[0].title,
            content: ensureProperParagraphFormatting(result.content || stories[0].content),
            excerpt: result.excerpt || stories[0].excerpt,
            isDeveloping: result.isDeveloping ?? true,
            // Default to developing if not specified
            combinedDetails: result.combinedDetails || `Merged ${stories.length} stories`
          };
        } catch (error) {
          console.error("[STORY MERGER] Error merging stories:", error);
          const fallback = stories.sort(
            (a, b) => b.content.length - a.content.length
          )[0];
          return {
            title: fallback.title,
            content: fallback.content,
            excerpt: fallback.excerpt,
            isDeveloping: true,
            combinedDetails: "Merge failed, using longest story as fallback"
          };
        }
      }
      /**
       * Helper to calculate time ago from a date
       */
      getTimeAgo(date2) {
        const now = /* @__PURE__ */ new Date();
        const diffMs = now.getTime() - new Date(date2).getTime();
        const diffMins = Math.floor(diffMs / 6e4);
        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
      }
    };
  }
});

// server/services/enrichment.ts
import OpenAI9 from "openai";
var openai9, EnrichmentService;
var init_enrichment = __esm({
  "server/services/enrichment.ts"() {
    "use strict";
    init_format_utils();
    openai9 = new OpenAI9({ apiKey: process.env.OPENAI_API_KEY });
    EnrichmentService = class {
      /**
       * Enrich a developing story with context, background, and updates
       */
      async enrichStory(article) {
        console.log(`[ENRICHMENT] Enriching article: ${article.title}`);
        try {
          const systemPrompt = `You are a senior news editor updating a breaking news story with new details.

\u{1F6A8} CRITICAL - FACTUAL ACCURACY RULES (READ FIRST) \u{1F6A8}
You MUST only include facts that are ALREADY in the article. This is an ENRICHMENT pass, not invention:
- Do NOT add new "facts" that aren't in the original content
- Do NOT upgrade vague words to more dramatic synonyms (e.g., "reckless" \u2192 "stunts" is FORBIDDEN)
- Do NOT invent quotes, witness statements, police responses, or specific numbers
- Do NOT add: "caused chaos", "performing stunts", "appeared agitated", "witnesses described" unless already present
- \u{1F6A8} PATONG/BANGLA ROAD HALLUCINATION WARNING: If the source says "Patong", do NOT assume it happened on "Bangla Road". Patong has many other piers, docks, shops, and beaches. Only name Bangla Road if the source EXPLICITLY mentions it.
- \u{1F697}\u{1F3CD}\uFE0F VEHICLE TYPE ACCURACY (CRITICAL - CORRECT IF WRONG): The Thai word "\u0E23\u0E16" (rot) is a GENERIC term meaning "vehicle" \u2014 NOT specifically "car". If the article currently says "car" but the source only used "\u0E23\u0E16" without a specific car modifier (\u0E23\u0E16\u0E22\u0E19\u0E15\u0E4C/\u0E40\u0E01\u0E4B\u0E07), CORRECT it to "vehicle". Similarly, only use "motorbike" if the source explicitly said \u0E23\u0E16\u0E08\u0E31\u0E01\u0E23\u0E22\u0E32\u0E19\u0E22\u0E19\u0E15\u0E4C/\u0E21\u0E2D\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E44\u0E0B\u0E04\u0E4C. When vehicle type is unknown, always use "vehicle" \u2014 never guess. Apply this correction to the title too.

\u{1F6AB} DO NOT ADD GENERIC AREA DESCRIPTIONS (CRITICAL - OUR READERS KNOW PHUKET):
Our readers are LOCAL RESIDENTS and EXPATS who know Phuket extremely well. DO NOT add condescending tourist-guide fluff like:
- "Patong, a bustling tourist area on Phuket's west coast" - LOCALS KNOW WHAT PATONG IS
- "Bangla Road, famous for its nightlife" - EVERYONE KNOWS THIS  
- "Patong is known for nightlife" - THIS IS PATRONIZING
- "Chalong, known for the Big Buddha" - LOCALS LIVE HERE

Write like you're talking to an INSIDER who reads this site every day, not a clueless tourist visiting for the first time.

\u2705 WHAT YOU MAY ADD (if applicable):
- RECURRING PATTERN context: "This is the latest in a series of similar incidents in the area" (ONLY if actually true)
- PUBLIC SENTIMENT: If there are comments or reactions, summarize what locals are saying
- UPDATES: New information from official sources
- BETTER ORGANIZATION: Clean up the narrative flow

EXAMPLES OF FORBIDDEN ENRICHMENT:
\u274C Source says "tourists riding recklessly" \u2192 You add "performing dangerous stunts"
\u274C Source says "police stopped them" \u2192 You add "arrested and fined"
\u274C Source says "disturbing the area" \u2192 You add "created havoc, causing traffic jams"
\u274C You add "Patong, a major tourist area, often sees..." - LOCALS KNOW THIS, STOP ADDING IT
\u2705 You reorganize facts into better narrative flow
\u2705 You add "Residents on social media expressed frustration..." (if comments exist)

\u{1F6A8} CRITICAL - PHUKET STREET NAME DISAMBIGUATION:
Phuket Town has streets NAMED AFTER other Thai cities. DO NOT misidentify locations:
- "Bangkok Road" / "\u0E16\u0E19\u0E19\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E" = A street in PHUKET TOWN, NOT Bangkok city
- "Krabi Road" / "\u0E16\u0E19\u0E19\u0E01\u0E23\u0E30\u0E1A\u0E35\u0E48" = A street in PHUKET TOWN, NOT Krabi province  
- "Phang Nga Road" / "\u0E16\u0E19\u0E19\u0E1E\u0E31\u0E07\u0E07\u0E32" = A street in PHUKET TOWN, NOT Phang Nga province

\u26A0\uFE0F CRITICAL: If the article mentions "Bangkok Road", the event is in PHUKET TOWN, NOT Bangkok!
This is a FACTUAL ERROR if you change the location to Bangkok. DO NOT MAKE THIS MISTAKE.

Your goal is to:
1. Create a single, cohesive narrative that integrates ALL existing facts cleanly
2. Do NOT just append "Update:" at the bottom - reorganize naturally
3. Keep Thai names, locations, and specific details exact - ESPECIALLY verify the location is correct
4. Use active, professional journalistic writing
5. DO NOT add generic area descriptions - our readers are locals who know Phuket
6. If the story is still unfolding (missing key outcomes, names, or official statements), mark it as developing

\u{1F4F0} HIGH-INTEREST STORY GUIDELINES (Score 4-5):
For serious stories (fatal accidents, major crimes, drownings), ensure:
- The tone matches the gravity of the event
- All factual details are preserved accurately
- Location is 100% verified (check street name disambiguation above!)
- The lede clearly states the most important facts
- The content is substantial enough for the story's importance

Structure:
- Lead paragraph with the most important existing fact
- Body paragraphs organized logically
- Public reaction/sentiment (if available)
- Clean, professional flow

Return JSON with:
{
  "enrichedContent": "The reorganized article - NO generic area descriptions added",
  "updateSummary": "Brief note on what was reorganized (NOT 'added location context')",
  "shouldContinueDeveloping": true/false (true if still missing key details)
}`;
          const enrichmentCount = article.enrichmentCount || 0;
          const lastEnriched = article.lastEnrichedAt ? new Date(article.lastEnrichedAt).toISOString() : "never";
          const userPrompt = `Enrich this ${article.isDeveloping ? "developing" : "published"} news story.

Original Article:
Title: ${article.title}
Content: ${article.content}

Metadata:
- Category: ${article.category}
- Interest Score: ${article.interestScore || "unknown"}
- Times previously enriched: ${enrichmentCount}
- Last enriched: ${lastEnriched}
- Source: ${article.sourceName || "Unknown"}

Reorganize for clarity. Do NOT add new facts, events, or details that aren't already in the article. 
CRITICAL: Do NOT add generic area descriptions like "bustling tourist area" or "known for nightlife" - our readers are locals who already know Phuket.
Mark shouldContinueDeveloping as true if still developing.`;
          const response = await openai9.chat.completions.create({
            model: "gpt-4o-mini",
            // Cost optimization: mini is sufficient for enrichment updates
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: userPrompt
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3
            // Low temperature for factual accuracy
          });
          const result = JSON.parse(response.choices[0].message.content || "{}");
          console.log(`[ENRICHMENT] Successfully enriched article`);
          console.log(`[ENRICHMENT] Update summary: ${result.updateSummary}`);
          console.log(`[ENRICHMENT] Should continue developing: ${result.shouldContinueDeveloping}`);
          return {
            enrichedContent: ensureProperParagraphFormatting(result.enrichedContent || article.content),
            updateSummary: result.updateSummary || "Added context and background",
            shouldContinueDeveloping: result.shouldContinueDeveloping ?? false
          };
        } catch (error) {
          console.error("[ENRICHMENT] Error enriching story:", error);
          return {
            enrichedContent: article.content,
            updateSummary: "Enrichment failed, using original content",
            shouldContinueDeveloping: article.isDeveloping || false
          };
        }
      }
      /**
       * Find articles ready for enrichment
       * - Developing stories
       * - Not enriched recently (at least 15 mins ago)
       * - Published in last 24 hours
       */
      async findStoriesReadyForEnrichment() {
        return [];
      }
    };
  }
});

// server/services/story-enrichment-coordinator.ts
var story_enrichment_coordinator_exports = {};
__export(story_enrichment_coordinator_exports, {
  StoryEnrichmentCoordinator: () => StoryEnrichmentCoordinator
});
var StoryEnrichmentCoordinator;
var init_story_enrichment_coordinator = __esm({
  "server/services/story-enrichment-coordinator.ts"() {
    "use strict";
    init_duplicate_detection();
    init_story_merger();
    init_enrichment();
    init_format_utils();
    StoryEnrichmentCoordinator = class {
      duplicateDetector;
      storyMerger;
      enrichmentService;
      constructor() {
        this.duplicateDetector = new DuplicateDetectionService();
        this.storyMerger = new StoryMergerService();
        this.enrichmentService = new EnrichmentService();
      }
      /**
       * Process a newly translated story - detect duplicates, merge if needed
       * This is called AFTER translation but BEFORE saving to database
       */
      async processNewStory(translatedArticle, storage2) {
        console.log(`
\u{1F50D} [ENRICHMENT COORDINATOR] Processing: "${translatedArticle.title?.substring(0, 60)}..."`);
        const duplicates = await this.duplicateDetector.findDuplicates({
          title: translatedArticle.title || "",
          content: translatedArticle.content || "",
          originalTitle: translatedArticle.originalTitle || void 0,
          originalContent: translatedArticle.originalContent || void 0,
          embedding: translatedArticle.embedding,
          publishedAt: /* @__PURE__ */ new Date()
        }, storage2);
        if (duplicates.length === 0) {
          console.log(`\u2705 [ENRICHMENT COORDINATOR] No duplicates found - creating new article`);
          return {
            action: "create",
            article: translatedArticle
          };
        }
        console.log(`\u{1F504} [ENRICHMENT COORDINATOR] Found ${duplicates.length} duplicate(s) - merging stories...`);
        const duplicateArticles = [];
        for (const dup of duplicates) {
          if (dup.matchedArticle) {
            duplicateArticles.push(dup.matchedArticle);
          }
        }
        const newArticleForMerge = {
          ...translatedArticle,
          id: "temp-new",
          publishedAt: /* @__PURE__ */ new Date(),
          isPublished: translatedArticle.isPublished ?? false,
          embedding: translatedArticle.embedding
        };
        const allStories = [newArticleForMerge, ...duplicateArticles];
        const mergedStory = await this.storyMerger.mergeStories(allStories);
        const primaryArticle = this.selectPrimaryArticle(duplicateArticles);
        const bestImage = this.selectBestImage(allStories);
        if (primaryArticle) {
          console.log(`\u{1F4DD} [ENRICHMENT COORDINATOR] Updating existing article: ${primaryArticle.id}`);
          console.log(`   Combined details: ${mergedStory.combinedDetails}`);
          console.log(`   Developing: ${mergedStory.isDeveloping}`);
          console.log(`   Sources merged: ${allStories.map((s) => s.sourceName || "Unknown").join(", ")}`);
          const updatePayload = {
            enrichmentCount: (primaryArticle.enrichmentCount || 0) + 1,
            lastEnrichedAt: /* @__PURE__ */ new Date()
          };
          if (!primaryArticle.lastManualEditAt) {
            updatePayload.title = mergedStory.title;
            updatePayload.content = ensureProperParagraphFormatting(mergedStory.content);
            updatePayload.excerpt = mergedStory.excerpt;
            updatePayload.isDeveloping = mergedStory.isDeveloping;
          } else {
            console.log(`   \u{1F512} Preserving manual edits for article ${primaryArticle.id}`);
          }
          if (bestImage.imageUrl && !primaryArticle.imageUrl) {
            updatePayload.imageUrl = bestImage.imageUrl;
            console.log(`   \u{1F4F8} Adding image from secondary source: ${bestImage.imageUrl.substring(0, 60)}...`);
          }
          if (bestImage.imageUrls && bestImage.imageUrls.length > 0 && (!primaryArticle.imageUrls || primaryArticle.imageUrls.length === 0)) {
            updatePayload.imageUrls = bestImage.imageUrls;
          }
          await storage2.updateArticle(primaryArticle.id, updatePayload);
          const otherDuplicates = duplicateArticles.filter((a) => a.id !== primaryArticle.id);
          for (const dup of otherDuplicates) {
            await storage2.updateArticle(dup.id, {
              mergedIntoId: primaryArticle.id,
              isPublished: false
              // Unpublish merged duplicates so they don't show in feeds
            });
            console.log(`   \u{1F517} Merged & unpublished duplicate: ${dup.id} (${dup.sourceName || "Unknown source"})`);
          }
          return {
            action: "merge",
            mergedWith: duplicateArticles.map((a) => a.id),
            reason: `Merged with ${duplicateArticles.length} existing article(s): ${mergedStory.combinedDetails}`
          };
        } else {
          console.log(`\u{1F4DD} [ENRICHMENT COORDINATOR] Creating new merged article`);
          return {
            action: "create",
            article: {
              ...translatedArticle,
              title: mergedStory.title,
              content: ensureProperParagraphFormatting(mergedStory.content),
              excerpt: mergedStory.excerpt,
              isDeveloping: mergedStory.isDeveloping,
              enrichmentCount: 1,
              lastEnrichedAt: /* @__PURE__ */ new Date()
            }
          };
        }
      }
      /**
       * Select the primary article from duplicates
       * Priority: published > higher interest score > earlier published date
       */
      selectPrimaryArticle(articles2) {
        if (articles2.length === 0) return null;
        return articles2.sort((a, b) => {
          if (a.isPublished && !b.isPublished) return -1;
          if (!a.isPublished && b.isPublished) return 1;
          const scoreA = a.interestScore || 0;
          const scoreB = b.interestScore || 0;
          if (scoreA !== scoreB) return scoreB - scoreA;
          return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
        })[0];
      }
      /**
       * Select the best image from all stories being merged.
       * Prefers stories with images; picks the one with the most images.
       */
      selectBestImage(stories) {
        let best = null;
        let bestCount = 0;
        for (const story of stories) {
          const count = (story.imageUrls?.length || 0) + (story.imageUrl ? 1 : 0);
          if (count > bestCount) {
            bestCount = count;
            best = story;
          }
        }
        if (!best) return { imageUrl: null, imageUrls: null };
        return { imageUrl: best.imageUrl || null, imageUrls: best.imageUrls || null };
      }
      /**
       * Run enrichment pass on developing stories
       * Called by the scheduled enrichment endpoint
       */
      async enrichDevelopingStories(storage2) {
        console.log(`
\u{1F504} [ENRICHMENT COORDINATOR] Starting enrichment pass...`);
        const readyForEnrichment = await storage2.getDevelopingArticles();
        console.log(`\u{1F4CA} [ENRICHMENT COORDINATOR] Found ${readyForEnrichment.length} developing stories`);
        let enriched = 0;
        let completed = 0;
        let failed = 0;
        for (const article of readyForEnrichment) {
          try {
            const lastUpdated = new Date(article.lastEnrichedAt || article.publishedAt);
            const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1e3 * 60 * 60);
            if (hoursSinceUpdate > 6) {
              console.log(`\u{1F6D1} [ENRICHMENT] Story "${article.title.substring(0, 40)}..." is stale (>6h). Removing from Live.`);
              await storage2.updateArticle(article.id, { isDeveloping: false });
              completed++;
              continue;
            }
            if (article.lastEnrichedAt) {
              const timeSinceEnrichment = Date.now() - new Date(article.lastEnrichedAt).getTime();
              if (timeSinceEnrichment < 10 * 60 * 1e3) {
                console.log(`\u23ED\uFE0F  Skipping "${article.title.substring(0, 40)}..." - enriched ${Math.round(timeSinceEnrichment / 6e4)}m ago`);
                continue;
              }
            }
            if (article.lastManualEditAt) {
              console.log(`\u{1F512} [ENRICHMENT] Skipping "${article.title.substring(0, 40)}..." - manually edited by admin, will not auto-enrich`);
              await storage2.updateArticle(article.id, { isDeveloping: false });
              completed++;
              continue;
            }
            console.log(`
\u{1F50D} [ENRICHMENT] Checking for updates for: "${article.title.substring(0, 60)}..."`);
            const relatedStories = await this.duplicateDetector.findRelatedStories(article, storage2);
            if (relatedStories.length > 0) {
              console.log(`\u{1F504} [ENRICHMENT] Found ${relatedStories.length} related stories/updates. Merging...`);
              const allStories = [article, ...relatedStories];
              const mergedStory = await this.storyMerger.mergeStories(allStories);
              const bestImage = this.selectBestImage(allStories);
              const updatePayload = {
                title: mergedStory.title,
                content: ensureProperParagraphFormatting(mergedStory.content),
                excerpt: mergedStory.excerpt,
                isDeveloping: mergedStory.isDeveloping,
                enrichmentCount: (article.enrichmentCount || 0) + 1,
                lastEnrichedAt: /* @__PURE__ */ new Date()
              };
              if (bestImage.imageUrl && !article.imageUrl) {
                updatePayload.imageUrl = bestImage.imageUrl;
              }
              if (bestImage.imageUrls && bestImage.imageUrls.length > 0 && (!article.imageUrls || article.imageUrls.length === 0)) {
                updatePayload.imageUrls = bestImage.imageUrls;
              }
              await storage2.updateArticle(article.id, updatePayload);
              for (const related of relatedStories) {
                await storage2.updateArticle(related.id, {
                  mergedIntoId: article.id,
                  isPublished: false
                  // Unpublish merged duplicates
                });
                console.log(`   \u{1F517} Merged & unpublished: ${related.id} (${related.sourceName || "Unknown source"})`);
              }
              enriched++;
              console.log(`\u2705 [ENRICHMENT] Successfully merged updates into main story`);
              continue;
            }
            console.log(`\u{1F527} [ENRICHMENT] Enriching content: "${article.title.substring(0, 60)}..."`);
            const enrichmentResult = await this.enrichmentService.enrichStory(article);
            await storage2.updateArticle(article.id, {
              content: enrichmentResult.enrichedContent,
              isDeveloping: enrichmentResult.shouldContinueDeveloping,
              enrichmentCount: (article.enrichmentCount || 0) + 1,
              lastEnrichedAt: /* @__PURE__ */ new Date()
            });
            enriched++;
            if (!enrichmentResult.shouldContinueDeveloping) {
              completed++;
              console.log(`\u2705 [ENRICHMENT] Story completed (no longer developing)`);
            } else {
              console.log(`\u{1F504} [ENRICHMENT] Story still developing, will enrich again later`);
            }
          } catch (error) {
            console.error(`\u274C [ENRICHMENT] Failed to enrich article ${article.id}:`, error);
            failed++;
          }
        }
        console.log(`
\u{1F4CA} [ENRICHMENT COORDINATOR] Enrichment pass complete:`);
        console.log(`   Enriched: ${enriched}`);
        console.log(`   Completed: ${completed}`);
        console.log(`   Failed: ${failed}`);
        return { enriched, completed, failed };
      }
    };
  }
});

// server/services/story-update-detector.ts
var story_update_detector_exports = {};
__export(story_update_detector_exports, {
  StoryUpdateDetectorService: () => StoryUpdateDetectorService,
  getStoryUpdateDetectorService: () => getStoryUpdateDetectorService
});
import OpenAI10 from "openai";
function getStoryUpdateDetectorService() {
  if (!storyUpdateDetectorInstance) {
    storyUpdateDetectorInstance = new StoryUpdateDetectorService();
  }
  return storyUpdateDetectorInstance;
}
var openai10, EVENT_PROGRESSIONS, StoryUpdateDetectorService, storyUpdateDetectorInstance;
var init_story_update_detector = __esm({
  "server/services/story-update-detector.ts"() {
    "use strict";
    init_semantic_similarity();
    openai10 = new OpenAI10({ apiKey: process.env.OPENAI_API_KEY });
    EVENT_PROGRESSIONS = [
      // Missing person stories
      { from: ["missing", "disappear", "search", "searching", "seek", "looking"], to: ["found", "body", "drowns", "drowned", "dead", "dies", "recovered", "rescue"] },
      // Accident stories
      { from: ["accident", "crash", "collision", "injured", "hospitalized", "critical"], to: ["dies", "dead", "death", "fatal", "killed", "passes away", "succumbs"] },
      // Fire stories
      { from: ["fire", "blaze", "burning", "flames"], to: ["extinguished", "contained", "damage", "destroyed", "deaths", "casualties"] },
      // Arrest/Investigation stories
      { from: ["suspect", "investigation", "manhunt", "search"], to: ["arrested", "caught", "apprehended", "charged", "sentenced"] },
      // Rescue stories
      { from: ["stranded", "trapped", "stuck", "rescue underway"], to: ["rescued", "saved", "recovered", "freed"] },
      // Storm/Weather stories
      { from: ["approaching", "warning", "expected", "forecast"], to: ["hits", "struck", "damage", "aftermath", "recovery"] }
    ];
    StoryUpdateDetectorService = class {
      /**
       * Check if a new article is an update to an existing story
       * Uses multi-stage detection:
       * 1. Find candidate stories from last 48 hours with similar embeddings
       * 2. Check for event progression patterns
       * 3. Use GPT to verify the relationship
       */
      async detectStoryUpdate(newArticle, storage2) {
        console.log(`
\u{1F504} [STORY UPDATE DETECTOR] Checking for story updates...`);
        console.log(`   Title: "${newArticle.title?.substring(0, 60)}..."`);
        if (!newArticle.embedding) {
          console.log(`   \u26A0\uFE0F No embedding available - skipping update detection`);
          return { isUpdate: false, confidence: 0 };
        }
        const recentArticles = await storage2.getRecentArticlesWithEmbeddings(2);
        console.log(`   \u{1F4F0} Found ${recentArticles.length} recent articles to check`);
        if (recentArticles.length === 0) {
          return { isUpdate: false, confidence: 0 };
        }
        const candidates = [];
        const embedding = newArticle.embedding;
        for (const existing of recentArticles) {
          if (!existing.embedding) continue;
          const similarity = cosineSimilarity(embedding, existing.embedding);
          if (similarity >= 0.35 && similarity < 0.85) {
            candidates.push({ article: existing, similarity });
          }
        }
        if (candidates.length === 0) {
          console.log(`   \u274C No candidate stories found in 35-85% similarity range`);
          return { isUpdate: false, confidence: 0 };
        }
        candidates.sort((a, b) => b.similarity - a.similarity);
        console.log(`   \u{1F50D} Found ${candidates.length} candidate stories for update check`);
        const newTitleLower = (newArticle.title || "").toLowerCase();
        const newContentLower = (newArticle.content || "").toLowerCase();
        const newText = newTitleLower + " " + newContentLower;
        for (const { article: candidate, similarity } of candidates.slice(0, 5)) {
          const existingTitleLower = candidate.title.toLowerCase();
          const existingContentLower = (candidate.content || "").toLowerCase();
          const existingText = existingTitleLower + " " + existingContentLower;
          for (const progression of EVENT_PROGRESSIONS) {
            const existingHasFromKeyword = progression.from.some((kw) => existingText.includes(kw));
            const newHasToKeyword = progression.to.some((kw) => newText.includes(kw));
            if (existingHasFromKeyword && newHasToKeyword) {
              console.log(`   \u26A1 Event progression detected: "${progression.from.find((kw) => existingText.includes(kw))}" \u2192 "${progression.to.find((kw) => newText.includes(kw))}"`);
              const gptResult = await this.verifyUpdateWithGPT(newArticle, candidate, similarity);
              if (gptResult.isUpdate) {
                const fullArticle = await storage2.getArticleById(candidate.id);
                return {
                  isUpdate: true,
                  originalStory: fullArticle || void 0,
                  confidence: gptResult.confidence,
                  progressionType: `${progression.from[0]} \u2192 ${progression.to[0]}`,
                  reasoning: gptResult.reasoning
                };
              }
            }
          }
          if (similarity >= 0.5) {
            console.log(`   \u{1F9E0} High similarity (${(similarity * 100).toFixed(1)}%) - checking with GPT...`);
            const gptResult = await this.verifyUpdateWithGPT(newArticle, candidate, similarity);
            if (gptResult.isUpdate) {
              const fullArticle = await storage2.getArticleById(candidate.id);
              return {
                isUpdate: true,
                originalStory: fullArticle || void 0,
                confidence: gptResult.confidence,
                reasoning: gptResult.reasoning
              };
            }
          }
        }
        console.log(`   \u2705 No story update detected - this is a new story`);
        return { isUpdate: false, confidence: 0 };
      }
      /**
       * Use GPT-4 to verify if the new article is an update to the existing story
       */
      async verifyUpdateWithGPT(newArticle, existingArticle, similarity) {
        try {
          const systemPrompt = `You are a news editor determining if a NEW article is an UPDATE or FOLLOW-UP to an EXISTING article.

They are an UPDATE/FOLLOW-UP if:
- They describe the SAME specific incident/event (same person, same location, same situation)
- The new article provides NEW INFORMATION (outcome, developments, additional details)
- The new article is a PROGRESSION (e.g., "search" \u2192 "body found"; "accident" \u2192 "victim dies")
- The time between them makes sense for a developing story (hours to days)

They are NOT an update if:
- They are about DIFFERENT incidents (different people, different times)
- They are DUPLICATES (same story, no new information)
- They are about similar but SEPARATE events

CRITICAL: Pay attention to:
- Person descriptions (age, nationality, gender) - must match for it to be an update
- Specific locations - must be same general area
- Time references - new story should be later in timeline

Return JSON:
{
  "isUpdate": true/false,
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "personMatch": true/false,
  "locationMatch": true/false,
  "eventProgression": "description of how the story progressed, if applicable"
}`;
          const userPrompt = `EXISTING ARTICLE (published earlier):
Title: "${existingArticle.title}"
Content: ${(existingArticle.content || "").substring(0, 1e3)}

NEW ARTICLE (just received):
Title: "${newArticle.title}"  
Content: ${(newArticle.content || "").substring(0, 1e3)}

Embedding Similarity: ${(similarity * 100).toFixed(1)}%

Is the NEW article an update/follow-up to the EXISTING article?`;
          const response = await openai10.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1
          });
          const result = JSON.parse(response.choices[0].message.content || "{}");
          console.log(`   \u{1F9E0} GPT Update Check Result:`);
          console.log(`      Is Update: ${result.isUpdate}`);
          console.log(`      Confidence: ${result.confidence}%`);
          console.log(`      Reasoning: ${result.reasoning}`);
          if (result.eventProgression) {
            console.log(`      Event Progression: ${result.eventProgression}`);
          }
          return {
            isUpdate: result.isUpdate === true && result.confidence >= 70,
            confidence: result.confidence || 0,
            reasoning: result.reasoning || "No reasoning provided"
          };
        } catch (error) {
          console.error(`   \u274C GPT verification failed:`, error);
          return { isUpdate: false, confidence: 0, reasoning: "GPT verification failed" };
        }
      }
      /**
       * Link a new article as an update to an existing story
       * Modifies the new article content to include reference to original
       * Optionally creates or updates a timeline
       */
      async linkAsUpdate(newArticle, originalStory, storage2, progressionType) {
        console.log(`
\u{1F517} [STORY UPDATE] Linking as update to: "${originalStory.title.substring(0, 50)}..."`);
        try {
          const { buildArticleUrl: buildArticleUrl2 } = await Promise.resolve().then(() => (init_category_map(), category_map_exports));
          const originalUrl = buildArticleUrl2({
            category: originalStory.category,
            slug: originalStory.slug || "",
            id: originalStory.id
          });
          const updateNotice = this.generateUpdateNotice(originalStory, originalUrl, progressionType);
          const modifiedContent = updateNotice + "\n\n" + (newArticle.content || "");
          let seriesId = originalStory.seriesId;
          let timelineCreated = false;
          if (!seriesId) {
            console.log(`   \u{1F4C5} Creating timeline for developing story...`);
            const { getTimelineService: getTimelineService2 } = await Promise.resolve().then(() => (init_timeline_service(), timeline_service_exports));
            const timelineService = getTimelineService2(storage2);
            const seriesTitle = this.generateSeriesTitle(originalStory, newArticle);
            const result = await timelineService.createStoryTimeline({
              parentArticleId: originalStory.id,
              seriesTitle
            });
            seriesId = result.seriesId;
            timelineCreated = true;
            console.log(`   \u2705 Created timeline: "${seriesTitle}" (${seriesId})`);
          }
          return {
            success: true,
            linkedStoryId: originalStory.id,
            modifiedContent,
            timelineCreated,
            seriesId
          };
        } catch (error) {
          console.error(`   \u274C Failed to link as update:`, error);
          return { success: false };
        }
      }
      /**
       * Generate the update notice HTML to prepend to article content
       */
      generateUpdateNotice(originalStory, originalUrl, progressionType) {
        const timeAgo = this.getTimeAgo(originalStory.publishedAt);
        return `<div class="story-update-notice" style="background: linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%); border-left: 4px solid #3b82f6; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
<p style="margin: 0 0 8px 0; font-size: 0.875rem; color: #60a5fa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">\u{1F4F0} Update to Developing Story</p>
<p style="margin: 0; color: #e2e8f0; font-size: 0.95rem;">This article is an update to <a href="${originalUrl}" style="color: #60a5fa; text-decoration: underline; font-weight: 500;">${originalStory.title}</a>, published ${timeAgo}.</p>
</div>`;
      }
      /**
       * Generate a timeline series title from the stories
       * Creates descriptive titles that include key identifying information
       */
      generateSeriesTitle(originalStory, updateStory) {
        const originalTitle = originalStory.title;
        const combinedTitle = originalTitle + " " + (updateStory.title || "");
        const combinedLower = combinedTitle.toLowerCase();
        const locationPatterns = [
          /at\s+([^,]+(?:Beach|Road|Pier|Bay|Island|Hospital|Hotel|Airport))/i,
          /in\s+(Patong|Chalong|Karon|Kata|Rawai|Kamala|Phuket Town|Bang Tao|Thalang|Wichit|Kathu|Rassada|Saphan Hin|Phuket City)/i,
          /near\s+([^,]+)/i
        ];
        let location = "";
        for (const pattern of locationPatterns) {
          const match = combinedTitle.match(pattern);
          if (match) {
            location = match[1].trim();
            break;
          }
        }
        const victimPatterns = [
          // "Iraqi National Ameer Mundher..." -> "Iraqi National"
          /(\w+)\s+(?:National|Citizen|Tourist|Man|Woman|Expat)/i,
          // "24-year-old Iraqi" -> "Iraqi"
          /(\d+)[\s-]*year[\s-]*old\s+(\w+)/i,
          // "Russian tourist" -> "Russian Tourist"
          /(Russian|Chinese|British|American|German|French|Thai|Burmese|Myanmar|Iraqi|Iranian|Indian|Australian|Swedish|Norwegian|Finnish|Danish|Korean|Japanese)\s+(tourist|national|citizen|man|woman|expat)/i
        ];
        let victimInfo = "";
        for (const pattern of victimPatterns) {
          const match = combinedTitle.match(pattern);
          if (match) {
            if (pattern.source.includes("year")) {
              victimInfo = `${match[2]} National`;
            } else if (match[2]) {
              victimInfo = `${match[1]} ${match[2].charAt(0).toUpperCase() + match[2].slice(1)}`;
            } else {
              victimInfo = match[1] + " National";
            }
            break;
          }
        }
        const eventPatterns = [
          { pattern: /shoot|shot|gunshot|gun|firearm/i, event: "Shooting Incident", prefix: "Phuket" },
          { pattern: /stab|stabbing|stabbed|knife/i, event: "Stabbing Incident", prefix: "Phuket" },
          { pattern: /murder|murdered|homicide|killed|killing/i, event: "Fatal Incident", prefix: "Phuket" },
          { pattern: /assault|attack|beaten|violence/i, event: "Assault Case", prefix: "Phuket" },
          { pattern: /drown|drowning|drowned|missing.*sea|missing.*water/i, event: "Drowning Incident", prefix: "Phuket" },
          { pattern: /fire|blaze|burn|inferno/i, event: "Fire Incident", prefix: "" },
          { pattern: /crash|accident|collision|vehicle|motorcycle|car/i, event: "Traffic Accident", prefix: "" },
          { pattern: /arrest|apprehend|custody|charged/i, event: "Police Investigation", prefix: "" },
          { pattern: /drug|narcotics|trafficking|smuggling/i, event: "Drug Case", prefix: "Phuket" },
          { pattern: /rescue|stranded|trapped|saved/i, event: "Rescue Operation", prefix: "" },
          { pattern: /flood|flooding|flooded|storm|weather|rain/i, event: "Weather Event", prefix: "" },
          { pattern: /explosion|bomb|blast/i, event: "Explosion Incident", prefix: "Phuket" },
          { pattern: /robbery|robbed|theft|stolen/i, event: "Robbery Case", prefix: "" },
          { pattern: /scam|fraud|deceived/i, event: "Fraud Case", prefix: "" }
        ];
        let eventType = "";
        let prefix = "Phuket";
        for (const { pattern, event, prefix: eventPrefix } of eventPatterns) {
          if (pattern.test(combinedLower)) {
            eventType = event;
            prefix = eventPrefix || "Phuket";
            break;
          }
        }
        if (eventType && victimInfo) {
          if (location) {
            return `${prefix ? prefix + " " : ""}${eventType}: ${victimInfo} in ${location} - Developing`;
          }
          return `${prefix ? prefix + " " : ""}${eventType}: ${victimInfo} - Developing`;
        }
        if (eventType && location) {
          return `${prefix ? prefix + " " : ""}${eventType} in ${location} - Developing`;
        }
        if (eventType) {
          return `${prefix ? prefix + " " : ""}${eventType} - Developing`;
        }
        const cleanedTitle = this.cleanTitleForSeries(originalTitle);
        if (cleanedTitle.length > 0) {
          return cleanedTitle + " - Developing";
        }
        if (location) {
          return `Developing Story in ${location}`;
        }
        return "Developing Story";
      }
      /**
       * Clean a title for use as a series title
       * Removes time-specific phrases, source attributions, etc.
       */
      cleanTitleForSeries(title) {
        let cleaned = title.replace(/\b(breaking|just in|update|latest|now|today|yesterday|this morning|this evening|hours ago)\b:?\s*/gi, "").replace(/[-–]\s*(source|report|reports|says|according to)[^,]*/gi, "").replace(/\s+/g, " ").trim();
        if (cleaned.length > 80) {
          const colonIndex = cleaned.indexOf(":");
          if (colonIndex > 10 && colonIndex < 60) {
            cleaned = cleaned.substring(0, colonIndex + 1) + cleaned.substring(colonIndex + 1, 80).trim();
          } else {
            cleaned = cleaned.substring(0, 77).trim() + "...";
          }
        }
        return cleaned;
      }
      /**
       * Calculate time ago string
       */
      getTimeAgo(date2) {
        const now = /* @__PURE__ */ new Date();
        const past = new Date(date2);
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 6e4);
        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      }
    };
    storyUpdateDetectorInstance = null;
  }
});

// server/services/re-enrichment.ts
var re_enrichment_exports = {};
__export(re_enrichment_exports, {
  ReEnrichmentService: () => ReEnrichmentService,
  getReEnrichmentService: () => getReEnrichmentService
});
import * as cheerio from "cheerio";
import Parser from "rss-parser";
function getReEnrichmentService(storage2) {
  if (!instance) {
    instance = new ReEnrichmentService(storage2);
  }
  return instance;
}
var rssParser, SOURCES, LOCATION_VARIANTS, INCIDENT_TYPES, NATIONALITIES, ReEnrichmentService, instance;
var init_re_enrichment = __esm({
  "server/services/re-enrichment.ts"() {
    "use strict";
    init_translator();
    rssParser = new Parser();
    SOURCES = [
      {
        name: "The Thaiger",
        searchUrl: "https://thethaiger.com/?s=",
        baseUrl: "https://thethaiger.com",
        rssFeedUrl: "https://thethaiger.com/news/phuket/feed"
      },
      {
        name: "Khaosod English",
        searchUrl: "https://www.khaosodenglish.com/?s=",
        baseUrl: "https://www.khaosodenglish.com",
        rssFeedUrl: "https://www.khaosodenglish.com/feed/"
      }
      // To be added later once system works:
      // {
      //   name: 'The Phuket News',
      //   searchUrl: 'https://www.thephuketnews.com/search.php?q=',
      //   baseUrl: 'https://www.thephuketnews.com',
      // },
      // {
      //   name: 'The Phuket Express',
      //   searchUrl: 'https://thephuketexpress.com/?s=',
      //   baseUrl: 'https://thephuketexpress.com',
      // }
    ];
    LOCATION_VARIANTS = {
      "thepkrasattri": ["thepkrasattri", "thep krasattri", "thep krassattri", "thepkasattri"],
      "kathu": ["kathu", "katu"],
      "cherngtalay": ["cherng talay", "choeng thale", "cherngtalay"],
      "thalang": ["thalang", "talang"],
      "chalong": ["chalong"],
      "rawai": ["rawai", "raway"],
      "kamala": ["kamala", "kamara"],
      "patong": ["patong", "ba tong"],
      "karon": ["karon"],
      "kata": ["kata"],
      "nai harn": ["nai harn", "naiharn"],
      "phuket town": ["phuket town", "phuket city", "mueang phuket"],
      "surin": ["surin"],
      "bangtao": ["bangtao", "bang tao"],
      "sri soonthorn": ["sri soonthorn", "srisoontorn", "sri sunthon"],
      "pa klok": ["pa klok", "paklok", "pa klock"],
      "panwa": ["panwa", "cape panwa"],
      "makham": ["makham", "aa makham"],
      "saphan hin": ["saphan hin", "sapan hin"],
      "rassada": ["rassada", "rasada"],
      "koh kaew": ["koh kaew", "ko kaew"],
      "si ko": ["si ko", "si kor", "sikor"],
      "soi": ["soi", "soi."],
      // Missing Phuket areas
      "wichit": ["wichit", "vichit"],
      "ao po": ["ao po"],
      "mai khao": ["mai khao", "maikhao"],
      "nai yang": ["nai yang", "naiyang"],
      "layan": ["layan", "la yan"],
      "kalim": ["kalim"],
      "tri trang": ["tri trang", "tritrang"],
      "freedom beach": ["freedom beach"],
      "laem singh": ["laem singh"],
      "ya nui": ["ya nui", "yanui"],
      "nai thon": ["nai thon", "naithon"],
      "ao yon": ["ao yon"],
      "koh sirey": ["koh sirey", "ko sirey", "sirey island"],
      "koh maphrao": ["koh maphrao", "coconut island"],
      "boat lagoon": ["boat lagoon"],
      "royal marina": ["royal marina"],
      "bypass road": ["bypass road", "bypass rd"],
      "heroines monument": ["heroines monument", "heroine monument"],
      "central festival": ["central festival", "central phuket"],
      "jungceylon": ["jungceylon", "jung ceylon", "jungcylon"],
      "vachira hospital": ["vachira hospital", "vachira"],
      "bangkok hospital phuket": ["bangkok hospital phuket"],
      "mission hospital": ["mission hospital"],
      "phuket airport": ["phuket airport", "hkt airport", "phuket international"],
      "sarasin bridge": ["sarasin bridge", "sarasin"],
      "dibuk road": ["dibuk road", "dibuk rd"],
      "phang nga road": ["phang nga road"],
      "thepkasattri road": ["thepkasattri road", "thep krasattri road"],
      "old town": ["old town", "old phuket town"],
      // Nearby islands (regularly in Phuket news)
      "similan": ["similan", "similan islands", "koh similan"],
      "phi phi": ["phi phi", "koh phi phi", "phi phi island", "phi phi don", "phi phi leh"],
      "racha": ["racha", "raya", "koh racha", "racha yai", "racha noi"],
      "coral island": ["coral island", "koh hei", "koh hey"],
      "maiton": ["maiton", "mai ton", "koh maiton"],
      "kai island": ["kai island", "koh kai", "koh khai"],
      "yao yai": ["yao yai", "koh yao yai"],
      "yao noi": ["yao noi", "koh yao noi"],
      "rang yai": ["rang yai", "koh rang yai"],
      "bamboo island": ["bamboo island", "koh mai pai"],
      "mosquito island": ["mosquito island"],
      "james bond island": ["james bond island", "khao phing kan"],
      // Surrounding areas that appear in Phuket-relevant news
      "phang nga": ["phang nga", "phangnga"],
      "krabi": ["krabi"],
      "khao lak": ["khao lak", "khaolak"],
      "khao sok": ["khao sok"],
      "surat thani": ["surat thani"],
      "andaman": ["andaman", "andaman sea"]
    };
    INCIDENT_TYPES = {
      "accident": ["accident", "crash", "collision", "smashed"],
      "arrest": ["arrest", "apprehend", "custody", "caught"],
      "raid": ["raid", "crackdown"],
      "drowning": ["drown", "drowning"],
      "fire": ["fire", "blaze", "burn"],
      "murder": ["murder", "kill", "homicide", "shot", "stabbing"],
      "theft": ["theft", "steal", "robbery", "robbed", "burglar", "snatch"],
      "assault": ["assault", "fight", "brawl", "attack", "punch", "slap"],
      // Rescue / maritime
      "rescue": ["rescue", "rescued", "rescuing", "saved", "recovery"],
      "sinking": ["sinking", "sunk", "capsized", "capsize", "overturned", "taking on water"],
      "missing": ["missing", "disappeared", "lost at sea", "search and rescue"],
      "stranded": ["stranded", "stuck", "marooned", "adrift"],
      // Traffic / road incidents (currently missing common terms)
      "hit and run": ["hit and run", "hit-and-run", "fled the scene"],
      "road death": ["road death", "fatal crash", "died at the scene", "dead on arrival"],
      "motorbike": ["motorbike accident", "motorcycle crash", "bike crash"],
      "overturned": ["overturned", "flipped", "rolled over"],
      // Medical / death
      "death": ["death", "dead", "died", "fatal", "fatality", "body found", "found dead"],
      "overdose": ["overdose", "OD"],
      "suicide": ["suicide", "jumped", "fell from"],
      "hospital": ["hospitalized", "hospitalised", "rushed to hospital", "intensive care", "ICU"],
      // Natural events
      "flood": ["flood", "flooding", "flooded", "flash flood"],
      "earthquake": ["earthquake", "tremor", "quake"],
      "landslide": ["landslide", "mudslide"],
      "storm": ["storm", "tropical storm", "heavy rain", "severe weather"],
      "tsunami": ["tsunami", "tidal wave"],
      "lightning": ["lightning", "lightning strike"],
      "riptide": ["riptide", "rip current", "undercurrent", "red flag"],
      // Scam / fraud
      "scam": ["scam", "scammed", "fraud", "fraudulent", "swindle", "con artist", "deceived"],
      "overcharge": ["overcharge", "overcharged", "ripped off", "price gouging"],
      // Immigration / legal
      "overstay": ["overstay", "overstayed", "visa violation", "illegal entry"],
      "deportation": ["deported", "deportation", "blacklisted"],
      "drug": ["drug", "drugs", "narcotics", "methamphetamine", "ya ba", "ya ice", "cannabis", "marijuana", "ketamine", "cocaine"],
      // Other
      "explosion": ["explosion", "exploded", "blast", "bomb"],
      "electrocution": ["electrocuted", "electrocution", "electric shock"],
      "animal attack": ["bitten", "snake bite", "dog attack", "monkey attack", "jellyfish sting"],
      "food poisoning": ["food poisoning", "poisoned", "contaminated"]
    };
    NATIONALITIES = [
      "russian",
      "chinese",
      "indian",
      "australian",
      "british",
      "american",
      "korean",
      "ukrainian",
      "israeli",
      "kazakh",
      "french",
      "german",
      "thai",
      "myanmar",
      "burmese",
      "swiss",
      "swedish",
      "japanese",
      "canadian",
      "dutch",
      "italian",
      "spanish",
      "belgian",
      "norwegian",
      "danish",
      "finnish",
      "polish",
      "czech",
      "austrian",
      "irish",
      "scottish",
      "new zealand",
      "kiwi",
      "south african",
      "malaysian",
      "singaporean",
      "indonesian",
      "vietnamese",
      "cambodian",
      "laotian",
      "filipino",
      "filipina",
      "nigerian",
      "uzbek",
      "tajik",
      "turkish",
      "iranian",
      "saudi",
      "emirati",
      "pakistani",
      "bangladeshi",
      "nepali",
      "sri lankan",
      "estonian",
      "latvian",
      "lithuanian",
      "romanian",
      "hungarian",
      "brazilian",
      "mexican",
      "colombian",
      "argentinian",
      "chilean"
    ];
    ReEnrichmentService = class {
      storage;
      constructor(storage2) {
        this.storage = storage2;
      }
      /**
       * Main entry point to re-enrich an article
       */
      async reEnrichArticle(articleId) {
        console.log(`
\u23F3 STARTING RE-ENRICHMENT for article ID: ${articleId}`);
        try {
          const article = await this.storage.getArticleById(articleId);
          if (!article) {
            console.error(`\u274C Re-enrichment failed: Article ${articleId} not found`);
            return;
          }
          if (article.lastManualEditAt) {
            console.log(`   \u{1F512} Skipping re-enrichment: Article was manually edited by admin.`);
            await this.storage.updateArticle(article.id, {
              reEnrichmentCompleted: true
            });
            return;
          }
          console.log(`   Title: ${article.title}`);
          const combinedText = `${article.title} ${article.content}`;
          const locations = this.extractLocations(combinedText);
          const incidentTypes = this.extractIncidentTypes(combinedText);
          const nationalities = this.extractNationalities(combinedText);
          const numbers = this.extractNumbers(combinedText);
          const times = this.extractTimeReferences(combinedText);
          if (locations.length === 0 || incidentTypes.length === 0) {
            console.log(`   \u26A0\uFE0F Missing required location or incident type for matching. Locs: ${locations.length}, Types: ${incidentTypes.length}. Skipping.`);
            return;
          }
          console.log(`   \u{1F50D} Signals extracted:`);
          console.log(`      Locations: [${locations.join(", ")}]`);
          console.log(`      Incidents: [${incidentTypes.join(", ")}]`);
          console.log(`      Nationalities: [${nationalities.join(", ")}]`);
          console.log(`      Numbers: [${numbers.join(", ")}]`);
          console.log(`      Times: [${times.join(", ")}]`);
          const primaryQuery = `${locations[0]} ${incidentTypes[0]}`;
          const fallbackQuery = `${locations[0]} Phuket`;
          const matchedSources = [];
          const sourcesSearched = [];
          for (const source of SOURCES) {
            console.log(`   \u{1F4E1} Checking source: ${source.name}`);
            sourcesSearched.push(source.name);
            try {
              let match = await this.findMatchingStory(source, article.publishedAt, locations, incidentTypes, nationalities, numbers, times, primaryQuery, false);
              if (!match) {
                console.log(`     [-] No match with primary method. Trying fallback search: "${fallbackQuery}"`);
                match = await this.findMatchingStory(source, article.publishedAt, locations, incidentTypes, nationalities, numbers, times, fallbackQuery, true);
              }
              if (match) {
                console.log(`     \u2705 Match found: ${match.title}`);
                const text2 = await this.extractArticleText(match.link);
                if (text2 && text2.length > 200) {
                  matchedSources.push({
                    name: source.name,
                    publishedDate: match.pubDate || (/* @__PURE__ */ new Date()).toISOString(),
                    extractedText: text2
                  });
                } else {
                  console.log(`     \u26A0\uFE0F Extracted text is too short or empty.`);
                }
              } else {
                console.log(`     [-] No match found in ${source.name}.`);
              }
            } catch (sourceErr) {
              console.error(`     \u274C Error checking source ${source.name}:`, sourceErr);
            }
            await new Promise((resolve) => setTimeout(resolve, 2e3));
          }
          if (matchedSources.length > 0) {
            console.log(`   \u{1F9E0} Running Claude re-enrichment prompt with ${matchedSources.length} matched sources...`);
            const result = await translatorService.reEnrichWithSources(
              article.title,
              article.content,
              article.excerpt,
              article.category,
              article.publishedAt,
              matchedSources
            );
            if (result.hasNewInformation) {
              console.log(`   \u2728 New information found! Updating article...`);
              console.log(`      Summary of new facts: ${result.newFactsSummary}`);
              await this.storage.updateArticle(article.id, {
                title: result.enrichedTitle,
                content: result.enrichedContent,
                excerpt: result.enrichedExcerpt,
                lastEnrichedAt: /* @__PURE__ */ new Date(),
                enrichmentCount: (article.enrichmentCount || 0) + 1
              });
              console.log(`   \u2705 Article updated successfully in database.`);
            } else {
              console.log(`   \u23ED\uFE0F Minimum change threshold not met. No new factual information found. Modifying lastEnrichedAt timestamp only.`);
              await this.storage.updateArticle(article.id, {
                lastEnrichedAt: /* @__PURE__ */ new Date()
              });
            }
          } else {
            console.log(`   \u23ED\uFE0F No matching English sources found for this article.`);
          }
        } catch (err) {
          console.error(`\u274C Re-enrichment job failed for ${articleId}:`, err);
        }
      }
      extractLocations(text2) {
        const locations = /* @__PURE__ */ new Set();
        const lowerText = text2.toLowerCase();
        for (const [canonical, variants] of Object.entries(LOCATION_VARIANTS)) {
          for (const variant of variants) {
            if (variant === "soi" || variant === "soi.") {
              if (new RegExp(`\\bsoi\\.?\\b`, "i").test(lowerText)) {
                locations.add(canonical);
                break;
              }
            } else if (!variant.includes(" ")) {
              if (new RegExp(`\\b${variant}\\b`, "i").test(lowerText)) {
                locations.add(canonical);
                break;
              }
            } else {
              if (lowerText.includes(variant)) {
                locations.add(canonical);
                break;
              }
            }
          }
        }
        const dynamicPatterns = [
          /\b(?:soi\.?)\s+([a-z0-9]+)\b/gi,
          /\b([a-z0-9]+)\s+(?:road|rd\.|rd)\b/gi,
          /\b([a-z0-9]+)\s+(?:intersection)\b/gi,
          /\b([a-z0-9]+)\s+(?:beach)\b/gi
        ];
        for (const pattern of dynamicPatterns) {
          let match;
          while ((match = pattern.exec(text2)) !== null) {
            if (match[1]) locations.add(match[1].toLowerCase());
          }
        }
        return Array.from(locations);
      }
      extractIncidentTypes(text2) {
        const types = /* @__PURE__ */ new Set();
        for (const [canonical, synonyms] of Object.entries(INCIDENT_TYPES)) {
          for (const synonym of synonyms) {
            if (new RegExp(`\\b${synonym}\\b`, "i").test(text2)) {
              types.add(canonical);
              break;
            }
          }
        }
        return Array.from(types);
      }
      extractNationalities(text2) {
        const matches = /* @__PURE__ */ new Set();
        for (const nat of NATIONALITIES) {
          if (new RegExp(`\\b${nat}\\b`, "i").test(text2)) {
            matches.add(nat);
          }
        }
        return Array.from(matches);
      }
      extractNumbers(text2) {
        const matches = /* @__PURE__ */ new Set();
        const patterns = [
          /\b(\d+)\s*(?:years? old|baht|people|tourists|vehicles|cars|motorcycles|men|women|injur|dead|killed|foreigners|locals)\b/gi
        ];
        for (const p of patterns) {
          let m;
          while ((m = p.exec(text2)) !== null) {
            if (m[1]) matches.add(m[1]);
          }
        }
        return Array.from(matches);
      }
      extractTimeReferences(text2) {
        const matches = /* @__PURE__ */ new Set();
        const timeRegex = /\b(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm)|morning|afternoon|evening|night|midnight|noon)\b/gi;
        let m;
        while ((m = timeRegex.exec(text2)) !== null) {
          if (m[1]) matches.add(m[1].toLowerCase());
        }
        return Array.from(matches);
      }
      evaluateMatch(sourceText, ourDate, sourceDate, extractedLocations, extractedIncidentTypes, extractedNationalities, extractedNumbers, extractedTimes) {
        const lowerSourceText = sourceText.toLowerCase();
        const diffHours = (sourceDate.getTime() - ourDate.getTime()) / (1e3 * 60 * 60);
        if (Math.abs(diffHours) > 36) {
          console.log(`        [EVAL] Rejected due to time diff > 36h (${diffHours.toFixed(1)}h)`);
          return 0;
        }
        let hasLocMatch = false;
        let hasIncMatch = false;
        for (const loc of extractedLocations) {
          if (LOCATION_VARIANTS[loc]) {
            for (const variant of LOCATION_VARIANTS[loc]) {
              if (variant === "soi" || variant === "soi.") {
                if (new RegExp(`\\bsoi\\.?\\b`, "i").test(lowerSourceText)) {
                  hasLocMatch = true;
                  break;
                }
              } else if (!variant.includes(" ")) {
                if (new RegExp(`\\b${variant}\\b`, "i").test(lowerSourceText)) {
                  hasLocMatch = true;
                  break;
                }
              } else if (lowerSourceText.includes(variant)) {
                hasLocMatch = true;
                break;
              }
            }
          } else {
            if (lowerSourceText.includes(loc.toLowerCase())) {
              hasLocMatch = true;
            }
          }
          if (hasLocMatch) break;
        }
        for (const inc of extractedIncidentTypes) {
          if (INCIDENT_TYPES[inc]) {
            for (const synonym of INCIDENT_TYPES[inc]) {
              if (new RegExp(`\\b${synonym}\\b`, "i").test(lowerSourceText)) {
                hasIncMatch = true;
                break;
              }
            }
          }
          if (hasIncMatch) break;
        }
        if (!hasLocMatch || !hasIncMatch) {
          console.log(`        [EVAL] Rejected: LocMatch=${hasLocMatch}, IncMatch=${hasIncMatch}`);
          return 0;
        }
        let score = 5;
        for (const nat of extractedNationalities) {
          if (new RegExp(`\\b${nat}\\b`, "i").test(lowerSourceText)) {
            score += 2;
            break;
          }
        }
        for (const num of extractedNumbers) {
          if (new RegExp(`\\b${num}\\b`).test(lowerSourceText)) {
            score += 2;
            break;
          }
        }
        for (const time of extractedTimes) {
          if (lowerSourceText.includes(time)) {
            score += 2;
            break;
          }
        }
        console.log(`        [EVAL] Score: ${score} - TimeDiff: ${diffHours.toFixed(1)}h - Text: "${sourceText.substring(0, 70).replace(/\n/g, " ")}..."`);
        return score;
      }
      async findMatchingStory(source, ourDate, locations, incidentTypes, nationalities, numbers, times, searchQuery, isFallback = false) {
        let bestMatch = null;
        let highestScore = 0;
        if (!isFallback && source.rssFeedUrl) {
          try {
            const feed = await rssParser.parseURL(source.rssFeedUrl);
            const recentItems = feed.items;
            for (const item of recentItems) {
              const textToSearch = `${item.title} ${item.content || item.contentSnippet}`;
              const pubDate = item.pubDate ? new Date(item.pubDate) : /* @__PURE__ */ new Date();
              const score = this.evaluateMatch(textToSearch, ourDate, pubDate, locations, incidentTypes, nationalities, numbers, times);
              if (score >= 5 && score > highestScore) {
                console.log(`        [RSS] \u{1F3C6} High confidence match found! Score: ${score}`);
                highestScore = score;
                bestMatch = {
                  title: item.title || "Match",
                  link: item.link,
                  pubDate: pubDate.toISOString()
                };
              }
            }
          } catch (e) {
            console.error(`      \u26A0\uFE0F RSS fetch failed for ${source.name}:`, e);
          }
        }
        if (bestMatch && highestScore >= 5) {
          return bestMatch;
        }
        console.log(`      [-] ${isFallback ? "Fallback " : ""}Search scraping for "${searchQuery}" on ${source.name}...`);
        try {
          const searchUrl = `${source.searchUrl}${encodeURIComponent(searchQuery)}`;
          console.log(`      [-] URL: ${searchUrl}`);
          const response = await fetch(searchUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
            }
          });
          const html = await response.text();
          const $ = cheerio.load(html);
          const searchResults = $("article, .search-result, .td_module_wrap, .post").slice(0, 5);
          searchResults.each((i, el) => {
            const titleEl = $(el).find("h1, h2, h3, .entry-title").first();
            const linkEl = $(el).find("a").first();
            const excerptEl = $(el).find(".entry-content, .td-excerpt, p").first();
            const dateEl = $(el).find("time, .entry-date, .td-post-date").first();
            const title = titleEl.text().trim();
            let link = linkEl.attr("href") || titleEl.find("a").attr("href");
            const excerpt = excerptEl.text().trim();
            const pubDateStr = dateEl.attr("datetime") || dateEl.text().trim();
            if (!title || !link) return;
            if (!link.startsWith("http") && !link.startsWith("//")) {
              link = source.baseUrl + (link.startsWith("/") ? link : "/" + link);
            } else if (link.startsWith("//")) {
              link = "https:" + link;
            }
            const pubDate = pubDateStr ? new Date(pubDateStr) : /* @__PURE__ */ new Date();
            const textToSearch = `${title} ${excerpt}`;
            const score = this.evaluateMatch(textToSearch, ourDate, pubDate, locations, incidentTypes, nationalities, numbers, times);
            if (score >= 5 && score > highestScore) {
              highestScore = score;
              bestMatch = { title, link, pubDate: pubDate.toISOString() };
            }
          });
        } catch (e) {
          console.error(`      \u26A0\uFE0F Search scrape failed for ${source.name}:`, e);
        }
        return bestMatch;
      }
      async extractArticleText(url) {
        if (!url) return null;
        try {
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
            }
          });
          console.log(`      [-] Fetching article text. Status: ${response.status}`);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const html = await response.text();
          const $ = cheerio.load(html);
          $("script, style, iframe, nav, header, footer, .ads-container, .advertisement, noscript").remove();
          const contentSelectors = [".entry-content", "article", ".post-content", ".td-post-content", ".article-content", ".content"];
          let contentContainer = null;
          for (const selector of contentSelectors) {
            const found = $(selector);
            if (found.length > 0 && found.text().trim().length > 500) {
              contentContainer = found;
              console.log(`      [-] Found content container using selector: ${selector}`);
              break;
            }
          }
          const searchArea = contentContainer || $("body");
          let content = "";
          let pCount = 0;
          searchArea.find("p").each((i, el) => {
            const text2 = $(el).text().trim();
            if (text2.length > 30 && !text2.includes("Copyright") && !text2.includes("All rights reserved")) {
              if (pCount === 0) console.log(`      [-] First paragraph extracted: "${text2.substring(0, 60)}..."`);
              content += text2 + "\n\n";
              pCount++;
            }
          });
          console.log(`      [-] Unified content length: ${content.length} chars from ${pCount} paragraphs.`);
          return content.trim();
        } catch (e) {
          console.error(`      \u26A0\uFE0F Failed to extract text from ${url}:`, e);
          return null;
        }
      }
    };
    instance = null;
  }
});

// server/scheduler.ts
var scheduler_exports = {};
__export(scheduler_exports, {
  runManualPageScrape: () => runManualPageScrape,
  runManualPostScrape: () => runManualPostScrape,
  runScheduledScrape: () => runScheduledScrape,
  startReEnrichmentPoller: () => startReEnrichmentPoller
});
function getBlurSetting(classification) {
  const shouldBlur = classification.eventType === "Accident";
  return { blurFaces: shouldBlur };
}
async function withTimeout(promise, timeoutMs, errorMessage) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
async function yieldToEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}
async function runScheduledScrape(callbacks) {
  const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
  console.log("\n".repeat(3) + "=".repeat(80));
  console.log("\u{1F6A8} SCRAPE TRIGGERED \u{1F6A8}");
  console.log(`Time: ${timestamp2}`);
  console.log(`Trigger: AUTOMATED CRON SCHEDULE (every 4 hours)`);
  console.log(`Environment: ${"production"}`);
  console.log("=".repeat(80) + "\n");
  const BATCH_SIZE = parseInt(process.env.SCRAPE_BATCH_SIZE || "12");
  console.log(`\u{1F4E6} Batch mode: Processing max ${BATCH_SIZE} posts per scrape to prevent server blocking`);
  try {
    const sources = getEnabledSources();
    console.log(`Scraping ${sources.length} Facebook news sources`);
    const journalists2 = await storage.getAllJournalists();
    console.log(`Loaded ${journalists2.length} journalists for article attribution`);
    const getRandomJournalist = () => {
      return journalists2[Math.floor(Math.random() * journalists2.length)];
    };
    const checkForDuplicate = async (sourceUrl) => {
      const existing = await storage.getArticleBySourceUrl(sourceUrl);
      return !!existing;
    };
    const existingEmbeddings = await storage.getRecentArticlesWithEmbeddings(3);
    console.log(`Loaded ${existingEmbeddings.length} recent article embeddings for duplicate detection`);
    const existingImageHashes = await storage.getArticlesWithImageHashes();
    console.log(`Loaded ${existingImageHashes.length} existing article image hashes`);
    const duplicateVerifier = new DuplicateVerifierService();
    console.log(`\u{1F9E0} GPT duplicate verifier initialized (for 70-85% similarity cases)`);
    console.log(`
\u{1F527} Checking for stuck Facebook posting locks...`);
    const stuckLocks = await storage.getArticlesWithStuckLocks();
    if (stuckLocks.length > 0) {
      console.warn(`\u26A0\uFE0F  Found ${stuckLocks.length} articles with stuck LOCK tokens`);
      for (const article of stuckLocks) {
        console.warn(`   - Article ID: ${article.id}`);
        console.warn(`     Title: ${article.title.substring(0, 60)}...`);
        console.warn(`     Lock token: ${article.facebookPostId}`);
        await storage.clearStuckFacebookLock(article.id);
      }
      console.log(`\u2705 Cleared ${stuckLocks.length} stuck locks - these articles will retry Facebook posting`);
    } else {
      console.log(`\u2705 No stuck locks found`);
    }
    console.log();
    let totalPosts = 0;
    let createdCount = 0;
    let publishedCount = 0;
    let skippedNotNews = 0;
    let skippedSemanticDuplicates = 0;
    const skipReasons = [];
    const scraperService2 = await getScraperService();
    for (const source of sources) {
      console.log(`Scraping source: ${source.name}`);
      const scrapedPosts = await scraperService2.scrapeFacebookPageWithPagination(
        source.url,
        3,
        // max pages - ensures we catch all recent stories from fast-posting sources like Newshawk
        checkForDuplicate
        // stop early on duplicates (prevents unnecessary API calls)
      );
      const seenUrls = /* @__PURE__ */ new Set();
      const uniquePosts = scrapedPosts.filter((post) => {
        if (seenUrls.has(post.sourceUrl)) {
          console.log(`\u{1F501} DUPLICATE POST IN BATCH - Skipping: ${post.sourceUrl.substring(0, 80)}...`);
          return false;
        }
        seenUrls.add(post.sourceUrl);
        return true;
      });
      if (uniquePosts.length < scrapedPosts.length) {
        console.log(`\u26A0\uFE0F  Removed ${scrapedPosts.length - uniquePosts.length} duplicate URLs from scraper response`);
      }
      console.log(`${source.name}: Found ${uniquePosts.length} unique NEW posts`);
      const postsToProcess = uniquePosts.slice(0, BATCH_SIZE);
      if (uniquePosts.length > BATCH_SIZE) {
        console.log(`   \u26A0\uFE0F  Limited to ${BATCH_SIZE} posts (${uniquePosts.length - BATCH_SIZE} posts deferred to next scrape)`);
      }
      totalPosts += postsToProcess.length;
      for (let postIndex = 0; postIndex < postsToProcess.length; postIndex++) {
        const post = postsToProcess[postIndex];
        try {
          await withTimeout(
            (async () => {
              const videoKeywords = [
                // Thai keywords for video/clip
                "\u0E04\u0E25\u0E34\u0E1B",
                "\u0E27\u0E34\u0E14\u0E35\u0E42\u0E2D",
                "\u0E27\u0E35\u0E14\u0E35\u0E42\u0E2D",
                "\u0E44\u0E27\u0E23\u0E31\u0E25",
                "\u0E04\u0E25\u0E34\u0E1B\u0E44\u0E27\u0E23\u0E31\u0E25",
                // English keywords (in case already translated or bilingual posts)
                "viral video",
                "video clip",
                "footage",
                "caught on camera",
                "captured on video"
              ];
              const combinedContent = `${post.title} ${post.content}`.toLowerCase();
              const mentionsVideo = videoKeywords.some((kw) => combinedContent.includes(kw.toLowerCase()));
              if (mentionsVideo && !post.isVideo) {
                console.log(`
\u{1F4F9} CONTENT-BASED VIDEO DETECTION - Post mentions video content`);
                console.log(`   Title: ${post.title.substring(0, 60)}...`);
                console.log(`   Marking as video post for Facebook embedding`);
                post.isVideo = true;
              }
              if (post.isVideo) {
                console.log(`
\u{1F3A5} VIDEO POST DETECTED - Processing with embedded video support`);
                console.log(`   Title: ${post.title.substring(0, 60)}...`);
                console.log(`   Video URL: ${post.videoUrl?.substring(0, 60) || "N/A"}...`);
                console.log(`   Thumbnail: ${post.videoThumbnail?.substring(0, 60) || "N/A"}...`);
                if (!post.imageUrl && post.videoThumbnail) {
                  console.log(`   \u{1F4F8} Using video thumbnail as primary image`);
                  post.imageUrl = post.videoThumbnail;
                  if (!post.imageUrls || post.imageUrls.length === 0) {
                    post.imageUrls = [post.videoThumbnail];
                  }
                }
              }
              const isEmbeddableVideoUrl = post.sourceUrl && (post.sourceUrl.includes("/reel/") || post.sourceUrl.includes("/reels/") || post.sourceUrl.includes("/videos/") || post.sourceUrl.includes("/watch"));
              const hasImages = post.imageUrls && post.imageUrls.length > 0 || post.imageUrl || post.isVideo && post.videoThumbnail;
              const canProceedWithEmbed = isEmbeddableVideoUrl && post.isVideo && !hasImages;
              if (!hasImages && !canProceedWithEmbed) {
                skippedNotNews++;
                skipReasons.push({
                  reason: "No images",
                  postTitle: post.title.substring(0, 60),
                  sourceUrl: post.sourceUrl,
                  facebookPostId: post.facebookPostId,
                  details: "Posts must have at least 1 image"
                });
                console.log(`
\u23ED\uFE0F  SKIPPED - NO IMAGES (only posts with photos are published)`);
                console.log(`   Title: ${post.title.substring(0, 60)}...`);
                console.log(`   Is Video: ${post.isVideo}, Has Thumbnail: ${!!post.videoThumbnail}`);
                console.log(`   \u2705 Skipped before translation (saved API credits)
`);
                if (callbacks?.onProgress) {
                  callbacks.onProgress({
                    totalPosts,
                    processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                    createdArticles: createdCount,
                    skippedNotNews
                  });
                }
                return;
              }
              if (canProceedWithEmbed) {
                console.log(`
\u{1F4FA} EMBED FALLBACK - Video without thumbnail will use Facebook embed widget`);
                console.log(`   Title: ${post.title.substring(0, 60)}...`);
                console.log(`   Source URL: ${post.sourceUrl}`);
                console.log(`   \u26A1 Proceeding with Facebook embed (no thumbnail required)
`);
              }
              if (post.textFormatPresetId) {
                skippedNotNews++;
                skipReasons.push({
                  reason: "Colored background text",
                  postTitle: post.title.substring(0, 60),
                  sourceUrl: post.sourceUrl,
                  facebookPostId: post.facebookPostId,
                  details: `Preset ID: ${post.textFormatPresetId}`
                });
                console.log(`
\u23ED\uFE0F  SKIPPED - COLORED BACKGROUND TEXT POST (Facebook text format preset)`);
                console.log(`   Preset ID: ${post.textFormatPresetId}`);
                console.log(`   Title: ${post.title.substring(0, 60)}...`);
                console.log(`   \u2705 Skipped before translation (saved API credits)
`);
                if (callbacks?.onProgress) {
                  callbacks.onProgress({
                    totalPosts,
                    processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                    createdArticles: createdCount,
                    skippedNotNews
                  });
                }
                return;
              }
              const teaserPhrases = [
                "/\u0E2D\u0E48\u0E32\u0E19\u0E15\u0E48\u0E2D\u0E43\u0E19\u0E40\u0E21\u0E49\u0E19",
                // "read more in [comments]" - most common form
                "\u0E2D\u0E48\u0E32\u0E19\u0E15\u0E48\u0E2D\u0E43\u0E19\u0E40\u0E21\u0E49\u0E19",
                // without leading slash
                "\u0E2D\u0E48\u0E32\u0E19\u0E15\u0E48\u0E2D\u0E43\u0E19\u0E04\u0E2D\u0E21\u0E40\u0E21\u0E19\u0E15\u0E4C",
                // "read more in comments"
                "/\u0E2D\u0E48\u0E32\u0E19\u0E15\u0E48\u0E2D\u0E43\u0E19\u0E04\u0E2D\u0E21\u0E40\u0E21\u0E49\u0E19",
                "\u0E2D\u0E48\u0E32\u0E19\u0E15\u0E48\u0E2D\u0E43\u0E19\u0E04\u0E2D\u0E21\u0E40\u0E21\u0E49\u0E19"
              ];
              const combinedPostContent = `${post.title} ${post.content}`;
              const isTeaserPost = teaserPhrases.some((phrase) => combinedPostContent.includes(phrase));
              if (isTeaserPost) {
                skippedNotNews++;
                skipReasons.push({
                  reason: "Teaser/graphic post (read-more-in-comments)",
                  postTitle: post.title.substring(0, 60),
                  sourceUrl: post.sourceUrl,
                  facebookPostId: post.facebookPostId,
                  details: `Caption ends with "read more in comments" \u2014 graphic poster, not a news article`
                });
                console.log(`
\u23ED\uFE0F  SKIPPED - TEASER GRAPHIC POST ("read more in comments" detected)`);
                console.log(`   Title: ${post.title.substring(0, 60)}...`);
                console.log(`   \u2705 Skipped before translation (saved API credits)
`);
                if (callbacks?.onProgress) {
                  callbacks.onProgress({
                    totalPosts,
                    processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                    createdArticles: createdCount,
                    skippedNotNews
                  });
                }
                return;
              }
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
                  console.log(`
\u{1F6AB} DUPLICATE DETECTED - Method: FACEBOOK POST ID CHECK`);
                  console.log(`   Post ID: ${post.facebookPostId}`);
                  console.log(`   New title: ${post.title.substring(0, 60)}...`);
                  console.log(`   Existing: ${existingByPostId.title.substring(0, 60)}...`);
                  console.log(`   \u2705 Skipped before translation (saved API credits)
`);
                  if (callbacks?.onProgress) {
                    callbacks.onProgress({
                      totalPosts,
                      processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                      createdArticles: createdCount,
                      skippedNotNews
                    });
                  }
                  return;
                }
              }
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
                console.log(`
\u{1F6AB} DUPLICATE DETECTED - Method: SOURCE URL CHECK`);
                console.log(`   URL: ${post.sourceUrl}`);
                console.log(`   New title: ${post.title.substring(0, 60)}...`);
                console.log(`   Existing: ${existingBySourceUrl.title.substring(0, 60)}...`);
                console.log(`   \u2705 Skipped before translation (saved API credits)
`);
                if (callbacks?.onProgress) {
                  callbacks.onProgress({
                    totalPosts,
                    processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                    createdArticles: createdCount,
                    skippedNotNews
                  });
                }
                return;
              }
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
                    console.log(`
\u{1F6AB} DUPLICATE DETECTED - Method: IMAGE URL CHECK (${post.imageUrls?.length || 1} images checked)`);
                    console.log(`   New title: ${post.title.substring(0, 60)}...`);
                    console.log(`   Existing: ${existingImageArticle.title.substring(0, 60)}...`);
                    console.log(`   Matching image: ${imageUrl.substring(0, 80)}...`);
                    console.log(`   \u2705 Skipped before translation (saved API credits)
`);
                    foundDuplicate = true;
                    break;
                  }
                }
                if (foundDuplicate) {
                  if (callbacks?.onProgress) {
                    callbacks.onProgress({
                      totalPosts,
                      processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                      createdArticles: createdCount,
                      skippedNotNews
                    });
                  }
                  return;
                }
              } else if (post.imageUrl) {
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
                  console.log(`
\u{1F6AB} DUPLICATE DETECTED - Method: IMAGE URL CHECK (single image)`);
                  console.log(`   New title: ${post.title.substring(0, 60)}...`);
                  console.log(`   Existing: ${existingImageArticle.title.substring(0, 60)}...`);
                  console.log(`   \u2705 Skipped before translation (saved API credits)
`);
                  if (callbacks?.onProgress) {
                    callbacks.onProgress({
                      totalPosts,
                      processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                      createdArticles: createdCount,
                      skippedNotNews
                    });
                  }
                  return;
                }
              }
              const primaryImageUrl = post.imageUrl || post.imageUrls && post.imageUrls[0];
              let imageHash;
              if (primaryImageUrl) {
                try {
                  imageHash = await imageHashService.generatePerceptualHash(primaryImageUrl);
                } catch (hashError) {
                }
              }
              const imagesToCheck = post.imageUrls || (post.imageUrl ? [post.imageUrl] : []);
              if (imagesToCheck.length > 0) {
                console.log(`
\u{1F4F8} IMAGE QUALITY CHECK: Analyzing ${imagesToCheck.length} image(s)...`);
                const batchResult = await imageAnalysisService.analyzeMultipleImages(
                  imagesToCheck,
                  { strictMode: source.strictImageFilter === true }
                );
                if (source.strictImageFilter) {
                  console.log(`   \u{1F50D} STRICT MODE: Applying tighter thresholds for ${source.name} (known graphic poster source)`);
                }
                const realPhotoCount = batchResult.results.filter((r) => r.analysis.status === "real_photo").length;
                const textGraphicCount = batchResult.results.filter((r) => r.analysis.status === "solid_background" && r.analysis.confidence === "high").length;
                const uncertainCount = batchResult.results.length - realPhotoCount - textGraphicCount;
                batchResult.results.forEach((result, idx) => {
                  const { analysis } = result;
                  const icon = analysis.status === "solid_background" ? "\u274C" : analysis.status === "real_photo" ? "\u2705" : "\u26A0\uFE0F";
                  console.log(`   Image ${idx + 1}/${imagesToCheck.length}: ${icon} ${analysis.status} (${analysis.confidence} confidence)`);
                  console.log(`      ${analysis.reason}`);
                  console.log(`      URL: ${result.url.substring(0, 100)}${result.url.length > 100 ? "..." : ""}`);
                  if (analysis.metadata?.fileSize) {
                    console.log(`      File size: ${Math.round(analysis.metadata.fileSize / 1024)}KB`);
                  }
                  if (analysis.metadata?.dominancePercentage) {
                    console.log(`      Color dominance: ${analysis.metadata.dominancePercentage.toFixed(1)}%`);
                  }
                });
                console.log(`
   \u{1F4CA} SUMMARY: ${realPhotoCount} real photos, ${textGraphicCount} text graphics, ${uncertainCount} uncertain`);
                if (batchResult.multipleRealPhotos) {
                  console.log(`   \u{1F31F} HIGH QUALITY: Post has ${realPhotoCount} real photos - strong accept signal!`);
                }
                if (batchResult.allTextGraphics) {
                  skippedNotNews++;
                  skipReasons.push({
                    reason: "Text graphic (multi-stage analysis)",
                    postTitle: post.title.substring(0, 60),
                    sourceUrl: post.sourceUrl,
                    facebookPostId: post.facebookPostId,
                    details: `All ${imagesToCheck.length} image(s) are text graphics (small + solid color)`
                  });
                  console.log(`
\u23ED\uFE0F  SKIPPED - TEXT GRAPHIC POST (all images are text-on-background)`);
                  console.log(`   Title: ${post.title.substring(0, 60)}...`);
                  console.log(`   Images analyzed: ${imagesToCheck.length}`);
                  console.log(`   \u{1F3AF} Result: ALL images confirmed as text graphics \u2192 REJECTED
`);
                  if (callbacks?.onProgress) {
                    callbacks.onProgress({
                      totalPosts,
                      processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                      createdArticles: createdCount,
                      skippedNotNews
                    });
                  }
                  return;
                } else if (batchResult.anyRealPhotos) {
                  console.log(`   \u2705 ACCEPTED: At least one real photo detected
`);
                } else {
                  console.log(`   \u26A0\uFE0F  ACCEPTED: Uncertain analysis, erring on side of inclusion
`);
                }
              }
              let extractedEntities;
              let foundEntityDuplicate = false;
              try {
                extractedEntities = await entityExtractionService.extractEntities(post.title, post.content);
                const recentArticles = existingEmbeddings.slice(0, 100);
                for (const existing of recentArticles) {
                  const existingEntities = existing.entities;
                  if (!existingEntities) continue;
                  const entityMatch = entityExtractionService.compareEntities(extractedEntities, existingEntities);
                  const hasSpecificMatch = entityMatch.matchedNumbers > 0 || // Same quantity = strong signal
                  entityMatch.matchedCrimeTypes > 0 || // Same crime type = strong signal
                  entityMatch.matchedPeople > 0;
                  const isEntityDuplicate = entityMatch.score >= 60 && hasSpecificMatch || entityMatch.score >= 80;
                  if (isEntityDuplicate) {
                    skippedSemanticDuplicates++;
                    foundEntityDuplicate = true;
                    skipReasons.push({
                      reason: "Duplicate: Entity match",
                      postTitle: post.title.substring(0, 60),
                      sourceUrl: post.sourceUrl,
                      facebookPostId: post.facebookPostId,
                      details: `Score: ${entityMatch.score}%`
                    });
                    console.log(`
\u{1F6AB} DUPLICATE DETECTED - Method: ENTITY MATCHING (${entityMatch.score}% match)`);
                    console.log(`   New title: ${post.title.substring(0, 60)}...`);
                    console.log(`   Existing: ${existing.title.substring(0, 60)}...`);
                    console.log(`   \u{1F4CA} Entity matches:`);
                    console.log(`      - Numbers: ${entityMatch.matchedNumbers} (quantities like "734 packs")`);
                    console.log(`      - Locations: ${entityMatch.matchedLocations}`);
                    console.log(`      - Crime types: ${entityMatch.matchedCrimeTypes}`);
                    console.log(`      - Organizations: ${entityMatch.matchedOrganizations}`);
                    console.log(`      - People: ${entityMatch.matchedPeople}`);
                    console.log(`   \u2705 Skipped before translation (saved API credits)
`);
                    if (callbacks?.onProgress) {
                      callbacks.onProgress({
                        totalPosts,
                        processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                        createdArticles: createdCount,
                        skippedNotNews
                      });
                    }
                    break;
                  }
                }
                if (foundEntityDuplicate) {
                  return;
                }
              } catch (entityError) {
                console.error(`Error extracting entities, proceeding without entity check:`, entityError);
              }
              let contentEmbedding;
              try {
                contentEmbedding = await translatorService.generateEmbeddingFromContent(post.title, post.content);
                const initialThreshold = 0.55;
                const duplicateCheck = checkSemanticDuplicate(contentEmbedding, existingEmbeddings, initialThreshold);
                if (duplicateCheck.isDuplicate) {
                  const similarityPercent = duplicateCheck.similarity * 100;
                  if (!duplicateCheck.matchedArticleId || !duplicateCheck.matchedArticleTitle) {
                    console.log(`\u26A0\uFE0F  Warning: Embedding matched but no article ID/title - skipping for safety`);
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
                        skippedNotNews
                      });
                    }
                    return;
                  }
                  if (duplicateCheck.similarity >= 0.8) {
                    skippedSemanticDuplicates++;
                    skipReasons.push({
                      reason: "Duplicate: High semantic similarity (full content)",
                      postTitle: post.title.substring(0, 60),
                      sourceUrl: post.sourceUrl,
                      facebookPostId: post.facebookPostId,
                      details: `Similarity: ${similarityPercent.toFixed(1)}% (obvious duplicate)`
                    });
                    console.log(`
\u{1F6AB} DUPLICATE DETECTED - Method: FULL CONTENT EMBEDDING (${similarityPercent.toFixed(1)}%)`);
                    console.log(`   New title: ${post.title.substring(0, 60)}...`);
                    console.log(`   Existing: ${duplicateCheck.matchedArticleTitle.substring(0, 60)}...`);
                    console.log(`   \u2705 Skipped before translation (saved API credits)
`);
                    if (callbacks?.onProgress) {
                      callbacks.onProgress({
                        totalPosts,
                        processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                        createdArticles: createdCount,
                        skippedNotNews
                      });
                    }
                    return;
                  }
                  console.log(`
\u{1F914} POTENTIAL DUPLICATE DETECTED (${similarityPercent.toFixed(1)}%) - Using GPT to analyze full content...`);
                  console.log(`   New title: ${post.title.substring(0, 60)}...`);
                  console.log(`   Existing: ${duplicateCheck.matchedArticleTitle.substring(0, 60)}...`);
                  const gptVerification = await duplicateVerifier.verifyDuplicate(
                    post.title,
                    post.content,
                    // Full scraped content
                    duplicateCheck.matchedArticleTitle,
                    duplicateCheck.matchedArticleContent || "",
                    // Full existing article content
                    duplicateCheck.similarity
                  );
                  console.log(`
\u{1F9E0} GPT VERIFICATION RESULT:`);
                  console.log(`   Decision: ${gptVerification.isDuplicate ? "\u274C DUPLICATE" : "\u2705 NOT DUPLICATE"}`);
                  console.log(`   Confidence: ${(gptVerification.confidence * 100).toFixed(0)}%`);
                  console.log(`   Reasoning: ${gptVerification.reasoning}`);
                  console.log(`
   New Story Analysis:`);
                  console.log(`      Event: ${gptVerification.newStoryAnalysis.eventType}`);
                  console.log(`      Location: ${gptVerification.newStoryAnalysis.location.join(", ") || "N/A"}`);
                  console.log(`      People: ${gptVerification.newStoryAnalysis.people.join(", ") || "N/A"}`);
                  console.log(`      Timing: ${gptVerification.newStoryAnalysis.timing}`);
                  console.log(`      Facts: ${gptVerification.newStoryAnalysis.coreFacts.join("; ")}`);
                  console.log(`
   Existing Story Analysis:`);
                  console.log(`      Event: ${gptVerification.existingStoryAnalysis.eventType}`);
                  console.log(`      Location: ${gptVerification.existingStoryAnalysis.location.join(", ") || "N/A"}`);
                  console.log(`      People: ${gptVerification.existingStoryAnalysis.people.join(", ") || "N/A"}`);
                  console.log(`      Timing: ${gptVerification.existingStoryAnalysis.timing}`);
                  console.log(`      Facts: ${gptVerification.existingStoryAnalysis.coreFacts.join("; ")}
`);
                  if (gptVerification.isDuplicate) {
                    skippedSemanticDuplicates++;
                    skipReasons.push({
                      reason: "Duplicate: GPT-verified same event",
                      postTitle: post.title.substring(0, 60),
                      sourceUrl: post.sourceUrl,
                      facebookPostId: post.facebookPostId,
                      details: `Embedding: ${similarityPercent.toFixed(1)}%, GPT confidence: ${(gptVerification.confidence * 100).toFixed(0)}%`
                    });
                    console.log(`\u{1F6AB} CONFIRMED DUPLICATE by GPT - Same event with different framing`);
                    console.log(`   \u2705 Skipped before translation (saved API credits)
`);
                    if (callbacks?.onProgress) {
                      callbacks.onProgress({
                        totalPosts,
                        processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                        createdArticles: createdCount,
                        skippedNotNews
                      });
                    }
                    return;
                  } else {
                    console.log(`\u2705 NOT A DUPLICATE - GPT determined these are different events`);
                    console.log(`   Proceeding with translation...
`);
                  }
                } else {
                  if (duplicateCheck.similarity >= 0.5) {
                    console.log(`
\u{1F6E1}\uFE0F SAFETY NET: Similarity ${(duplicateCheck.similarity * 100).toFixed(1)}% - Checking top 2 similar stories...`);
                    const topSimilar = getTopSimilarArticles(contentEmbedding, existingEmbeddings, 2);
                    if (topSimilar.length > 0) {
                      console.log(`   Found ${topSimilar.length} stories to check`);
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
                          console.log(`
\u{1F6AB} DUPLICATE CAUGHT BY SAFETY NET!`);
                          console.log(`   GPT confidence: ${(safetyVerification.confidence * 100).toFixed(0)}%`);
                          console.log(`   Reasoning: ${safetyVerification.reasoning}`);
                          console.log(`   \u2705 Skipped before translation (saved API credits)
`);
                          if (callbacks?.onProgress) {
                            callbacks.onProgress({
                              totalPosts,
                              processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                              createdArticles: createdCount,
                              skippedNotNews
                            });
                          }
                          duplicateFoundInSafetyNet = true;
                          break;
                        }
                      }
                      if (duplicateFoundInSafetyNet) {
                        return;
                      }
                      console.log(`   \u2705 Safety net passed - not a duplicate of top similar stories`);
                    }
                  } else {
                    console.log(`   \u26A1 Similarity very low (${(duplicateCheck.similarity * 100).toFixed(1)}%) - skipping safety net (cost optimization)`);
                  }
                }
              } catch (embeddingError) {
                console.error(`Error generating embedding, proceeding without semantic check:`, embeddingError);
              }
              let translation;
              try {
                const hotKeywords = [
                  // EXISTING SPECIFIC KEYWORDS
                  "\u0E1B\u0E30\u0E17\u0E30",
                  "\u0E40\u0E2E\u0E42\u0E23\u0E2D\u0E35\u0E19",
                  "\u0E02\u0E32\u0E22\u0E22\u0E32",
                  "QR",
                  "\u0E04\u0E34\u0E27\u0E2D\u0E32\u0E23\u0E4C",
                  "\u0E2A\u0E15\u0E34\u0E4A\u0E01\u0E40\u0E01\u0E2D\u0E23\u0E4C",
                  "\u0E15\u0E34\u0E14\u0E1B\u0E23\u0E30\u0E01\u0E32\u0E28",
                  "Telegram",
                  "\u0E40\u0E17\u0E40\u0E25\u0E41\u0E01\u0E23\u0E21",
                  // CRIME & POLICE
                  "\u0E2D\u0E38\u0E1A\u0E31\u0E15\u0E34\u0E40\u0E2B\u0E15\u0E38",
                  "\u0E08\u0E31\u0E1A\u0E01\u0E38\u0E21",
                  "\u0E08\u0E31\u0E1A",
                  "\u0E15\u0E33\u0E23\u0E27\u0E08",
                  "\u0E2A\u0E16\u0E32\u0E19\u0E35\u0E15\u0E33\u0E23\u0E27\u0E08",
                  "\u0E04\u0E14\u0E35",
                  "\u0E42\u0E08\u0E23\u0E01\u0E23\u0E23\u0E21",
                  "\u0E25\u0E31\u0E01\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C",
                  "\u0E02\u0E42\u0E21\u0E22",
                  "\u0E01\u0E23\u0E30\u0E40\u0E1B\u0E4B\u0E32",
                  "\u0E27\u0E34\u0E48\u0E07\u0E23\u0E32\u0E27",
                  "\u0E06\u0E32\u0E15\u0E01\u0E23\u0E23\u0E21",
                  "\u0E06\u0E48\u0E32",
                  "\u0E41\u0E17\u0E07",
                  "\u0E22\u0E34\u0E07",
                  "\u0E1B\u0E37\u0E19",
                  "\u0E21\u0E35\u0E14",
                  "\u0E17\u0E33\u0E23\u0E49\u0E32\u0E22\u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22",
                  "\u0E17\u0E33\u0E23\u0E49\u0E32\u0E22",
                  "\u0E15\u0E48\u0E2D\u0E22",
                  "\u0E15\u0E1A",
                  "\u0E17\u0E30\u0E40\u0E25\u0E32\u0E30",
                  "\u0E0A\u0E01\u0E15\u0E48\u0E2D\u0E22",
                  "\u0E15\u0E35\u0E01\u0E31\u0E19",
                  "\u0E22\u0E32\u0E40\u0E2A\u0E1E\u0E15\u0E34\u0E14",
                  "\u0E22\u0E32\u0E1A\u0E49\u0E32",
                  "\u0E22\u0E32\u0E44\u0E2D\u0E0B\u0E4C",
                  "\u0E42\u0E04\u0E40\u0E04\u0E19",
                  "\u0E01\u0E31\u0E0D\u0E0A\u0E32",
                  "\u0E04\u0E49\u0E32\u0E22\u0E32",
                  "\u0E09\u0E49\u0E2D\u0E42\u0E01\u0E07",
                  "\u0E2B\u0E25\u0E2D\u0E01\u0E25\u0E27\u0E07",
                  "\u0E42\u0E01\u0E07",
                  "\u0E41\u0E01\u0E4A\u0E07\u0E04\u0E2D\u0E25\u0E40\u0E0B\u0E47\u0E19\u0E40\u0E15\u0E2D\u0E23\u0E4C",
                  "\u0E2D\u0E2D\u0E19\u0E44\u0E25\u0E19\u0E4C",
                  "\u0E1A\u0E38\u0E01\u0E08\u0E31\u0E1A",
                  "\u0E15\u0E23\u0E27\u0E08\u0E04\u0E49\u0E19",
                  "\u0E2B\u0E21\u0E32\u0E22\u0E08\u0E31\u0E1A",
                  "\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19\u0E15\u0E31\u0E27",
                  "\u0E1D\u0E32\u0E01\u0E02\u0E31\u0E07",
                  "\u0E2A\u0E2D\u0E1A\u0E2A\u0E27\u0E19",
                  "\u0E1E\u0E22\u0E32\u0E19",
                  "CCTV",
                  "\u0E01\u0E25\u0E49\u0E2D\u0E07\u0E27\u0E07\u0E08\u0E23\u0E1B\u0E34\u0E14",
                  "\u0E2B\u0E19\u0E35\u0E04\u0E14\u0E35",
                  "\u0E2B\u0E25\u0E1A\u0E2B\u0E19\u0E35",
                  "\u0E1C\u0E39\u0E49\u0E15\u0E49\u0E2D\u0E07\u0E2B\u0E32",
                  "\u0E15\u0E23\u0E27\u0E08\u0E08\u0E31\u0E1A",
                  "\u0E14\u0E48\u0E32\u0E19\u0E15\u0E23\u0E27\u0E08",
                  "\u0E42\u0E2D\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E2A\u0E40\u0E15\u0E22\u0E4C",
                  // TRAFFIC & ACCIDENTS
                  "\u0E0A\u0E19",
                  "\u0E0A\u0E19\u0E01\u0E31\u0E19",
                  "\u0E23\u0E16\u0E0A\u0E19",
                  "\u0E40\u0E09\u0E35\u0E48\u0E22\u0E27\u0E0A\u0E19",
                  "\u0E04\u0E27\u0E48\u0E33",
                  "\u0E1E\u0E25\u0E34\u0E01\u0E04\u0E27\u0E48\u0E33",
                  "\u0E15\u0E01",
                  "\u0E25\u0E49\u0E21",
                  "\u0E40\u0E08\u0E47\u0E1A",
                  "\u0E1A\u0E32\u0E14\u0E40\u0E08\u0E47\u0E1A",
                  "\u0E40\u0E2A\u0E35\u0E22\u0E0A\u0E35\u0E27\u0E34\u0E15",
                  "\u0E14\u0E31\u0E1A",
                  "\u0E15\u0E32\u0E22",
                  "\u0E2A\u0E32\u0E2B\u0E31\u0E2A",
                  "\u0E42\u0E04\u0E21\u0E48\u0E32",
                  "\u0E21\u0E2D\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E44\u0E0B\u0E04\u0E4C",
                  "\u0E08\u0E31\u0E01\u0E23\u0E22\u0E32\u0E19\u0E22\u0E19\u0E15\u0E4C",
                  "\u0E1A\u0E34\u0E4A\u0E01\u0E44\u0E1A\u0E04\u0E4C",
                  "\u0E23\u0E16\u0E40\u0E01\u0E4B\u0E07",
                  "\u0E23\u0E16\u0E01\u0E23\u0E30\u0E1A\u0E30",
                  "\u0E23\u0E16\u0E15\u0E39\u0E49",
                  "\u0E23\u0E16\u0E1A\u0E23\u0E23\u0E17\u0E38\u0E01",
                  "\u0E23\u0E16\u0E2A\u0E34\u0E1A\u0E25\u0E49\u0E2D",
                  "\u0E23\u0E16\u0E40\u0E04\u0E23\u0E19",
                  "\u0E23\u0E16\u0E41\u0E17\u0E47\u0E01\u0E0B\u0E35\u0E48",
                  "\u0E15\u0E38\u0E4A\u0E01\u0E15\u0E38\u0E4A\u0E01",
                  "\u0E2A\u0E07\u0E02\u0E25\u0E32",
                  "\u0E40\u0E21\u0E32\u0E41\u0E25\u0E49\u0E27\u0E02\u0E31\u0E1A",
                  "\u0E41\u0E2D\u0E25\u0E01\u0E2D\u0E2E\u0E2D\u0E25\u0E4C",
                  "\u0E40\u0E1B\u0E48\u0E32\u0E41\u0E2D\u0E25\u0E01\u0E2D\u0E2E\u0E2D\u0E25\u0E4C",
                  "\u0E43\u0E1A\u0E02\u0E31\u0E1A\u0E02\u0E35\u0E48",
                  "\u0E43\u0E1A\u0E02\u0E31\u0E1A\u0E02\u0E35\u0E48\u0E2A\u0E32\u0E01\u0E25",
                  "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E1A\u0E02\u0E31\u0E1A\u0E02\u0E35\u0E48",
                  "\u0E2B\u0E21\u0E27\u0E01\u0E01\u0E31\u0E19\u0E19\u0E47\u0E2D\u0E04",
                  "\u0E44\u0E21\u0E48\u0E2A\u0E27\u0E21\u0E2B\u0E21\u0E27\u0E01",
                  "\u0E40\u0E02\u0E32\u0E1B\u0E48\u0E32\u0E15\u0E2D\u0E07",
                  "\u0E17\u0E32\u0E07\u0E42\u0E04\u0E49\u0E07",
                  "\u0E25\u0E37\u0E48\u0E19",
                  "\u0E1D\u0E19\u0E15\u0E01",
                  "\u0E16\u0E19\u0E19\u0E40\u0E1B\u0E35\u0E22\u0E01",
                  "\u0E23\u0E16\u0E15\u0E34\u0E14",
                  "\u0E08\u0E23\u0E32\u0E08\u0E23",
                  "\u0E1B\u0E34\u0E14\u0E16\u0E19\u0E19",
                  "\u0E0A\u0E34\u0E07\u0E40\u0E25\u0E19",
                  "\u0E22\u0E49\u0E2D\u0E19\u0E28\u0E23",
                  "\u0E1D\u0E48\u0E32\u0E44\u0E1F\u0E41\u0E14\u0E07",
                  "\u0E2B\u0E19\u0E35\u0E17\u0E35\u0E48\u0E40\u0E01\u0E34\u0E14\u0E40\u0E2B\u0E15\u0E38",
                  "\u0E0A\u0E19\u0E41\u0E25\u0E49\u0E27\u0E2B\u0E19\u0E35",
                  // NIGHTLIFE & ENTERTAINMENT
                  "\u0E1A\u0E32\u0E23\u0E4C",
                  "\u0E1C\u0E31\u0E1A",
                  "\u0E04\u0E25\u0E31\u0E1A",
                  "\u0E2A\u0E16\u0E32\u0E19\u0E1A\u0E31\u0E19\u0E40\u0E17\u0E34\u0E07",
                  "\u0E14\u0E34\u0E2A\u0E42\u0E01\u0E49\u0E40\u0E18\u0E04",
                  "\u0E1A\u0E31\u0E07\u0E25\u0E32",
                  "\u0E1B\u0E34\u0E14\u0E23\u0E49\u0E32\u0E19",
                  "\u0E40\u0E1B\u0E34\u0E14\u0E40\u0E01\u0E34\u0E19\u0E40\u0E27\u0E25\u0E32",
                  "\u0E43\u0E1A\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15",
                  "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E1A\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15",
                  "\u0E1A\u0E38\u0E01\u0E15\u0E23\u0E27\u0E08",
                  "\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E14\u0E31\u0E07",
                  "\u0E23\u0E49\u0E2D\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19",
                  "\u0E40\u0E21\u0E32",
                  "\u0E40\u0E21\u0E32\u0E2B\u0E31\u0E27\u0E23\u0E32\u0E19\u0E49\u0E33",
                  "\u0E17\u0E30\u0E40\u0E25\u0E32\u0E30\u0E27\u0E34\u0E27\u0E32\u0E17",
                  "\u0E41\u0E2A\u0E07\u0E2A\u0E35\u0E40\u0E2A\u0E35\u0E22\u0E07",
                  "\u0E42\u0E0A\u0E27\u0E4C",
                  "\u0E2A\u0E32\u0E27\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E2A\u0E2D\u0E07",
                  "\u0E1B\u0E34\u0E07\u0E1B\u0E2D\u0E07\u0E42\u0E0A\u0E27\u0E4C",
                  "\u0E2A\u0E1B\u0E32",
                  "\u0E19\u0E27\u0E14",
                  // TOURISM & FOREIGNERS
                  "\u0E19\u0E31\u0E01\u0E17\u0E48\u0E2D\u0E07\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27",
                  "\u0E1D\u0E23\u0E31\u0E48\u0E07",
                  "\u0E15\u0E48\u0E32\u0E07\u0E0A\u0E32\u0E15\u0E34",
                  "\u0E0A\u0E32\u0E27\u0E23\u0E31\u0E2A\u0E40\u0E0B\u0E35\u0E22",
                  "\u0E0A\u0E32\u0E27\u0E08\u0E35\u0E19",
                  "\u0E0A\u0E32\u0E27\u0E2D\u0E34\u0E19\u0E40\u0E14\u0E35\u0E22",
                  "\u0E0A\u0E32\u0E27\u0E2D\u0E2D\u0E2A\u0E40\u0E15\u0E23\u0E40\u0E25\u0E35\u0E22",
                  "\u0E0A\u0E32\u0E27\u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29",
                  "\u0E0A\u0E32\u0E27\u0E2D\u0E40\u0E21\u0E23\u0E34\u0E01\u0E31\u0E19",
                  "\u0E0A\u0E32\u0E27\u0E40\u0E01\u0E32\u0E2B\u0E25\u0E35",
                  "\u0E0A\u0E32\u0E27\u0E22\u0E39\u0E40\u0E04\u0E23\u0E19",
                  "\u0E0A\u0E32\u0E27\u0E2D\u0E34\u0E2A\u0E23\u0E32\u0E40\u0E2D\u0E25",
                  "\u0E0A\u0E32\u0E27\u0E04\u0E32\u0E0B\u0E31\u0E04\u0E2A\u0E16\u0E32\u0E19",
                  "\u0E19\u0E31\u0E01\u0E17\u0E48\u0E2D\u0E07\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E",
                  "\u0E27\u0E35\u0E0B\u0E48\u0E32",
                  "\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14",
                  "\u0E15\u0E21.",
                  "\u0E15\u0E23\u0E27\u0E08\u0E04\u0E19\u0E40\u0E02\u0E49\u0E32\u0E40\u0E21\u0E37\u0E2D\u0E07",
                  "\u0E2A\u0E19\u0E32\u0E21\u0E1A\u0E34\u0E19",
                  "\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27\u0E1A\u0E34\u0E19",
                  "\u0E42\u0E23\u0E07\u0E41\u0E23\u0E21",
                  "\u0E23\u0E35\u0E2A\u0E2D\u0E23\u0E4C\u0E17",
                  "\u0E40\u0E0A\u0E48\u0E32\u0E23\u0E16",
                  "\u0E40\u0E0A\u0E48\u0E32\u0E21\u0E2D\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E44\u0E0B\u0E04\u0E4C",
                  "\u0E40\u0E08\u0E47\u0E17\u0E2A\u0E01\u0E35",
                  "\u0E2B\u0E32\u0E14\u0E1B\u0E48\u0E32\u0E15\u0E2D\u0E07",
                  "\u0E2B\u0E32\u0E14\u0E01\u0E30\u0E23\u0E19",
                  "\u0E2B\u0E32\u0E14\u0E01\u0E30\u0E15\u0E30",
                  "\u0E2B\u0E32\u0E14\u0E2A\u0E38\u0E23\u0E34\u0E19\u0E17\u0E23\u0E4C",
                  "\u0E2B\u0E32\u0E14\u0E1A\u0E32\u0E07\u0E40\u0E17\u0E32",
                  "\u0E2B\u0E32\u0E14\u0E44\u0E19\u0E2B\u0E32\u0E19",
                  "\u0E2B\u0E32\u0E14\u0E01\u0E21\u0E25\u0E32",
                  "\u0E23\u0E32\u0E44\u0E27\u0E22\u0E4C",
                  "\u0E16\u0E25\u0E32\u0E07",
                  "\u0E01\u0E30\u0E17\u0E39\u0E49",
                  "\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E40\u0E01\u0E48\u0E32",
                  // WEATHER & ENVIRONMENT
                  "\u0E1E\u0E32\u0E22\u0E38",
                  "\u0E1D\u0E19\u0E15\u0E01\u0E2B\u0E19\u0E31\u0E01",
                  "\u0E19\u0E49\u0E33\u0E17\u0E48\u0E27\u0E21",
                  "\u0E19\u0E49\u0E33\u0E1B\u0E48\u0E32",
                  "\u0E19\u0E49\u0E33\u0E23\u0E2D\u0E23\u0E30\u0E1A\u0E32\u0E22",
                  "\u0E14\u0E34\u0E19\u0E16\u0E25\u0E48\u0E21",
                  "\u0E25\u0E21\u0E41\u0E23\u0E07",
                  "\u0E04\u0E25\u0E37\u0E48\u0E19\u0E2A\u0E39\u0E07",
                  "\u0E04\u0E25\u0E37\u0E48\u0E19\u0E25\u0E21\u0E41\u0E23\u0E07",
                  "\u0E01\u0E23\u0E30\u0E41\u0E2A\u0E19\u0E49\u0E33",
                  "\u0E18\u0E07\u0E41\u0E14\u0E07",
                  "\u0E08\u0E21\u0E19\u0E49\u0E33",
                  "\u0E2A\u0E39\u0E0D\u0E2B\u0E32\u0E22",
                  "\u0E01\u0E39\u0E49\u0E20\u0E31\u0E22",
                  "\u0E0A\u0E48\u0E27\u0E22\u0E40\u0E2B\u0E25\u0E37\u0E2D",
                  "\u0E2D\u0E38\u0E17\u0E01\u0E20\u0E31\u0E22",
                  "\u0E44\u0E1F\u0E1B\u0E48\u0E32",
                  "\u0E44\u0E1F\u0E44\u0E2B\u0E21\u0E49",
                  "\u0E40\u0E1E\u0E25\u0E34\u0E07\u0E44\u0E2B\u0E21\u0E49",
                  "\u0E41\u0E1C\u0E48\u0E19\u0E14\u0E34\u0E19\u0E44\u0E2B\u0E27",
                  "\u0E2A\u0E36\u0E19\u0E32\u0E21\u0E34",
                  "\u0E1B\u0E34\u0E14\u0E2D\u0E48\u0E32\u0E27",
                  "\u0E1B\u0E34\u0E14\u0E40\u0E01\u0E32\u0E30",
                  "\u0E40\u0E23\u0E37\u0E2D\u0E25\u0E48\u0E21",
                  "\u0E2B\u0E49\u0E32\u0E21\u0E25\u0E07\u0E40\u0E25\u0E48\u0E19\u0E19\u0E49\u0E33",
                  "\u0E21\u0E25\u0E1E\u0E34\u0E29",
                  "\u0E1D\u0E38\u0E48\u0E19 PM2.5",
                  "\u0E04\u0E23\u0E32\u0E1A\u0E19\u0E49\u0E33\u0E21\u0E31\u0E19",
                  "\u0E02\u0E22\u0E30",
                  "\u0E1B\u0E30\u0E01\u0E32\u0E23\u0E31\u0E07",
                  // ANIMALS & WILDLIFE
                  "\u0E2A\u0E38\u0E19\u0E31\u0E02",
                  "\u0E2B\u0E21\u0E32\u0E08\u0E23\u0E08\u0E31\u0E14",
                  "\u0E2B\u0E21\u0E32\u0E01\u0E31\u0E14",
                  "\u0E1E\u0E34\u0E29\u0E2A\u0E38\u0E19\u0E31\u0E02\u0E1A\u0E49\u0E32",
                  "\u0E07\u0E39",
                  "\u0E08\u0E07\u0E2D\u0E32\u0E07",
                  "\u0E07\u0E39\u0E40\u0E2B\u0E48\u0E32",
                  "\u0E07\u0E39\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E21",
                  "\u0E25\u0E34\u0E07",
                  "\u0E0A\u0E49\u0E32\u0E07",
                  "\u0E09\u0E25\u0E32\u0E21",
                  "\u0E41\u0E21\u0E07\u0E01\u0E30\u0E1E\u0E23\u0E38\u0E19",
                  "\u0E41\u0E21\u0E07\u0E01\u0E30\u0E1E\u0E23\u0E38\u0E19\u0E01\u0E25\u0E48\u0E2D\u0E07",
                  "\u0E27\u0E32\u0E2C",
                  "\u0E42\u0E25\u0E21\u0E32",
                  "\u0E40\u0E15\u0E48\u0E32",
                  "\u0E15\u0E30\u0E01\u0E27\u0E14",
                  // HEALTH & HOSPITALS
                  "\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25",
                  "\u0E27\u0E0A\u0E34\u0E23\u0E30\u0E20\u0E39\u0E40\u0E01\u0E47\u0E15",
                  "\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E20\u0E39\u0E40\u0E01\u0E47\u0E15",
                  "\u0E2B\u0E49\u0E2D\u0E07\u0E09\u0E38\u0E01\u0E40\u0E09\u0E34\u0E19",
                  "\u0E23\u0E16\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25",
                  "\u0E01\u0E39\u0E49\u0E0A\u0E35\u0E1E",
                  "\u0E21\u0E39\u0E25\u0E19\u0E34\u0E18\u0E34",
                  "\u0E01\u0E38\u0E28\u0E25\u0E18\u0E23\u0E23\u0E21",
                  "\u0E40\u0E08\u0E47\u0E1A\u0E1B\u0E48\u0E27\u0E22",
                  "\u0E44\u0E02\u0E49\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E2D\u0E2D\u0E01",
                  "\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E40\u0E1B\u0E47\u0E19\u0E1E\u0E34\u0E29",
                  "\u0E15\u0E01\u0E08\u0E32\u0E01\u0E17\u0E35\u0E48\u0E2A\u0E39\u0E07",
                  "\u0E01\u0E23\u0E30\u0E42\u0E14\u0E14",
                  "\u0E1E\u0E25\u0E31\u0E14\u0E15\u0E01",
                  // LOCAL GOVERNMENT & COMMUNITY
                  "\u0E1C\u0E39\u0E49\u0E27\u0E48\u0E32\u0E23\u0E32\u0E0A\u0E01\u0E32\u0E23",
                  "\u0E19\u0E32\u0E22\u0E01 \u0E2D\u0E1A\u0E08.",
                  "\u0E40\u0E17\u0E28\u0E1A\u0E32\u0E25",
                  "\u0E2D\u0E1A\u0E15.",
                  "\u0E1B\u0E48\u0E32\u0E15\u0E2D\u0E07",
                  "\u0E01\u0E30\u0E17\u0E39\u0E49",
                  "\u0E16\u0E25\u0E32\u0E07",
                  "\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E20\u0E39\u0E40\u0E01\u0E47\u0E15",
                  "\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E1E\u0E34\u0E08\u0E32\u0E23\u0E13\u0E4C",
                  "\u0E04\u0E2D\u0E23\u0E31\u0E1B\u0E0A\u0E31\u0E19",
                  "\u0E17\u0E38\u0E08\u0E23\u0E34\u0E15",
                  "\u0E1A\u0E38\u0E01\u0E23\u0E38\u0E01",
                  "\u0E17\u0E35\u0E48\u0E14\u0E34\u0E19",
                  "\u0E01\u0E48\u0E2D\u0E2A\u0E23\u0E49\u0E32\u0E07",
                  "\u0E23\u0E37\u0E49\u0E2D\u0E16\u0E2D\u0E19",
                  "\u0E1C\u0E34\u0E14\u0E01\u0E0E\u0E2B\u0E21\u0E32\u0E22",
                  "\u0E43\u0E1A\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E01\u0E48\u0E2D\u0E2A\u0E23\u0E49\u0E32\u0E07",
                  // TRANSPORT & INFRASTRUCTURE
                  "\u0E2A\u0E19\u0E32\u0E21\u0E1A\u0E34\u0E19\u0E20\u0E39\u0E40\u0E01\u0E47\u0E15",
                  "\u0E0A\u0E49\u0E32",
                  "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01",
                  "\u0E17\u0E48\u0E32\u0E40\u0E23\u0E37\u0E2D",
                  "\u0E40\u0E23\u0E37\u0E2D",
                  "\u0E2A\u0E1B\u0E35\u0E14\u0E42\u0E1A\u0E4A\u0E17",
                  "\u0E40\u0E1F\u0E2D\u0E23\u0E4C\u0E23\u0E35\u0E48",
                  "\u0E23\u0E16\u0E40\u0E21\u0E25\u0E4C",
                  "\u0E2A\u0E21\u0E32\u0E23\u0E4C\u0E17\u0E1A\u0E31\u0E2A",
                  "\u0E41\u0E01\u0E23\u0E47\u0E1A",
                  "\u0E42\u0E1A\u0E25\u0E17\u0E4C",
                  "\u0E04\u0E48\u0E32\u0E42\u0E14\u0E22\u0E2A\u0E32\u0E23",
                  "\u0E42\u0E01\u0E48\u0E07\u0E23\u0E32\u0E04\u0E32",
                  "\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E1C\u0E39\u0E49\u0E42\u0E14\u0E22\u0E2A\u0E32\u0E23",
                  "\u0E21\u0E34\u0E40\u0E15\u0E2D\u0E23\u0E4C",
                  "\u0E44\u0E21\u0E48\u0E01\u0E14\u0E21\u0E34\u0E40\u0E15\u0E2D\u0E23\u0E4C",
                  "\u0E23\u0E16\u0E44\u0E1F\u0E1F\u0E49\u0E32"
                ];
                const combinedPostText = `${post.title} ${post.content}`;
                const mightBeHighInterest = hotKeywords.some((kw) => combinedPostText.includes(kw));
                let communityComments;
                if (mightBeHighInterest && post.sourceUrl) {
                  try {
                    console.log(`   \u{1F525} Potential high-interest story detected - fetching community comments...`);
                    const comments = await scrapePostComments(post.sourceUrl, 15);
                    if (comments.length > 0) {
                      communityComments = comments.filter((c) => c.text && c.text.length > 10).map((c) => c.text);
                      console.log(`   \u2705 Got ${communityComments.length} substantive comments for context`);
                    }
                  } catch (commentError) {
                    console.log(`   \u26A0\uFE0F Comment fetch failed (non-critical): ${commentError}`);
                  }
                }
                translation = await translatorService.translateAndRewrite(
                  post.title,
                  post.content,
                  contentEmbedding,
                  // Pass precomputed full content embedding to be stored
                  post.location,
                  // Pass post.location as checkInLocation
                  communityComments,
                  // Pass community comments for story enrichment (used for score 4-5)
                  {
                    likeCount: post.likeCount,
                    commentCount: post.commentCount,
                    shareCount: post.shareCount,
                    viewCount: post.viewCount
                  },
                  // ASSET METADATA: Pass REAL asset info so headlines don't lie about videos/photos
                  {
                    hasVideo: !!post.videoUrl,
                    // True only if actual video URL exists
                    hasMultipleImages: (post.imageUrls?.length ?? 0) > 1,
                    // True only if multiple images
                    hasCCTV: (post.content?.toLowerCase() || "").includes("cctv") || (post.content || "").includes("\u0E01\u0E25\u0E49\u0E2D\u0E07\u0E27\u0E07\u0E08\u0E23\u0E1B\u0E34\u0E14"),
                    isVideo: post.isVideo
                    // True if scraper detected this as a video/reel
                  },
                  post.sourceUrl
                  // Pass sourceUrl so comments can be scraped if interestScore >= 4
                );
              } catch (translationError) {
                console.error(`
\u274C TRANSLATION FAILED - Skipping post`);
                console.error(`   Title: ${post.title.substring(0, 60)}...`);
                console.error(`   Error: ${translationError}`);
                console.error(`   \u2705 Post skipped (prevents publishing untranslated Thai content)
`);
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
                    skippedNotNews
                  });
                }
                return;
              }
              const classification = await classificationService.classifyArticle(
                translation.translatedTitle,
                translation.excerpt
              );
              if (translation.isActualNews) {
                const isHighInterest = translation.interestScore >= 4;
                const shouldAutoPublish = isHighInterest || translation.interestScore >= 3 && !translation.needsReview;
                if (!shouldAutoPublish) {
                  const reason = translation.needsReview ? "Flagged for review (AI uncertainty)" : "Low interest (draft)";
                  skipReasons.push({
                    reason,
                    postTitle: post.title.substring(0, 60),
                    sourceUrl: post.sourceUrl,
                    facebookPostId: post.facebookPostId,
                    details: translation.needsReview ? `Reason: ${translation.reviewReason || "Unspecified uncertainty"}` : `Score: ${translation.interestScore}/5`
                  });
                  if (translation.needsReview) {
                    console.log(`\u26A0\uFE0F  ARTICLE FLAGGED FOR REVIEW: ${translation.reviewReason}`);
                  }
                }
                let article;
                try {
                  const assignedJournalist = getRandomJournalist();
                  let localImageUrl = post.imageUrl;
                  let localImageUrls = post.imageUrls;
                  try {
                    const blurOptions = getBlurSetting(classification);
                    if (blurOptions.blurFaces) {
                      console.log(`\u{1F6E1}\uFE0F  PRIVACY: Sensitive story detected (${classification.eventType}). Enabling face blur for images.`);
                    }
                    if (post.imageUrl) {
                      console.log(`\u2B07\uFE0F  Downloading primary image: ${post.imageUrl.substring(0, 60)}...`);
                      const savedPath = await imageDownloaderService.downloadAndSaveImage(post.imageUrl, "news", blurOptions);
                      if (savedPath) {
                        localImageUrl = savedPath;
                      } else {
                        console.warn(`\u26A0\uFE0F  Failed to download primary image, keeping original URL`);
                      }
                    }
                    if (post.imageUrls && post.imageUrls.length > 0) {
                      console.log(`\u2B07\uFE0F  Downloading ${post.imageUrls.length} additional images...`);
                      const savedUrls = [];
                      for (const url of post.imageUrls) {
                        const savedPath = await imageDownloaderService.downloadAndSaveImage(url, "news-gallery", blurOptions);
                        if (savedPath) {
                          savedUrls.push(savedPath);
                        } else {
                          savedUrls.push(url);
                        }
                      }
                      localImageUrls = savedUrls;
                    }
                  } catch (downloadError) {
                    console.error("\u274C Error downloading images:", downloadError);
                  }
                  console.log(`\u{1F4BE} Attempting to save article to database...`);
                  console.log(`   Title: ${translation.translatedTitle.substring(0, 60)}...`);
                  console.log(`   Category: ${translation.category} | Interest: ${translation.interestScore}/5 | Will publish: ${shouldAutoPublish}`);
                  const isVideoStory = post.isVideo;
                  const finalInterestScore = translation.interestScore;
                  const finalImageUrl = localImageUrl;
                  if (isVideoStory) {
                    const hasDirectUrl = !!post.videoUrl;
                    console.log(`   \u{1F3A5} VIDEO STORY DETECTED!`);
                    console.log(`      \u{1F4CA} Final score: ${finalInterestScore}/5`);
                    if (hasDirectUrl) {
                      console.log(`      \u2705 Direct video URL available - native playback`);
                    } else {
                      console.log(`      \u{1F4FA} No direct URL - using Facebook embed (auto-embed enabled)`);
                    }
                  }
                  const articleData = {
                    title: translation.translatedTitle,
                    content: translation.translatedContent,
                    excerpt: translation.excerpt,
                    originalTitle: post.title,
                    // Store Thai source title for duplicate detection
                    originalContent: post.content,
                    // Store Thai source content for duplicate detection
                    facebookHeadline: translation.facebookHeadline,
                    // Save high-CTR headline
                    imageUrl: finalImageUrl || null,
                    imageUrls: localImageUrls || null,
                    imageHash: imageHash || null,
                    // Store perceptual hash for duplicate detection
                    sourceImageUrl: post.imageUrl || null,
                    // Original CDN URL for cross-source duplicate detection
                    sourceImageUrls: post.imageUrls || null,
                    // All original CDN URLs for cross-source duplicate detection
                    videoUrl: post.videoUrl || null,
                    // Store video URL for embedded playback
                    videoThumbnail: post.videoThumbnail || null,
                    // High-quality video thumbnail
                    // PHASE 1: Auto-embed for ACTUAL video/reel URLs only (not just isVideo flag)
                    // Only embed if URL contains video patterns - prevents photo posts from showing "Video Unavailable"
                    facebookEmbedUrl: isVideoStory && !post.videoUrl && post.sourceUrl && (post.sourceUrl.includes("/reel/") || post.sourceUrl.includes("/reels/") || post.sourceUrl.includes("/videos/") || post.sourceUrl.includes("/watch")) ? post.sourceUrl : null,
                    category: translation.category,
                    sourceUrl: post.sourceUrl,
                    sourceName: post.sourceName || "Facebook",
                    sourceFacebookPostId: post.facebookPostId || null,
                    facebookPostId: null,
                    // Set after our page posts it
                    journalistId: assignedJournalist.id,
                    isPublished: shouldAutoPublish,
                    originalLanguage: "th",
                    translatedBy: "openai",
                    embedding: translation.embedding,
                    eventType: classification.eventType,
                    severity: classification.severity,
                    interestScore: finalInterestScore,
                    engagementScore: (post.likeCount || 0) + (post.commentCount || 0) * 2 + (post.shareCount || 0) * 5,
                    viewCount: post.viewCount || 0,
                    isDeveloping: translation.isDeveloping || false,
                    entities: extractedEntities || null,
                    reEnrichAt: shouldAutoPublish && finalInterestScore >= 4 ? new Date(Date.now() + 2.5 * 60 * 60 * 1e3) : null
                  };
                  articleData.tags = detectTags(translation.translatedTitle, translation.translatedContent, translation.category);
                  const { StoryEnrichmentCoordinator: StoryEnrichmentCoordinator2 } = await Promise.resolve().then(() => (init_story_enrichment_coordinator(), story_enrichment_coordinator_exports));
                  const enrichmentCoordinator = new StoryEnrichmentCoordinator2();
                  console.log(`\u{1F50D} Running duplicate detection and enrichment...`);
                  const enrichmentResult = await enrichmentCoordinator.processNewStory(articleData, storage);
                  if (enrichmentResult.action === "merge") {
                    console.log(`\u{1F504} MERGED: Story merged into existing article(s)`);
                    console.log(`   Reason: ${enrichmentResult.reason}`);
                    console.log(`   Merged with: ${enrichmentResult.mergedWith?.join(", ")}`);
                    skipReasons.push({
                      reason: "Merged with existing",
                      postTitle: post.title.substring(0, 60),
                      sourceUrl: post.sourceUrl,
                      facebookPostId: post.facebookPostId,
                      details: enrichmentResult.reason || "Story merged into existing article"
                    });
                    return;
                  }
                  let finalArticleData = enrichmentResult.article || articleData;
                  try {
                    const { getStoryUpdateDetectorService: getStoryUpdateDetectorService2 } = await Promise.resolve().then(() => (init_story_update_detector(), story_update_detector_exports));
                    const storyUpdateDetector = getStoryUpdateDetectorService2();
                    const updateResult = await storyUpdateDetector.detectStoryUpdate(finalArticleData, storage);
                    if (updateResult.isUpdate && updateResult.originalStory) {
                      console.log(`
\u{1F4F0} STORY UPDATE DETECTED!`);
                      console.log(`   This is an update to: "${updateResult.originalStory.title.substring(0, 50)}..."`);
                      console.log(`   Confidence: ${updateResult.confidence}%`);
                      console.log(`   Progression: ${updateResult.progressionType || "General update"}`);
                      console.log(`   Reasoning: ${updateResult.reasoning}`);
                      const linkResult = await storyUpdateDetector.linkAsUpdate(
                        finalArticleData,
                        updateResult.originalStory,
                        storage,
                        updateResult.progressionType
                      );
                      if (linkResult.success) {
                        finalArticleData = {
                          ...finalArticleData,
                          content: linkResult.modifiedContent || finalArticleData.content,
                          relatedArticleIds: [updateResult.originalStory.id],
                          seriesId: linkResult.seriesId || void 0,
                          storySeriesTitle: updateResult.originalStory.storySeriesTitle || void 0
                        };
                        console.log(`   \u2705 Linked to original story: ${updateResult.originalStory.id}`);
                        if (linkResult.timelineCreated) {
                          console.log(`   \u{1F4C5} Timeline created: ${linkResult.seriesId}`);
                        }
                      }
                    }
                  } catch (updateError) {
                    console.error(`   \u26A0\uFE0F Story update detection failed (non-critical):`, updateError);
                  }
                  article = await storage.createArticle(finalArticleData);
                  console.log(`\u2705 SUCCESS: Article created with ID: ${article.id}`);
                  if (article.isPublished) {
                    console.log(`   \u{1F4F0} HIGH INTEREST (${translation.interestScore}/5) - Article AUTO-PUBLISHED`);
                    publishedCount++;
                    try {
                      const { switchyService: switchyService2 } = await Promise.resolve().then(() => (init_switchy(), switchy_exports));
                      const { buildArticleUrl: buildArticleUrl2 } = await Promise.resolve().then(() => (init_category_map(), category_map_exports));
                      if (switchyService2.isConfigured()) {
                        const baseUrl = "https://phuketradar.com";
                        const articlePath = buildArticleUrl2({ category: article.category, slug: article.slug, id: article.id });
                        const fullUrl = `${baseUrl}${articlePath}`;
                        const switchyResult = await switchyService2.createArticleLink(
                          fullUrl,
                          "bio",
                          translation.facebookHeadline || translation.translatedTitle,
                          localImageUrl || void 0
                        );
                        if (switchyResult.success && switchyResult.link?.shortUrl) {
                          await storage.updateArticle(article.id, { switchyShortUrl: switchyResult.link.shortUrl });
                          console.log(`   \u{1F517} Generated Switchy short URL: ${switchyResult.link.shortUrl}`);
                        }
                      }
                    } catch (switchyError) {
                      console.warn(`   \u26A0\uFE0F  Switchy short URL generation failed (non-critical):`, switchyError);
                    }
                  } else {
                    console.log(`   \u{1F4CB} Low interest (${translation.interestScore}/5) - Article saved as DRAFT for review`);
                  }
                  createdCount++;
                  try {
                    const { getTimelineService: getTimelineService2 } = await Promise.resolve().then(() => (init_timeline_service(), timeline_service_exports));
                    const timelineService = getTimelineService2(storage);
                    if (finalArticleData.seriesId) {
                      console.log(`\u{1F4C5} Adding story update to timeline: ${finalArticleData.seriesId}`);
                      await timelineService.addArticleToTimeline(article.id, finalArticleData.seriesId);
                      console.log(`   \u2705 Added to timeline successfully`);
                    }
                    const matchResult = await timelineService.findMatchingTimeline(article);
                    if (matchResult.matched && matchResult.seriesId) {
                      await timelineService.addArticleToTimeline(article.id, matchResult.seriesId);
                      const isPublished = matchResult.shouldAutoPublish;
                      const needsReview = !matchResult.shouldAutoPublish;
                      await storage.updateArticle(article.id, {
                        needsReview,
                        reviewReason: needsReview ? `Auto-matched to timeline with ${matchResult.matchCount} keyword (needs review)` : void 0,
                        isPublished
                      });
                      console.log(`\u{1F517} AUTO-MATCHED to timeline: ${matchResult.seriesId}`);
                      console.log(`   \u{1F4CA} Matched ${matchResult.matchCount} unique keyword(s): [${matchResult.matchedKeywords.join(", ")}]`);
                      console.log(`   ${isPublished ? "\u2705 AUTO-PUBLISHED (2+ keywords)" : "\u26A0\uFE0F  DRAFT + REVIEW (1 keyword)"}
`);
                      if (article.isPublished) {
                        publishedCount--;
                      }
                    }
                  } catch (timelineError) {
                    console.error("Error checking timeline auto-match:", timelineError);
                  }
                } catch (createError) {
                  console.error(`
\u274C ERROR: Failed to create article in database`);
                  console.error(`   Error Code: ${createError.code || "UNKNOWN"}`);
                  console.error(`   Error Message: ${createError.message || "No message"}`);
                  console.error(`   Error Name: ${createError.name || "Unknown"}`);
                  console.error(`   Full Error:`, JSON.stringify(createError, null, 2));
                  console.error(`   Stack Trace:`, createError.stack);
                  console.error(`   Article Title: ${translation.translatedTitle.substring(0, 60)}...`);
                  console.error(`   Source URL: ${post.sourceUrl}`);
                  if (createError.code === "23505") {
                    console.log(`\u26A0\uFE0F  Duplicate article caught by database constraint: ${post.sourceUrl}`);
                    console.log(`   Title: ${translation.translatedTitle.substring(0, 60)}...`);
                    return;
                  } else {
                    console.error(`
\u{1F6A8} CRITICAL: Non-duplicate database error - re-throwing to stop scrape`);
                    throw createError;
                  }
                }
                if (imageHash) {
                  existingImageHashes.push({
                    id: article.id,
                    title: translation.translatedTitle,
                    imageHash
                  });
                }
                if (contentEmbedding) {
                  existingEmbeddings.push({
                    id: article.id,
                    title: post.title,
                    // Store original Thai title
                    content: post.content,
                    // Store original full content (used for embeddings)
                    embedding: contentEmbedding,
                    entities: extractedEntities || null
                  });
                }
                console.log(`\u2705 ${article.isPublished ? "Created and published" : "Created as draft"}: ${translation.translatedTitle.substring(0, 50)}...`);
                const hasImage = article.imageUrl || article.imageUrls && article.imageUrls.length > 0 || article.videoThumbnail;
                const isReallyPosted = article.facebookPostId && !article.facebookPostId.startsWith("LOCK:");
                const isSouthernFloodStory = /Hat Yai|Songkhla|Narathiwat|Yala|Pattani/i.test(article.title + article.content);
                const effectiveScore = isSouthernFloodStory ? Math.min(article.interestScore ?? 0, 3) : article.interestScore ?? 0;
                const effectiveCategory = isSouthernFloodStory ? "National" : article.category;
                if (article.isPublished && effectiveScore >= 4) {
                  console.log(`
\u{1F4CA} [FB-AUTOPOST DECISION] Article ID: ${article.id}`);
                  console.log(`   Title: ${article.title.substring(0, 70)}...`);
                  console.log(`   Score: ${effectiveScore}/5 | Category: ${article.category}${isSouthernFloodStory ? " \u2192 overridden to National (flood keyword)" : ""}`);
                  console.log(`   hasImage: ${!!hasImage} | isPublished: ${article.isPublished} | isReallyPosted: ${!!isReallyPosted} | isManuallyCreated: ${!!article.isManuallyCreated}`);
                }
                const shouldTriggerAutoPost = article.isPublished && effectiveScore >= 4 && !isReallyPosted && hasImage && !article.isManuallyCreated && effectiveCategory !== "National";
                if (shouldTriggerAutoPost) {
                  console.log(`\u{1F680} Triggering Internal Facebook Auto-Poster for: ${article.title.substring(0, 50)}...`);
                  postArticleToFacebook(article, storage).then((result) => {
                    if (result) {
                      console.log(`\u2705 Auto-post successful: ${result.postId}`);
                    } else {
                      console.log(`\u26A0\uFE0F Auto-post skipped or failed (check logs)`);
                    }
                  }).catch((err) => {
                    console.error("\u274C Failed to auto-post to Facebook:", err);
                  });
                } else if (article.isPublished && effectiveScore >= 4) {
                  const skipReasonDetail = !hasImage ? `no image attached` : isReallyPosted ? `already posted to Facebook (postId: ${article.facebookPostId})` : article.isManuallyCreated ? `manually created article (excluded from auto-post)` : effectiveCategory === "National" ? `category is '${article.category}'${isSouthernFloodStory ? " (Southern flood override)" : ""} \u2014 National stories excluded from auto-post` : `unknown reason`;
                  console.log(`\u23ED\uFE0F  [FB-AUTOPOST SKIP] Score ${effectiveScore}/5 story NOT auto-posted \u2192 ${skipReasonDetail}`);
                  console.log(`   Title: ${article.title.substring(0, 70)}...`);
                  console.log(`   \u2139\uFE0F  Use the Facebook button in Admin Dashboard to post this manually.`);
                } else if (article.isPublished && !hasImage) {
                  console.log(`\u23ED\uFE0F  Skipping Facebook post (no image): ${article.title.substring(0, 60)}...`);
                } else if (article.isPublished && (article.interestScore ?? 0) < 4) {
                  console.log(`\u23ED\uFE0F  Skipping auto-post to Facebook (score ${article.interestScore}/5 - manual post available in admin): ${article.title.substring(0, 60)}...`);
                }
              } else {
                const interestScore = translation.interestScore || 0;
                skippedNotNews++;
                skipReasons.push({
                  reason: "Not news (AI classified)",
                  postTitle: post.title.substring(0, 60),
                  sourceUrl: post.sourceUrl,
                  facebookPostId: post.facebookPostId,
                  details: `AI classified as non-news (score: ${interestScore}/5)`
                });
                console.log(`\u23ED\uFE0F  Skipped non-news: ${post.title.substring(0, 50)}...`);
              }
              if (callbacks?.onProgress) {
                callbacks.onProgress({
                  totalPosts,
                  processedPosts: createdCount + skippedNotNews + skippedSemanticDuplicates,
                  createdArticles: createdCount,
                  skippedNotNews
                });
              }
            })(),
            // End of async function - invoke immediately
            3e5,
            // 5 minute timeout (increased from 2 min due to slow Neon queries)
            `Post processing timeout after 5 minutes: ${post.title.substring(0, 60)}...`
          );
        } catch (error) {
          console.error("\n\u274C CRITICAL ERROR processing post:");
          console.error(`   Post Title: ${post.title.substring(0, 60)}...`);
          console.error(`   Source URL: ${post.sourceUrl}`);
          console.error(`   Error: ${error.message || "Unknown error"}`);
          console.error(`   Stack:`, error.stack);
          if (error.message?.includes("timeout")) {
            console.error(`   \u23F1\uFE0F  POST TIMED OUT - Skipping and continuing to next post`);
            skipReasons.push({
              reason: "Processing timeout",
              postTitle: post.title.substring(0, 60),
              sourceUrl: post.sourceUrl,
              facebookPostId: post.facebookPostId,
              details: "Processing took longer than 2 minutes"
            });
          }
          continue;
        }
        if ((postIndex + 1) % 3 === 0) {
          console.log(`   \u23F8\uFE0F  Yielding to event loop after ${postIndex + 1} posts (keeping server responsive)...`);
          await yieldToEventLoop();
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    console.log("\n" + "\u2501".repeat(80));
    console.log("\u{1F4CA} SCRAPE SUMMARY");
    console.log("\u2501".repeat(80));
    console.log(`Total posts checked: ${totalPosts}`);
    console.log(`Articles created: ${createdCount} (${publishedCount} published, ${createdCount - publishedCount} drafts)`);
    console.log(`Posts skipped: ${skipReasons.length}`);
    if (skipReasons.length > 0) {
      const reasonCounts = skipReasons.reduce((acc, skip) => {
        acc[skip.reason] = (acc[skip.reason] || 0) + 1;
        return acc;
      }, {});
      console.log("\n" + "\u2500".repeat(80));
      console.log("\u{1F6AB} REJECTION BREAKDOWN:");
      console.log("\u2500".repeat(80));
      Object.entries(reasonCounts).sort(([, a], [, b]) => b - a).forEach(([reason, count]) => {
        console.log(`  \u2022 ${reason}: ${count} post${count > 1 ? "s" : ""}`);
      });
      console.log("\n" + "\u2500".repeat(80));
      console.log("\u{1F4CB} DETAILED REJECTION LOG:");
      console.log("\u2500".repeat(80));
      skipReasons.forEach((skip, idx) => {
        console.log(`
${idx + 1}. ${skip.reason}`);
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
    console.log("\n" + "\u2501".repeat(80));
    console.log("\u2705 SCRAPE COMPLETE");
    console.log("\u2501".repeat(80) + "\n");
    return {
      success: true,
      totalPosts,
      skippedSemanticDuplicates,
      skippedNotNews,
      articlesCreated: createdCount,
      articlesPublished: publishedCount
    };
  } catch (error) {
    console.error("Error during scheduled scrape:", error);
    throw error;
  }
}
async function runManualPageScrape(pageIdentifier, callbacks) {
  let pageUrl;
  if (pageIdentifier.startsWith("http")) {
    pageUrl = pageIdentifier;
  } else if (pageIdentifier.startsWith("facebook.com") || pageIdentifier.startsWith("www.facebook.com")) {
    pageUrl = `https://${pageIdentifier}`;
  } else {
    pageUrl = `https://www.facebook.com/${pageIdentifier}`;
  }
  console.log(`
\u{1F3AF} MANUAL PAGE SCRAPE - Scraping arbitrary Facebook page
`);
  console.log(`   Input: ${pageIdentifier}`);
  console.log(`   Resolved URL: ${pageUrl}`);
  console.log(`   Note: Quality filters apply, articles saved as DRAFT
`);
  try {
    const scraperService2 = await getScraperService();
    const journalists2 = await storage.getAllJournalists();
    const getRandomJournalist = () => {
      return journalists2[Math.floor(Math.random() * journalists2.length)];
    };
    console.log(`\u{1F4E1} Fetching posts from page...`);
    const posts = await scraperService2.scrapeFacebookPageWithPagination(
      pageUrl,
      1,
      // Only 1 page of results for manual scrapes (most recent posts)
      void 0
      // Don't stop early on duplicates for manual scrapes
    );
    console.log(`\u{1F4E5} Found ${posts.length} posts from page`);
    if (posts.length === 0) {
      return {
        success: false,
        message: `No posts found from ${pageIdentifier}. The page may be private, the name may be incorrect, or there are no recent posts.`,
        articlesCreated: 0,
        articlesSkipped: 0
      };
    }
    if (callbacks?.onProgress) {
      callbacks.onProgress({
        totalPosts: posts.length,
        processedPosts: 0,
        createdArticles: 0,
        skippedNotNews: 0
      });
    }
    let articlesCreated = 0;
    let articlesSkipped = 0;
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      console.log(`
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
      console.log(`Processing post ${i + 1}/${posts.length}`);
      console.log(`   Title: ${post.title.substring(0, 60)}...`);
      try {
        const hasImages = post.imageUrls && post.imageUrls.length > 0 || post.imageUrl || post.isVideo && post.videoThumbnail;
        const isEmbeddableVideoUrl = post.sourceUrl && (post.sourceUrl.includes("/reel/") || post.sourceUrl.includes("/reels/") || post.sourceUrl.includes("/videos/") || post.sourceUrl.includes("/watch"));
        if (!hasImages && !(isEmbeddableVideoUrl && post.isVideo)) {
          console.log(`   \u23ED\uFE0F  Skipped (no images)`);
          articlesSkipped++;
          continue;
        }
        if (post.textFormatPresetId) {
          console.log(`   \u23ED\uFE0F  Skipped (colored background text)`);
          articlesSkipped++;
          continue;
        }
        const existingBySourceUrl = await storage.getArticleBySourceUrl(post.sourceUrl);
        if (existingBySourceUrl) {
          console.log(`   \u23ED\uFE0F  Skipped (already exists by source URL)`);
          articlesSkipped++;
          continue;
        }
        if (post.facebookPostId) {
          const existingByPostId = await storage.getArticleBySourceFacebookPostId(post.facebookPostId);
          if (existingByPostId) {
            console.log(`   \u23ED\uFE0F  Skipped (already exists by FB post ID)`);
            articlesSkipped++;
            continue;
          }
        }
        if (post.isVideo && !post.imageUrl && post.videoThumbnail) {
          post.imageUrl = post.videoThumbnail;
          if (!post.imageUrls || post.imageUrls.length === 0) {
            post.imageUrls = [post.videoThumbnail];
          }
        }
        let contentEmbedding;
        try {
          contentEmbedding = await translatorService.generateEmbeddingFromContent(post.title, post.content);
        } catch (e) {
          console.log(`   \u26A0\uFE0F  Embedding generation failed (continuing anyway)`);
        }
        console.log(`   \u{1F4DD} Translating content...`);
        const translation = await translatorService.translateAndRewrite(
          post.title,
          post.content,
          contentEmbedding,
          post.location,
          void 0,
          // No community comments for page scrapes
          {
            likeCount: post.likeCount,
            commentCount: post.commentCount,
            shareCount: post.shareCount,
            viewCount: post.viewCount
          },
          {
            hasVideo: !!post.videoUrl,
            hasMultipleImages: (post.imageUrls?.length ?? 0) > 1,
            hasCCTV: (post.content?.toLowerCase() || "").includes("cctv") || (post.content || "").includes("\u0E01\u0E25\u0E49\u0E2D\u0E07\u0E27\u0E07\u0E08\u0E23\u0E1B\u0E34\u0E14"),
            isVideo: post.isVideo
          }
        );
        if (!translation.isActualNews) {
          console.log(`   \u23ED\uFE0F  Skipped (not classified as news)`);
          articlesSkipped++;
          continue;
        }
        console.log(`   \u2705 Classification: ${translation.category}, Interest: ${translation.interestScore}/5`);
        const classification = await classificationService.classifyArticle(
          translation.translatedTitle,
          translation.excerpt
        );
        console.log(`   \u2728 Applying premium GPT-4o enrichment...`);
        try {
          const enrichmentResult = await translatorService.enrichWithPremiumGPT4({
            title: translation.translatedTitle,
            content: translation.translatedContent,
            excerpt: translation.excerpt,
            category: translation.category
          }, "gpt-4o");
          translation.translatedTitle = enrichmentResult.enrichedTitle;
          translation.translatedContent = enrichmentResult.enrichedContent;
          translation.excerpt = enrichmentResult.enrichedExcerpt;
          console.log(`   \u2705 Premium enrichment applied`);
        } catch (enrichmentError) {
          console.warn(`   \u26A0\uFE0F  Premium enrichment failed (using base translation):`, enrichmentError);
        }
        let localImageUrl = post.imageUrl;
        let localImageUrls = post.imageUrls;
        const blurOptions = getBlurSetting(classification);
        if (blurOptions.blurFaces) {
          console.log(`\u{1F6E1}\uFE0F  PRIVACY: Sensitive story detected (${classification.eventType}). Enabling face blur for images.`);
        }
        try {
          if (post.imageUrl) {
            const savedPath = await imageDownloaderService.downloadAndSaveImage(post.imageUrl, "news", blurOptions);
            if (savedPath) {
              localImageUrl = savedPath;
            }
          }
          if (post.imageUrls && post.imageUrls.length > 0) {
            const savedUrls = [];
            for (const url of post.imageUrls) {
              const savedPath = await imageDownloaderService.downloadAndSaveImage(url, "news-gallery", blurOptions);
              if (savedPath) {
                savedUrls.push(savedPath);
              } else {
                savedUrls.push(url);
              }
            }
            localImageUrls = savedUrls;
          }
        } catch (downloadError) {
          console.log(`   \u26A0\uFE0F  Image download failed (using original URLs)`);
        }
        let extractedEntities = null;
        try {
          const { entityExtractionService: entityExtractionService2 } = await Promise.resolve().then(() => (init_entity_extraction(), entity_extraction_exports));
          extractedEntities = await entityExtractionService2.extractEntities(post.title, post.content);
        } catch (e) {
        }
        const sourceNameMatch = pageUrl.match(/facebook\.com\/([^\/\?]+)/);
        const sourceName = sourceNameMatch ? sourceNameMatch[1] : pageIdentifier;
        const assignedJournalist = getRandomJournalist();
        const articleData = {
          title: translation.translatedTitle,
          content: translation.translatedContent,
          excerpt: translation.excerpt,
          originalTitle: post.title,
          originalContent: post.content,
          facebookHeadline: translation.facebookHeadline,
          imageUrl: localImageUrl || null,
          imageUrls: localImageUrls || null,
          imageHash: null,
          sourceImageUrl: post.imageUrl || null,
          // Original CDN URL for cross-source duplicate detection
          sourceImageUrls: post.imageUrls || null,
          // All original CDN URLs for cross-source duplicate detection
          category: translation.category,
          sourceUrl: post.sourceUrl,
          sourceName,
          sourceFacebookPostId: post.facebookPostId || null,
          facebookPostId: null,
          journalistId: assignedJournalist.id,
          isPublished: false,
          // ALWAYS DRAFT for manual page scrapes
          originalLanguage: "th",
          translatedBy: "openai",
          embedding: translation.embedding,
          eventType: classification.eventType,
          severity: classification.severity,
          videoUrl: post.videoUrl || null,
          videoThumbnail: post.videoThumbnail || null,
          facebookEmbedUrl: post.isVideo && !post.videoUrl && post.sourceUrl && (post.sourceUrl.includes("/reel/") || post.sourceUrl.includes("/reels/") || post.sourceUrl.includes("/videos/") || post.sourceUrl.includes("/watch")) ? post.sourceUrl : null,
          interestScore: post.isVideo ? Math.max(translation.interestScore, 4) : translation.interestScore,
          engagementScore: (post.likeCount || 0) + (post.commentCount || 0) * 2 + (post.shareCount || 0) * 5,
          viewCount: post.viewCount || 0,
          isDeveloping: translation.isDeveloping || false,
          entities: extractedEntities || null
        };
        articleData.tags = detectTags(translation.translatedTitle, translation.translatedContent, translation.category);
        const article = await storage.createArticle(articleData);
        console.log(`   \u2705 Created article: ${article.title.substring(0, 50)}...`);
        articlesCreated++;
        if (callbacks?.onProgress) {
          callbacks.onProgress({
            totalPosts: posts.length,
            processedPosts: i + 1,
            createdArticles: articlesCreated,
            skippedNotNews: articlesSkipped
          });
        }
      } catch (postError) {
        console.error(`   \u274C Error processing post:`, postError);
        articlesSkipped++;
        continue;
      }
    }
    console.log(`
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`);
    console.log(`\u{1F4CA} MANUAL PAGE SCRAPE COMPLETE`);
    console.log(`   Page: ${pageIdentifier}`);
    console.log(`   Posts found: ${posts.length}`);
    console.log(`   Articles created: ${articlesCreated} (as drafts)`);
    console.log(`   Posts skipped: ${articlesSkipped}`);
    console.log(`\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
`);
    return {
      success: true,
      message: articlesCreated > 0 ? `Created ${articlesCreated} article(s) as drafts from ${pageIdentifier}` : `No new articles from ${pageIdentifier} (${articlesSkipped} posts skipped - may be duplicates or non-news)`,
      articlesCreated,
      articlesSkipped
    };
  } catch (error) {
    console.error("\u274C Error during manual page scrape:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
      articlesCreated: 0,
      articlesSkipped: 0
    };
  }
}
async function runManualPostScrape(postUrl, callbacks) {
  console.log(`
\u{1F3AF} MANUAL SCRAPE - User requested specific post
`);
  console.log(`   URL: ${postUrl}`);
  console.log(`   Note: Skipping quality/duplicate checks (user-requested)
`);
  try {
    const scraperService2 = await getScraperService();
    if (callbacks?.onProgress) {
      callbacks.onProgress({
        totalPosts: 1,
        processedPosts: 0,
        createdArticles: 0,
        skippedNotNews: 0
      });
    }
    let post;
    try {
      post = await scraperService2.scrapeSingleFacebookPost(postUrl);
      if (callbacks?.onPostScraped) {
        callbacks.onPostScraped(post);
      }
    } catch (scrapeError) {
      console.error("\u274C Error scraping post URL:", scrapeError);
      return {
        success: false,
        message: `Failed to scrape the post: ${scrapeError instanceof Error ? scrapeError.message : "Unknown error"}`
      };
    }
    if (!post) {
      console.log("\u274C No post found at the given URL");
      return {
        success: false,
        message: "No post found at the given URL. The post may be private or the URL may be incorrect."
      };
    }
    console.log(`\u2705 Post scraped successfully`);
    console.log(`   Title: ${post.title.substring(0, 60)}...`);
    console.log(`   Images: ${post.imageUrls?.length || (post.imageUrl ? 1 : 0)}`);
    const videoKeywords = [
      // Thai keywords for video/clip
      "\u0E04\u0E25\u0E34\u0E1B",
      "\u0E27\u0E34\u0E14\u0E35\u0E42\u0E2D",
      "\u0E27\u0E35\u0E14\u0E35\u0E42\u0E2D",
      "\u0E44\u0E27\u0E23\u0E31\u0E25",
      "\u0E04\u0E25\u0E34\u0E1B\u0E44\u0E27\u0E23\u0E31\u0E25",
      // English keywords (in case already translated or bilingual posts)
      "viral video",
      "video clip",
      "footage",
      "caught on camera",
      "captured on video"
    ];
    const combinedContent = `${post.title} ${post.content}`.toLowerCase();
    const mentionsVideo = videoKeywords.some((kw) => combinedContent.includes(kw.toLowerCase()));
    if (mentionsVideo && !post.isVideo) {
      console.log(`
\u{1F4F9} CONTENT-BASED VIDEO DETECTION - Post mentions video content`);
      console.log(`   Marking as video post for Facebook embedding`);
      post.isVideo = true;
    }
    const journalists2 = await storage.getAllJournalists();
    const getRandomJournalist = () => {
      return journalists2[Math.floor(Math.random() * journalists2.length)];
    };
    let contentEmbedding;
    try {
      contentEmbedding = await translatorService.generateEmbeddingFromContent(post.title, post.content);
    } catch (embeddingError) {
      console.error("\u26A0\uFE0F  Warning: Could not generate embedding:", embeddingError);
    }
    console.log(`
\u{1F4DD} Translating content...`);
    let communityComments;
    if (post.sourceUrl) {
      try {
        console.log(`   \u{1F4AC} Fetching community comments for enhanced context...`);
        const comments = await scrapePostComments(post.sourceUrl, 20);
        if (comments.length > 0) {
          communityComments = comments.filter((c) => c.text && c.text.length > 10).map((c) => c.text);
          console.log(`   \u2705 Got ${communityComments.length} substantive comments for context`);
        } else {
          console.log(`   \u{1F4ED} No comments found on this post`);
        }
      } catch (commentError) {
        console.log(`   \u26A0\uFE0F Comment fetch failed (non-critical): ${commentError}`);
      }
    }
    let translation;
    try {
      translation = await translatorService.translateAndRewrite(
        post.title,
        post.content,
        contentEmbedding,
        post.location,
        communityComments,
        // Pass fetched community comments for story enrichment
        {
          likeCount: post.likeCount,
          commentCount: post.commentCount,
          shareCount: post.shareCount,
          viewCount: post.viewCount
        },
        // ASSET METADATA: Pass REAL asset info so headlines don't lie about videos/photos
        {
          hasVideo: !!post.videoUrl,
          hasMultipleImages: (post.imageUrls?.length ?? 0) > 1,
          hasCCTV: (post.content?.toLowerCase() || "").includes("cctv") || (post.content || "").includes("\u0E01\u0E25\u0E49\u0E2D\u0E07\u0E27\u0E07\u0E08\u0E23\u0E1B\u0E34\u0E14"),
          isVideo: post.isVideo
        }
      );
    } catch (translationError) {
      console.error(`\u274C TRANSLATION FAILED:`, translationError);
      if (callbacks?.onProgress) {
        callbacks.onProgress({
          totalPosts: 1,
          processedPosts: 1,
          createdArticles: 0,
          skippedNotNews: 1
        });
      }
      return {
        success: false,
        message: "Translation failed. Please try again."
      };
    }
    console.log(`\u2705 Translation complete`);
    console.log(`   Category: ${translation.category}`);
    console.log(`   Interest Score: ${translation.interestScore}/5`);
    console.log(`   Translated Title: ${translation.translatedTitle?.substring(0, 80)}...`);
    const thaiPattern = /[\u0E00-\u0E7F]/;
    if (thaiPattern.test(translation.translatedTitle || "")) {
      console.warn(`   \u26A0\uFE0F  WARNING: Translated title still contains Thai characters!`);
      console.warn(`   This may indicate a translation failure.`);
    }
    const classification = await classificationService.classifyArticle(
      translation.translatedTitle,
      translation.excerpt
    );
    console.log(`
\u2728 MANUAL SCRAPE - Applying premium GPT-4o enrichment...`);
    try {
      const enrichmentResult = await translatorService.enrichWithPremiumGPT4({
        title: translation.translatedTitle,
        content: translation.translatedContent,
        excerpt: translation.excerpt,
        category: translation.category,
        communityComments
        // Pass community comments for richer enrichment
      }, "gpt-4o");
      translation.translatedTitle = enrichmentResult.enrichedTitle;
      translation.translatedContent = enrichmentResult.enrichedContent;
      translation.excerpt = enrichmentResult.enrichedExcerpt;
      console.log(`   \u2705 Premium enrichment complete`);
      console.log(`   Enriched Title: ${translation.translatedTitle.substring(0, 80)}...`);
    } catch (enrichmentError) {
      console.warn(`   \u26A0\uFE0F  Premium enrichment failed, using base translation:`, enrichmentError);
    }
    let localImageUrl = post.imageUrl;
    let localImageUrls = post.imageUrls;
    const blurOptions = getBlurSetting(classification);
    if (blurOptions.blurFaces) {
      console.log(`\u{1F6E1}\uFE0F  PRIVACY: Sensitive story detected (${classification.eventType}). Enabling face blur for images.`);
    }
    try {
      if (!localImageUrl && post.videoThumbnail) {
        console.log(`
\u{1F4F8} No primary image, using video thumbnail instead...`);
        const savedPath = await imageDownloaderService.downloadAndSaveImage(post.videoThumbnail, "news-video", blurOptions);
        if (savedPath) {
          localImageUrl = savedPath;
          console.log(`   \u2705 Saved to: ${savedPath}`);
        }
      } else if (post.imageUrl) {
        console.log(`
\u2B07\uFE0F  Downloading primary image...`);
        const savedPath = await imageDownloaderService.downloadAndSaveImage(post.imageUrl, "news", blurOptions);
        if (savedPath) {
          localImageUrl = savedPath;
          console.log(`   \u2705 Saved to: ${savedPath}`);
        }
      }
      if (post.imageUrls && post.imageUrls.length > 0) {
        console.log(`\u2B07\uFE0F  Downloading ${post.imageUrls.length} additional images...`);
        const savedUrls = [];
        for (const url of post.imageUrls) {
          const savedPath = await imageDownloaderService.downloadAndSaveImage(url, "news-gallery", blurOptions);
          if (savedPath) {
            savedUrls.push(savedPath);
          } else {
            savedUrls.push(url);
          }
        }
        localImageUrls = savedUrls;
        console.log(`   \u2705 Downloaded ${savedUrls.length} images`);
      }
    } catch (downloadError) {
      console.error("\u26A0\uFE0F  Warning: Error downloading images:", downloadError);
      console.log("   Continuing with original URLs...");
    }
    const finalInterestScore = post.isVideo ? Math.max(translation.interestScore, 4) : translation.interestScore;
    let extractedEntities = null;
    try {
      const { entityExtractionService: entityExtractionService2 } = await Promise.resolve().then(() => (init_entity_extraction(), entity_extraction_exports));
      extractedEntities = await entityExtractionService2.extractEntities(post.title, post.content);
    } catch (e) {
      console.error("\u274C Failed to extract entities for manual scrape:", e);
    }
    const finalImageUrl = localImageUrl;
    const assignedJournalist = getRandomJournalist();
    const sourceName = (() => {
      if (post.sourceName) return post.sourceName;
      const pageMatch = post.sourceUrl?.match(/facebook\.com\/([^\/]+)/);
      if (pageMatch && pageMatch[1] !== "reel" && pageMatch[1] !== "watch" && pageMatch[1] !== "share") {
        return pageMatch[1];
      }
      return "Facebook";
    })();
    const articleData = {
      title: translation.translatedTitle,
      content: translation.translatedContent,
      excerpt: translation.excerpt,
      originalTitle: post.title,
      originalContent: post.content,
      facebookHeadline: translation.facebookHeadline,
      imageUrl: finalImageUrl || null,
      imageUrls: localImageUrls || null,
      imageHash: null,
      sourceImageUrl: post.imageUrl || null,
      // Original CDN URL for cross-source duplicate detection
      sourceImageUrls: post.imageUrls || null,
      // All original CDN URLs for cross-source duplicate detection
      category: translation.category,
      sourceUrl: post.sourceUrl,
      sourceName,
      sourceFacebookPostId: post.facebookPostId || null,
      facebookPostId: null,
      journalistId: assignedJournalist.id,
      isPublished: false,
      // ALWAYS DRAFT - admin will review and publish
      originalLanguage: "th",
      translatedBy: "openai",
      embedding: translation.embedding,
      eventType: classification.eventType,
      severity: classification.severity,
      // VIDEO SUPPORT: Include video fields for manual scrapes
      videoUrl: post.videoUrl || null,
      videoThumbnail: post.videoThumbnail || null,
      // PHASE 1 AUTO-EMBED: Only embed for ACTUAL video/reel URLs (not just isVideo flag)
      // This prevents photo posts from showing "Video Unavailable"
      facebookEmbedUrl: post.isVideo && !post.videoUrl && post.sourceUrl && (post.sourceUrl.includes("/reel/") || post.sourceUrl.includes("/reels/") || post.sourceUrl.includes("/videos/") || post.sourceUrl.includes("/watch")) ? post.sourceUrl : null,
      // VIDEO BOOST: Videos get minimum score of 4 for high engagement
      interestScore: post.isVideo ? Math.max(translation.interestScore, 4) : translation.interestScore,
      engagementScore: (post.likeCount || 0) + (post.commentCount || 0) * 2 + (post.shareCount || 0) * 5,
      viewCount: post.viewCount || 0,
      isDeveloping: translation.isDeveloping || false,
      entities: extractedEntities || null
    };
    if (post.isVideo) {
      console.log(`
\u{1F3A5} VIDEO POST DETECTED (Manual Scrape)`);
      console.log(`   \u{1F4CA} Score boost: ${translation.interestScore} \u2192 ${Math.max(translation.interestScore, 4)}`);
      if (post.videoUrl) {
        console.log(`   \u2705 Direct video URL available`);
      } else {
        console.log(`   \u{1F4FA} Using Facebook embed (source URL)`);
      }
    }
    articleData.tags = detectTags(translation.translatedTitle, translation.translatedContent, translation.category);
    console.log(`
\u{1F50D} Running enrichment check...`);
    try {
      const { StoryEnrichmentCoordinator: StoryEnrichmentCoordinator2 } = await Promise.resolve().then(() => (init_story_enrichment_coordinator(), story_enrichment_coordinator_exports));
      const enrichmentCoordinator = new StoryEnrichmentCoordinator2();
      const enrichmentResult = await enrichmentCoordinator.processNewStory(articleData, storage);
      if (enrichmentResult.action === "merge") {
        console.log(`\u{1F504} MERGED: Story merged into existing article(s)`);
        console.log(`   Reason: ${enrichmentResult.reason}`);
        return {
          success: true,
          message: `Post merged into existing story: ${enrichmentResult.reason}`
        };
      }
      if (enrichmentResult.article) {
        Object.assign(articleData, enrichmentResult.article);
      }
    } catch (enrichmentError) {
      console.error("\u26A0\uFE0F  Warning: Enrichment failed:", enrichmentError);
      console.log("   Continuing without enrichment...");
    }
    let article;
    try {
      console.log(`
\u{1F4BE} Creating article in database...`);
      article = await storage.createArticle(articleData);
      console.log(`
\u2705 SUCCESS: Manual scrape complete!`);
      console.log(`   Article ID: ${article.id}`);
      console.log(`   Title: ${article.title}`);
      console.log(`   Category: ${article.category}`);
      console.log(`   Status: DRAFT (ready for admin review)`);
      try {
        const { getTimelineService: getTimelineService2 } = await Promise.resolve().then(() => (init_timeline_service(), timeline_service_exports));
        const timelineService = getTimelineService2(storage);
        const matchResult = await timelineService.findMatchingTimeline(article);
        if (matchResult.matched && matchResult.seriesId) {
          await timelineService.addArticleToTimeline(article.id, matchResult.seriesId);
          console.log(`   \u{1F517} Auto-matched to timeline: ${matchResult.seriesId}`);
          console.log(`   \u{1F4CA} Matched ${matchResult.matchCount} keyword(s): [${matchResult.matchedKeywords.join(", ")}]`);
        }
      } catch (timelineError) {
        console.error("\u26A0\uFE0F  Warning: Timeline auto-match failed:", timelineError);
      }
      if (callbacks?.onProgress) {
        callbacks.onProgress({
          totalPosts: 1,
          processedPosts: 1,
          createdArticles: 1,
          skippedNotNews: 0
        });
      }
      return {
        success: true,
        message: `Article created as draft: "${article.title}"`,
        article
      };
    } catch (createError) {
      console.error(`\u274C ERROR: Failed to create article in database`, createError);
      if (createError.code === "23505") {
        return {
          success: false,
          message: "This post already exists in the database."
        };
      }
      return {
        success: false,
        message: `Failed to create article: ${createError.message || "Unknown error"}`
      };
    }
  } catch (error) {
    console.error("\u274C Error during manual post scrape:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}
function startReEnrichmentPoller() {
  console.log("\u23F0 Starting re-enrichment poller (runs every 5 minutes)");
  setInterval(async () => {
    try {
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { articles: articles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { and: and7, isNotNull: isNotNull2, lte, eq: eq9, gte: gte4 } = await import("drizzle-orm");
      const { getReEnrichmentService: getReEnrichmentService2 } = await Promise.resolve().then(() => (init_re_enrichment(), re_enrichment_exports));
      const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
      const now = /* @__PURE__ */ new Date();
      const pendingArticles = await db2.select().from(articles2).where(
        and7(
          isNotNull2(articles2.reEnrichAt),
          lte(articles2.reEnrichAt, now),
          eq9(articles2.reEnrichmentCompleted, false),
          gte4(articles2.interestScore, 4)
        )
      );
      console.log(`
\u{1F504} [RE-ENRICHMENT POLLER] Cycle started at ${now.toISOString()}`);
      console.log(`   Checked for pending articles. Found ${pendingArticles.length} due for enrichment.`);
      if (pendingArticles.length === 0) return;
      const reEnrichmentService = getReEnrichmentService2(storage2);
      for (const article of pendingArticles) {
        console.log(`   Processing article ID ${article.id}: "${article.title.substring(0, 50)}..."`);
        try {
          await reEnrichmentService.reEnrichArticle(article.id);
          console.log(`   \u2705 English source search completed for article ID ${article.id}`);
        } catch (err) {
          console.error(`   \u274C Failed to run re-enrichment for article ID ${article.id}`, err);
        } finally {
          await db2.update(articles2).set({ reEnrichmentCompleted: true }).where(eq9(articles2.id, article.id));
        }
      }
    } catch (err) {
      console.error("\u274C Error in re-enrichment poller:", err);
    }
  }, 5 * 60 * 1e3);
}
var init_scheduler = __esm({
  "server/scheduler.ts"() {
    "use strict";
    init_scraper();
    init_translator();
    init_classifier();
    init_storage();
    init_semantic_similarity();
    init_news_sources();
    init_facebook_service();
    init_entity_extraction();
    init_image_hash();
    init_image_analysis();
    init_duplicate_verifier();
    init_image_downloader();
    init_tag_detector();
  }
});

// server/lib/resend-client.ts
var resend_client_exports = {};
__export(resend_client_exports, {
  addResendContact: () => addResendContact,
  getUncachableResendClient: () => getUncachableResendClient,
  isResendConfigured: () => isResendConfigured,
  removeResendContact: () => removeResendContact,
  sendResendBroadcast: () => sendResendBroadcast
});
import { Resend } from "resend";
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}
function isResendConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL && process.env.RESEND_AUDIENCE_ID);
}
async function addResendContact(email) {
  const client = getResendClient();
  if (!client) return { success: false, error: "RESEND_API_KEY not configured" };
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    console.warn("\u26A0\uFE0F RESEND_AUDIENCE_ID not set \u2014 skipping Resend contact add");
    return { success: false, error: "RESEND_AUDIENCE_ID not configured" };
  }
  try {
    const { data, error } = await client.contacts.create({ audienceId, email, unsubscribed: false });
    if (error) {
      console.error(`\u274C Resend: failed to add contact ${email}:`, error);
      return { success: false, error: error.message };
    }
    console.log(`\u2705 Resend: contact added ${email} (${data?.id})`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`\u274C Resend contact error:`, err);
    return { success: false, error: msg };
  }
}
async function removeResendContact(email) {
  const client = getResendClient();
  if (!client) return { success: false, error: "RESEND_API_KEY not configured" };
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  try {
    const { data: list } = await client.contacts.list({ audienceId });
    const contact = list?.data?.find((c) => c.email === email);
    if (!contact) return { success: true };
    const { error } = await client.contacts.update({
      audienceId,
      id: contact.id,
      unsubscribed: true
    });
    if (error) return { success: false, error: error.message };
    console.log(`\u2705 Resend: contact unsubscribed ${email}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`\u274C Resend unsubscribe error:`, err);
    return { success: false, error: msg };
  }
}
async function sendResendBroadcast(options) {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const fromEmail = "newsletter@news.phuketradar.com";
  if (!apiKey) return { success: false, error: "RESEND_API_KEY not configured" };
  if (!audienceId) return { success: false, error: "RESEND_AUDIENCE_ID not configured" };
  try {
    console.log(`\u{1F4E7} Resend: Creating broadcast \u2014 "${options.subject}"`);
    const htmlWithUnsub = options.html.replace(
      /\{\{UNSUBSCRIBE_URL\}\}/g,
      "{{{RESEND_UNSUBSCRIBE_URL}}}"
    );
    const response = await fetch("https://api.resend.com/broadcasts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        audience_id: audienceId,
        from: `Phuket Radar <${fromEmail}>`,
        subject: options.subject,
        preview_text: options.previewText || "",
        html: htmlWithUnsub,
        send: true
        // create and send immediately
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error(`\u274C Resend broadcast failed (${response.status}):`, data);
      return { success: false, error: data.message || `HTTP ${response.status}` };
    }
    console.log(`\u2705 Resend broadcast sent! ID: ${data.id}`);
    return { success: true, broadcastId: data.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`\u274C Resend broadcast error:`, err);
    return { success: false, error: msg };
  }
}
async function getUncachableResendClient() {
  const client = getResendClient();
  if (!client) throw new Error("RESEND_API_KEY not configured");
  return {
    client,
    fromEmail: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"
  };
}
var init_resend_client = __esm({
  "server/lib/resend-client.ts"() {
    "use strict";
  }
});

// server/index.ts
import "dotenv/config";
import express2 from "express";
import session2 from "express-session";
import connectPgSimple from "connect-pg-simple";

// server/routes.ts
init_storage();
init_translator();
init_schema();
import { createServer } from "http";

// server/scrape-jobs.ts
import { randomUUID } from "crypto";
var ScrapeJobManager = class {
  jobs = /* @__PURE__ */ new Map();
  createJob() {
    const id = randomUUID();
    const job = {
      id,
      status: "pending",
      startedAt: /* @__PURE__ */ new Date(),
      progress: {
        totalPosts: 0,
        processedPosts: 0,
        createdArticles: 0,
        skippedNotNews: 0
      }
    };
    this.jobs.set(id, job);
    setTimeout(() => {
      this.jobs.delete(id);
    }, 5 * 60 * 1e3);
    return job;
  }
  getJob(id) {
    return this.jobs.get(id);
  }
  updateJob(id, updates) {
    const job = this.jobs.get(id);
    if (job) {
      Object.assign(job, updates);
    }
  }
  updateProgress(id, progress) {
    const job = this.jobs.get(id);
    if (job) {
      Object.assign(job.progress, progress);
    }
  }
  markCompleted(id) {
    const job = this.jobs.get(id);
    if (job) {
      job.status = "completed";
      job.completedAt = /* @__PURE__ */ new Date();
    }
  }
  markFailed(id, error) {
    const job = this.jobs.get(id);
    if (job) {
      job.status = "failed";
      job.error = error;
      job.completedAt = /* @__PURE__ */ new Date();
    }
  }
};
var scrapeJobManager = new ScrapeJobManager();

// server/routes.ts
init_facebook_service();

// server/lib/instagram-service.ts
init_category_map();
var META_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
var INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID;
function generateHashtags2(category) {
  const baseHashtag = "#Phuket";
  const categoryHashtags = {
    "Breaking": ["#PhuketNews", "#ThailandNews", "#BreakingNews"],
    "Tourism": ["#PhuketTourism", "#ThailandTravel", "#VisitPhuket"],
    "Business": ["#PhuketBusiness", "#ThailandBusiness", "#PhuketEconomy"],
    "Events": ["#PhuketEvents", "#ThingsToDoInPhuket", "#PhuketLife"],
    "Other": ["#PhuketNews", "#Thailand", "#PhuketLife"]
  };
  const categoryTags = categoryHashtags[category] || categoryHashtags["Other"];
  return `${baseHashtag} ${categoryTags.join(" ")}`;
}
function getArticleUrl2(article) {
  const baseUrl = false ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://phuketradar.com";
  const articlePath = buildArticleUrl({ category: article.category, slug: article.slug, id: article.id });
  return `${baseUrl}${articlePath}`;
}
async function postArticleToInstagram(article, storage2) {
  if (false) {
    console.log(`\u{1F6AB} [IG-POST] Instagram posting DISABLED in development environment`);
    console.log(`\u{1F4F8} [IG-POST] Article: ${article.title.substring(0, 60)}... (would post in production)`);
    return null;
  }
  console.log(`\u{1F4F8} [IG-POST] Starting Instagram post attempt for article: ${article.title.substring(0, 60)}...`);
  console.log(`\u{1F4F8} [IG-POST] Article ID: ${article.id}`);
  if (!META_ACCESS_TOKEN) {
    console.error("\u274C [IG-POST] META_ACCESS_TOKEN not configured");
    return null;
  }
  if (!INSTAGRAM_ACCOUNT_ID) {
    console.error("\u274C [IG-POST] INSTAGRAM_ACCOUNT_ID not configured");
    return null;
  }
  const primaryImageUrl = article.imageUrl || article.imageUrls && article.imageUrls[0];
  if (!primaryImageUrl) {
    console.error(`\u274C [IG-POST] Article ${article.id} has no image, skipping Instagram post`);
    return null;
  }
  console.log(`\u{1F4F8} [IG-POST] Using image: ${primaryImageUrl}`);
  const lockToken = `${article.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  console.log(`\u{1F512} [IG-POST] Attempting to claim article for posting (lockToken: ${lockToken.substring(0, 40)}...)...`);
  const claimed = await storage2.claimArticleForInstagramPosting(article.id, lockToken);
  if (!claimed) {
    console.log(`\u23ED\uFE0F  [IG-POST] Could not claim article - already posted or being posted by another process`);
    const freshArticle = await storage2.getArticleById(article.id);
    if (freshArticle?.instagramPostId && !freshArticle.instagramPostId.startsWith("IG-LOCK:")) {
      console.log(`\u2705 [IG-POST] Article already posted (status: already-posted)`);
      console.log(`\u{1F4F8} [IG-POST] Post ID: ${freshArticle.instagramPostId}`);
      return {
        status: "already-posted",
        postId: freshArticle.instagramPostId,
        postUrl: freshArticle.instagramPostUrl || `https://www.instagram.com/p/${freshArticle.instagramPostId}/`
      };
    }
    console.log(`\u26A0\uFE0F  [IG-POST] Article is locked by another process - skipping`);
    return null;
  }
  console.log(`\u2705 [IG-POST] Successfully claimed article - proceeding with Instagram API call...`);
  try {
    const hashtags = generateHashtags2(article.category);
    const articleUrl = getArticleUrl2(article);
    const caption = `${article.title}

${article.excerpt}

Read the full story (link in comments) \u{1F447}

${hashtags}`;
    console.log(`\u{1F4F8} [IG-POST] Creating media container...`);
    console.log(`\u{1F4F8} [IG-POST] Account ID: ${INSTAGRAM_ACCOUNT_ID}`);
    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${INSTAGRAM_ACCOUNT_ID}/media`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image_url: primaryImageUrl,
          caption,
          access_token: META_ACCESS_TOKEN
        })
      }
    );
    if (!containerResponse.ok) {
      const errorText = await containerResponse.text();
      console.error("\u274C [IG-POST] Failed to create media container:");
      console.error(`\u274C [IG-POST] Status: ${containerResponse.status}`);
      console.error(`\u274C [IG-POST] Response: ${errorText}`);
      await storage2.releaseInstagramPostLock(article.id, lockToken);
      return null;
    }
    const containerData = await containerResponse.json();
    const containerId = containerData.id;
    console.log(`\u2705 [IG-POST] Created media container: ${containerId}`);
    console.log(`\u{1F4F8} [IG-POST] Waiting 3 seconds for media processing...`);
    await new Promise((resolve) => setTimeout(resolve, 3e3));
    console.log(`\u{1F4F8} [IG-POST] Publishing media container...`);
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${INSTAGRAM_ACCOUNT_ID}/media_publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: META_ACCESS_TOKEN
        })
      }
    );
    if (!publishResponse.ok) {
      const errorText = await publishResponse.text();
      console.error("\u274C [IG-POST] Failed to publish media:");
      console.error(`\u274C [IG-POST] Status: ${publishResponse.status}`);
      console.error(`\u274C [IG-POST] Response: ${errorText}`);
      await storage2.releaseInstagramPostLock(article.id, lockToken);
      return null;
    }
    const publishData = await publishResponse.json();
    const mediaId = publishData.id;
    console.log(`\u2705 [IG-POST] Published to Instagram! Media ID: ${mediaId}`);
    console.log(`\u{1F4F8} [IG-POST] Adding comment with article link...`);
    const commentResponse = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}/comments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Read the full story: ${articleUrl}`,
          access_token: META_ACCESS_TOKEN
        })
      }
    );
    if (commentResponse.ok) {
      const commentData = await commentResponse.json();
      console.log(`\u2705 [IG-POST] Added comment to post: ${commentData.id}`);
    } else {
      const commentErrorText = await commentResponse.text();
      console.warn(`\u26A0\uFE0F  [IG-POST] Failed to add comment (status ${commentResponse.status}): ${commentErrorText}`);
    }
    const postUrl = `https://www.instagram.com/p/${mediaId}/`;
    console.log(`\u{1F4F8} [IG-POST] Updating database with post ID and URL...`);
    await storage2.updateArticleInstagramPost(article.id, mediaId, postUrl, lockToken);
    console.log(`\u2705 [IG-POST] Database updated successfully!`);
    console.log(`\u{1F4F8} [IG-POST] Post URL: ${postUrl}`);
    return {
      status: "posted",
      postId: mediaId,
      postUrl
    };
  } catch (error) {
    console.error("\u274C [IG-POST] Unexpected error during Instagram posting:", error);
    try {
      await storage2.releaseInstagramPostLock(article.id, lockToken);
    } catch (releaseError) {
      console.error("\u274C [IG-POST] Failed to release lock after error:", releaseError);
    }
    return null;
  }
}

// server/lib/threads-service.ts
init_category_map();
var META_ACCESS_TOKEN2 = process.env.FB_PAGE_ACCESS_TOKEN;
var THREADS_USER_ID = process.env.THREADS_USER_ID;
function generateHashtags3(category) {
  const baseHashtag = "#Phuket";
  const categoryHashtags = {
    "Breaking": ["#PhuketNews", "#ThailandNews", "#BreakingNews"],
    "Tourism": ["#PhuketTourism", "#ThailandTravel", "#VisitPhuket"],
    "Business": ["#PhuketBusiness", "#ThailandBusiness", "#PhuketEconomy"],
    "Events": ["#PhuketEvents", "#ThingsToDoInPhuket", "#PhuketLife"],
    "Other": ["#PhuketNews", "#Thailand", "#PhuketLife"]
  };
  const categoryTags = categoryHashtags[category] || categoryHashtags["Other"];
  return `${baseHashtag} ${categoryTags.join(" ")}`;
}
function getArticleUrl3(article) {
  const baseUrl = false ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://phuketradar.com";
  const articlePath = buildArticleUrl({ category: article.category, slug: article.slug, id: article.id });
  return `${baseUrl}${articlePath}`;
}
async function postArticleToThreads(article, storage2) {
  if (false) {
    console.log(`\u{1F6AB} [THREADS-POST] Threads posting DISABLED in development environment`);
    console.log(`\u{1F9F5} [THREADS-POST] Article: ${article.title.substring(0, 60)}... (would post in production)`);
    return null;
  }
  console.log(`\u{1F9F5} [THREADS-POST] Starting Threads post attempt for article: ${article.title.substring(0, 60)}...`);
  console.log(`\u{1F9F5} [THREADS-POST] Article ID: ${article.id}`);
  if (!META_ACCESS_TOKEN2) {
    console.error("\u274C [THREADS-POST] META_ACCESS_TOKEN not configured");
    return null;
  }
  if (!THREADS_USER_ID) {
    console.error("\u274C [THREADS-POST] THREADS_USER_ID not configured");
    return null;
  }
  const lockToken = `${article.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  console.log(`\u{1F512} [THREADS-POST] Attempting to claim article for posting (lockToken: ${lockToken.substring(0, 40)}...)...`);
  const claimed = await storage2.claimArticleForThreadsPosting(article.id, lockToken);
  if (!claimed) {
    console.log(`\u23ED\uFE0F  [THREADS-POST] Could not claim article - already posted or being posted by another process`);
    const freshArticle = await storage2.getArticleById(article.id);
    if (freshArticle?.threadsPostId && !freshArticle.threadsPostId.startsWith("THREADS-LOCK:")) {
      console.log(`\u2705 [THREADS-POST] Article already posted (status: already-posted)`);
      console.log(`\u{1F9F5} [THREADS-POST] Post ID: ${freshArticle.threadsPostId}`);
      return {
        status: "already-posted",
        postId: freshArticle.threadsPostId,
        postUrl: freshArticle.threadsPostUrl || `https://www.threads.net/@phuketradar/post/${freshArticle.threadsPostId}`
      };
    }
    console.log(`\u26A0\uFE0F  [THREADS-POST] Article is locked by another process - skipping`);
    return null;
  }
  console.log(`\u2705 [THREADS-POST] Successfully claimed article - proceeding with Threads API call...`);
  try {
    const hashtags = generateHashtags3(article.category);
    const articleUrl = getArticleUrl3(article);
    const threadText = `${article.title}

${article.excerpt}

Read the full story: ${articleUrl}

${hashtags}`;
    console.log(`\u{1F9F5} [THREADS-POST] Creating threads container...`);
    console.log(`\u{1F9F5} [THREADS-POST] User ID: ${THREADS_USER_ID}`);
    const primaryImageUrl = article.imageUrl || article.imageUrls && article.imageUrls[0];
    const containerPayload = {
      text: threadText,
      access_token: META_ACCESS_TOKEN2
    };
    if (primaryImageUrl) {
      containerPayload.media_type = "IMAGE";
      containerPayload.image_url = primaryImageUrl;
      console.log(`\u{1F9F5} [THREADS-POST] Including image: ${primaryImageUrl}`);
    } else {
      containerPayload.media_type = "TEXT";
      console.log(`\u{1F9F5} [THREADS-POST] Text-only post (no image available)`);
    }
    const containerResponse = await fetch(
      `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(containerPayload)
      }
    );
    if (!containerResponse.ok) {
      const errorText = await containerResponse.text();
      console.error("\u274C [THREADS-POST] Failed to create threads container:");
      console.error(`\u274C [THREADS-POST] Status: ${containerResponse.status}`);
      console.error(`\u274C [THREADS-POST] Response: ${errorText}`);
      await storage2.releaseThreadsPostLock(article.id, lockToken);
      return null;
    }
    const containerData = await containerResponse.json();
    const containerId = containerData.id;
    console.log(`\u2705 [THREADS-POST] Created threads container: ${containerId}`);
    if (primaryImageUrl) {
      console.log(`\u{1F9F5} [THREADS-POST] Waiting 3 seconds for media processing...`);
      await new Promise((resolve) => setTimeout(resolve, 3e3));
    }
    console.log(`\u{1F9F5} [THREADS-POST] Publishing thread...`);
    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads_publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: META_ACCESS_TOKEN2
        })
      }
    );
    if (!publishResponse.ok) {
      const errorText = await publishResponse.text();
      console.error("\u274C [THREADS-POST] Failed to publish thread:");
      console.error(`\u274C [THREADS-POST] Status: ${publishResponse.status}`);
      console.error(`\u274C [THREADS-POST] Response: ${errorText}`);
      await storage2.releaseThreadsPostLock(article.id, lockToken);
      return null;
    }
    const publishData = await publishResponse.json();
    const threadId = publishData.id;
    console.log(`\u2705 [THREADS-POST] Published to Threads! Thread ID: ${threadId}`);
    console.log(`\u{1F9F5} [THREADS-POST] Link included in main post - skipping reply`);
    const postUrl = `https://www.threads.net/@phuketradar/post/${threadId}`;
    console.log(`\u{1F9F5} [THREADS-POST] Updating database with post ID and URL...`);
    await storage2.updateArticleThreadsPost(article.id, threadId, postUrl, lockToken);
    console.log(`\u2705 [THREADS-POST] Database updated successfully!`);
    console.log(`\u{1F9F5} [THREADS-POST] Post URL: ${postUrl}`);
    return {
      status: "posted",
      postId: threadId,
      postUrl
    };
  } catch (error) {
    console.error("\u274C [THREADS-POST] Unexpected error during Threads posting:", error);
    try {
      await storage2.releaseThreadsPostLock(article.id, lockToken);
    } catch (releaseError) {
      console.error("\u274C [THREADS-POST] Failed to release lock after error:", releaseError);
    }
    return null;
  }
}

// server/services/newsletter.ts
init_storage();
init_category_map();
import fs from "fs";
import path from "path";
import { format } from "date-fns";
var SITE_URL = "https://phuketradar.com";
async function generateDailyNewsletterHTML() {
  console.log("\u{1F680} Generating daily newsletter HTML...");
  const hoursAgo = 24;
  const articles2 = await storage.getPublishedArticles(100, 0);
  const twentyFourHoursAgo = new Date(Date.now() - hoursAgo * 60 * 60 * 1e3);
  const recentArticles = articles2.filter((a) => new Date(a.publishedAt) >= twentyFourHoursAgo);
  if (recentArticles.length === 0) {
    console.log("\u26A0\uFE0F No articles found in the last 24 hours. Using recent published articles instead.");
    recentArticles.push(...articles2.slice(0, 10));
  }
  if (recentArticles.length === 0) return null;
  const rankedArticles = recentArticles.sort((a, b) => {
    const scoreA = (a.engagementScore || 0) + (a.interestScore || 0);
    const scoreB = (b.engagementScore || 0) + (b.interestScore || 0);
    return scoreB - scoreA;
  });
  const topStory = rankedArticles[0];
  const trendingStories = rankedArticles.slice(1, 4);
  const radarStories = rankedArticles.slice(4, 9);
  const templatePath = path.join(process.cwd(), "docs", "newsletter-template.html");
  if (!fs.existsSync(templatePath)) {
    console.error("\u274C Newsletter template not found at", templatePath);
    return null;
  }
  let html = fs.readFileSync(templatePath, "utf-8");
  const formattedDate = format(/* @__PURE__ */ new Date(), "EEEE, MMMM d, yyyy");
  html = html.replace(/{{DATE}}/g, formattedDate);
  const excerpt = (topStory.excerpt || "").split(".")[0].trim();
  html = html.replace(/{{PREHEADER}}/g, excerpt);
  const getTimeString = (date2) => {
    const d = new Date(date2);
    return format(d, "h:mm a");
  };
  const topStoryPath = buildArticleUrl({ category: topStory.category, slug: topStory.slug, id: topStory.id });
  html = html.replace(/{{TOP_STORY_URL}}/g, `${SITE_URL}${topStoryPath}`);
  html = html.replace(/{{TOP_STORY_IMAGE}}/g, topStory.imageUrl || "https://phuketradar.com/assets/placeholder.png");
  html = html.replace(/{{TOP_STORY_TITLE}}/g, topStory.title);
  html = html.replace(/{{TOP_STORY_CATEGORY}}/g, topStory.category.toUpperCase());
  html = html.replace(/{{TOP_STORY_EXCERPT}}/g, topStory.excerpt);
  trendingStories.forEach((s, i) => {
    const idx = i + 1;
    const sPath = buildArticleUrl({ category: s.category, slug: s.slug, id: s.id });
    html = html.replace(new RegExp(`{{STORY_${idx}_URL}}`, "g"), `${SITE_URL}${sPath}`);
    html = html.replace(new RegExp(`{{STORY_${idx}_IMAGE}}`, "g"), s.imageUrl || "https://phuketradar.com/assets/placeholder.png");
    html = html.replace(new RegExp(`{{STORY_${idx}_TITLE}}`, "g"), s.title);
    html = html.replace(new RegExp(`{{STORY_${idx}_CATEGORY}}`, "g"), s.category.toUpperCase());
    html = html.replace(new RegExp(`{{STORY_${idx}_TIME}}`, "g"), getTimeString(s.publishedAt));
  });
  radarStories.forEach((s, i) => {
    const idx = i + 1;
    const sPath = buildArticleUrl({ category: s.category, slug: s.slug, id: s.id });
    html = html.replace(new RegExp(`{{RADAR_${idx}_URL}}`, "g"), `${SITE_URL}${sPath}`);
    html = html.replace(new RegExp(`{{RADAR_${idx}_TITLE}}`, "g"), s.title);
  });
  html = html.replace(/{{STORY_\d_URL}}/g, "#");
  html = html.replace(/{{STORY_\d_IMAGE}}/g, "https://phuketradar.com/assets/placeholder.png");
  html = html.replace(/{{STORY_\d_TITLE}}/g, "More news coming soon");
  html = html.replace(/{{STORY_\d_CATEGORY}}/g, "NEWS");
  html = html.replace(/{{STORY_\d_TIME}}/g, "");
  html = html.replace(/{{RADAR_\d_URL}}/g, "#");
  html = html.replace(/{{RADAR_\d_TITLE}}/g, "");
  html = html.replace(/{{UNSUBSCRIBE_URL}}/g, `${SITE_URL}/unsubscribe`);
  const topStoryExcerpt = (topStory.excerpt || "").split(".")[0].trim();
  return { html, topStoryTitle: topStory.title, topStoryExcerpt };
}

// server/services/insight-service.ts
import OpenAI3 from "openai";

// server/services/english-scrapers/english-news-scraper.ts
import { load } from "cheerio";
var EnglishNewsScraper = class {
  /**
   * Scrape The Phuket News
   * Uses RSS feed for article discovery
   */
  async scrapePhuketNews(maxArticles = 10) {
    try {
      console.log("Scraping The Phuket News...");
      const rssUrl = "https://www.thephuketnews.com/rss-news.php?type=phuket";
      const response = await fetch(rssUrl);
      const xmlText = await response.text();
      const $ = load(xmlText, { xmlMode: true });
      const articles2 = [];
      $("item").slice(0, maxArticles).each((i, elem) => {
        const title = $(elem).find("title").text();
        const url = $(elem).find("link").text();
        const description = $(elem).find("description").text();
        const pubDate = $(elem).find("pubDate").text();
        articles2.push({
          title,
          url,
          excerpt: description.substring(0, 200),
          content: description,
          publishedAt: pubDate ? new Date(pubDate) : /* @__PURE__ */ new Date(),
          source: "phuket-news"
        });
      });
      console.log(`Found ${articles2.length} articles from The Phuket News`);
      return articles2;
    } catch (error) {
      console.error("Error scraping The Phuket News:", error);
      return [];
    }
  }
  /**
   * Scrape The Phuket Express
   * Uses HTML scraping of main page
   */
  async scrapePhuketExpress(maxArticles = 10) {
    try {
      console.log("Scraping The Phuket Express...");
      const url = "https://thephuketexpress.com/";
      const response = await fetch(url);
      const html = await response.text();
      const $ = load(html);
      const articles2 = [];
      $("article, .post, .article-item").slice(0, maxArticles).each((i, elem) => {
        const $article = $(elem);
        const titleElem = $article.find("h2, h3, .entry-title, .post-title").first();
        const linkElem = titleElem.find("a").first().length ? titleElem.find("a").first() : $article.find("a").first();
        const excerptElem = $article.find(".excerpt, .entry-summary, p").first();
        const imageElem = $article.find("img").first();
        const title = titleElem.text().trim();
        const url2 = linkElem.attr("href") || "";
        const excerpt = excerptElem.text().trim();
        const imageUrl = imageElem.attr("src") || imageElem.attr("data-src");
        if (title && url2) {
          articles2.push({
            title,
            url: url2.startsWith("http") ? url2 : `https://thephuketexpress.com${url2}`,
            excerpt: excerpt.substring(0, 200),
            content: excerpt,
            publishedAt: /* @__PURE__ */ new Date(),
            source: "phuket-express",
            imageUrl
          });
        }
      });
      console.log(`Found ${articles2.length} articles from The Phuket Express`);
      return articles2;
    } catch (error) {
      console.error("Error scraping The Phuket Express:", error);
      return [];
    }
  }
  /**
   * Scrape The Thaiger (Phuket section)
   * Uses HTML scraping of Phuket news page
   */
  async scrapeThaiger(maxArticles = 10) {
    try {
      console.log("Scraping The Thaiger...");
      const url = "https://thethaiger.com/news/phuket";
      const response = await fetch(url);
      const html = await response.text();
      const $ = load(html);
      const articles2 = [];
      $("article, .post, .article-item").slice(0, maxArticles).each((i, elem) => {
        const $article = $(elem);
        const titleElem = $article.find("h2, h3, .entry-title, .post-title").first();
        const linkElem = titleElem.find("a").first().length ? titleElem.find("a").first() : $article.find("a").first();
        const excerptElem = $article.find(".excerpt, .entry-summary, p").first();
        const imageElem = $article.find("img").first();
        const title = titleElem.text().trim();
        const url2 = linkElem.attr("href") || "";
        const excerpt = excerptElem.text().trim();
        const imageUrl = imageElem.attr("src") || imageElem.attr("data-src");
        if (title && url2) {
          articles2.push({
            title,
            url: url2.startsWith("http") ? url2 : `https://thethaiger.com${url2}`,
            excerpt: excerpt.substring(0, 200),
            content: excerpt,
            publishedAt: /* @__PURE__ */ new Date(),
            source: "thaiger",
            imageUrl
          });
        }
      });
      console.log(`Found ${articles2.length} articles from The Thaiger`);
      return articles2;
    } catch (error) {
      console.error("Error scraping The Thaiger:", error);
      return [];
    }
  }
  /**
   * Scrape all English news sources
   */
  async scrapeAll(maxPerSource = 10) {
    const [phuketNews, phuketExpress, thaiger] = await Promise.all([
      this.scrapePhuketNews(maxPerSource),
      this.scrapePhuketExpress(maxPerSource),
      this.scrapeThaiger(maxPerSource)
    ]);
    return [...phuketNews, ...phuketExpress, ...thaiger];
  }
};
var englishNewsScraper = new EnglishNewsScraper();

// server/services/insight-service.ts
var openai3 = new OpenAI3({
  apiKey: process.env.OPENAI_API_KEY
});
var InsightService = class {
  /**
   * Generate a Phuket Radar Insight piece (300-400 words)
   * Combines your breaking news with context from English sources
   */
  async generateInsight(request) {
    console.log(`
=== GENERATING PHUKET RADAR INSIGHT ===`);
    console.log(`Topic: ${request.topic}`);
    console.log(`Source articles: ${request.sourceArticles.length}`);
    console.log(`Scraping English news sources for related coverage...`);
    const englishArticles = await englishNewsScraper.scrapeAll(15);
    const relevantEnglishArticles = await this.findRelevantEnglishArticles(
      request.topic,
      englishArticles
    );
    console.log(`Found ${relevantEnglishArticles.length} relevant English articles`);
    const insight = await this.synthesizeInsight(
      request.topic,
      request.sourceArticles,
      relevantEnglishArticles,
      request.eventType
    );
    return {
      ...insight,
      relatedArticleIds: request.sourceArticles.map((a) => a.id),
      sources: relevantEnglishArticles.map((a) => a.url)
    };
  }
  /**
   * Find English articles relevant to the topic
   * Uses keyword matching and semantic similarity
   */
  async findRelevantEnglishArticles(topic, articles2) {
    const keywords = topic.toLowerCase().split(/\s+/);
    return articles2.filter((article) => {
      const text2 = `${article.title} ${article.excerpt}`.toLowerCase();
      return keywords.some((keyword) => text2.includes(keyword));
    }).slice(0, 5);
  }
  /**
   * Use GPT-4 to synthesize breaking news + English source context
   * into a 300-400 word analytical Insight piece
   */
  async synthesizeInsight(topic, breakingNewsArticles, englishArticles, eventType) {
    const breakingNewsContext = breakingNewsArticles.map(
      (article, idx) => `[Breaking News ${idx + 1}]
Title: ${article.title}
Excerpt: ${article.excerpt}
Published: ${article.publishedAt.toISOString()}`
    ).join("\n\n");
    const englishSourceContext = englishArticles.map(
      (article, idx) => `[${article.source.toUpperCase()} - ${idx + 1}]
Title: ${article.title}
Excerpt: ${article.excerpt}
URL: ${article.url}`
    ).join("\n\n");
    const systemPrompt = `You are a news analyst for Phuket Radar, a trusted local news platform for Phuket's international community.

Your task is to create a "Phuket Radar Insight" - a short analytical piece (300-400 words) that:
1. Synthesizes breaking news we published with context from trusted English news outlets
2. Provides factual analysis in a neutral, journalistic tone
3. Highlights patterns, implications, or local context that readers should know
4. Shows our value-add: "We broke it first, here's the full picture"
5. Maintains credibility by citing sources appropriately

Voice & Style:
- Factual, neutral, local-focused
- Clear and accessible to international residents
- Confident but not sensational
- Professional journalism standards`;
    const userPrompt = `Create a Phuket Radar Insight on: "${topic}"${eventType ? ` (Event Type: ${eventType})` : ""}

=== OUR BREAKING NEWS (Published First) ===
${breakingNewsContext}

=== ADDITIONAL CONTEXT (English News Sources) ===
${englishSourceContext || "No additional English source coverage found yet."}

Write a 300-400 word Insight piece that:
1. Opens with what happened (based on our breaking news)
2. Adds context, patterns, or implications from English sources
3. Explains what this means for Phuket residents
4. Maintains neutral, factual tone
5. Credits sources naturally in the narrative

Format your response as JSON:
{
  "title": "Engaging headline for the Insight piece (max 100 chars)",
  "content": "Full 300-400 word article in markdown format",
  "excerpt": "Compelling 2-sentence summary (max 200 chars)"
}`;
    try {
      const completion = await openai3.chat.completions.create({
        model: "gpt-4o-mini",
        // Cost optimization: mini is sufficient for insight generation
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });
      const result = JSON.parse(completion.choices[0].message.content || "{}");
      console.log(`Generated Insight: ${result.title}`);
      console.log(`Word count: ${result.content.split(/\s+/).length}`);
      return {
        title: result.title,
        content: result.content,
        excerpt: result.excerpt
      };
    } catch (error) {
      console.error("Error generating Insight with GPT-4:", error);
      throw new Error("Failed to generate Insight piece");
    }
  }
};
var insightService = new InsightService();

// server/routes.ts
init_category_map();
init_db();
import multer from "multer";
import path3 from "path";
import { promises as fs3 } from "fs";
import { sql as sql9 } from "drizzle-orm";

// server/lib/auto-link-content.ts
init_core_tags();
function autoLinkContent(content, tags) {
  if (!tags || tags.length === 0) {
    return content;
  }
  let modifiedContent = content;
  for (const tag of tags) {
    const regex = new RegExp(
      `(?<!<a[^>]*>.*?)\\b(${escapeRegex(tag)})\\b(?![^<]*<\\/a>)`,
      "i"
    );
    const match = regex.exec(modifiedContent);
    if (match) {
      const matchedText = match[1];
      const tagUrl = getTagUrl(tag);
      const replacement = `<a href="${tagUrl}" class="internal-link">${matchedText}</a>`;
      modifiedContent = modifiedContent.replace(regex, replacement);
    }
  }
  return modifiedContent;
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// server/services/smart-context.ts
async function getSmartContextStories(currentArticle, storage2) {
  if (currentArticle.seriesId) {
    const timelineStories = await storage2.getArticlesBySeriesId(currentArticle.seriesId);
    if (timelineStories.length > 1) {
      return {
        type: "TIMELINE" /* TIMELINE */,
        stories: timelineStories,
        metadata: {
          seriesId: currentArticle.seriesId,
          timeframe: "developing-story"
        }
      };
    }
  }
  const recentCategoryStories = await storage2.getRecentArticlesByCategory(
    currentArticle.category,
    48,
    currentArticle.id
  );
  if (recentCategoryStories.length > 0) {
    return {
      type: "FRESH_GRID" /* FRESH_GRID */,
      stories: recentCategoryStories.slice(0, 6),
      // Limit to 6 for grid layout
      metadata: {
        category: currentArticle.category,
        timeframe: "48-hours"
      }
    };
  }
  const trendingStories = await storage2.getTrendingArticles(24, 3);
  if (trendingStories.length > 0) {
    return {
      type: "TRENDING_LIST" /* TRENDING_LIST */,
      stories: trendingStories,
      metadata: {
        timeframe: "24-hours"
      }
    };
  }
  return {
    type: "NULL" /* NULL */,
    stories: [],
    metadata: {}
  };
}

// server/routes.ts
init_tag_detector();
init_core_tags();
import sharp4 from "sharp";

// server/lib/cache.ts
var MemoryCache = class {
  cache = /* @__PURE__ */ new Map();
  cleanupInterval = null;
  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 6e4);
  }
  /**
   * Get a cached value
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  /**
   * Set a cached value with TTL in milliseconds
   */
  set(key, data, ttlMs) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }
  /**
   * Delete a specific cache entry
   */
  delete(key) {
    this.cache.delete(key);
  }
  /**
   * Invalidate all entries matching a pattern
   */
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }
  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
  /**
   * Stop the cleanup interval (for graceful shutdown)
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
};
var cache = new MemoryCache();
var CACHE_KEYS = {
  PUBLISHED_ARTICLES: "articles:published",
  CATEGORY_ARTICLES: (category) => `articles:category:${category}`,
  TRENDING_ARTICLES: "articles:trending",
  JOURNALISTS: "journalists:all",
  ARTICLE_BY_SLUG: (slug) => `article:slug:${slug}`,
  ARTICLE_BY_ID: (id) => `article:id:${id}`
};
var CACHE_TTL = {
  ARTICLES_LIST: 60 * 1e3,
  // 1 minute for article lists
  ARTICLE_DETAIL: 5 * 60 * 1e3,
  // 5 minutes for article detail
  TRENDING: 2 * 60 * 1e3,
  // 2 minutes for trending
  JOURNALISTS: 10 * 60 * 1e3
  // 10 minutes for journalists
};
async function withCache(key, ttlMs, fetchFn) {
  const cached = cache.get(key);
  if (cached !== null) {
    console.log(`[CACHE] HIT: ${key}`);
    return cached;
  }
  console.log(`[CACHE] MISS: ${key}`);
  const data = await fetchFn();
  cache.set(key, data, ttlMs);
  return data;
}
function invalidateArticleCaches() {
  cache.invalidatePattern("^articles:");
  cache.invalidatePattern("^article:");
  console.log("[CACHE] Invalidated all article caches");
}

// server/services/meta-business-suite-client.ts
init_db();
init_schema();
import { eq as eq3, and as and2, gte as gte2, sql as sql4 } from "drizzle-orm";
var MetaBusinessSuiteService = class {
  accessToken;
  pageId;
  baseUrl = "https://graph.facebook.com/v19.0";
  constructor() {
    this.accessToken = process.env.FB_PAGE_ACCESS_TOKEN || "";
    this.pageId = process.env.FB_PAGE_ID || "";
    if (!this.accessToken || !this.pageId) {
      console.warn("[META SERVICE] Missing FB_PAGE_ACCESS_TOKEN or FB_PAGE_ID. Facebook insights will not work.");
    }
  }
  /**
   * Fetch post insights from Facebook Graph API
   */
  /**
   * Fetch post insights from Facebook Graph API
   */
  async getPostInsights(facebookPostId) {
    if (!this.accessToken) return null;
    try {
      const cleanPostId = facebookPostId.includes("_") ? facebookPostId : `${this.pageId}_${facebookPostId}`;
      console.log(`[META SERVICE] Fetching insights for: ${cleanPostId}`);
      const postUrl = `${this.baseUrl}/${cleanPostId}?fields=shares,comments.summary(true).limit(0),reactions.summary(true).limit(0)&access_token=${this.accessToken}`;
      const postResponse = await fetch(postUrl);
      const postData = await postResponse.json();
      if (postData.error) {
        console.error(`[META SERVICE] Error fetching post details for ${cleanPostId}:`, postData.error.message);
        return null;
      }
      const insightsUrl = `${this.baseUrl}/${cleanPostId}/insights?metric=post_impressions_unique,post_clicks&access_token=${this.accessToken}`;
      const insightsResponse = await fetch(insightsUrl);
      const insightsData = await insightsResponse.json();
      let impressions = 0;
      let clicks = 0;
      if (insightsData.error) {
        console.warn(`[META SERVICE] Warning: Could not fetch deep insights for ${cleanPostId} (likely permission issue), using basic metrics only.`);
        console.warn(`[META SERVICE] Error: ${insightsData.error.message}`);
      } else if (insightsData.data) {
        const impMetric = insightsData.data.find((m) => m.name === "post_impressions_unique");
        const clickMetric = insightsData.data.find((m) => m.name === "post_clicks");
        if (impMetric && impMetric.values && impMetric.values.length > 0) {
          impressions = impMetric.values[0].value;
        }
        if (clickMetric && clickMetric.values && clickMetric.values.length > 0) {
          clicks = clickMetric.values[0].value;
        }
      }
      const shares = postData.shares?.count || 0;
      const comments = postData.comments?.summary?.total_count || 0;
      const reactions = postData.reactions?.summary?.total_count || 0;
      const engagement = shares + comments + reactions + clicks;
      const ctr = impressions > 0 ? clicks / impressions : 0;
      return {
        impressions,
        clicks,
        reactions,
        comments,
        shares,
        engagement,
        ctr
      };
    } catch (error) {
      console.error("[META SERVICE] Exception fetching insights:", error);
      return null;
    }
  }
  /**
   * Batch update insights for all posts in last N days
   */
  async batchUpdatePostInsights(daysAgo = 7) {
    if (!this.accessToken) {
      console.warn("[META SERVICE] Skipping batch update: No access token");
      return { updated: 0, errors: 0 };
    }
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    const recentArticles = await db.select({
      id: articles.id,
      facebookPostId: articles.facebookPostId,
      facebookHeadline: articles.facebookHeadline
    }).from(articles).where(
      and2(
        gte2(articles.publishedAt, cutoffDate),
        sql4`${articles.facebookPostId} IS NOT NULL`,
        sql4`${articles.facebookPostId} NOT LIKE 'LOCK:%'`
        // Exclude locked/pending posts
      )
    );
    console.log(`[META SERVICE] Found ${recentArticles.length} articles with Facebook posts to sync`);
    let updatedCount = 0;
    let errorCount = 0;
    for (const article of recentArticles) {
      if (!article.facebookPostId) continue;
      const insights = await this.getPostInsights(article.facebookPostId);
      if (insights) {
        try {
          const [existing] = await db.select().from(socialMediaAnalytics).where(
            and2(
              eq3(socialMediaAnalytics.articleId, article.id),
              eq3(socialMediaAnalytics.platform, "facebook")
            )
          );
          if (existing) {
            await db.update(socialMediaAnalytics).set({
              impressions: insights.impressions,
              clicks: insights.clicks,
              shares: insights.shares,
              reactions: insights.reactions,
              comments: insights.comments,
              lastUpdatedAt: /* @__PURE__ */ new Date()
            }).where(eq3(socialMediaAnalytics.id, existing.id));
          } else {
            await db.insert(socialMediaAnalytics).values({
              articleId: article.id,
              platform: "facebook",
              postId: article.facebookPostId,
              headlineVariant: article.facebookHeadline,
              impressions: insights.impressions,
              clicks: insights.clicks,
              shares: insights.shares,
              reactions: insights.reactions,
              comments: insights.comments
            });
          }
          updatedCount++;
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (dbError) {
          console.error(`[META SERVICE] DB Error saving insights for article ${article.id}:`, dbError);
          errorCount++;
        }
      } else {
        errorCount++;
      }
    }
    return { updated: updatedCount, errors: errorCount };
  }
};
var metaBusinessSuiteService = new MetaBusinessSuiteService();

// server/services/google-analytics-client.ts
init_db();
init_schema();
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { eq as eq4 } from "drizzle-orm";
var GoogleAnalyticsService = class {
  client;
  propertyId;
  constructor() {
    if (!process.env.GA_CLIENT_EMAIL || !process.env.GA_PRIVATE_KEY || !process.env.GA_PROPERTY_ID) {
      console.warn("[GA SERVICE] Missing Google Analytics credentials. Analytics sync will not work.");
    }
    this.client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: process.env.GA_CLIENT_EMAIL,
        private_key: process.env.GA_PRIVATE_KEY?.replace(/\\n/g, "\n")
        // Handle newlines in env var
      }
    });
    this.propertyId = process.env.GA_PROPERTY_ID || "";
  }
  /**
   * Get article performance metrics for a specific article
   */
  async getArticleMetrics(articleSlug, daysAgo = 30) {
    if (!this.propertyId) return null;
    try {
      const [response] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate: `${daysAgo}daysAgo`,
            endDate: "today"
          }
        ],
        dimensions: [
          { name: "pagePath" }
        ],
        metrics: [
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
          // Approximation for time on page
          { name: "totalUsers" },
          { name: "engagementRate" }
        ],
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            stringFilter: {
              matchType: "CONTAINS",
              value: articleSlug
            }
          }
        }
      });
      if (response.rows && response.rows.length > 0) {
        const row = response.rows[0];
        return {
          views: parseInt(row.metricValues?.[0]?.value || "0"),
          avgTimeOnPage: parseFloat(row.metricValues?.[1]?.value || "0"),
          users: parseInt(row.metricValues?.[2]?.value || "0"),
          engagementRate: parseFloat(row.metricValues?.[3]?.value || "0")
        };
      }
      return null;
    } catch (error) {
      console.error(`[GA SERVICE] Error fetching metrics for ${articleSlug}:`, error);
      return null;
    }
  }
  /**
   * Batch sync metrics for all recent articles
   */
  async batchSyncArticleMetrics(daysAgo = 7) {
    if (!this.propertyId) {
      console.warn("[GA SERVICE] Skipping batch sync: No property ID");
      return { updated: 0, errors: 0 };
    }
    console.log(`[GA SERVICE] Starting batch sync for last ${daysAgo} days...`);
    try {
      const [response] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate: `${daysAgo}daysAgo`,
            endDate: "today"
          }
        ],
        dimensions: [
          { name: "pagePath" },
          { name: "date" }
          // YYYYMMDD
        ],
        metrics: [
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
          { name: "bounceRate" }
        ],
        limit: 5e3
      });
      if (!response.rows) {
        console.log("[GA SERVICE] No data returned from Google Analytics");
        return { updated: 0, errors: 0 };
      }
      console.log(`[GA SERVICE] Fetched ${response.rows.length} rows from GA`);
      let updatedCount = 0;
      let errorCount = 0;
      for (const row of response.rows) {
        const pagePath = (row.dimensionValues?.[0]?.value || "").split("?")[0].split("#")[0];
        const dateStr = row.dimensionValues?.[1]?.value || "";
        if (!pagePath || !dateStr) continue;
        const parts = pagePath.split("/").filter((p) => p);
        if (parts.length < 2) continue;
        const slug = parts[parts.length - 1];
        const metricDateStr = dateStr.substring(0, 4) + "-" + dateStr.substring(4, 6) + "-" + dateStr.substring(6, 8);
        const article = await db.query.articles.findFirst({
          where: eq4(articles.slug, slug),
          columns: { id: true, title: true }
        });
        if (article) {
          try {
            const views = parseInt(row.metricValues?.[0]?.value || "0");
            const avgTime = parseFloat(row.metricValues?.[1]?.value || "0");
            const bounceRate = parseFloat(row.metricValues?.[2]?.value || "0");
            console.log(`[GA SERVICE] Updating metrics for "${article.title}" on ${dateStr}: ${views} views`);
            await db.insert(articleMetrics).values({
              articleId: article.id,
              source: "google_analytics",
              metricDate: metricDateStr,
              gaViews: views,
              gaAvgTimeOnPage: avgTime,
              gaBounceRate: bounceRate,
              syncedAt: /* @__PURE__ */ new Date()
            }).onConflictDoUpdate({
              target: [articleMetrics.articleId, articleMetrics.source, articleMetrics.metricDate],
              set: {
                gaViews: views,
                gaAvgTimeOnPage: avgTime,
                gaBounceRate: bounceRate,
                syncedAt: /* @__PURE__ */ new Date()
              }
            });
            updatedCount++;
          } catch (err) {
            console.error(`[GA SERVICE] Error updating article ${slug}:`, err);
            errorCount++;
          }
        }
      }
      return { updated: updatedCount, errors: errorCount };
    } catch (error) {
      console.error("[GA SERVICE] Batch sync failed:", error);
      return { updated: 0, errors: 1 };
    }
  }
};
var googleAnalyticsService = new GoogleAnalyticsService();

// server/services/google-search-console-client.ts
init_db();
init_schema();
import { google } from "googleapis";
import { eq as eq5 } from "drizzle-orm";
var GoogleSearchConsoleService = class {
  auth;
  siteUrl;
  constructor() {
    if (!process.env.GA_CLIENT_EMAIL || !process.env.GA_PRIVATE_KEY || !process.env.GSC_SITE_URL) {
      console.warn("[GSC SERVICE] Missing Google Search Console credentials. Sync will not work.");
    }
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GA_CLIENT_EMAIL,
        private_key: process.env.GA_PRIVATE_KEY?.replace(/\\n/g, "\n")
      },
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"]
    });
    this.siteUrl = process.env.GSC_SITE_URL || "https://phuketradar.com/";
  }
  /**
   * Batch sync search performance metrics
   */
  async batchSyncSearchMetrics(daysAgo = 3) {
    if (!this.siteUrl) {
      console.warn("[GSC SERVICE] Skipping sync: No site URL");
      return { updated: 0, errors: 0 };
    }
    console.log(`[GSC SERVICE] Starting batch sync for last ${daysAgo} days...`);
    try {
      const searchConsole = google.searchconsole({ version: "v1", auth: this.auth });
      const startDate = /* @__PURE__ */ new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const response = await searchConsole.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate: startDateStr,
          endDate: endDateStr,
          dimensions: ["page", "date"],
          rowLimit: 5e3
        }
      });
      const rows = response.data.rows;
      if (!rows || rows.length === 0) {
        console.log("[GSC SERVICE] No data returned from Google Search Console");
        return { updated: 0, errors: 0 };
      }
      console.log(`[GSC SERVICE] Fetched ${rows.length} rows from GSC`);
      let updatedCount = 0;
      let errorCount = 0;
      for (const row of rows) {
        const pageUrl = (row.keys?.[0] || "").split("?")[0].split("#")[0];
        const dateStr = row.keys?.[1] || "";
        if (!pageUrl || !dateStr) continue;
        const parts = pageUrl.split("/").filter((p) => p);
        const slug = parts[parts.length - 1];
        if (!slug) continue;
        const article = await db.query.articles.findFirst({
          where: eq5(articles.slug, slug),
          columns: { id: true, title: true }
        });
        if (article) {
          try {
            const clicks = row.clicks || 0;
            const impressions = row.impressions || 0;
            const ctr = row.ctr || 0;
            const position = row.position || 0;
            console.log(`[GSC SERVICE] Updating metrics for "${article.title}" on ${dateStr}: ${clicks} clicks`);
            await db.insert(articleMetrics).values({
              articleId: article.id,
              source: "google_search_console",
              metricDate: dateStr,
              scClicks: clicks,
              scImpressions: impressions,
              scCtr: ctr,
              scAvgPosition: position,
              syncedAt: /* @__PURE__ */ new Date()
            }).onConflictDoUpdate({
              target: [articleMetrics.articleId, articleMetrics.source, articleMetrics.metricDate],
              set: {
                scClicks: clicks,
                scImpressions: impressions,
                scCtr: ctr,
                scAvgPosition: position,
                syncedAt: /* @__PURE__ */ new Date()
              }
            });
            updatedCount++;
          } catch (err) {
            console.error(`[GSC SERVICE] Error updating article ${slug}:`, err);
            errorCount++;
          }
        }
      }
      return { updated: updatedCount, errors: errorCount };
    } catch (error) {
      console.error("[GSC SERVICE] Batch sync failed:", error);
      return { updated: 0, errors: 1 };
    }
  }
};
var googleSearchConsoleService = new GoogleSearchConsoleService();

// server/services/smart-learning-service.ts
init_db();
init_schema();
import { eq as eq6, desc as desc3, sql as sql7, gte as gte3 } from "drizzle-orm";
var SmartLearningService = class {
  /**
   * Recalculate engagement scores for all articles based on recent metrics
   * 
   * Formula factors (Updated for low-traffic optimization):
   * - GA Views (Weight: 0.1)
   * - GA Time on Page (Weight: 10.0 per min - High quality signal)
   * - GSC Clicks (Weight: 2.0 - High intent signal)
   * - Facebook Impressions (Weight: 0.05 - Reach signal)
   * - Facebook Reactions (Weight: 2.0 - Engagement signal)
   * - Facebook Comments (Weight: 3.0 - High engagement signal)
   * - Facebook Shares (Weight: 5.0 - Viral signal)
   * - Recency Decay (Scores degrade over time)
   */
  async recalculateEngagementScores(daysLookback = 7) {
    console.log("[SMART LEARNING] Recalculating engagement scores...");
    const aggregatedMetrics = await db.execute(sql7`
            WITH latest_social AS (
                SELECT article_id, impressions, reactions, comments, shares, last_updated_at
                FROM social_media_analytics
            ),
            metrics_agg AS (
                SELECT 
                    article_id, 
                    SUM(COALESCE(ga_views, 0)) as total_ga_views,
                    AVG(COALESCE(ga_avg_time_on_page, 0)) as avg_ga_time,
                    SUM(COALESCE(sc_clicks, 0)) as total_sc_clicks,
                    SUM(COALESCE(sc_impressions, 0)) as total_sc_impressions
                FROM article_metrics
                GROUP BY article_id
            )
            SELECT 
                a.id,
                a.title,
                a.published_at as "publishedAt",
                m.total_ga_views as "gaViews",
                m.avg_ga_time as "gaTime",
                m.total_sc_clicks as "scClicks",
                s.impressions,
                s.reactions,
                s.comments,
                s.shares
            FROM articles a
            LEFT JOIN metrics_agg m ON a.id = m.article_id
            LEFT JOIN latest_social s ON a.id = s.article_id
            WHERE a.published_at >= NOW() - INTERVAL '${sql7.raw(daysLookback.toString())} days'
        `);
    const recentArticles = aggregatedMetrics.rows;
    let updatedCount = 0;
    for (const row of recentArticles) {
      const article = row;
      let score = 0;
      const views = Math.max(Number(article.gaViews) || 0, article.viewCount || 0);
      score += Math.min(views, 1e3) * 0.1;
      const timeOnPage = Number(article.gaTime) || 0;
      score += timeOnPage / 60 * 10;
      const searchClicks = Number(article.scClicks) || 0;
      score += searchClicks * 2;
      const impressions = Number(article.impressions) || 0;
      const reactions = Number(article.reactions) || 0;
      const comments = Number(article.comments) || 0;
      const shares = Number(article.shares) || 0;
      score += impressions * 0.05;
      score += reactions * 2;
      score += comments * 3;
      score += shares * 5;
      const publishedDate = new Date(article.publishedAt);
      const hoursOld = (Date.now() - publishedDate.getTime()) / (1e3 * 60 * 60);
      const decayFactor = 1 / (1 + hoursOld / 24);
      const finalScore = score * decayFactor;
      await db.update(articles).set({ engagementScore: finalScore }).where(eq6(articles.id, article.id));
      updatedCount++;
    }
    console.log(`[SMART LEARNING] Updated engagement scores for ${updatedCount} articles.`);
    return { updated: updatedCount };
  }
  /**
   * Get trending articles based on the new Engagement Score
   * Only considers articles published in the last 3 days to ensure freshness
   */
  async getTrendingArticles(limit = 5) {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3);
    return await db.select().from(articles).where(gte3(articles.publishedAt, threeDaysAgo)).orderBy(desc3(articles.engagementScore)).limit(limit);
  }
};
var smartLearningService = new SmartLearningService();

// server/routes.ts
function requireAdminAuth(req, res, next) {
  console.log(`[AUTH CHECK] ${req.method} ${req.path} - Session auth: ${req.session.isAdminAuthenticated}`);
  if (req.session.isAdminAuthenticated) {
    console.log(`[AUTH CHECK] Authorized - proceeding`);
    return next();
  }
  console.log(`[AUTH CHECK] Unauthorized - blocking request`);
  return res.status(401).json({ error: "Unauthorized" });
}
function requireCronAuth(req, res, next) {
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
  const providedKey = authHeader.replace(/^Bearer\s+/i, "");
  if (providedKey === cronApiKey) {
    console.log(`[CRON AUTH] Valid API key - authorized`);
    return next();
  }
  console.log(`[CRON AUTH] Invalid API key - unauthorized`);
  return res.status(401).json({ error: "Invalid API key" });
}
async function registerRoutes(app2) {
  app2.post("/api/admin/sync-facebook-insights", requireCronAuth, async (req, res) => {
    try {
      const result = await metaBusinessSuiteService.batchUpdatePostInsights(7);
      res.json(result);
    } catch (error) {
      console.error("Error syncing Facebook insights:", error);
      res.status(500).json({ error: "Failed to sync insights" });
    }
  });
  app2.post("/api/admin/sync-google-analytics", requireCronAuth, async (req, res) => {
    try {
      const result = await googleAnalyticsService.batchSyncArticleMetrics(7);
      res.json(result);
    } catch (error) {
      console.error("Error syncing Google Analytics:", error);
      res.status(500).json({ error: "Failed to sync analytics" });
    }
  });
  app2.post("/api/admin/sync-google-search-console", requireCronAuth, async (req, res) => {
    try {
      const result = await googleSearchConsoleService.batchSyncSearchMetrics(3);
      res.json(result);
    } catch (error) {
      console.error("Error syncing Google Search Console:", error);
      res.status(500).json({ error: "Failed to sync search console" });
    }
  });
  app2.post("/api/admin/recalculate-engagement", requireCronAuth, async (req, res) => {
    try {
      const result = await smartLearningService.recalculateEngagementScores(7);
      res.json(result);
    } catch (error) {
      console.error("Error recalculating engagement scores:", error);
      res.status(500).json({ error: "Failed to recalculate scores" });
    }
  });
  app2.get("/api/articles", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 30, 100);
      const offset = parseInt(req.query.offset) || 0;
      const articles2 = await withCache(
        `${CACHE_KEYS.PUBLISHED_ARTICLES}:${limit}:${offset}`,
        CACHE_TTL.ARTICLES_LIST,
        () => storage.getPublishedArticles(limit, offset)
      );
      res.set({
        "Cache-Control": "public, max-age=30, s-maxage=120, stale-while-revalidate=300",
        "CDN-Cache-Control": "public, max-age=120",
        "Vary": "Accept-Encoding"
      });
      res.json(articles2);
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });
  app2.get("/api/articles/trending", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const articles2 = await withCache(
        `${CACHE_KEYS.TRENDING_ARTICLES}:${limit}`,
        CACHE_TTL.TRENDING,
        () => smartLearningService.getTrendingArticles(limit)
      );
      res.set({
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        "Vary": "Accept-Encoding"
      });
      res.json(articles2);
    } catch (error) {
      console.error("Error fetching trending articles:", error);
      res.status(500).json({ error: "Failed to fetch trending articles" });
    }
  });
  app2.get("/api/articles/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const limit = Math.min(parseInt(req.query.limit) || 30, 100);
      const offset = parseInt(req.query.offset) || 0;
      const articles2 = await withCache(
        `${CACHE_KEYS.CATEGORY_ARTICLES(category)}:${limit}:${offset}`,
        CACHE_TTL.ARTICLES_LIST,
        () => storage.getArticlesByCategory(category, limit, offset)
      );
      res.set({
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        "Vary": "Accept-Encoding"
      });
      res.json(articles2);
    } catch (error) {
      console.error("Error fetching articles by category:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });
  app2.get("/api/articles/tag/:tag", async (req, res) => {
    try {
      const { tag } = req.params;
      const tagName = tag.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
      const articles2 = await storage.getArticlesByTag(tagName);
      res.set({
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        "Vary": "Accept-Encoding"
      });
      res.json(articles2);
    } catch (error) {
      console.error("Error fetching articles by tag:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });
  app2.get("/api/articles/search", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query || query.length < 2) {
        return res.json([]);
      }
      const results = await withCache(
        `search:${query.toLowerCase().trim()}`,
        300,
        // 5 minutes
        () => storage.searchArticles(query)
      );
      res.set({
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
      });
      res.json(results);
    } catch (error) {
      console.error("Error searching articles:", error);
      res.status(500).json({ error: "Failed to search articles" });
    }
  });
  app2.get("/api/articles/:slugOrId", async (req, res) => {
    try {
      const { slugOrId } = req.params;
      const cacheKeySlug = CACHE_KEYS.ARTICLE_BY_SLUG(slugOrId);
      const cacheKeyId = CACHE_KEYS.ARTICLE_BY_ID(slugOrId);
      let article = cache.get(cacheKeySlug) || cache.get(cacheKeyId);
      if (!article) {
        article = await storage.getArticleBySlug(slugOrId);
        if (!article) {
          article = await storage.getArticleById(slugOrId);
        }
        if (article) {
          cache.set(CACHE_KEYS.ARTICLE_BY_SLUG(article.slug), article, CACHE_TTL.ARTICLE_DETAIL);
          cache.set(CACHE_KEYS.ARTICLE_BY_ID(article.id), article, CACHE_TTL.ARTICLE_DETAIL);
        }
      }
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      const articleResponse = { ...article };
      if (article.tags && article.tags.length > 0) {
        const tagsToLink = [];
        let locationFound = false;
        let topicFound = false;
        for (const tagName of article.tags) {
          const def = TAG_DEFINITIONS.find((t) => t.name === tagName);
          if (!def) continue;
          if (!locationFound && def.type === "location") {
            tagsToLink.push(tagName);
            locationFound = true;
          } else if (!topicFound && (def.type !== "location" && def.type !== "person")) {
            tagsToLink.push(tagName);
            topicFound = true;
          }
          if (locationFound && topicFound) break;
        }
        if (tagsToLink.length > 0) {
          articleResponse.content = autoLinkContent(article.content, tagsToLink);
        }
      }
      res.set({
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        "Vary": "Accept-Encoding"
      });
      res.json(articleResponse);
    } catch (error) {
      console.error("Error fetching article:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to fetch article", details: errorMessage });
    }
  });
  app2.get("/api/articles/:id/sidebar", async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.getArticleById(id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      const cacheKey = `sidebar:${id}:${article.category}`;
      const sidebarData = await withCache(
        cacheKey,
        CACHE_TTL.ARTICLES_LIST,
        async () => {
          const allArticles = await storage.getPublishedArticles();
          const latestArticles = allArticles.filter((a) => a.id !== id).slice(0, 5);
          const trendingArticles = await smartLearningService.getTrendingArticles(4);
          const relatedArticles = trendingArticles.filter((a) => a.id !== id).slice(0, 3);
          return { latestArticles, relatedArticles };
        }
      );
      res.set({
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
        "Vary": "Accept-Encoding"
      });
      res.json(sidebarData);
    } catch (error) {
      console.error("Error fetching sidebar articles:", error);
      res.status(500).json({ error: "Failed to fetch sidebar articles" });
    }
  });
  app2.get("/api/articles/:id/smart-context", async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.getArticleById(id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      const contextResult = await getSmartContextStories(article, storage);
      res.json(contextResult);
    } catch (error) {
      console.error("Error fetching smart context:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to fetch smart context", details: errorMessage });
    }
  });
  app2.post("/api/articles/:id/view", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.incrementArticleViewCount(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking article view:", error);
      res.json({ success: false });
    }
  });
  app2.get("/api/stories/:seriesId/timeline", async (req, res) => {
    try {
      const { seriesId } = req.params;
      const { getTimelineService: getTimelineService2 } = await Promise.resolve().then(() => (init_timeline_service(), timeline_service_exports));
      const timelineService = getTimelineService2(storage);
      const timelineStories = await timelineService.getTimelineStories(seriesId);
      const parentStory = await timelineService.getParentStory(seriesId);
      res.json({
        seriesId,
        parentStory,
        updates: timelineStories,
        updateCount: timelineStories.length
      });
    } catch (error) {
      console.error("Error fetching timeline:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to fetch timeline", details: errorMessage });
    }
  });
  app2.get("/api/admin/timelines", requireAdminAuth, async (req, res) => {
    try {
      const { getTimelineService: getTimelineService2 } = await Promise.resolve().then(() => (init_timeline_service(), timeline_service_exports));
      const timelineService = getTimelineService2(storage);
      const timelines = await timelineService.getAllTimelines();
      res.json(timelines);
    } catch (error) {
      console.error("Error fetching timelines:", error);
      res.status(500).json({ error: "Failed to fetch timelines" });
    }
  });
  app2.post("/api/admin/stories/timeline", requireAdminAuth, async (req, res) => {
    try {
      const { parentArticleId, seriesTitle, seriesId } = req.body;
      if (!parentArticleId || !seriesTitle) {
        return res.status(400).json({ error: "parentArticleId and seriesTitle are required" });
      }
      const { getTimelineService: getTimelineService2 } = await Promise.resolve().then(() => (init_timeline_service(), timeline_service_exports));
      const timelineService = getTimelineService2(storage);
      const result = await timelineService.createStoryTimeline({
        parentArticleId,
        seriesTitle,
        seriesId
      });
      res.json(result);
    } catch (error) {
      console.error("Error creating timeline:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to create timeline", details: errorMessage });
    }
  });
  app2.patch("/api/admin/stories/:id/add-to-timeline", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { seriesId } = req.body;
      if (!seriesId) {
        return res.status(400).json({ error: "seriesId is required" });
      }
      const { getTimelineService: getTimelineService2 } = await Promise.resolve().then(() => (init_timeline_service(), timeline_service_exports));
      const timelineService = getTimelineService2(storage);
      await timelineService.addArticleToTimeline(id, seriesId);
      const updatedArticle = await storage.getArticleById(id);
      res.json(updatedArticle);
    } catch (error) {
      console.error("Error adding article to timeline:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to add to timeline", details: errorMessage });
    }
  });
  app2.delete("/api/admin/stories/:id/remove-from-timeline", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { getTimelineService: getTimelineService2 } = await Promise.resolve().then(() => (init_timeline_service(), timeline_service_exports));
      const timelineService = getTimelineService2(storage);
      await timelineService.removeArticleFromTimeline(id);
      const updatedArticle = await storage.getArticleById(id);
      res.json(updatedArticle);
    } catch (error) {
      console.error("Error removing article from timeline:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to remove from timeline", details: errorMessage });
    }
  });
  app2.get("/api/admin/stories/:id/suggest-related", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const minSimilarity = req.query.minSimilarity ? parseFloat(req.query.minSimilarity) : void 0;
      const maxSuggestions = req.query.maxSuggestions ? parseInt(req.query.maxSuggestions, 10) : void 0;
      const { getTimelineService: getTimelineService2 } = await Promise.resolve().then(() => (init_timeline_service(), timeline_service_exports));
      const timelineService = getTimelineService2(storage);
      const suggestions = await timelineService.suggestRelatedArticles(id, {
        minSimilarity,
        maxSuggestions
      });
      res.json(suggestions);
    } catch (error) {
      console.error("Error getting timeline suggestions:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to get suggestions", details: errorMessage });
    }
  });
  app2.get("/api/admin/articles/search", requireAdminAuth, async (req, res) => {
    try {
      const query = req.query.q;
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
  app2.delete("/api/admin/timelines/:seriesId", requireAdminAuth, async (req, res) => {
    try {
      const { seriesId } = req.params;
      const { getTimelineService: getTimelineService2 } = await Promise.resolve().then(() => (init_timeline_service(), timeline_service_exports));
      const timelineService = getTimelineService2(storage);
      await timelineService.deleteTimeline(seriesId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting timeline:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to delete timeline", details: errorMessage });
    }
  });
  app2.get("/api/journalists", async (req, res) => {
    try {
      const journalists2 = await withCache(
        CACHE_KEYS.JOURNALISTS,
        CACHE_TTL.JOURNALISTS,
        () => storage.getAllJournalists()
      );
      res.set({
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        "Vary": "Accept-Encoding"
      });
      res.json(journalists2);
    } catch (error) {
      console.error("Error fetching journalists:", error);
      res.status(500).json({ error: "Failed to fetch journalists" });
    }
  });
  app2.get("/api/journalists/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const journalist = await storage.getJournalistById(id);
      if (!journalist) {
        return res.status(404).json({ error: "Journalist not found" });
      }
      const articles2 = await storage.getArticlesByJournalistId(id);
      res.json({
        ...journalist,
        articles: articles2
      });
    } catch (error) {
      console.error("Error fetching journalist:", error);
      res.status(500).json({ error: "Failed to fetch journalist" });
    }
  });
  app2.get("/sitemap.xml", (req, res, next) => next());
  app2.post("/api/cron/scrape", requireCronAuth, async (req, res) => {
    const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
    console.log("\n".repeat(3) + "=".repeat(80));
    console.log("\u{1F6A8} AUTO-SCRAPE TRIGGERED \u{1F6A8}");
    console.log(`Time: ${timestamp2}`);
    console.log(`Trigger: AUTOMATED CRON (GitHub Actions)`);
    console.log(`Environment: ${"production"}`);
    console.log("=".repeat(80) + "\n");
    res.json({
      success: true,
      message: "Auto-scrape started in background",
      timestamp: timestamp2
    });
    (async () => {
      try {
        const { acquireSchedulerLock: acquireSchedulerLock2, releaseSchedulerLock: releaseSchedulerLock2 } = await Promise.resolve().then(() => (init_scheduler_lock(), scheduler_lock_exports));
        const lockAcquired = await acquireSchedulerLock2();
        if (!lockAcquired) {
          console.error(`[AUTO-SCRAPE] \u274C Could not acquire lock - another scrape is already running`);
          return;
        }
        console.log(`[AUTO-SCRAPE] \u{1F512} Scheduler lock acquired`);
        console.log(`[AUTO-SCRAPE] Starting scrape using runScheduledScrape()`);
        const { runScheduledScrape: runScheduledScrape2 } = await Promise.resolve().then(() => (init_scheduler(), scheduler_exports));
        const result = await runScheduledScrape2();
        if (result) {
          console.log(`[AUTO-SCRAPE] \u2705 Scrape completed successfully`);
          console.log(`[AUTO-SCRAPE] Total posts: ${result.totalPosts}`);
          console.log(`[AUTO-SCRAPE] Articles created: ${result.articlesCreated}`);
          console.log(`[AUTO-SCRAPE] Skipped (duplicates): ${result.skippedSemanticDuplicates}`);
          console.log(`[AUTO-SCRAPE] Skipped (not news/text graphics): ${result.skippedNotNews}`);
        } else {
          console.error(`[AUTO-SCRAPE] \u274C Scrape returned null result`);
        }
      } catch (error) {
        console.error(`[AUTO-SCRAPE] \u274C SCRAPING ERROR:`, error);
      } finally {
        try {
          const { releaseSchedulerLock: releaseSchedulerLock2 } = await Promise.resolve().then(() => (init_scheduler_lock(), scheduler_lock_exports));
          await releaseSchedulerLock2();
          console.log(`[AUTO-SCRAPE] \u{1F513} Scheduler lock released`);
        } catch (lockError) {
          console.error(`[AUTO-SCRAPE] \u274C Error releasing lock:`, lockError);
        }
      }
    })();
  });
  app2.post("/api/cron/newsletter/send", requireCronAuth, async (req, res) => {
    const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
    console.log("\n".repeat(3) + "=".repeat(80));
    console.log("\u{1F4E8} DAILY NEWSLETTER TRIGGERED \u{1F4E8}");
    console.log(`Time: ${timestamp2}`);
    console.log("=".repeat(80) + "\n");
    try {
      const html = await generateDailyNewsletterHTML();
      if (!html) {
        console.log(`[NEWSLETTER-CRON] \u26A0\uFE0F No articles found \u2014 newsletter not sent`);
        return res.status(404).json({ success: false, error: "No articles found to generate newsletter", timestamp: timestamp2 });
      }
      const previewPath = path3.join(process.cwd(), "newsletter_approval_preview.html");
      await fs3.writeFile(previewPath, html.html, "utf-8");
      console.log(`[NEWSLETTER-CRON] \u{1F4C4} Preview saved`);
      const { sendResendBroadcast: sendResendBroadcast2 } = await Promise.resolve().then(() => (init_resend_client(), resend_client_exports));
      const subject = html.topStoryTitle;
      const previewText = html.topStoryExcerpt;
      const result = await sendResendBroadcast2({ subject, html: html.html, previewText });
      if (result.success) {
        console.log(`[NEWSLETTER-CRON] \u2705 Newsletter sent! Broadcast ID: ${result.broadcastId}`);
        return res.json({ success: true, broadcastId: result.broadcastId, subject, timestamp: timestamp2 });
      } else {
        console.error(`[NEWSLETTER-CRON] \u274C Resend broadcast failed: ${result.error}`);
        return res.status(500).json({ success: false, error: result.error, timestamp: timestamp2 });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[NEWSLETTER-CRON] \u274C ERROR: ${msg}`);
      return res.status(500).json({ success: false, error: msg, timestamp: timestamp2 });
    }
  });
  app2.post("/api/cron/newsletter/test", requireCronAuth, async (req, res) => {
    const toEmail = req.body?.email || process.env.ADMIN_EMAIL || "dannyjkeegan@gmail.com";
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
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: `Phuket Radar <${fromEmail}>`,
          to: [toEmail],
          subject: `[TEST] ${html.topStoryTitle}`,
          html: html.html
        })
      });
      const data = await response.json();
      if (!response.ok) {
        console.error(`[NEWSLETTER-TEST] \u274C Failed:`, data);
        return res.status(500).json({ error: data.message || "Send failed" });
      }
      console.log(`[NEWSLETTER-TEST] \u2705 Test email sent to ${toEmail} (id: ${data.id})`);
      res.json({ success: true, to: toEmail, subject: `[TEST] ${html.topStoryTitle}`, id: data.id });
    } catch (error) {
      console.error("[NEWSLETTER-TEST] \u274C ERROR:", error);
      res.status(500).json({ error: "Internal error" });
    }
  });
  app2.post("/api/cron/enrich", requireCronAuth, async (req, res) => {
    const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
    console.log("\n".repeat(3) + "=".repeat(80));
    console.log("\u{1F504} ENRICHMENT TRIGGERED \u{1F504}");
    console.log(`Time: ${timestamp2}`);
    console.log(`Trigger: EXTERNAL CRON SERVICE (GitHub Actions)`);
    console.log(`Environment: ${"production"}`);
    console.log("=".repeat(80) + "\n");
    try {
      console.log("\u{1F504} Starting enrichment pass...");
      const { StoryEnrichmentCoordinator: StoryEnrichmentCoordinator2 } = await Promise.resolve().then(() => (init_story_enrichment_coordinator(), story_enrichment_coordinator_exports));
      const coordinator = new StoryEnrichmentCoordinator2();
      const result = await coordinator.enrichDevelopingStories(storage);
      console.log("\u2705 Enrichment completed successfully");
      console.log("Result:", JSON.stringify(result, null, 2));
      res.json({
        success: true,
        message: "Enrichment completed successfully",
        timestamp: timestamp2,
        result
      });
    } catch (error) {
      console.error("\u274C Error during enrichment:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.json({
        success: false,
        message: "Enrichment completed with errors",
        error: errorMessage,
        timestamp: timestamp2
      });
    }
  });
  app2.post("/api/admin/auth", async (req, res) => {
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
  app2.post("/api/admin/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });
  app2.get("/api/admin/analytics/dashboard", requireAdminAuth, async (req, res) => {
    try {
      const topArticlesResult = await db.execute(sql9`
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
      const categoryStats = await db.execute(sql9`
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
      const dailyStats = await db.execute(sql9`
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
      const summaryStats = await db.execute(sql9`
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
  app2.get("/api/admin/articles", requireAdminAuth, async (req, res) => {
    try {
      const articles2 = await storage.getAllArticlesLean(500, 0);
      res.set({
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60"
      });
      res.json(articles2);
    } catch (error) {
      console.error("Error fetching all articles:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });
  app2.get("/api/admin/articles/pending", requireAdminAuth, async (req, res) => {
    try {
      const articles2 = await storage.getPendingArticles();
      res.json(articles2);
    } catch (error) {
      console.error("Error fetching pending articles:", error);
      res.status(500).json({ error: "Failed to fetch pending articles" });
    }
  });
  app2.get("/api/admin/articles/needs-review", requireAdminAuth, async (req, res) => {
    try {
      const articles2 = await storage.getArticlesNeedingReview();
      res.json(articles2);
    } catch (error) {
      console.error("Error fetching articles needing review:", error);
      res.status(500).json({ error: "Failed to fetch articles needing review" });
    }
  });
  app2.get("/api/admin/articles/:id", requireAdminAuth, async (req, res) => {
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
  app2.post("/api/admin/articles", requireAdminAuth, async (req, res) => {
    try {
      const articleData = req.body;
      if (!articleData.slug && articleData.title) {
        articleData.slug = articleData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      }
      articleData.isManuallyCreated = true;
      if (!articleData.sourceUrl) {
        articleData.sourceUrl = "https://phuketradar.com";
      }
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
  app2.post("/api/admin/articles/:id/facebook-timeline", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { parentStoryId } = req.body;
      if (!parentStoryId) {
        return res.status(400).json({ error: "parentStoryId is required" });
      }
      const article = await storage.getArticleById(id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      const parent = await storage.getArticleById(parentStoryId);
      if (!parent) {
        return res.status(404).json({ error: "Parent story not found" });
      }
      const baseUrl = "https://phuketradar.com";
      const parentUrl = `${baseUrl}/${parent.category}/${parent.slug}`;
      const result = await postArticleToFacebook(article, storage);
      if (result?.postId && process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
        try {
          const commentText = `\u{1F4F0} Latest update in: ${parent.storySeriesTitle || parent.title}
\u{1F449} ${parentUrl}`;
          const commentResponse = await fetch(
            `https://graph.facebook.com/v18.0/${result.postId}/comments`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                message: commentText,
                access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN
              })
            }
          );
          if (!commentResponse.ok) {
            console.error("Failed to add comment to Facebook post");
          } else {
            console.log(`\u2705 Added parent timeline link comment to Facebook post`);
          }
        } catch (commentError) {
          console.error("Error adding comment:", commentError);
        }
      }
      res.json(result);
    } catch (error) {
      console.error("Error posting timeline child to Facebook:", error);
      res.status(500).json({ error: error?.message || "Failed to post to Facebook" });
    }
  });
  app2.get("/api/admin/categories", requireAdminAuth, async (req, res) => {
    try {
      const categories2 = await storage.getAllCategories();
      res.json(categories2);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });
  app2.post("/api/admin/categories", requireAdminAuth, async (req, res) => {
    try {
      const { name, color, icon } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Category name is required" });
      }
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const category = await storage.createCategory({
        name,
        slug,
        color: color || "#3b82f6",
        icon: icon || null,
        isDefault: false
      });
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });
  app2.post("/api/admin/categories/seed", requireAdminAuth, async (req, res) => {
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
        { name: "Sports", slug: "sports", color: "#f43f5e", icon: null }
      ];
      const existingCategories = await storage.getAllCategories();
      const existingSlugs = new Set(existingCategories.map((c) => c.slug));
      const created = [];
      for (const cat of defaultCategories) {
        if (!existingSlugs.has(cat.slug)) {
          const category = await storage.createCategory({
            ...cat,
            isDefault: true
          });
          created.push(category);
        }
      }
      res.json({
        success: true,
        created: created.length,
        total: defaultCategories.length,
        categories: created
      });
    } catch (error) {
      console.error("Error seeding categories:", error);
      res.status(500).json({ error: "Failed to seed categories" });
    }
  });
  app2.post("/api/admin/scrape", requireAdminAuth, async (req, res) => {
    const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
    console.log("\n".repeat(3) + "=".repeat(80));
    console.log("\u{1F6A8} SCRAPE TRIGGERED \u{1F6A8}");
    console.log(`Time: ${timestamp2}`);
    console.log(`Trigger: MANUAL (Admin Dashboard)`);
    console.log(`Environment: ${"production"}`);
    console.log("=".repeat(80) + "\n");
    const job = scrapeJobManager.createJob();
    console.log(`Created scrape job: ${job.id}`);
    res.json({
      success: true,
      jobId: job.id,
      message: "Scraping started in background"
    });
    (async () => {
      try {
        const { acquireSchedulerLock: acquireSchedulerLock2, releaseSchedulerLock: releaseSchedulerLock2 } = await Promise.resolve().then(() => (init_scheduler_lock(), scheduler_lock_exports));
        const lockAcquired = await acquireSchedulerLock2();
        if (!lockAcquired) {
          console.error(`[Job ${job.id}] \u274C Could not acquire lock - another scrape is already running`);
          scrapeJobManager.markFailed(job.id, "Another scrape is already in progress");
          return;
        }
        console.log(`[Job ${job.id}] \u{1F512} Scheduler lock acquired`);
        scrapeJobManager.updateJob(job.id, { status: "processing" });
        console.log(`[Job ${job.id}] Starting scrape using runScheduledScrape() with job tracking`);
        const { runScheduledScrape: runScheduledScrape2 } = await Promise.resolve().then(() => (init_scheduler(), scheduler_exports));
        const result = await runScheduledScrape2({
          onProgress: (stats) => {
            scrapeJobManager.updateProgress(job.id, {
              totalPosts: stats.totalPosts,
              processedPosts: stats.processedPosts,
              createdArticles: stats.createdArticles,
              skippedNotNews: stats.skippedNotNews
            });
          }
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
        try {
          const { releaseSchedulerLock: releaseSchedulerLock2 } = await Promise.resolve().then(() => (init_scheduler_lock(), scheduler_lock_exports));
          await releaseSchedulerLock2();
          console.log(`[Job ${job.id}] \u{1F513} Scheduler lock released`);
        } catch (lockError) {
          console.error(`[Job ${job.id}] Error releasing lock:`, lockError);
        }
      }
    })();
  });
  app2.get("/api/admin/scrape/status/:id", requireAdminAuth, async (req, res) => {
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
  app2.post("/api/admin/scrape/manual", requireAdminAuth, async (req, res) => {
    const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
    const { postUrl } = req.body;
    if (!postUrl) {
      return res.status(400).json({ error: "URL or page name is required" });
    }
    console.log("\n".repeat(3) + "=".repeat(80));
    console.log("\u{1F3AF} MANUAL SCRAPE TRIGGERED \u{1F3AF}");
    console.log(`Time: ${timestamp2}`);
    console.log(`Trigger: MANUAL (Admin Dashboard)`);
    console.log(`Input: ${postUrl}`);
    console.log("=".repeat(80) + "\n");
    const isSinglePostUrl = postUrl.includes("/posts/") || postUrl.includes("/share/") || postUrl.includes("/reel/") || postUrl.includes("/reels/") || postUrl.includes("/videos/") || postUrl.includes("/watch") || postUrl.includes("pfbid");
    const isPageScrape = !isSinglePostUrl;
    console.log(`Mode: ${isPageScrape ? "PAGE SCRAPE (all recent posts)" : "SINGLE POST SCRAPE"}`);
    const job = scrapeJobManager.createJob();
    console.log(`Created manual scrape job: ${job.id}`);
    res.json({
      success: true,
      jobId: job.id,
      message: isPageScrape ? "Scraping page for recent posts in background..." : "Scraping single post in background..."
    });
    (async () => {
      try {
        scrapeJobManager.updateJob(job.id, { status: "processing" });
        if (isPageScrape) {
          console.log(`[Job ${job.id}] Starting manual PAGE scrape for: ${postUrl}`);
          const { runManualPageScrape: runManualPageScrape2 } = await Promise.resolve().then(() => (init_scheduler(), scheduler_exports));
          const result = await runManualPageScrape2(postUrl, {
            onProgress: (stats) => {
              scrapeJobManager.updateProgress(job.id, {
                totalPosts: stats.totalPosts,
                processedPosts: stats.processedPosts,
                createdArticles: stats.createdArticles,
                skippedNotNews: stats.skippedNotNews
              });
            }
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
          console.log(`[Job ${job.id}] Starting manual SINGLE POST scrape for: ${postUrl}`);
          const { runManualPostScrape: runManualPostScrape2 } = await Promise.resolve().then(() => (init_scheduler(), scheduler_exports));
          const result = await runManualPostScrape2(postUrl, {
            onProgress: (stats) => {
              scrapeJobManager.updateProgress(job.id, {
                totalPosts: stats.totalPosts,
                processedPosts: stats.processedPosts,
                createdArticles: stats.createdArticles,
                skippedNotNews: stats.skippedNotNews
              });
            }
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
  app2.patch("/api/admin/articles/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      if (updates.interestScore !== void 0) {
        const currentArticle = await storage.getArticleById(id);
        if (currentArticle && currentArticle.interestScore !== updates.interestScore) {
          const { scoreLearningService: scoreLearningService2 } = await Promise.resolve().then(() => (init_score_learning(), score_learning_exports));
          await scoreLearningService2.recordAdjustment({
            articleId: id,
            originalScore: currentArticle.interestScore || 3,
            adjustedScore: updates.interestScore,
            adjustmentReason: `Admin manually adjusted score from ${currentArticle.interestScore || 3} to ${updates.interestScore}`
          });
        }
      }
      const contentEditFields = ["content", "title", "excerpt"];
      const isContentEdit = contentEditFields.some((field) => updates[field] !== void 0);
      if (isContentEdit) {
        console.log(`\u{1F512} [PATCH ARTICLE] Content field edited - disabling isDeveloping to prevent auto-enrichment overwrites`);
        updates.isDeveloping = false;
        updates.lastManualEditAt = /* @__PURE__ */ new Date();
      }
      if (updates.timelineTags) {
        console.log(`\u{1F4DD} [PATCH ARTICLE] Raw timelineTags received:`, updates.timelineTags);
        console.log(`   Type: ${typeof updates.timelineTags}, isArray: ${Array.isArray(updates.timelineTags)}`);
        if (Array.isArray(updates.timelineTags)) {
          updates.timelineTags = updates.timelineTags.flatMap((tag) => {
            if (typeof tag === "string" && tag.includes(",")) {
              return tag.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
            }
            return typeof tag === "string" ? tag.trim() : tag;
          }).filter((tag) => tag && tag.length > 0);
          console.log(`   Sanitized to: [${updates.timelineTags.join(", ")}] (${updates.timelineTags.length} separate tags)`);
        }
      }
      const article = await storage.updateArticle(id, updates);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      invalidateArticleCaches();
      res.json(article);
    } catch (error) {
      console.error("Error updating article:", error);
      res.status(500).json({ error: "Failed to update article" });
    }
  });
  app2.post("/api/admin/articles/:id/blur", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.getArticleById(id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      console.log(`\u{1F6E1}\uFE0F  MANUAL BLUR: Triggered face blur for article: ${article.title}`);
      const { imageDownloaderService: imageDownloaderService2 } = await Promise.resolve().then(() => (init_image_downloader(), image_downloader_exports));
      let newImageUrl = article.imageUrl;
      let newImageUrls = article.imageUrls;
      if (article.imageUrl) {
        console.log(`\u2B07\uFE0F  Re-processing primary image...`);
        const savedPath = await imageDownloaderService2.downloadAndSaveImage(article.imageUrl, "news-blurred", { blurFaces: true });
        if (savedPath) newImageUrl = savedPath;
      }
      if (article.imageUrls && article.imageUrls.length > 0) {
        console.log(`\u2B07\uFE0F  Re-processing ${article.imageUrls.length} gallery images...`);
        const savedUrls = [];
        for (const url of article.imageUrls) {
          const savedPath = await imageDownloaderService2.downloadAndSaveImage(url, "news-gallery-blurred", { blurFaces: true });
          savedUrls.push(savedPath || url);
        }
        newImageUrls = savedUrls;
      }
      const updatedArticle = await storage.updateArticle(id, {
        imageUrl: newImageUrl,
        imageUrls: newImageUrls
      });
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
  app2.delete("/api/admin/articles/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteArticle(id);
      if (!success) {
        return res.status(404).json({ error: "Article not found" });
      }
      invalidateArticleCaches();
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting article:", error);
      res.status(500).json({ error: "Failed to delete article" });
    }
  });
  app2.post("/api/admin/articles/:id/publish", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.updateArticle(id, {
        isPublished: true,
        facebookPostId: null
        // Clear any previous posting attempts so button appears
      });
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      console.log(`\u{1F4F0} [PUBLISH] Article published manually (not auto-posted to Facebook): ${article.title.substring(0, 60)}...`);
      if (!article.switchyShortUrl) {
        try {
          const { switchyService: switchyService2 } = await Promise.resolve().then(() => (init_switchy(), switchy_exports));
          const { buildArticleUrl: buildArticleUrl2 } = await Promise.resolve().then(() => (init_category_map(), category_map_exports));
          console.log(`\u{1F517} [PUBLISH] Attempting to generate Switchy short URL for article ${id}...`);
          if (switchyService2.isConfigured()) {
            const baseUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://phuketradar.com";
            const articlePath = buildArticleUrl2({ category: article.category, slug: article.slug, id: article.id });
            const fullUrl = `${baseUrl}${articlePath}`;
            console.log(`\u{1F517} [PUBLISH] Article URL: ${fullUrl}`);
            const result = await switchyService2.createArticleLink(
              fullUrl,
              "bio",
              // Default to bio link UTMs
              article.facebookHeadline || article.title,
              article.imageUrl || void 0
            );
            if (result.success && result.link?.shortUrl) {
              await storage.updateArticle(id, { switchyShortUrl: result.link.shortUrl });
              console.log(`\u2705 [PUBLISH] Generated Switchy short URL: ${result.link.shortUrl}`);
            } else {
              console.warn(`\u26A0\uFE0F  [PUBLISH] Switchy generation failed: ${result.error || "Unknown error"}`);
              console.warn(`\u26A0\uFE0F  [PUBLISH] Full Switchy response:`, JSON.stringify(result));
            }
          } else {
            console.warn(`\u26A0\uFE0F  [PUBLISH] Switchy not configured (SWITCHY_API_KEY not set)`);
          }
        } catch (switchyError) {
          console.warn(`\u26A0\uFE0F  [PUBLISH] Switchy short URL generation exception:`, switchyError);
        }
      } else {
        console.log(`\u{1F517} [PUBLISH] Article already has Switchy URL: ${article.switchyShortUrl}`);
      }
      invalidateArticleCaches();
      const updatedArticle = await storage.getArticleById(id);
      res.json(updatedArticle || article);
    } catch (error) {
      console.error("Error publishing article:", error);
      res.status(500).json({ error: "Failed to publish article" });
    }
  });
  app2.post("/api/admin/articles/:id/facebook", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { force } = req.body || {};
      const article = await storage.getArticleById(id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      if (!article.isPublished) {
        return res.status(400).json({ error: "Only published articles can be posted to Facebook" });
      }
      if (article.facebookPostId && !force) {
        return res.status(400).json({
          error: "Article already posted to Facebook",
          hint: "Use { force: true } in request body to re-post with updated content"
        });
      }
      if (article.facebookPostId && force) {
        console.log(`\u{1F504} [FB-REPOST] Force re-posting article ${id} - clearing old facebookPostId: ${article.facebookPostId}`);
        await storage.updateArticle(id, {
          facebookPostId: null,
          facebookPostUrl: null
        });
        const clearedArticle = await storage.getArticleById(id);
        if (!clearedArticle) {
          return res.status(404).json({ error: "Article not found after clearing" });
        }
        const fbResult2 = await postArticleToFacebook(clearedArticle, storage);
        if (!fbResult2) {
          return res.status(500).json({ error: "Failed to re-post to Facebook" });
        }
        const updatedArticle2 = await storage.getArticleById(id);
        console.log(`\u2705 [FB-REPOST] Successfully re-posted article with new post ID: ${fbResult2.postId}`);
        return res.json({
          ...updatedArticle2,
          status: fbResult2.status,
          reposted: true,
          note: "Article was re-posted to Facebook with updated content"
        });
      }
      const fbResult = await postArticleToFacebook(article, storage);
      if (!fbResult) {
        return res.status(500).json({ error: "Failed to post to Facebook" });
      }
      const updatedArticle = await storage.getArticleById(id);
      res.json({
        ...updatedArticle,
        status: fbResult.status
      });
    } catch (error) {
      console.error("Error posting to Facebook:", error);
      res.status(500).json({ error: "Failed to post to Facebook" });
    }
  });
  app2.post("/api/admin/facebook/batch-post", requireAdminAuth, async (req, res) => {
    try {
      const allArticles = await storage.getPublishedArticles();
      const articlesToPost = allArticles.filter(
        (article) => (article.imageUrl || article.imageUrls && article.imageUrls.length > 0) && !article.facebookPostId
      );
      console.log(`\u{1F4D8} Batch posting ${articlesToPost.length} articles to Facebook`);
      const results = {
        total: articlesToPost.length,
        successful: 0,
        failed: 0,
        errors: []
      };
      for (const articleListItem of articlesToPost) {
        try {
          console.log(`\u{1F4D8} Posting: ${articleListItem.title.substring(0, 60)}...`);
          const fullArticle = await storage.getArticleById(articleListItem.id);
          if (!fullArticle) {
            results.failed++;
            results.errors.push(`${articleListItem.title}: Article not found`);
            continue;
          }
          const fbResult = await postArticleToFacebook(fullArticle, storage);
          if (fbResult) {
            results.successful++;
            if (fbResult.status === "posted") {
              console.log(`\u2705 Posted successfully: ${fbResult.postUrl}`);
            } else {
              console.log(`\u2139\uFE0F  Already posted: ${fbResult.postUrl}`);
            }
          } else {
            results.failed++;
            results.errors.push(`${fullArticle.title}: Failed to post (no result)`);
            console.log(`\u274C Failed to post: ${fullArticle.title.substring(0, 60)}...`);
          }
        } catch (error) {
          results.failed++;
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          results.errors.push(`${articleListItem.title}: ${errorMsg}`);
          console.error(`\u274C Error posting ${articleListItem.title}:`, error);
        }
      }
      console.log(`\u{1F4D8} Batch post complete: ${results.successful} successful, ${results.failed} failed`);
      res.json(results);
    } catch (error) {
      console.error("Error in batch Facebook posting:", error);
      res.status(500).json({ error: "Failed to batch post to Facebook" });
    }
  });
  app2.post("/api/admin/articles/:id/instagram", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.getArticleById(id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      if (!article.isPublished) {
        return res.status(400).json({ error: "Only published articles can be posted to Instagram" });
      }
      if (article.instagramPostId && !article.instagramPostId.startsWith("IG-LOCK:")) {
        return res.status(400).json({ error: "Article already posted to Instagram" });
      }
      const igResult = await postArticleToInstagram(article, storage);
      if (!igResult) {
        return res.status(500).json({ error: "Failed to post to Instagram" });
      }
      const updatedArticle = await storage.getArticleById(id);
      res.json({
        ...updatedArticle,
        status: igResult.status
      });
    } catch (error) {
      console.error("Error posting to Instagram:", error);
      res.status(500).json({ error: "Failed to post to Instagram" });
    }
  });
  app2.post("/api/admin/articles/:id/threads", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.getArticleById(id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      if (!article.isPublished) {
        return res.status(400).json({ error: "Only published articles can be posted to Threads" });
      }
      if (article.threadsPostId && !article.threadsPostId.startsWith("THREADS-LOCK:")) {
        return res.status(400).json({ error: "Article already posted to Threads" });
      }
      const threadsResult = await postArticleToThreads(article, storage);
      if (!threadsResult) {
        return res.status(500).json({ error: "Failed to post to Threads" });
      }
      const updatedArticle = await storage.getArticleById(id);
      res.json({
        ...updatedArticle,
        status: threadsResult.status
      });
    } catch (error) {
      console.error("Error posting to Threads:", error);
      res.status(500).json({ error: "Failed to post to Threads" });
    }
  });
  app2.post("/api/admin/articles/:id/switchy", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { platform = "bio" } = req.body;
      const article = await storage.getArticleById(id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      if (!article.isPublished) {
        return res.status(400).json({ error: "Only published articles can have short links generated" });
      }
      const { switchyService: switchyService2 } = await Promise.resolve().then(() => (init_switchy(), switchy_exports));
      if (!switchyService2.isConfigured()) {
        return res.status(500).json({ error: "Switchy API key not configured" });
      }
      const { buildArticleUrl: buildArticleUrl2 } = await Promise.resolve().then(() => (init_category_map(), category_map_exports));
      const baseUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://phuketradar.com";
      const articlePath = buildArticleUrl2({ category: article.category, slug: article.slug, id: article.id });
      const fullUrl = `${baseUrl}${articlePath}`;
      const result = await switchyService2.createArticleLink(
        fullUrl,
        platform,
        article.facebookHeadline || article.title,
        article.imageUrl || void 0
      );
      if (!result.success || !result.link) {
        return res.status(500).json({ error: result.error || "Failed to create short link" });
      }
      await storage.updateArticle(id, {
        switchyShortUrl: result.link.shortUrl
      });
      console.log(`\u{1F517} [SWITCHY] Created/Returned short URL: ${result.link.shortUrl}`);
      res.json(result);
    } catch (error) {
      console.error("Error generating Short link:", error);
      res.status(500).json({ error: "Failed to generate short URL" });
    }
  });
  app2.post("/api/admin/articles/:id/upgrade-enrich", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { targetScore = 4 } = req.body;
      const article = await storage.getArticleById(id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      const activeProvider = process.env.ENRICHMENT_PROVIDER || "openai";
      const activeModelLabel = activeProvider === "anthropic" ? `Anthropic ${process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5"}` : "OpenAI GPT-4o";
      console.log(`
\u2728 [UPGRADE-ENRICH] Starting premium enrichment for article: ${article.title.substring(0, 60)}...`);
      console.log(`   \u{1F4CA} Current score: ${article.interestScore || "N/A"} \u2192 Target: ${targetScore}`);
      console.log(`   \u{1F4DD} Current content length: ${article.content?.length || 0} chars`);
      console.log(`   \u{1F916} Provider: ${activeModelLabel}`);
      const enrichmentResult = await translatorService.enrichWithPremiumGPT4({
        title: article.title,
        content: article.content || "",
        excerpt: article.excerpt || "",
        category: article.category
      }, "gpt-4o");
      console.log(`   \u2705 ${activeModelLabel} enrichment complete`);
      console.log(`   \u{1F4DD} New content length: ${enrichmentResult.enrichedContent?.length || 0} chars`);
      let facebookHeadline = article.facebookHeadline;
      if (!facebookHeadline && enrichmentResult.enrichedTitle) {
        try {
          const { default: OpenAI11 } = await import("openai");
          const openai11 = new OpenAI11({ apiKey: process.env.OPENAI_API_KEY });
          const headlineResponse = await openai11.chat.completions.create({
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

NEVER reveal the whole story. NEVER use useless CTAs like "see the photos".`
              },
              {
                role: "user",
                content: `Generate a curiosity-gap teaser for Facebook (withhold key details to force clicks):

Full Title: ${enrichmentResult.enrichedTitle}
Excerpt: ${enrichmentResult.enrichedExcerpt}`
              }
            ],
            temperature: 0.7,
            max_tokens: 60
          });
          facebookHeadline = headlineResponse.choices[0].message.content?.trim().replace(/^["']|["']$/g, "") || enrichmentResult.enrichedTitle;
          console.log(`   \u{1F4F1} Generated curiosity-gap headline: ${facebookHeadline}`);
        } catch (headlineError) {
          console.warn(`   \u26A0\uFE0F  Failed to generate Facebook headline:`, headlineError);
          facebookHeadline = enrichmentResult.enrichedTitle;
        }
      }
      if (article.interestScore !== targetScore) {
        const { scoreLearningService: scoreLearningService2 } = await Promise.resolve().then(() => (init_score_learning(), score_learning_exports));
        await scoreLearningService2.recordAdjustment({
          articleId: id,
          originalScore: article.interestScore || 3,
          adjustedScore: targetScore,
          adjustmentReason: `Admin upgraded story with premium GPT-4o enrichment (${article.interestScore || 3} \u2192 ${targetScore})`
        });
      }
      const updatedArticle = await storage.updateArticle(id, {
        title: enrichmentResult.enrichedTitle,
        content: enrichmentResult.enrichedContent,
        excerpt: enrichmentResult.enrichedExcerpt,
        interestScore: targetScore,
        facebookHeadline: facebookHeadline || void 0,
        enrichmentCount: (article.enrichmentCount || 0) + 1,
        lastEnrichedAt: /* @__PURE__ */ new Date()
      });
      if (!updatedArticle) {
        return res.status(500).json({ error: "Failed to update article" });
      }
      invalidateArticleCaches();
      console.log(`   \u{1F389} [UPGRADE-ENRICH] Complete! Article upgraded to score ${targetScore}`);
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
          facebookHeadlineGenerated: !article.facebookHeadline && !!facebookHeadline
        }
      });
    } catch (error) {
      console.error("Error upgrading/enriching article:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to upgrade article" });
    }
  });
  app2.post("/api/admin/articles/:id/regenerate-headline", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { angle } = req.body;
      const article = await storage.getArticleById(id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      console.log(`
\u{1F4F1} [REGENERATE-HEADLINE] Generating Curiosity Gap headlines for: ${article.title.substring(0, 60)}...`);
      const { generateFacebookHeadlines: generateFacebookHeadlines2, validateHeadline: validateHeadline2 } = await Promise.resolve().then(() => (init_facebook_headline_generator(), facebook_headline_generator_exports));
      const content = article.content || "";
      const hasVideo = content.toLowerCase().includes("\u0E27\u0E34\u0E14\u0E35\u0E42\u0E2D") || content.toLowerCase().includes("video") || content.toLowerCase().includes("\u0E04\u0E25\u0E34\u0E1B") || !!article.videoUrl;
      const hasMultipleImages = article.imageUrls && article.imageUrls.length > 1 || content.includes("\u0E20\u0E32\u0E1E") || content.includes("\u0E23\u0E39\u0E1B");
      const hasCCTV = content.toLowerCase().includes("cctv") || content.toLowerCase().includes("\u0E01\u0E25\u0E49\u0E2D\u0E07\u0E27\u0E07\u0E08\u0E23\u0E1B\u0E34\u0E14");
      const hasMap = content.toLowerCase().includes("map") || content.toLowerCase().includes("\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48");
      const variants = await generateFacebookHeadlines2({
        title: article.title,
        content,
        excerpt: article.excerpt || "",
        category: article.category,
        interestScore: article.interestScore || 3,
        hasVideo,
        hasMultipleImages,
        hasCCTV,
        hasMap,
        isDeveloping: article.isDeveloping || false
      });
      console.log(`   \u2753 What Happened: "${variants.whatHappened}"`);
      console.log(`   \u{1F50D} Who/Why: "${variants.whoWhy}"`);
      console.log(`   \u2696\uFE0F  Consequence: "${variants.consequence}"`);
      console.log(`   \u2705 Recommended (${variants.recommendedAngle}): "${variants.recommended}"`);
      const validations = {
        whatHappened: validateHeadline2(variants.whatHappened),
        whoWhy: validateHeadline2(variants.whoWhy),
        consequence: validateHeadline2(variants.consequence)
      };
      let selectedHeadline;
      let selectedAngle;
      const validAngles = ["whatHappened", "whoWhy", "consequence"];
      if (angle && validAngles.includes(angle)) {
        selectedHeadline = variants[angle];
        selectedAngle = angle;
        console.log(`   \u{1F3AF} Using requested angle: ${angle}`);
      } else {
        selectedHeadline = variants.recommended;
        selectedAngle = variants.recommendedAngle;
      }
      const previousHeadline = article.facebookHeadline;
      const updatedArticle = await storage.updateArticle(id, {
        facebookHeadline: selectedHeadline
      });
      if (!updatedArticle) {
        return res.status(500).json({ error: "Failed to update article" });
      }
      invalidateArticleCaches();
      console.log(`   \u{1F389} [REGENERATE-HEADLINE] Complete!`);
      res.json({
        success: true,
        previousHeadline,
        newHeadline: selectedHeadline,
        selectedAngle,
        variants: {
          whatHappened: {
            headline: variants.whatHappened,
            valid: validations.whatHappened.valid,
            issues: validations.whatHappened.issues
          },
          whoWhy: {
            headline: variants.whoWhy,
            valid: validations.whoWhy.valid,
            issues: validations.whoWhy.issues
          },
          consequence: {
            headline: variants.consequence,
            valid: validations.consequence.valid,
            issues: validations.consequence.issues
          }
        },
        recommendation: {
          angle: variants.recommendedAngle,
          reason: variants.recommendingReason
        }
      });
    } catch (error) {
      console.error("Error regenerating headline:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to regenerate headline" });
    }
  });
  app2.post("/api/admin/facebook/clear-locks", requireAdminAuth, async (req, res) => {
    try {
      console.log(`\u{1F527} [ADMIN] Manually clearing stuck Facebook posting locks...`);
      const stuckLocks = await storage.getArticlesWithStuckLocks();
      if (stuckLocks.length === 0) {
        console.log(`\u2705 [ADMIN] No stuck locks found`);
        return res.json({
          cleared: 0,
          articles: []
        });
      }
      console.warn(`\u26A0\uFE0F  [ADMIN] Found ${stuckLocks.length} articles with stuck LOCK tokens`);
      const clearedArticles = [];
      for (const article of stuckLocks) {
        console.warn(`   - Clearing lock for: ${article.title.substring(0, 60)}... (ID: ${article.id})`);
        await storage.clearStuckFacebookLock(article.id);
        clearedArticles.push({
          id: article.id,
          title: article.title,
          lockToken: article.facebookPostId
        });
      }
      console.log(`\u2705 [ADMIN] Cleared ${stuckLocks.length} stuck locks`);
      res.json({
        cleared: stuckLocks.length,
        articles: clearedArticles
      });
    } catch (error) {
      console.error("Error clearing stuck Facebook locks:", error);
      res.status(500).json({ error: "Failed to clear stuck locks" });
    }
  });
  app2.post("/api/admin/fix-video-embeds", requireAdminAuth, async (req, res) => {
    try {
      console.log(`\u{1F527} [ADMIN] Fixing broken video embeds...`);
      const allArticles = await storage.getAllArticles();
      const brokenArticles = allArticles.filter((article) => {
        const embedUrl = article.facebookEmbedUrl;
        if (!embedUrl) return false;
        const isValidVideoUrl = embedUrl.includes("/reel/") || embedUrl.includes("/reels/") || embedUrl.includes("/videos/") || embedUrl.includes("/watch");
        return !isValidVideoUrl;
      });
      console.log(`Found ${brokenArticles.length} articles with broken video embeds`);
      const fixedArticles = [];
      for (const article of brokenArticles) {
        console.log(`   - Fixing: ${article.title.substring(0, 60)}...`);
        await storage.updateArticle(article.id, { facebookEmbedUrl: null });
        fixedArticles.push({
          id: article.id,
          title: article.title,
          clearedUrl: article.facebookEmbedUrl
        });
      }
      invalidateArticleCaches();
      console.log(`\u2705 [ADMIN] Fixed ${brokenArticles.length} broken video embeds`);
      res.json({
        fixed: brokenArticles.length,
        articles: fixedArticles
      });
    } catch (error) {
      console.error("Error fixing video embeds:", error);
      res.status(500).json({ error: "Failed to fix video embeds" });
    }
  });
  app2.post("/api/cron/newsletter", requireCronAuth, async (req, res) => {
    res.json({
      success: true,
      message: "Newsletter sending is now handled by Beehiiv. Use the Beehiiv dashboard to send newsletters.",
      beehiivDashboard: "https://app.beehiiv.com"
    });
  });
  app2.get("/api/admin/newsletter/preview", requireAdminAuth, async (req, res) => {
    try {
      const previewPath = path3.join(process.cwd(), "newsletter_approval_preview.html");
      const html = await fs3.readFile(previewPath, "utf-8");
      res.header("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      res.status(404).json({ error: "Preview not found. Run the generation script first." });
    }
  });
  app2.post("/api/subscribe", async (req, res) => {
    try {
      const result = insertSubscriberSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      const existing = await storage.getSubscriberByEmail(result.data.email);
      if (existing) {
        if (existing.isActive) {
          return res.status(200).json({
            message: "You're already subscribed to Phuket Radar!",
            alreadySubscribed: true
          });
        } else {
          await storage.reactivateSubscriber(existing.id);
          try {
            const { addResendContact: addResendContact2 } = await Promise.resolve().then(() => (init_resend_client(), resend_client_exports));
            await addResendContact2(existing.email);
          } catch (err) {
            console.error(`\u274C Resend reactivation sync error:`, err);
          }
          return res.status(200).json({
            message: "Welcome back! Your subscription has been reactivated.",
            subscriber: { email: existing.email }
          });
        }
      }
      const subscriber = await storage.createSubscriber(result.data);
      try {
        const { addResendContact: addResendContact2 } = await Promise.resolve().then(() => (init_resend_client(), resend_client_exports));
        await addResendContact2(subscriber.email);
      } catch (err) {
        console.error(`\u274C Resend contact sync error:`, err);
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
  app2.get("/api/unsubscribe/:token", async (req, res) => {
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
  app2.get("/api/admin/score-learning/insights", requireAdminAuth, async (req, res) => {
    try {
      const { scoreLearningService: scoreLearningService2 } = await Promise.resolve().then(() => (init_score_learning(), score_learning_exports));
      const insights = await scoreLearningService2.getLearningInsights();
      const statistics = await scoreLearningService2.getStatistics();
      res.json({
        insights,
        statistics
      });
    } catch (error) {
      console.error("Error getting score learning insights:", error);
      res.status(500).json({ error: "Failed to get insights" });
    }
  });
  app2.get("/api/admin/score-learning/category/:category", requireAdminAuth, async (req, res) => {
    try {
      const { category } = req.params;
      const { scoreLearningService: scoreLearningService2 } = await Promise.resolve().then(() => (init_score_learning(), score_learning_exports));
      const adjustments = await scoreLearningService2.getAdjustmentsByCategory(category);
      res.json(adjustments);
    } catch (error) {
      console.error("Error getting category adjustments:", error);
      res.status(500).json({ error: "Failed to get adjustments" });
    }
  });
  app2.post("/api/admin/insights/generate", requireAdminAuth, async (req, res) => {
    try {
      const { topic, sourceArticleIds, eventType } = req.body;
      if (!topic || !sourceArticleIds || sourceArticleIds.length === 0) {
        return res.status(400).json({ error: "Topic and source articles are required" });
      }
      console.log(`
=== INSIGHT GENERATION REQUESTED ===`);
      console.log(`Topic: ${topic}`);
      console.log(`Source articles: ${sourceArticleIds.length}`);
      const sourceArticles = await Promise.all(
        sourceArticleIds.map((id) => storage.getArticleById(id))
      );
      const validArticles = sourceArticles.filter((a) => a !== null);
      if (validArticles.length === 0) {
        return res.status(404).json({ error: "No valid source articles found" });
      }
      const insight = await insightService.generateInsight({
        sourceArticles: validArticles,
        topic,
        eventType
      });
      console.log(`\u2705 Insight generated: ${insight.title}`);
      res.json({
        success: true,
        insight
      });
    } catch (error) {
      console.error("Error generating Insight:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to generate Insight", message: errorMessage });
    }
  });
  app2.post("/api/admin/insights/publish", requireAdminAuth, async (req, res) => {
    try {
      const { title, content, excerpt, relatedArticleIds, sources } = req.body;
      if (!title || !content || !excerpt) {
        return res.status(400).json({ error: "Title, content, and excerpt are required" });
      }
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
        relatedArticleIds: relatedArticleIds || []
      });
      console.log(`\u2705 Published Insight: ${article.title}`);
      res.json({
        success: true,
        article
      });
    } catch (error) {
      console.error("Error publishing Insight:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to publish Insight", message: errorMessage });
    }
  });
  app2.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://phuketradar.com";
      const allArticles = await storage.getPublishedArticles();
      const categories2 = ["crime", "local", "tourism", "politics", "economy", "traffic", "weather"];
      const MIN_EXCERPT_WORDS = 30;
      const indexableArticles = allArticles.filter((article) => {
        const excerptWords = article.excerpt.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
        return excerptWords >= MIN_EXCERPT_WORDS;
      });
      let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
      sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      sitemap += "  <url>\n";
      sitemap += `    <loc>${baseUrl}/</loc>
`;
      sitemap += "    <changefreq>hourly</changefreq>\n";
      sitemap += "    <priority>1.0</priority>\n";
      sitemap += "  </url>\n";
      for (const category of categories2) {
        sitemap += "  <url>\n";
        sitemap += `    <loc>${baseUrl}/${category}</loc>
`;
        sitemap += "    <changefreq>hourly</changefreq>\n";
        sitemap += "    <priority>0.8</priority>\n";
        sitemap += "  </url>\n";
      }
      for (const article of indexableArticles) {
        const articlePath = buildArticleUrl({ category: article.category, slug: article.slug, id: article.id });
        const url = `${baseUrl}${articlePath}`;
        const modifiedDate = article.lastEnrichedAt || article.lastManualEditAt || article.publishedAt;
        const lastmod = new Date(modifiedDate).toISOString().split("T")[0];
        const priority = article.imageUrl || article.imageUrls && article.imageUrls.length > 0 ? "0.7" : "0.5";
        sitemap += "  <url>\n";
        sitemap += `    <loc>${url}</loc>
`;
        sitemap += `    <lastmod>${lastmod}</lastmod>
`;
        sitemap += "    <changefreq>weekly</changefreq>\n";
        sitemap += `    <priority>${priority}</priority>
`;
        sitemap += "  </url>\n";
      }
      sitemap += "</urlset>";
      res.header("Content-Type", "application/xml");
      res.send(sitemap);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send("Error generating sitemap");
    }
  });
  const uploadsDir = path3.join(process.cwd(), "public", "uploads");
  fs3.mkdir(uploadsDir, { recursive: true }).catch(console.error);
  const storage_multer = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path3.extname(file.originalname));
    }
  });
  const upload = multer({
    storage: storage_multer,
    limits: { fileSize: 10 * 1024 * 1024 },
    // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path3.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"));
      }
    }
  });
  app2.post("/api/admin/upload-image", requireAdminAuth, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const originalPath = req.file.path;
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error("\u274C Cloudinary not configured for image upload");
        try {
          await fs3.unlink(originalPath);
        } catch (e) {
        }
        return res.status(500).json({ error: "Image storage not configured" });
      }
      console.log(`\u{1F4E4} Processing uploaded image: ${req.file.originalname}`);
      const optimizedBuffer = await sharp4(originalPath).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      try {
        await fs3.unlink(originalPath);
      } catch (e) {
      }
      const { v2: cloudinary2 } = await import("cloudinary");
      cloudinary2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
      const imageUrl = await new Promise((resolve, reject) => {
        const timestamp2 = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const uploadStream = cloudinary2.uploader.upload_stream(
          {
            folder: "phuketradar",
            public_id: `manual-upload-${timestamp2}-${randomSuffix}`,
            resource_type: "image",
            format: "webp"
          },
          (error, result) => {
            if (error) {
              console.error("\u274C Cloudinary upload failed:", error.message);
              reject(new Error(`Cloudinary upload failed: ${error.message}`));
            } else if (result?.secure_url) {
              console.log(`\u2705 Uploaded to Cloudinary: ${result.secure_url}`);
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
      if (req.file) {
        try {
          await fs3.unlink(req.file.path);
        } catch (e) {
        }
      }
      const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/admin/generate-facebook-headline", requireAdminAuth, async (req, res) => {
    try {
      const { title, excerpt } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }
      const OpenAI11 = (await import("openai")).default;
      const openai11 = new OpenAI11({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai11.chat.completions.create({
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

\u{1F3AD} CRITICAL - THAI SOCIAL MEDIA CONTEXT:
If the title contains sarcastic/humorous Thai context:
- "Quality tourist" or "Tourist enjoying" with ironic context = DRUNK/MISBEHAVING tourist
- Reference to "embracing street life" or "resting on road" = PASSED OUT DRUNK
- Always report the ACTUAL situation, not the sarcastic framing

Examples:
- "Tourist Found Passed Out on Patong Street" \u2192 "WATCH: 'Quality Tourist' Found Sprawled Across Patong Sidewalk as Locals React"
- "Traffic Accident on Patong Hill" \u2192 "BREAKING: Multi-Vehicle Crash Closes Patong Hill During Rush Hour"
- "Restaurant Fire in Rawai" \u2192 "Dramatic Fire Engulfs Popular Rawai Restaurant \u2013 No Injuries Reported"`
          },
          {
            role: "user",
            content: `Create a high-CTR Facebook headline for this article:

Title: ${title}
Excerpt: ${excerpt || "(no excerpt provided)"}

Respond with ONLY the headline, no quotes or explanation.`
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      });
      const headline = completion.choices[0].message.content?.trim() || title;
      res.json({ headline });
    } catch (error) {
      console.error("Error generating Facebook headline:", error);
      res.status(500).json({ error: "Failed to generate headline" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/static-server.ts
import express from "express";
import fs4 from "fs";
import path4 from "path";
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs4.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath, {
    maxAge: "1y",
    immutable: true,
    index: false
    // Don't serve index.html as a static file, we handle it below
  }));
  app2.use("*", (_req, res) => {
    res.set({
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      "CDN-Cache-Control": "public, max-age=300",
      "Vary": "Accept-Encoding"
    });
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
init_db();
import path5 from "path";
import { sql as sql10 } from "drizzle-orm";
process.on("uncaughtException", (error) => {
  console.error("\u274C [UNCAUGHT EXCEPTION]:", error);
  console.error("   Stack:", error.stack);
  console.error("   \u26A0\uFE0F  Process continuing - error logged but not fatal");
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("\u274C [UNHANDLED REJECTION]:", reason);
  console.error("   Promise:", promise);
  console.error("   \u26A0\uFE0F  Process continuing - rejection logged but not fatal");
});
console.log("\u{1F680} [STARTUP] Application starting...");
console.log(`   NODE_ENV: ${"production"}`);
console.log(`   PORT: ${process.env.PORT || "5000"}`);
var app = express2();
app.set("trust proxy", 1);
var startTime = Date.now();
app.get("/health", (_req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1e3);
  res.status(200).json({
    status: "ok",
    uptime: `${uptime}s`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/", (_req, res, next) => {
  if (!_req.headers.accept || _req.headers["user-agent"]?.includes("Health")) {
    return res.status(200).send("OK");
  }
  next();
});
app.use("/assets", express2.static(path5.join(process.cwd(), "attached_assets"), {
  maxAge: "30d",
  immutable: true
}));
app.use("/uploads", express2.static(path5.join(process.cwd(), "public", "uploads"), {
  maxAge: "7d"
}));
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
if (!process.env.DATABASE_URL) {
  console.error("\u274C [FATAL] DATABASE_URL environment variable is missing");
  throw new Error("DATABASE_URL environment variable is required for database operations");
}
var PgSession = connectPgSimple(session2);
var sessionStore = new PgSession({
  pool,
  // Use the shared pool with IPv4 fix
  createTableIfMissing: false,
  // Prevent startup DB query - table should exist
  errorLog: (error) => {
    console.error("[SESSION STORE] Error:", error);
  }
});
var SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  console.warn("\u26A0\uFE0F  [WARNING] SESSION_SECRET is missing or too short. Using a temporary random secret.");
  console.warn("   Sessions will be invalidated on restart. Set SESSION_SECRET in environment variables.");
  SESSION_SECRET = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
log(`Session configured with ${SESSION_SECRET.length}-character secret`);
app.use(
  session2({
    store: sessionStore,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1e3,
      // 24 hours
      sameSite: "lax"
    }
  })
);
app.use((req, res, next) => {
  const start = Date.now();
  const path6 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path6.startsWith("/api")) {
      let logLine = `${req.method} ${path6} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
app.get("/category/:category", (req, res) => {
  const { category } = req.params;
  res.redirect(301, `/${category}`);
});
var LEGACY_CATEGORY_REDIRECTS = {
  "breaking": "local",
  // Breaking -> Local (most breaking news is local)
  "other": "local",
  // Other -> Local
  "info": "local",
  // Info -> Local
  "events": "local",
  // Events -> Local
  "business": "economy",
  // Business -> Economy
  "local-news": "local"
  // Local News -> Local (old category slug, ~252 Google-indexed URLs)
};
app.get("/:legacyCategory/:slugOrId", (req, res, next) => {
  const { legacyCategory, slugOrId } = req.params;
  const legacyCategoryLower = legacyCategory.toLowerCase();
  const correctCategory = LEGACY_CATEGORY_REDIRECTS[legacyCategoryLower];
  if (correctCategory) {
    console.log(`\u{1F504} [REDIRECT] Legacy category path: /${legacyCategory}/${slugOrId} -> /${correctCategory}/${slugOrId}`);
    res.redirect(301, `/${correctCategory}/${slugOrId}`);
  } else {
    next();
  }
});
app.get("/article/:slugOrId", async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const { resolveFrontendCategory: resolveFrontendCategory2 } = await Promise.resolve().then(() => (init_category_map(), category_map_exports));
    const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
    let article = await storage2.getArticleBySlug(slugOrId);
    if (!article) {
      article = await storage2.getArticleById(slugOrId);
    }
    if (article) {
      const frontendCategory = resolveFrontendCategory2(article.category);
      const slug = article.slug || article.id;
      res.redirect(301, `/${frontendCategory}/${slug}`);
    } else {
      next();
    }
  } catch (error) {
    console.error("Error redirecting article URL:", error);
    next();
  }
});
(async () => {
  try {
    const server = await registerRoutes(app);
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error(`\u274C [EXPRESS ERROR] ${status} ${message}`, err);
      res.status(status).json({ message });
    });
    if (false) {
      const { setupVite } = await null;
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    const port = parseInt(process.env.PORT || "5000", 10);
    Promise.resolve().then(() => (init_scheduler(), scheduler_exports)).then(({ startReEnrichmentPoller: startReEnrichmentPoller2 }) => {
      startReEnrichmentPoller2();
    }).catch((err) => console.error("Failed to start re-enrichment poller:", err));
    server.listen({
      port,
      host: "0.0.0.0"
    }, () => {
      log(`\u2705 Server serving on port ${port}`);
      (async () => {
        try {
          log("\u{1F527} [SCHEMA] Ensuring database schema is up to date...");
          const schemaCheckPromise = db.execute(sql10`
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS facebook_headline text;
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS author varchar;
            ALTER TABLE journalists ADD COLUMN IF NOT EXISTS nickname varchar;
            
            -- Auto-match and review columns
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS timeline_tags text[] DEFAULT ARRAY[]::text[];
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS auto_match_enabled boolean DEFAULT false;
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS review_reason text;
            
            -- Re-enrichment scheduling
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS re_enrich_at timestamp;
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS re_enrichment_completed boolean DEFAULT false;
          `);
          const timeoutPromise = new Promise(
            (_, reject) => setTimeout(() => reject(new Error("Schema check timeout after 30s")), 3e4)
          );
          await Promise.race([schemaCheckPromise, timeoutPromise]);
          log("\u2705 [SCHEMA] Database schema verified");
        } catch (error) {
          if (error.message?.includes("timeout")) {
            log("\u26A0\uFE0F  [SCHEMA] Schema check timed out - database may be cold starting");
            log("   Server is running, schema will be checked on first query");
          } else {
            log("\u274C [SCHEMA] Error ensuring schema:");
            console.error(error);
          }
        }
      })();
    });
    server.on("error", (error) => {
      console.error("\u274C [SERVER ERROR] Server failed to start:", error);
      process.exit(1);
    });
    log("\u{1F4C5} Automated internal scraping DISABLED");
    log(`\u{1F4C5} CRON_API_KEY loaded: ${process.env.CRON_API_KEY ? "YES (" + process.env.CRON_API_KEY.substring(0, 3) + "...)" : "NO"}`);
    log("\u{1F4C5} External cron endpoint: POST /api/cron/scrape (requires CRON_API_KEY)");
    log("\u{1F4C5} Manual scraping available at: /api/admin/scrape (requires admin session)");
  } catch (error) {
    console.error("\u274C [FATAL] Failed to initialize application:", error);
    process.exit(1);
  }
})();
