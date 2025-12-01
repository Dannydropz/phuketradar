import { db } from "../db";
import { articles, articleMetrics, socialMediaAnalytics } from "@shared/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";

export class SmartLearningService {

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
            const searchClicks = metrics?.scClicks || 0;
            score += searchClicks * 2;

            // 4. Social Score (Viral potential) - HEAVILY WEIGHTED
            const impressions = social?.impressions || 0;
            const reactions = social?.reactions || 0;
            const comments = social?.comments || 0;
            const shares = social?.shares || 0;

            score += impressions * 0.05; // 200 reach = 10 pts
            score += reactions * 2.0;    // 5 reactions = 10 pts
            score += comments * 3.0;     // 3 comments ~ 10 pts
            score += shares * 5.0;       // 2 shares = 10 pts

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
     * Only considers articles published in the last 3 days to ensure freshness
     */
    async getTrendingArticles(limit: number = 5) {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

        return await db
            .select()
            .from(articles)
            .where(gte(articles.publishedAt, threeDaysAgo))
            .orderBy(desc(articles.engagementScore))
            .limit(limit);
    }
}

export const smartLearningService = new SmartLearningService();
