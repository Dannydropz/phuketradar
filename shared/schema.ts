import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, real, json, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const articles = pgTable("articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt").notNull(),
  imageUrl: text("image_url"),
  category: text("category").notNull(),
  sourceUrl: text("source_url").notNull(),
  author: text("author").notNull().default("Ploy Srisawat"),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  isPublished: boolean("is_published").notNull().default(false),
  originalLanguage: text("original_language").default("th"),
  translatedBy: text("translated_by").default("openai"),
  embedding: real("embedding").array(),
});

// Scheduler locks table - used by server/lib/scheduler-lock.ts
export const schedulerLocks = pgTable("scheduler_locks", {
  lockName: varchar("lock_name", { length: 255 }).primaryKey(),
  acquiredAt: timestamp("acquired_at").notNull().defaultNow(),
  instanceId: varchar("instance_id", { length: 255 }),
});

// Session table - auto-created by connect-pg-simple
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
}, (table) => ({
  expireIdx: index("IDX_session_expire").on(table.expire),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  publishedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;
