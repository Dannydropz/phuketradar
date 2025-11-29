import { db } from "../db";
import { articles, socialMediaAnalytics, type InsertSocialMediaAnalytics } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export class MetaBusinessSuiteService {
    private accessToken: string;
    private pageId: string;
    private baseUrl = 'https://graph.facebook.com/v19.0';

    constructor() {
        this.accessToken = process.env.FB_PAGE_ACCESS_TOKEN || '';
        this.pageId = process.env.FB_PAGE_ID || '';

        if (!this.accessToken || !this.pageId) {
            console.warn('[META SERVICE] Missing FB_PAGE_ACCESS_TOKEN or FB_PAGE_ID. Facebook insights will not work.');
        }
    }

    /**
     * Fetch post insights from Facebook Graph API
     */
    /**
     * Fetch post insights from Facebook Graph API
     */
    async getPostInsights(facebookPostId: string): Promise<{
        impressions: number;
        clicks: number;
        reactions: number;
        comments: number;
        shares: number;
        engagement: number;
        ctr: number;
    } | null> {
        if (!this.accessToken) return null;

        try {
            // Extract the actual post ID if it's in the format PAGE_ID_POST_ID
            const cleanPostId = facebookPostId.includes('_') ? facebookPostId : `${this.pageId}_${facebookPostId}`;

            // DEBUG: Log what we are trying to fetch
            console.log(`[META SERVICE] Fetching insights for: ${cleanPostId}`);

            // 1. Get Post details (shares, comments, reactions summary) - Basic public fields
            // Removed 'reactions.summary(true)' temporarily to see if that's the blocker
            const postUrl = `${this.baseUrl}/${cleanPostId}?fields=shares,comments.summary(true).limit(0),reactions.summary(true).limit(0)&access_token=${this.accessToken}`;

            const postResponse = await fetch(postUrl);
            const postData = await postResponse.json();

            if (postData.error) {
                console.error(`[META SERVICE] Error fetching post details for ${cleanPostId}:`, postData.error.message);
                // If we can't even read the post, we definitely can't get insights
                return null;
            }

            // 2. Get Insights (impressions, clicks)
            // metrics: post_impressions_unique, post_clicks
            // Note: This SPECIFICALLY requires pages_read_engagement
            const insightsUrl = `${this.baseUrl}/${cleanPostId}/insights?metric=post_impressions_unique,post_clicks&access_token=${this.accessToken}`;
            const insightsResponse = await fetch(insightsUrl);
            const insightsData = await insightsResponse.json();

            let impressions = 0;
            let clicks = 0;

            if (insightsData.error) {
                console.warn(`[META SERVICE] Warning: Could not fetch deep insights for ${cleanPostId} (likely permission issue), using basic metrics only.`);
                console.warn(`[META SERVICE] Error: ${insightsData.error.message}`);
                // Don't return null, continue with partial data (shares/comments are still valuable)
            } else if (insightsData.data) {
                const impMetric = insightsData.data.find((m: any) => m.name === 'post_impressions_unique');
                const clickMetric = insightsData.data.find((m: any) => m.name === 'post_clicks');

                if (impMetric && impMetric.values && impMetric.values.length > 0) {
                    impressions = impMetric.values[0].value;
                }
                if (clickMetric && clickMetric.values && clickMetric.values.length > 0) {
                    clicks = clickMetric.values[0].value;
                }
            }

            // Parse metrics
            const shares = postData.shares?.count || 0;
            const comments = postData.comments?.summary?.total_count || 0;
            const reactions = postData.reactions?.summary?.total_count || 0;

            const engagement = shares + comments + reactions + clicks;
            const ctr = impressions > 0 ? (clicks / impressions) : 0;

            return {
                impressions,
                clicks,
                reactions,
                comments,
                shares,
                engagement,
                ctr
            };

        } catch (error) {
            console.error('[META SERVICE] Exception fetching insights:', error);
            return null;
        }
    }

    /**
     * Batch update insights for all posts in last N days
     */
    async batchUpdatePostInsights(daysAgo: number = 7): Promise<{ updated: number, errors: number }> {
        if (!this.accessToken) {
            console.warn('[META SERVICE] Skipping batch update: No access token');
            return { updated: 0, errors: 0 };
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

        // Find articles with Facebook posts from last N days
        const recentArticles = await db
            .select({
                id: articles.id,
                facebookPostId: articles.facebookPostId,
                facebookHeadline: articles.facebookHeadline,
            })
            .from(articles)
            .where(
                and(
                    gte(articles.publishedAt, cutoffDate),
                    sql`${articles.facebookPostId} IS NOT NULL`,
                    sql`${articles.facebookPostId} NOT LIKE 'LOCK:%'` // Exclude locked/pending posts
                )
            );

        console.log(`[META SERVICE] Found ${recentArticles.length} articles with Facebook posts to sync`);

        let updatedCount = 0;
        let errorCount = 0;

        for (const article of recentArticles) {
            if (!article.facebookPostId) continue;

            const insights = await this.getPostInsights(article.facebookPostId);

            if (insights) {
                try {
                    // Update or insert into social_media_analytics
                    // Check if record exists
                    const [existing] = await db
                        .select()
                        .from(socialMediaAnalytics)
                        .where(
                            and(
                                eq(socialMediaAnalytics.articleId, article.id),
                                eq(socialMediaAnalytics.platform, 'facebook')
                            )
                        );

                    if (existing) {
                        await db
                            .update(socialMediaAnalytics)
                            .set({
                                impressions: insights.impressions,
                                clicks: insights.clicks,
                                shares: insights.shares,
                                reactions: insights.reactions,
                                comments: insights.comments,
                                lastUpdatedAt: new Date(),
                            })
                            .where(eq(socialMediaAnalytics.id, existing.id));
                    } else {
                        await db
                            .insert(socialMediaAnalytics)
                            .values({
                                articleId: article.id,
                                platform: 'facebook',
                                postId: article.facebookPostId,
                                headlineVariant: article.facebookHeadline,
                                impressions: insights.impressions,
                                clicks: insights.clicks,
                                shares: insights.shares,
                                reactions: insights.reactions,
                                comments: insights.comments,
                            });
                    }
                    updatedCount++;
                    // Rate limiting protection
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (dbError) {
                    console.error(`[META SERVICE] DB Error saving insights for article ${article.id}:`, dbError);
                    errorCount++;
                }
            } else {
                errorCount++;
            }
        }

        return { updated: updatedCount, errors: errorCount };
    }
}

export const metaBusinessSuiteService = new MetaBusinessSuiteService();
