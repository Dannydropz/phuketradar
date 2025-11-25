import type { Article, ArticleListItem } from '@shared/schema';

/**
 * Smart Context Widget Types
 */

export enum ContextType {
    TIMELINE = 'TIMELINE',           // Developing story timeline (Priority 1)
    FRESH_GRID = 'FRESH_GRID',       // Recent stories in same category (Priority 2)
    TRENDING_LIST = 'TRENDING_LIST', // Most-viewed stories (Priority 3)
    NULL = 'NULL'                    // No fresh content available (Priority 4)
}

export interface SmartContextResult {
    type: ContextType;
    stories: ArticleListItem[];
    metadata?: {
        seriesId?: string;
        category?: string;
        timeframe?: string;
    };
}

/**
 * Storage interface extension for Smart Context queries
 */
export interface ISmartContextStorage {
    // Get all articles in a series, sorted chronologically
    getArticlesBySeriesId(seriesId: string): Promise<ArticleListItem[]>;

    // Get recent articles in a category
    getRecentArticlesByCategory(category: string, hoursAgo: number, excludeId?: string): Promise<ArticleListItem[]>;

    // Get trending articles by view count
    getTrendingArticles(hoursAgo: number, limit: number): Promise<ArticleListItem[]>;

    // Increment view count
    incrementArticleViewCount(id: string): Promise<void>;
}

/**
 * Get Smart Context stories for an article
 * Implements the 4-tier priority logic
 * 
 * Priority 1: Timeline (if article is part of a series)
 * Priority 2: Fresh category news (last 48 hours)
 * Priority 3: Trending stories (last 24 hours, most-viewed)
 * Priority 4: Null (no fresh content)
 * 
 * @param currentArticle The article being viewed
 * @param storage Storage interface with smart context methods
 * @returns Smart context result with type and stories
 */
export async function getSmartContextStories(
    currentArticle: Article,
    storage: ISmartContextStorage
): Promise<SmartContextResult> {

    // Priority 1: Timeline for developing stories
    if (currentArticle.seriesId) {
        const timelineStories = await storage.getArticlesBySeriesId(currentArticle.seriesId);

        if (timelineStories.length > 1) {
            return {
                type: ContextType.TIMELINE,
                stories: timelineStories,
                metadata: {
                    seriesId: currentArticle.seriesId,
                    timeframe: 'developing-story'
                }
            };
        }
    }

    // Priority 2: Fresh news in same category (48 hours)
    const recentCategoryStories = await storage.getRecentArticlesByCategory(
        currentArticle.category,
        48,
        currentArticle.id
    );

    if (recentCategoryStories.length > 0) {
        return {
            type: ContextType.FRESH_GRID,
            stories: recentCategoryStories.slice(0, 6), // Limit to 6 for grid layout
            metadata: {
                category: currentArticle.category,
                timeframe: '48-hours'
            }
        };
    }

    // Priority 3: Trending stories (24 hours, most-viewed)
    const trendingStories = await storage.getTrendingArticles(24, 3);

    if (trendingStories.length > 0) {
        return {
            type: ContextType.TRENDING_LIST,
            stories: trendingStories,
            metadata: {
                timeframe: '24-hours'
            }
        };
    }

    // Priority 4: No fresh content available
    return {
        type: ContextType.NULL,
        stories: [],
        metadata: {}
    };
}
