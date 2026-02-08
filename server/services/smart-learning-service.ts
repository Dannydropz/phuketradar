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

        // 1. Fetch aggregated metrics for articles published in the last N days
        const aggregatedMetrics = await db.execute(sql`
            WITH latest_social AS (
                SELECT article_id, impressions, reactions, comments, shares, last_updated_at
                FROM social_media_analytics
            ),
            metrics_agg AS (
                SELECT 
                    article_id, 
                    SUM(COALESCE(ga_views, 0)) as total_ga_views,
                    AVG(COALESCE(ga_avg_time_on_page, 0)) as avg_ga_time,
                    SUM(COALESCE(sc_clicks, 0)) as total_sc_clicks,
                    SUM(COALESCE(sc_impressions, 0)) as total_sc_impressions
                FROM article_metrics
                GROUP BY article_id
            )
            SELECT 
                a.id,
                a.title,
                a.published_at as "publishedAt",
                m.total_ga_views as "gaViews",
                m.avg_ga_time as "gaTime",
                m.total_sc_clicks as "scClicks",
                s.impressions,
                s.reactions,
                s.comments,
                s.shares
            FROM articles a
            LEFT JOIN metrics_agg m ON a.id = m.article_id
            LEFT JOIN latest_social s ON a.id = s.article_id
            WHERE a.published_at >= NOW() - INTERVAL '${sql.raw(daysLookback.toString())} days'
        `);

        const recentArticles = aggregatedMetrics.rows;
        let updatedCount = 0;

        for (const row of recentArticles) {
            const article = row as any;
            let score = 0;

            // --- SCORING LOGIC ---

            // 1. Traffic Score (Views)
            // Use internal viewCount if GA views are lower/missing
            const views = Math.max(Number(article.gaViews) || 0, article.viewCount || 0);
            score += Math.min(views, 1000) * 0.1;

            // 2. Quality Score (Time on Page)
            // 60 seconds = 10 points
            const timeOnPage = Number(article.gaTime) || 0;
            score += (timeOnPage / 60) * 10;

            // 3. Search Intent Score (Clicks)
            // High intent users
            const searchClicks = Number(article.scClicks) || 0;
            score += searchClicks * 2;

            // 4. Social Score (Viral potential) - HEAVILY WEIGHTED
            const impressions = Number(article.impressions) || 0;
            const reactions = Number(article.reactions) || 0;
            const comments = Number(article.comments) || 0;
            const shares = Number(article.shares) || 0;

            score += impressions * 0.05; // 200 reach = 10 pts
            score += reactions * 2.0;    // 5 reactions = 10 pts
            score += comments * 3.0;     // 3 comments ~ 10 pts
            score += shares * 5.0;       // 2 shares = 10 pts

            // 5. Recency Decay
            // Newer articles hold score better. Older ones fade.
            const publishedDate = new Date(article.publishedAt);
            const hoursOld = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
            const decayFactor = 1 / (1 + (hoursOld / 24)); // Halves every 24 hours roughly

            // Final Score
            const finalScore = score * decayFactor;

            // Update DB
            await db
                .update(articles)
                .set({ engagementScore: finalScore })
                .where(eq(articles.id, article.id as string));

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
