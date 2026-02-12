import { type User, type InsertUser, type Article, type ArticleListItem, type InsertArticle, type Subscriber, type InsertSubscriber, type Journalist, type InsertJournalist, type Category, type InsertCategory, users, articles, subscribers, journalists, categories } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, inArray, and, gte, isNull } from "drizzle-orm";
import { generateUniqueSlug } from "./lib/seo-utils";
import { retryDatabaseOperation } from "./lib/db-retry";
import { resolveDbCategories } from "@shared/category-map";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Article methods
  getAllArticles(): Promise<Article[]>;
  getAllArticlesLean(limit?: number, offset?: number): Promise<ArticleListItem[]>;
  getArticleById(id: string): Promise<Article | undefined>;
  getArticleBySlug(slug: string): Promise<Article | undefined>;
  getArticleBySourceUrl(sourceUrl: string): Promise<Article | undefined>;
  getArticleByFacebookPostId(facebookPostId: string): Promise<Article | undefined>;
  getArticleBySourceFacebookPostId(sourceFacebookPostId: string): Promise<Article | undefined>;
  getArticleByImageUrl(imageUrl: string): Promise<Article | undefined>;
  getArticlesWithImageHashes(): Promise<{ id: string; title: string; imageHash: string | null }[]>;
  getArticlesByCategory(category: string, limit?: number, offset?: number): Promise<ArticleListItem[]>;
  getPublishedArticles(limit?: number, offset?: number): Promise<ArticleListItem[]>;
  getPendingArticles(): Promise<Article[]>;
  getArticlesWithEmbeddings(): Promise<{ id: string; title: string; content: string; embedding: number[] | null; entities?: any }[]>;
  getRecentArticlesWithEmbeddings(days: number): Promise<{ id: string; title: string; content: string; embedding: number[] | null; entities?: any }[]>;
  createArticle(article: InsertArticle): Promise<Article>;
  updateArticle(id: string, article: Partial<Article>): Promise<Article | undefined>;
  claimArticleForFacebookPosting(id: string, lockToken: string): Promise<boolean>;
  finalizeArticleFacebookPost(id: string, lockToken: string, facebookPostId: string, facebookPostUrl: string): Promise<boolean>;
  releaseFacebookPostLock(id: string, lockToken: string): Promise<void>;
  claimArticleForInstagramPosting(id: string, lockToken: string): Promise<boolean>;
  updateArticleInstagramPost(id: string, instagramPostId: string, instagramPostUrl: string, lockToken: string): Promise<void>;
  releaseInstagramPostLock(id: string, lockToken: string): Promise<void>;
  claimArticleForThreadsPosting(id: string, lockToken: string): Promise<boolean>;
  updateArticleThreadsPost(id: string, threadsPostId: string, threadsPostUrl: string, lockToken: string): Promise<void>;
  releaseThreadsPostLock(id: string, lockToken: string): Promise<void>;
  getArticlesWithStuckLocks(): Promise<{ id: string; title: string; facebookPostId: string }[]>;
  clearStuckFacebookLock(id: string): Promise<void>;
  deleteArticle(id: string): Promise<boolean>;

  // Subscriber methods
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  getSubscriberByEmail(email: string): Promise<Subscriber | undefined>;
  getAllActiveSubscribers(): Promise<Subscriber[]>;
  unsubscribeByToken(token: string): Promise<boolean>;
  reactivateSubscriber(id: string): Promise<Subscriber>;

  // Journalist methods
  getAllJournalists(): Promise<Journalist[]>;
  getJournalistById(id: string): Promise<Journalist | undefined>;
  getArticlesByJournalistId(journalistId: string): Promise<ArticleListItem[]>;

  // Category methods
  getAllCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Article review methods
  getArticlesNeedingReview(): Promise<Article[]>;

  // Enrichment methods
  getDevelopingArticles(): Promise<Article[]>;

  // Smart Context methods
  getArticlesBySeriesId(seriesId: string): Promise<ArticleListItem[]>;
  searchArticles(query: string): Promise<ArticleListItem[]>;
  getArticlesByTag(tag: string): Promise<ArticleListItem[]>;
  getRecentArticlesByCategory(category: string, hoursAgo: number, excludeId?: string): Promise<ArticleListItem[]>;
  getTrendingArticles(hoursAgo: number, limit: number): Promise<ArticleListItem[]>;
  incrementArticleViewCount(id: string): Promise<void>;
}

