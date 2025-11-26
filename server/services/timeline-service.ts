import { eq, desc, and, sql, inArray, or, isNotNull } from "drizzle-orm";
import { db } from "../db";
import { articles } from "@shared/schema";
import type { Article } from "@shared/schema";
import type { IStorage } from "../storage";
import { checkSemanticDuplicate } from "../lib/semantic-similarity";

/**
 * Timeline Service
 * 
 * Manages story series/timelines for developing stories.
 * Allows grouping related articles (e.g., multiple flood relief stories)
 * into a single timeline view.
 */

export interface TimelineCreateParams {
    parentArticleId: string;
    seriesTitle: string;
    seriesId?: string; // Optional - will generate if not provided
}

export interface TimelineSuggestion {
    articleId: string;
    title: string;
    publishedAt: Date;
    similarityScore: number;
    reasoning: string;
}

export class TimelineService {
    constructor(private storage: IStorage) { }

    /**
     * Create a new story timeline from a parent article
     */
    async createStoryTimeline(params: TimelineCreateParams): Promise<{ seriesId: string; parentArticle: Article }> {
        const { parentArticleId, seriesTitle, seriesId: providedSeriesId } = params;

        // Get the parent article
        const parentArticle = await this.storage.getArticleById(parentArticleId);
        if (!parentArticle) {
            throw new Error(`Parent article not found: ${parentArticleId}`);
        }

        // Generate series ID if not provided
        const seriesId = providedSeriesId || `series-${Date.now()}-${parentArticleId.substring(0, 8)}`;

        // Update parent article to be the timeline parent
        await this.storage.updateArticle(parentArticleId, {
            seriesId,
            storySeriesTitle: seriesTitle,
            isParentStory: true,
            isDeveloping: true,
            seriesUpdateCount: 0,
        });

        const updatedParent = await this.storage.getArticleById(parentArticleId);
        if (!updatedParent) {
            throw new Error("Failed to update parent article");
        }

        console.log(`📰 [TIMELINE] Created new timeline: "${seriesTitle}" (${seriesId})`);
        return { seriesId, parentArticle: updatedParent };
    }

    /**
     * Add an article to an existing timeline
     */
    async addArticleToTimeline(articleId: string, seriesId: string): Promise<void> {
        // Get the article to add
        const article = await this.storage.getArticleById(articleId);
        if (!article) {
            throw new Error(`Article not found: ${articleId}`);
        }

        // Get the parent story to verify series exists
        const parentStory = await this.getParentStory(seriesId);
        if (!parentStory) {
            throw new Error(`Timeline series not found: ${seriesId}`);
        }

        // Don't allow adding an article that's already a parent of another series
        if (article.isParentStory && article.seriesId !== seriesId) {
            throw new Error("Cannot add a parent story from another timeline");
        }

        // Update the article to be part of this series
        await this.storage.updateArticle(articleId, {
            seriesId,
            storySeriesTitle: parentStory.storySeriesTitle,
            isParentStory: false, // Updates are never parent stories
            isDeveloping: true,
        });

        // Increment the parent story's update count
        const currentCount = parentStory.seriesUpdateCount || 0;
        await this.storage.updateArticle(parentStory.id, {
            seriesUpdateCount: currentCount + 1,
        });

        console.log(`📰 [TIMELINE] Added article to timeline: ${article.title.substring(0, 60)}... → ${parentStory.storySeriesTitle}`);
    }

    /**
     * Remove an article from a timeline
     */
    async removeArticleFromTimeline(articleId: string): Promise<void> {
        const article = await this.storage.getArticleById(articleId);
        if (!article || !article.seriesId) {
            throw new Error("Article not in a timeline");
        }

        // Can't remove the parent story directly - must delete the whole timeline
        if (article.isParentStory) {
            throw new Error("Cannot remove parent story. Delete the entire timeline instead.");
        }

        const seriesId = article.seriesId;

        // Remove from series
        await this.storage.updateArticle(articleId, {
            seriesId: null,
            storySeriesTitle: null,
            isParentStory: false,
            isDeveloping: false,
        });

        // Decrement parent story's update count
        const parentStory = await this.getParentStory(seriesId);
        if (parentStory) {
            const currentCount = parentStory.seriesUpdateCount || 0;
            await this.storage.updateArticle(parentStory.id, {
                seriesUpdateCount: Math.max(0, currentCount - 1),
            });
        }

        console.log(`📰 [TIMELINE] Removed article from timeline: ${article.title.substring(0, 60)}...`);
    }

    /**
     * Get all articles in a timeline, sorted chronologically (newest first)
     */
    async getTimelineStories(seriesId: string): Promise<Article[]> {
        const timelineArticles = await db
            .select()
            .from(articles)
            .where(eq(articles.seriesId, seriesId))
            .orderBy(desc(articles.publishedAt));

        return timelineArticles;
    }

    /**
     * Get the parent story of a timeline
     */
    async getParentStory(seriesId: string): Promise<Article | undefined> {
        const [parentStory] = await db
            .select()
            .from(articles)
            .where(
                and(
                    or(
                        eq(articles.seriesId, seriesId),
                        eq(articles.slug, seriesId) // Also check slug
                    ),
                    eq(articles.isParentStory, true)
                )
            );

        return parentStory || undefined;
    }

