import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, real, json, index, integer, vector, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const journalists = pgTable("journalists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nickname: text("nickname").notNull(),
  fullName: text("full_name").notNull(),
  surname: text("surname").notNull(),
  headshot: text("headshot").notNull(),
  bio: text("bio").notNull(),
  beat: text("beat").notNull(),
  funFact: text("fun_fact").notNull(),
});

export const articles = pgTable("articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt").notNull(),
  originalTitle: text("original_title"), // Thai source title before translation
  originalContent: text("original_content"), // Thai source content before translation
  imageUrl: text("image_url"),
  imageUrls: text("image_urls").array(),
  imageHash: text("image_hash"),
  videoUrl: text("video_url"),
  videoThumbnail: text("video_thumbnail"),
  facebookEmbedUrl: text("facebook_embed_url"), // Facebook video/reel URL to embed on article page
  category: text("category").notNull(),
  sourceUrl: text("source_url").notNull(),
  author: text("author"), // Deprecated: use journalistId instead
  journalistId: varchar("journalist_id"),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  isPublished: boolean("is_published").notNull().default(false),
  originalLanguage: text("original_language").default("th"),
  translatedBy: text("translated_by").default("openai"),
  embedding: real("embedding").array(),
  facebookPostId: text("facebook_post_id").unique(), // OUR Facebook page post ID (set after posting)
  facebookHeadline: text("facebook_headline"), // High-CTR headline for social media
  facebookPostUrl: text("facebook_post_url"), // OUR Facebook page post URL
  sourceFacebookPostId: text("source_facebook_post_id").unique(), // Original source post ID (for duplicate detection)
  instagramPostId: text("instagram_post_id"), // OUR Instagram post ID (set after posting)
  instagramPostUrl: text("instagram_post_url"), // OUR Instagram post URL
  threadsPostId: text("threads_post_id"), // OUR Threads post ID (set after posting)
  threadsPostUrl: text("threads_post_url"), // OUR Threads post URL
  eventType: text("event_type"),
  severity: text("severity"),
  articleType: text("article_type").notNull().default("breaking"),
  interestScore: real("interest_score"),
  engagementScore: real("engagement_score").default(0),
  isPostedToFacebook: boolean("is_posted_to_facebook").default(false),
  relatedArticleIds: text("related_article_ids").array(),
  entities: json("entities"),
  sourceName: text("source_name"), // Actual source (e.g., "Phuket Times", "Info Center")
  isDeveloping: boolean("is_developing").default(false), // Story has limited details or expecting updates
  isManuallyCreated: boolean("is_manually_created").default(false), // True if created via admin UI, false if scraped
  parentStoryId: varchar("parent_story_id"), // If this was created from merging stories, points to the main story
  mergedIntoId: varchar("merged_into_id"), // If this story was merged into another, points to the merged story
  lastEnrichedAt: timestamp("last_enriched_at"), // When the last enrichment pass was done
  enrichmentCount: integer("enrichment_count").default(0), // Number of times this story has been enriched
  seriesId: varchar("series_id"), // Groups related articles that are part of a developing story
  storySeriesTitle: text("story_series_title"), // Human-readable title for the timeline (e.g., "Southern Thailand Flooding Crisis")
  isParentStory: boolean("is_parent_story").default(false), // TRUE for main story shown on homepage, FALSE for timeline updates
  seriesUpdateCount: integer("series_update_count").default(0), // Number of updates in this series (only for parent stories)
  tags: text("tags").array().default(sql`ARRAY[]::text[]`), // Auto-detected location/topic tags
  viewCount: integer("view_count").default(0), // Tracks article popularity for trending logic
  timelineTags: text("timeline_tags").array().default(sql`ARRAY[]::text[]`), // Keywords for auto-matching new stories
  autoMatchEnabled: boolean("auto_match_enabled").default(false), // Whether to auto-match stories to this timeline
  // TODO: Add these columns once ALTER TABLE completes on production database
  needsReview: boolean("needs_review").default(false), // Flagged for manual review
  reviewReason: text("review_reason"), // Why this needs review (e.g., "truncated text", "low quality")
});

// Scheduler locks table - used by server/lib/scheduler-lock.ts
// Matches raw SQL: CREATE TABLE IF NOT EXISTS scheduler_locks (...)
export const schedulerLocks = pgTable("scheduler_locks", {
  lockName: varchar("lock_name").primaryKey(),
  acquiredAt: timestamp("acquired_at").notNull().defaultNow(),
  instanceId: varchar("instance_id"),
});

// Session table - auto-created by connect-pg-simple
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
}, (table) => ({
  expireIdx: index("IDX_session_expire").on(table.expire),
}));

export const subscribers = pgTable("subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  unsubscribeToken: varchar("unsubscribe_token").notNull().unique().default(sql`gen_random_uuid()`),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  color: text("color").notNull().default("#3b82f6"), // Tailwind blue-500
  icon: text("icon"), // Optional Lucide icon name
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isDefault: boolean("is_default").notNull().default(false), // Prevents deletion of core categories
});

export const articleMetrics = pgTable("article_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: text("article_id").notNull(),
  source: text("source").notNull(), // 'google_analytics', 'search_console', 'facebook'
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

  syncedAt: timestamp("synced_at").defaultNow(),
}, (table) => ({
  uniqueMetric: index("unique_metric_idx").on(table.articleId, table.source, table.metricDate),
}));

export const socialMediaAnalytics = pgTable("social_media_analytics", {
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
  lastUpdatedAt: timestamp("last_updated_at").notNull().defaultNow(),
});

export const scoreAdjustments = pgTable("score_adjustments", {
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
  adjustedAt: timestamp("adjusted_at").notNull().defaultNow(),
}, (table) => ({
  articleIdIdx: index("score_adjustments_article_id_idx").on(table.articleId),
  categoryIdx: index("score_adjustments_category_idx").on(table.articleCategory),
  adjustedAtIdx: index("score_adjustments_adjusted_at_idx").on(table.adjustedAt),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertJournalistSchema = createInsertSchema(journalists).omit({
  id: true,
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  publishedAt: true,
});

export const insertSubscriberSchema = createInsertSchema(subscribers).pick({
  email: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertJournalist = z.infer<typeof insertJournalistSchema>;
export type Journalist = typeof journalists.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = typeof subscribers.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const insertArticleMetricsSchema = createInsertSchema(articleMetrics).omit({
  id: true,
  syncedAt: true,
});
export type InsertArticleMetrics = z.infer<typeof insertArticleMetricsSchema>;
export type ArticleMetrics = typeof articleMetrics.$inferSelect;

export const insertSocialMediaAnalyticsSchema = createInsertSchema(socialMediaAnalytics).omit({
  id: true,
  lastUpdatedAt: true,
});
export type InsertSocialMediaAnalytics = z.infer<typeof insertSocialMediaAnalyticsSchema>;
export type SocialMediaAnalytics = typeof socialMediaAnalytics.$inferSelect;

// Optimized article type for list views (excludes heavy fields)
export type ArticleListItem = Omit<Article, 'content' | 'embedding' | 'seriesId' | 'storySeriesTitle' | 'isParentStory' | 'seriesUpdateCount' | 'autoMatchEnabled'> & {
  seriesId?: string | null;
  storySeriesTitle?: string | null;
  isParentStory?: boolean | null;
  seriesUpdateCount?: number | null;
  autoMatchEnabled?: boolean | null;  // Whether the timeline is actively matching new stories
};