// Optimized field selection for article lists (excludes heavy content/embedding/entities fields)
const LEAN_ARTICLE_FIELDS = {
  id: articles.id,
  slug: articles.slug,
  title: articles.title,
  excerpt: articles.excerpt,
  imageUrl: articles.imageUrl,
  imageUrls: articles.imageUrls,
  imageHash: articles.imageHash,
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
  switchyShortUrl: articles.switchyShortUrl,
};

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

  // Optimized version of getAllArticles that excludes heavy fields (content, embedding, entities)
  // Use this for admin dashboard and list views where full content isn't needed
  async getAllArticlesLean(limit: number = 200, offset: number = 0): Promise<ArticleListItem[]> {
    return await db
      .select(LEAN_ARTICLE_FIELDS)
      .from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(limit)
      .offset(offset);
  }

  async getArticleById(id: string): Promise<Article | undefined> {
    // Validate ID is a UUID to prevent DB errors
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return undefined;
    }

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
    return retryDatabaseOperation(async () => {
      const [article] = await db
        .select()
        .from(articles)
        .where(eq(articles.sourceUrl, sourceUrl));
      return article || undefined;
    }, 3, 2000, `getArticleBySourceUrl(${sourceUrl.substring(0, 40)}...)`);
  }

  async getArticleByFacebookPostId(facebookPostId: string): Promise<Article | undefined> {
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.facebookPostId, facebookPostId));
    return article || undefined;
  }

  async getArticleBySourceFacebookPostId(sourceFacebookPostId: string): Promise<Article | undefined> {
    return retryDatabaseOperation(async () => {
      const [article] = await db
        .select()
        .from(articles)
        .where(eq(articles.sourceFacebookPostId, sourceFacebookPostId));
      return article || undefined;
    }, 3, 2000, `getArticleBySourceFacebookPostId(${sourceFacebookPostId.substring(0, 20)}...)`);
  }

  async getArticleByImageUrl(imageUrl: string): Promise<Article | undefined> {
    return retryDatabaseOperation(async () => {
      const [article] = await db
        .select()
        .from(articles)
        .where(
          sql`${articles.imageUrl} = ${imageUrl} OR ${imageUrl} = ANY(${articles.imageUrls})`
        );
      return article || undefined;
    }, 3, 2000, `getArticleByImageUrl(${imageUrl.substring(0, 30)}...)`);
  }

  async getArticlesByCategory(category: string, limit: number = 30, offset: number = 0): Promise<ArticleListItem[]> {
    const dbCategories = [...resolveDbCategories(category)];

    if (dbCategories.length === 0) {
      return [];
    }

    return await db
      .select(LEAN_ARTICLE_FIELDS)
      .from(articles)
      .where(
        and(
          eq(articles.isPublished, true),
          inArray(articles.category, dbCategories)
        )
      )
      .orderBy(desc(articles.publishedAt))
      .limit(limit)
      .offset(offset);
  }

  async getPublishedArticles(limit: number = 30, offset: number = 0): Promise<ArticleListItem[]> {
    return await db
      .select(LEAN_ARTICLE_FIELDS)
      .from(articles)
      .where(eq(articles.isPublished, true))
      .orderBy(desc(articles.publishedAt))
      .limit(limit)
      .offset(offset);
  }

  async getPendingArticles(): Promise<Article[]> {
    return await db
      .select()
      .from(articles)
      .where(eq(articles.isPublished, false))
      .orderBy(desc(articles.publishedAt));
  }

  async getArticlesWithEmbeddings(): Promise<{ id: string; title: string; content: string; embedding: number[] | null; entities?: any }[]> {
    const result = await db
      .select({
        id: articles.id,
        title: articles.originalTitle, // Return Thai original for duplicate detection
        content: articles.originalContent, // Return Thai original for duplicate detection
        embedding: articles.embedding,
        entities: articles.entities,
      })
      .from(articles);

    // Filter out articles without original content (legacy articles before this fix)
    return result
      .filter(a => a.title !== null && a.content !== null)
      .map(a => ({
        id: a.id,
        title: a.title as string,
        content: a.content as string,
        embedding: a.embedding,
        entities: a.entities,
      }));
  }

  async getRecentArticlesWithEmbeddings(days: number): Promise<{ id: string; title: string; content: string; embedding: number[] | null; entities?: any }[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db
      .select({
        id: articles.id,
        title: articles.originalTitle,
        content: articles.originalContent,
        embedding: articles.embedding,
        entities: articles.entities,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .where(gte(articles.publishedAt, cutoffDate));

    return result
      .filter(a => a.title !== null && a.content !== null && a.embedding !== null)
      .map(a => ({
        id: a.id,
        title: a.title as string,
        content: a.content as string,
        embedding: a.embedding,
        entities: a.entities,
      }));
  }

  async getArticlesWithImageHashes(): Promise<{ id: string; title: string; imageHash: string | null }[]> {
    const result = await db
      .select({
        id: articles.id,
        title: articles.title,
        imageHash: articles.imageHash,
      })
      .from(articles)
      .orderBy(desc(articles.publishedAt));
    return result;
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    let articleData: any;

    if (!insertArticle.slug) {
      const articleId = (insertArticle as any).id || crypto.randomUUID();
      const slug = generateUniqueSlug(insertArticle.title, articleId);

      articleData = {
        ...insertArticle,
        ...(!(insertArticle as any).id && { id: articleId }),
        slug,
      };
    } else {
      articleData = insertArticle;
    }

    return retryDatabaseOperation(
      async () => {
        try {
          const [article] = await db
            .insert(articles)
            .values(articleData)
            .returning();

          return article;
        } catch (error: any) {
          console.error(`\n❌ [STORAGE] Database insertion failed`);
          console.error(`   Error Code: ${error.code || 'UNKNOWN'}`);
          console.error(`   Error Message: ${error.message || 'No message'}`);
          console.error(`   Error Name: ${error.name || 'Unknown'}`);
          console.error(`   PostgreSQL Detail: ${error.detail || 'N/A'}`);
          console.error(`   PostgreSQL Hint: ${error.hint || 'N/A'}`);
          console.error(`   Constraint: ${error.constraint || 'N/A'}`);
          console.error(`   Full Error:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
          console.error(`   Article Title: ${insertArticle.title?.substring(0, 60) || 'MISSING'}...`);
          console.error(`   Source URL: ${insertArticle.sourceUrl || 'MISSING'}`);

          // Re-throw the error so scheduler can handle it
          throw error;
        }
      },
      5,
      1000,
      `Create article: ${insertArticle.title?.substring(0, 40)}...`
    );
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

  async getArticlesWithStuckLocks(): Promise<{ id: string; title: string; facebookPostId: string }[]> {
    // Only return locks older than 5 minutes to avoid clearing in-flight posts
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const results = await db
      .select({
        id: articles.id,
        title: articles.title,
        facebookPostId: articles.facebookPostId,
      })
      .from(articles)
      .where(sql`${articles.facebookPostId} LIKE 'LOCK:%' AND ${articles.publishedAt} < ${fiveMinutesAgo}`);

    return results.map(r => ({
      id: r.id,
      title: r.title,
      facebookPostId: r.facebookPostId || '',
    }));
  }

  async clearStuckFacebookLock(id: string): Promise<void> {
    await db
      .update(articles)
      .set({
        facebookPostId: null,
        facebookPostUrl: null,
      })
      .where(sql`${articles.id} = ${id} AND ${articles.facebookPostId} LIKE 'LOCK:%'`);
  }

  // Instagram posting methods
  async claimArticleForInstagramPosting(id: string, lockToken: string): Promise<boolean> {
    const lockValue = `IG-LOCK:${lockToken}`;
    const result = await db
      .update(articles)
      .set({
        instagramPostId: lockValue,
      })
      .where(sql`${articles.id} = ${id} AND ${articles.instagramPostId} IS NULL`)
      .returning();
    return result.length > 0;
  }

  async updateArticleInstagramPost(
    id: string,
    instagramPostId: string,
    instagramPostUrl: string,
    lockToken: string
  ): Promise<void> {
    const lockValue = `IG-LOCK:${lockToken}`;
    await db
      .update(articles)
      .set({
        instagramPostId,
        instagramPostUrl,
      })
      .where(sql`${articles.id} = ${id} AND ${articles.instagramPostId} = ${lockValue}`);
  }

  async releaseInstagramPostLock(id: string, lockToken: string): Promise<void> {
    const lockValue = `IG-LOCK:${lockToken}`;
    await db
      .update(articles)
      .set({
        instagramPostId: null,
        instagramPostUrl: null,
      })
      .where(sql`${articles.id} = ${id} AND ${articles.instagramPostId} = ${lockValue}`);
  }

  // Threads posting methods
  async claimArticleForThreadsPosting(id: string, lockToken: string): Promise<boolean> {
    const lockValue = `THREADS-LOCK:${lockToken}`;
    const result = await db
      .update(articles)
      .set({
        threadsPostId: lockValue,
      })
      .where(sql`${articles.id} = ${id} AND ${articles.threadsPostId} IS NULL`)
      .returning();
    return result.length > 0;
  }

  async updateArticleThreadsPost(
    id: string,
    threadsPostId: string,
    threadsPostUrl: string,
    lockToken: string
  ): Promise<void> {
    const lockValue = `THREADS-LOCK:${lockToken}`;
    await db
      .update(articles)
      .set({
        threadsPostId,
        threadsPostUrl,
      })
      .where(sql`${articles.id} = ${id} AND ${articles.threadsPostId} = ${lockValue}`);
  }

  async releaseThreadsPostLock(id: string, lockToken: string): Promise<void> {
    const lockValue = `THREADS-LOCK:${lockToken}`;
    await db
      .update(articles)
      .set({
        threadsPostId: null,
        threadsPostUrl: null,
      })
      .where(sql`${articles.id} = ${id} AND ${articles.threadsPostId} = ${lockValue}`);
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

  async reactivateSubscriber(id: string): Promise<Subscriber> {
    const [subscriber] = await db
      .update(subscribers)
      .set({
        isActive: true,
        subscribedAt: new Date(),
        unsubscribeToken: sql`gen_random_uuid()`,
      })
      .where(eq(subscribers.id, id))
      .returning();
    return subscriber;
  }

  // Journalist methods
  async getAllJournalists(): Promise<Journalist[]> {
    return await db
      .select()
      .from(journalists)
      .orderBy(journalists.nickname);
  }

  async getJournalistById(id: string): Promise<Journalist | undefined> {
    const [journalist] = await db
      .select()
      .from(journalists)
      .where(eq(journalists.id, id));
    return journalist || undefined;
  }

  async getArticlesByJournalistId(journalistId: string): Promise<ArticleListItem[]> {
    return await db
      .select(LEAN_ARTICLE_FIELDS)
      .from(articles)
      .where(eq(articles.journalistId, journalistId))
      .orderBy(desc(articles.publishedAt));
  }

  // Category methods
  async getAllCategories(): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .orderBy(categories.name);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(insertCategory)
      .returning();
    return category;
  }

  // Article review methods (disabled until database columns are added)
  async getArticlesNeedingReview(): Promise<Article[]> {
    // TODO: Re-enable once needs_review column is added to database
    return [];
  }

  // Enrichment methods
  async getDevelopingArticles(): Promise<Article[]> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return await db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.isDeveloping, true),
          eq(articles.isPublished, true),
          gte(articles.publishedAt, twentyFourHoursAgo),
          isNull(articles.mergedIntoId)
        )
      )
      .orderBy(desc(articles.interestScore), desc(articles.publishedAt));
  }

  // Smart Context methods
  async getArticlesBySeriesId(seriesId: string): Promise<ArticleListItem[]> {
    return await db
      .select(LEAN_ARTICLE_FIELDS)
      .from(articles)
      .where(eq(articles.seriesId, seriesId))
      .orderBy(desc(articles.publishedAt));
  }

  async searchArticles(query: string): Promise<ArticleListItem[]> {
    if (!query.trim()) return [];

    const searchPattern = `%${query.trim()}%`;

    return await db
      .select(LEAN_ARTICLE_FIELDS)
      .from(articles)
      .where(
        and(
          eq(articles.isPublished, true),
          sql`(${articles.title} ILIKE ${searchPattern} OR ${articles.excerpt} ILIKE ${searchPattern})`
        )
      )
      .orderBy(desc(articles.publishedAt))
      .limit(20);
  }

  async getArticlesByTag(tag: string): Promise<ArticleListItem[]> {
    if (!tag.trim()) return [];

    // Tags are stored as an array, check if the tag is in the array
    return await db
      .select(LEAN_ARTICLE_FIELDS)
      .from(articles)
      .where(
        and(
          eq(articles.isPublished, true),
          sql`${tag} = ANY(${articles.tags})`
        )
      )
      .orderBy(desc(articles.publishedAt));
  }

  async getRecentArticlesByCategory(
    category: string,
    hoursAgo: number,
    excludeId?: string
  ): Promise<ArticleListItem[]> {
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    const dbCategories = [...resolveDbCategories(category)];

    if (dbCategories.length === 0) {
      return [];
    }

    const conditions = [
      inArray(articles.category, dbCategories),
      eq(articles.isPublished, true),
      gte(articles.publishedAt, cutoffTime),
    ];

    if (excludeId) {
      conditions.push(sql`${articles.id} != ${excludeId}`);
    }

    return await db
      .select(LEAN_ARTICLE_FIELDS)
      .from(articles)
      .where(and(...conditions))
      .orderBy(desc(articles.publishedAt)); // Newest first
  }

  async getTrendingArticles(hoursAgo: number, limit: number): Promise<ArticleListItem[]> {
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    return await db
      .select(LEAN_ARTICLE_FIELDS)
      .from(articles)
      .where(
        and(
          eq(articles.isPublished, true),
          gte(articles.publishedAt, cutoffTime),
          sql`${articles.viewCount} > 0` // Only include articles with views
        )
      )
      .orderBy(desc(articles.viewCount), desc(articles.publishedAt))
      .limit(limit);
  }

  async incrementArticleViewCount(id: string): Promise<void> {
    await db
      .update(articles)
      .set({
        viewCount: sql`${articles.viewCount} + 1`,
      })
      .where(eq(articles.id, id));
  }
}

export const storage = new DatabaseStorage();