    /**
     * Get all timeline series (parent stories only)
     */
    async getAllTimelines(): Promise<Article[]> {
        const timelines = await db
            .select()
            .from(articles)
            .where(
                and(
                    eq(articles.isParentStory, true),
                    isNotNull(articles.seriesId)
                )
            )
            .orderBy(desc(articles.publishedAt));

        return timelines;
    }

    /**
   * AI-suggested: Find articles that might belong in the same timeline
   * Uses semantic similarity to suggest related articles
   */
    async suggestRelatedArticles(
        articleId: string,
        options: {
            minSimilarity?: number;
            maxSuggestions?: number;
            timeWindowHours?: number;
        } = {}
    ): Promise<TimelineSuggestion[]> {
        const {
            minSimilarity = 0.75, // High threshold for timeline grouping
            maxSuggestions = 10,
            timeWindowHours = 72, // Look at articles from last 3 days
        } = options;

        const article = await this.storage.getArticleById(articleId);
        if (!article || !article.embedding) {
            throw new Error(`Article not found or has no embedding: ${articleId}`);
        }

        // Don't suggest for articles already in a timeline (unless they're the parent)
        if (article.seriesId && !article.isParentStory) {
            return [];
        }

        // Get recent articles to compare against (with embeddings)
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - timeWindowHours);

        const allArticlesWithEmbeddings = await this.storage.getArticlesWithEmbeddings();
        const recentCandidates = allArticlesWithEmbeddings.filter(a => {
            // Get the full article to check publish date and series status
            // Note: This is a performance trade-off - we could optimize by adding
            // publishedAt and seriesId to getArticlesWithEmbeddings() result
            return a.id !== articleId && a.embedding !== null;
        });

        // Check semantic similarity using cosine similarity
        const { checkSemanticDuplicate } = await import("../lib/semantic-similarity");
        const result = checkSemanticDuplicate(
            article.embedding,
            recentCandidates,
            minSimilarity
        );

        const suggestions: TimelineSuggestion[] = [];

        // If we found a high-similarity match, that's our primary suggestion
        if (result.isDuplicate && result.matchedArticleId) {
            // Fetch full article details
            const matchedArticle = await this.storage.getArticleById(result.matchedArticleId);
            if (matchedArticle && new Date(matchedArticle.publishedAt) >= cutoffDate && !matchedArticle.seriesId) {
                suggestions.push({
                    articleId: matchedArticle.id,
                    title: matchedArticle.title,
                    publishedAt: new Date(matchedArticle.publishedAt),
                    similarityScore: result.similarity,
                    reasoning: result.similarity >= 0.9
                        ? "Very high similarity - likely the same developing story"
                        : "High similarity - possibly related to developing story",
                });
            }
        }

        // Get top similar articles for additional suggestions
        const { getTopSimilarArticles } = await import("../lib/semantic-similarity");
        const topSimilar = getTopSimilarArticles(article.embedding, recentCandidates, maxSuggestions * 2);

        for (const similar of topSimilar) {
            // Skip if already added or below threshold
            if (similar.similarity < minSimilarity || suggestions.some(s => s.articleId === similar.id)) {
                continue;
            }

            // Fetch full article to check dates and series status
            const candidateArticle = await this.storage.getArticleById(similar.id);
            if (!candidateArticle || candidateArticle.seriesId) {
                continue; // Skip articles already in a timeline
            }

            if (new Date(candidateArticle.publishedAt) >= cutoffDate) {
                suggestions.push({
                    articleId: candidateArticle.id,
                    title: candidateArticle.title,
                    publishedAt: new Date(candidateArticle.publishedAt),
                    similarityScore: similar.similarity,
                    reasoning: similar.similarity >= 0.85
                        ? "Strong similarity - likely part of same story"
                        : "Moderate similarity - possibly related",
                });

                if (suggestions.length >= maxSuggestions) {
                    break;
                }
            }
        }

        if (suggestions.length > 0) {
            console.log(`🤖 [TIMELINE-AI] Found ${suggestions.length} suggested articles for: ${article.title.substring(0, 60)}...`);
        }

