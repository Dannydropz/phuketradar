import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { db } from "../db";
import { articles, articleMetrics } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export class GoogleAnalyticsService {
    private client: BetaAnalyticsDataClient;
    private propertyId: string;

    constructor() {
        // Check if credentials are set
        if (!process.env.GA_CLIENT_EMAIL || !process.env.GA_PRIVATE_KEY || !process.env.GA_PROPERTY_ID) {
            console.warn('[GA SERVICE] Missing Google Analytics credentials. Analytics sync will not work.');
        }

        this.client = new BetaAnalyticsDataClient({
            credentials: {
                client_email: process.env.GA_CLIENT_EMAIL,
                private_key: process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle newlines in env var
            },
        });

        this.propertyId = process.env.GA_PROPERTY_ID || '';
    }

    /**
     * Get article performance metrics for a specific article
     */
    async getArticleMetrics(articleSlug: string, daysAgo: number = 30): Promise<{
        views: number;
        avgTimeOnPage: number; // In seconds
        users: number;
        engagementRate: number;
    } | null> {
        if (!this.propertyId) return null;

        try {
            const [response] = await this.client.runReport({
                property: `properties/${this.propertyId}`,
                dateRanges: [
                    {
                        startDate: `${daysAgo}daysAgo`,
                        endDate: 'today',
                    },
                ],
                dimensions: [
                    { name: 'pagePath' },
                ],
                metrics: [
                    { name: 'screenPageViews' },
                    { name: 'averageSessionDuration' }, // Approximation for time on page
                    { name: 'totalUsers' },
                    { name: 'engagementRate' },
                ],
                dimensionFilter: {
                    filter: {
                        fieldName: 'pagePath',
                        stringFilter: {
                            matchType: 'CONTAINS',
                            value: articleSlug,
                        },
                    },
                },
            });

            if (response.rows && response.rows.length > 0) {
                const row = response.rows[0];
                return {
                    views: parseInt(row.metricValues?.[0]?.value || '0'),
                    avgTimeOnPage: parseFloat(row.metricValues?.[1]?.value || '0'),
                    users: parseInt(row.metricValues?.[2]?.value || '0'),
                    engagementRate: parseFloat(row.metricValues?.[3]?.value || '0'),
                };
            }

            return null;
        } catch (error) {
            console.error(`[GA SERVICE] Error fetching metrics for ${articleSlug}:`, error);
            return null;
        }
    }

    /**
     * Batch sync metrics for all recent articles
     */
    async batchSyncArticleMetrics(daysAgo: number = 7): Promise<{ updated: number, errors: number }> {
        if (!this.propertyId) {
            console.warn('[GA SERVICE] Skipping batch sync: No property ID');
            return { updated: 0, errors: 0 };
        }

        console.log(`[GA SERVICE] Starting batch sync for last ${daysAgo} days...`);

        // 1. Get top pages from GA directly (more efficient than querying per article)
        try {
            const [response] = await this.client.runReport({
                property: `properties/${this.propertyId}`,
                dateRanges: [
                    {
                        startDate: `${daysAgo}daysAgo`,
                        endDate: 'today',
                    },
                ],
                dimensions: [
                    { name: 'pagePath' },
                    { name: 'date' }, // YYYYMMDD
                ],
                metrics: [
                    { name: 'screenPageViews' },
                    { name: 'averageSessionDuration' },
                    { name: 'bounceRate' },
                ],
                limit: 5000,
            });

            if (!response.rows) {
                console.log('[GA SERVICE] No data returned from Google Analytics');
                return { updated: 0, errors: 0 };
            }

            console.log(`[GA SERVICE] Fetched ${response.rows.length} rows from GA`);

            let updatedCount = 0;
            let errorCount = 0;

            // 2. Map GA paths to Articles
            for (const row of response.rows) {
                const pagePath = (row.dimensionValues?.[0]?.value || '').split('?')[0].split('#')[0];
                const dateStr = row.dimensionValues?.[1]?.value || ''; // YYYYMMDD

                if (!pagePath || !dateStr) continue;

                // Extract slug from path (e.g., "/news/crime/some-slug" -> "some-slug")
                const parts = pagePath.split('/').filter(p => p);
                if (parts.length < 2) continue; // Skip home page or category pages

                const slug = parts[parts.length - 1];

                const metricDateStr = dateStr.substring(0, 4) + '-' + dateStr.substring(4, 6) + '-' + dateStr.substring(6, 8);

                // Find article by slug
                const article = await db.query.articles.findFirst({
                    where: eq(articles.slug, slug),
                    columns: { id: true, title: true }
                });

                if (article) {
                    try {
                        const views = parseInt(row.metricValues?.[0]?.value || '0');
                        const avgTime = parseFloat(row.metricValues?.[1]?.value || '0');
                        const bounceRate = parseFloat(row.metricValues?.[2]?.value || '0');

                        console.log(`[GA SERVICE] Updating metrics for "${article.title}" on ${dateStr}: ${views} views`);

                        await db
                            .insert(articleMetrics)
                            .values({
                                articleId: article.id,
                                source: 'google_analytics',
                                metricDate: metricDateStr,
                                gaViews: views,
                                gaAvgTimeOnPage: avgTime,
                                gaBounceRate: bounceRate,
                                syncedAt: new Date(),
                            })
                            .onConflictDoUpdate({
                                target: [articleMetrics.articleId, articleMetrics.source, articleMetrics.metricDate],
                                set: {
                                    gaViews: views,
                                    gaAvgTimeOnPage: avgTime,
                                    gaBounceRate: bounceRate,
                                    syncedAt: new Date(),
                                }
                            });

                        updatedCount++;
                    } catch (err) {
                        console.error(`[GA SERVICE] Error updating article ${slug}:`, err);
                        errorCount++;
                    }
                }
            }

            return { updated: updatedCount, errors: errorCount };

        } catch (error) {
            console.error('[GA SERVICE] Batch sync failed:', error);
            return { updated: 0, errors: 1 };
        }
    }
}

export const googleAnalyticsService = new GoogleAnalyticsService();
