import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, real, json, index } from "drizzle-orm/pg-core";
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
  category: text("category").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceName: text("source_name"), // Name of Facebook page (e.g., "Phuket Info Center")
  author: text("author"), // Deprecated: use journalistId instead
  journalistId: varchar("journalist_id"),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  isPublished: boolean("is_published").notNull().default(false),
  originalLanguage: text("original_language").default("th"),
  translatedBy: text("translated_by").default("openai"),
  embedding: real("embedding").array(),
  facebookPostId: text("facebook_post_id").unique(), // OUR Facebook page post ID (set after posting)
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
  isDeveloping: boolean("is_developing").default(false), // Story missing key details (names, ages, causes)
  relatedArticleIds: text("related_article_ids").array(),
  entities: json("entities"),
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertJournalist = z.infer<typeof insertJournalistSchema>;
export type Journalist = typeof journalists.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = typeof subscribers.$inferSelect;

// Optimized article type for list views (excludes heavy fields)
export type ArticleListItem = Omit<Article, 'content' | 'embedding' | 'originalTitle' | 'originalContent'>;
