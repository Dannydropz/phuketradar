import { type User, type InsertUser, type Article, type InsertArticle, users, articles } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Article methods
  getAllArticles(): Promise<Article[]>;
  getArticleById(id: string): Promise<Article | undefined>;
  getArticleBySourceUrl(sourceUrl: string): Promise<Article | undefined>;
  getArticlesByCategory(category: string): Promise<Article[]>;
  getPublishedArticles(): Promise<Article[]>;
  getPendingArticles(): Promise<Article[]>;
  createArticle(article: InsertArticle): Promise<Article>;
  updateArticle(id: string, article: Partial<Article>): Promise<Article | undefined>;
  deleteArticle(id: string): Promise<boolean>;
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

  async getArticleBySourceUrl(sourceUrl: string): Promise<Article | undefined> {
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.sourceUrl, sourceUrl));
    return article || undefined;
  }

  async getArticlesByCategory(category: string): Promise<Article[]> {
    return await db
      .select()
      .from(articles)
      .where(sql`LOWER(${articles.category}) = LOWER(${category}) AND ${articles.isPublished} = true`)
      .orderBy(desc(articles.publishedAt));
  }

  async getPublishedArticles(): Promise<Article[]> {
    return await db
      .select()
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

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
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

  async deleteArticle(id: string): Promise<boolean> {
    const result = await db
      .delete(articles)
      .where(eq(articles.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
