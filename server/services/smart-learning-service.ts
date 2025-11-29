import { db } from "../db";
import { articles, articleMetrics, socialMediaAnalytics } from "@shared/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";

export class SmartLearningService {

    /**
     * Recalculate engagement scores for all articles based on recent metrics
     * 
     * Formula factors:
     * - GA Views (Weight: 1.0)
     * - GA Time on Page (Weight: 2.0 - High quality signal)
     * - GSC Clicks (Weight: 1.5 - High intent signal)
     * - Facebook Engagement (Weight: 0.5 - Social signal)
     * - Recency Decay (Scores degrade over time)
     */
    async recalculateEngagementScores(daysLookback: number = 7): Promise<{ updated: number }> {
        console.log('[SMART LEARNING] Recalculating engagement scores...');

        // 1. Fetch latest metrics for articles
        // We join articles with their latest metrics
        const recentArticles = await db
            .select({
                id: articles.id,
                publishedAt: articles.publishedAt,
                // GA Metrics
                gaViews: articleMetrics.gaViews,
                gaTime: articleMetrics.gaAvgTimeOnPage,
                articles: articles,
                article_metrics: articleMetrics,
                social_media_analytics: socialMediaAnalytics
            })
            .from(articles)
            .leftJoin(articleMetrics, eq(articles.id, articleMetrics.articleId))
            .leftJoin(socialMediaAnalytics, eq(articles.id, socialMediaAnalytics.articleId))
            .where(
                gte(articles.publishedAt, new Date(Date.now() - daysLookback * 24 * 60 * 60 * 1000))
            );

        let updatedCount = 0;

        for (const row of recentArticles) {
            // Drizzle returns joined rows as { articles: ..., article_metrics: ..., social_media_analytics: ... }
            const article = row.articles;
            const metrics = row.article_metrics;
            const social = row.social_media_analytics;

            let score = 0;

            // --- SCORING LOGIC ---

            // 1. Traffic Score (Views)
            // Cap at 1000 views to prevent outliers dominating
            const views = metrics?.gaViews || 0;
            score += Math.min(views, 1000) * 0.1;

            // 2. Quality Score (Time on Page)
            // 60 seconds = 10 points
            const timeOnPage = metrics?.gaAvgTimeOnPage || 0;
            score += (timeOnPage / 60) * 10;

            // 3. Search Intent Score (Clicks)
            // High intent users
            const searchClicks = metrics?.gscClicks || 0;
            score += searchClicks * 2;

            // 4. Social Score (Viral potential)
            // Likes/Shares
            const socialEng = social?.reactions || 0; // Using reactions as proxy
            score += socialEng * 0.5;

            // 5. Recency Decay
            // Newer articles hold score better. Older ones fade.
            const hoursOld = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);
            const decayFactor = 1 / (1 + (hoursOld / 24)); // Halves every 24 hours roughly

            // Final Score
            const finalScore = score * decayFactor;

            // Update DB
            await db
                .update(articles)
                .set({ engagementScore: finalScore })
                .where(eq(articles.id, article.id));

            updatedCount++;
        }

        console.log(`[SMART LEARNING] Updated engagement scores for ${updatedCount} articles.`);
        return { updated: updatedCount };
    }

    /**
     * Get trending articles based on the new Engagement Score
     */
    async getTrendingArticles(limit: number = 5) {
        return await db
            .select()
            .from(articles)
            .orderBy(desc(articles.engagementScore))
            .limit(limit);
    }
}

export const smartLearningService = new SmartLearningService();