        return suggestions;
    }

    /**
     * Find a matching timeline for a new article based on tags
     */
    async findMatchingTimeline(article: Article): Promise<string | null> {
        console.log(`🔍 [AUTO-MATCH BEGIN] Checking article: "${article.title.substring(0, 60)}..."`);

        // Get all active timelines that have auto-match enabled
        const activeTimelines = await db
            .select()
            .from(articles)
            .where(
                and(
                    eq(articles.isParentStory, true),
                    eq(articles.autoMatchEnabled, true),
                    isNotNull(articles.seriesId)
                )
            );

        console.log(`🔍 [AUTO-MATCH] Found ${activeTimelines.length} timelines with auto-match enabled`);

        if (activeTimelines.length === 0) {
            console.log(`⚠️ [AUTO-MATCH] No timelines with auto-match enabled - skipping`);
            return null;
        }

        const titleLower = article.title.toLowerCase();
        const contentLower = article.content.toLowerCase();
        // Also check original Thai text for better coverage
        const originalTitleLower = (article.originalTitle || '').toLowerCase();
        const originalContentLower = (article.originalContent || '').toLowerCase();

        console.log(`🔍 [AUTO-MATCH] Article title (lowercase): "${titleLower.substring(0, 80)}..."`);
        console.log(`🔍 [AUTO-MATCH] Article content length: ${contentLower.length} chars`);
        console.log(`🔍 [AUTO-MATCH] Also checking original Thai text: ${originalTitleLower ? 'Yes' : 'No'}`);

        for (const timeline of activeTimelines) {
            if (!timeline.timelineTags || timeline.timelineTags.length === 0) {
                console.log(`⚠️ [AUTO-MATCH] Timeline "${timeline.storySeriesTitle}" has no tags - skipping`);
                continue;
            }

            // CRITICAL FIX: Handle tags stored as string instead of array
            let tagsArray: string[];
            if (typeof timeline.timelineTags === 'string') {
                console.log(`⚠️ [AUTO-MATCH] Tags stored as STRING, not array! Converting...`);
                console.log(`   Raw value: "${timeline.timelineTags}"`);
                // Split by comma and trim
                tagsArray = (timeline.timelineTags as string).split(',').map((t: string) => t.trim());
            } else if (Array.isArray(timeline.timelineTags)) {
                tagsArray = timeline.timelineTags;
            } else {
                console.log(`❌ [AUTO-MATCH] Invalid tag type: ${typeof timeline.timelineTags}`);
                continue;
            }

            console.log(`🔍 [AUTO-MATCH] Checking timeline: "${timeline.storySeriesTitle}" with ${tagsArray.length} tags: [${tagsArray.join(", ")}]`);

            // Check if any tag matches (check both English and Thai/original text)
            const matchResults: string[] = [];
            const hasMatch = tagsArray.some(tag => {
                const tagLower = tag.toLowerCase();
                const inTitle = titleLower.includes(tagLower);
                const inContent = contentLower.includes(tagLower);
                const inOriginalTitle = originalTitleLower.includes(tagLower);
                const inOriginalContent = originalContentLower.includes(tagLower);

                const found = inTitle || inContent || inOriginalTitle || inOriginalContent;

                if (found) {
                    const location = inTitle ? 'title' : inContent ? 'content' : inOriginalTitle ? 'Thai title' : 'Thai content';
                    matchResults.push(`✅ "${tag}" found in ${location}`);
                } else {
                    matchResults.push(`❌ "${tag}" not found`);
                }

                return found;
            });

            // Log all tag check results
            matchResults.forEach(result => console.log(`     ${result}`));

            if (hasMatch && timeline.seriesId) {
                console.log(`✅ [AUTO-MATCH SUCCESS] Matched to timeline "${timeline.storySeriesTitle}"`);
                return timeline.seriesId;
            }
        }

        console.log(`❌ [AUTO-MATCH] No matching timeline found for: "${article.title.substring(0, 60)}..."`);
        return null;
    }

    /**
     * Group similar keywords to avoid counting "flood", "floods", "flooding" as 3 matches
     * Returns array of groups with a representative keyword
     */
    private groupSimilarKeywords(tags: string[]): Array<{ representative: string; keywords: string[] }> {
        const groups: Map<string, string[]> = new Map();

        for (const tag of tags) {
            const normalized = tag.toLowerCase().trim();

            // Find root form (stem) by removing common suffixes
            let stem = normalized
                .replace(/s$/, '')        // floods → flood
                .replace(/ing$/, '')      // flooding → flood
                .replace(/ed$/, '');      // flooded → flood

            // Group by stem
            if (!groups.has(stem)) {
                groups.set(stem, []);
            }
            groups.get(stem)!.push(tag);
        }

        // Convert to array format with representative (shortest) keyword
        return Array.from(groups.entries()).map(([stem, keywords]) => ({
            representative: keywords.sort((a, b) => a.length - b.length)[0], // Use shortest as representative
            keywords
        }));
    }

    /**
     * Delete an entire timeline (removes all articles from series)
     */
    async deleteTimeline(seriesId: string): Promise<void> {
        const timelineArticles = await this.getTimelineStories(seriesId);

        // Remove series info from all articles
        for (const article of timelineArticles) {
            await this.storage.updateArticle(article.id, {
                seriesId: null,
                storySeriesTitle: null,
                isParentStory: false,
                seriesUpdateCount: 0,
                isDeveloping: false,
            });
        }

        console.log(`📰 [TIMELINE] Deleted timeline: ${seriesId} (${timelineArticles.length} articles freed)`);
    }
}

// Singleton instance
let timelineServiceInstance: TimelineService | null = null;

export function getTimelineService(storage: IStorage): TimelineService {
    if (!timelineServiceInstance) {
        timelineServiceInstance = new TimelineService(storage);
    }
    return timelineServiceInstance;
}
