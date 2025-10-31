import { type User, type InsertUser, type Article, type ArticleListItem, type InsertArticle, type Subscriber, type InsertSubscriber, users, articles, subscribers } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { generateUniqueSlug } from "./lib/seo-utils";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Article methods
  getAllArticles(): Promise<Article[]>;
  getArticleById(id: string): Promise<Article | undefined>;
  getArticleBySlug(slug: string): Promise<Article | undefined>;
  getArticleBySourceUrl(sourceUrl: string): Promise<Article | undefined>;
  getArticleByFacebookPostId(facebookPostId: string): Promise<Article | undefined>;
  getArticleByImageUrl(imageUrl: string): Promise<Article | undefined>;
  getArticlesByCategory(category: string): Promise<ArticleListItem[]>;
  getPublishedArticles(): Promise<ArticleListItem[]>;
  getPendingArticles(): Promise<Article[]>;
  getArticlesWithEmbeddings(): Promise<{ id: string; title: string; embedding: number[] | null }[]>;
  createArticle(article: InsertArticle): Promise<Article>;
  updateArticle(id: string, article: Partial<Article>): Promise<Article | undefined>;
  claimArticleForFacebookPosting(id: string, lockToken: string): Promise<boolean>;
  finalizeArticleFacebookPost(id: string, lockToken: string, facebookPostId: string, facebookPostUrl: string): Promise<boolean>;
  releaseFacebookPostLock(id: string, lockToken: string): Promise<void>;
  deleteArticle(id: string): Promise<boolean>;
  
  // Subscriber methods
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  getSubscriberByEmail(email: string): Promise<Subscriber | undefined>;
  getAllActiveSubscribers(): Promise<Subscriber[]>;
  unsubscribeByToken(token: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Article methods
  async getAllArticles(): Promise<Article[]> {
    return await db
      .select()
      .from(articles)
      .orderBy(desc(articles.publishedAt));
  }

  async getArticleById(id: string): Promise<Article | undefined> {
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.id, id));
    return article || undefined;
  }

  async getArticleBySlug(slug: string): Promise<Article | undefined> {
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.slug, slug));
    return article || undefined;
  }

  async getArticleBySourceUrl(sourceUrl: string): Promise<Article | undefined> {
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.sourceUrl, sourceUrl));
    return article || undefined;
  }

  async getArticleByFacebookPostId(facebookPostId: string): Promise<Article | undefined> {
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.facebookPostId, facebookPostId));
    return article || undefined;
  }

  async getArticleByImageUrl(imageUrl: string): Promise<Article | undefined> {
    const [article] = await db
      .select()
      .from(articles)
      .where(
        sql`${articles.imageUrl} = ${imageUrl} OR ${imageUrl} = ANY(${articles.imageUrls})`
      );
    return article || undefined;
  }

  async getArticlesByCategory(category: string): Promise<ArticleListItem[]> {
    return await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        imageUrl: articles.imageUrl,
        imageUrls: articles.imageUrls,
        category: articles.category,
        author: articles.author,
        sourceUrl: articles.sourceUrl,
        publishedAt: articles.publishedAt,
        isPublished: articles.isPublished,
        originalLanguage: articles.originalLanguage,
        translatedBy: articles.translatedBy,
        facebookPostId: articles.facebookPostId,
        facebookPostUrl: articles.facebookPostUrl,
        eventType: articles.eventType,
        severity: articles.severity,
        articleType: articles.articleType,
        relatedArticleIds: articles.relatedArticleIds,
      })
      .from(articles)
      .where(sql`LOWER(${articles.category}) = LOWER(${category}) AND ${articles.isPublished} = true`)
      .orderBy(desc(articles.publishedAt));
  }

  async getPublishedArticles(): Promise<ArticleListItem[]> {
    return await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        imageUrl: articles.imageUrl,
        imageUrls: articles.imageUrls,
        category: articles.category,
        author: articles.author,
        sourceUrl: articles.sourceUrl,
        publishedAt: articles.publishedAt,
        isPublished: articles.isPublished,
        originalLanguage: articles.originalLanguage,
        translatedBy: articles.translatedBy,
        facebookPostId: articles.facebookPostId,
        facebookPostUrl: articles.facebookPostUrl,
        eventType: articles.eventType,
        severity: articles.severity,
        articleType: articles.articleType,
        relatedArticleIds: articles.relatedArticleIds,
      })
      .from(articles)
      .where(eq(articles.isPublished, true))
      .orderBy(desc(articles.publishedAt));
  }

  async getPendingArticles(): Promise<Article[]> {
    return await db
      .select()
      .from(articles)
      .where(eq(articles.isPublished, false))
      .orderBy(desc(articles.publishedAt));
  }

  async getArticlesWithEmbeddings(): Promise<{ id: string; title: string; embedding: number[] | null }[]> {
    const result = await db
      .select({
        id: articles.id,
        title: articles.title,
        embedding: articles.embedding,
      })
      .from(articles);
    return result;
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    // Generate a unique slug from title if not provided
    if (!insertArticle.slug) {
      // Use provided ID or generate new UUID
      const articleId = (insertArticle as any).id || crypto.randomUUID();
      
      // Create slug from title + first 8 chars of ID for uniqueness
      const slug = generateUniqueSlug(insertArticle.title, articleId);
      
      // Insert with slug, preserving any provided ID
      const [article] = await db
        .insert(articles)
        .values({
          ...insertArticle,
          ...(!(insertArticle as any).id && { id: articleId }), // Only set ID if not provided
          slug,
        })
        .returning();
      return article;
    }
    
    // If slug is provided, use it as-is
    const [article] = await db
      .insert(articles)
      .values(insertArticle)
      .returning();
    return article;
  }

  async updateArticle(id: string, updates: Partial<Article>): Promise<Article | undefined> {
    const [article] = await db
      .update(articles)
      .set(updates)
      .where(eq(articles.id, id))
      .returning();
    return article || undefined;
  }

  async claimArticleForFacebookPosting(id: string, lockToken: string): Promise<boolean> {
    const lockValue = `LOCK:${lockToken}`;
    const result = await db
      .update(articles)
      .set({
        facebookPostId: lockValue,
      })
      .where(sql`${articles.id} = ${id} AND ${articles.facebookPostId} IS NULL`)
      .returning();
    return result.length > 0;
  }

  async finalizeArticleFacebookPost(
    id: string,
    lockToken: string,
    facebookPostId: string,
    facebookPostUrl: string
  ): Promise<boolean> {
    const lockValue = `LOCK:${lockToken}`;
    const result = await db
      .update(articles)
      .set({
        facebookPostId,
        facebookPostUrl,
      })
      .where(sql`${articles.id} = ${id} AND ${articles.facebookPostId} = ${lockValue}`)
      .returning();
    return result.length > 0;
  }

  async releaseFacebookPostLock(id: string, lockToken: string): Promise<void> {
    const lockValue = `LOCK:${lockToken}`;
    await db
      .update(articles)
      .set({
        facebookPostId: null,
        facebookPostUrl: null,
      })
      .where(sql`${articles.id} = ${id} AND ${articles.facebookPostId} = ${lockValue}`);
  }

  async deleteArticle(id: string): Promise<boolean> {
    const result = await db
      .delete(articles)
      .where(eq(articles.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Subscriber methods
  async createSubscriber(insertSubscriber: InsertSubscriber): Promise<Subscriber> {
    const [subscriber] = await db
      .insert(subscribers)
      .values(insertSubscriber)
      .returning();
    return subscriber;
  }

  async getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email));
    return subscriber || undefined;
  }

  async getAllActiveSubscribers(): Promise<Subscriber[]> {
    return await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.isActive, true))
      .orderBy(desc(subscribers.subscribedAt));
  }

  async unsubscribeByToken(token: string): Promise<boolean> {
    const result = await db
      .update(subscribers)
      .set({ isActive: false })
      .where(eq(subscribers.unsubscribeToken, token))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
