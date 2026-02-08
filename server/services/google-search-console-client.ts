import { google } from 'googleapis';
import { db } from "../db";
import { articles, articleMetrics } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export class GoogleSearchConsoleService {
    private auth;
    private siteUrl: string;

    constructor() {
        if (!process.env.GA_CLIENT_EMAIL || !process.env.GA_PRIVATE_KEY || !process.env.GSC_SITE_URL) {
            console.warn('[GSC SERVICE] Missing Google Search Console credentials. Sync will not work.');
        }

        this.auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GA_CLIENT_EMAIL,
                private_key: process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
        });

        this.siteUrl = process.env.GSC_SITE_URL || 'https://phuketradar.com/'; // Ensure trailing slash usually
    }

    /**
     * Batch sync search performance metrics
     */
    async batchSyncSearchMetrics(daysAgo: number = 3): Promise<{ updated: number, errors: number }> {
        if (!this.siteUrl) {
            console.warn('[GSC SERVICE] Skipping sync: No site URL');
            return { updated: 0, errors: 0 };
        }

        console.log(`[GSC SERVICE] Starting batch sync for last ${daysAgo} days...`);

        try {
            const searchConsole = google.searchconsole({ version: 'v1', auth: this.auth });

            // Calculate start date (YYYY-MM-DD)
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysAgo);
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = new Date().toISOString().split('T')[0];

            const response = await searchConsole.searchanalytics.query({
                siteUrl: this.siteUrl,
                requestBody: {
                    startDate: startDateStr,
                    endDate: endDateStr,
                    dimensions: ['page', 'date'],
                    rowLimit: 5000,
                },
            });

            const rows = response.data.rows;

            if (!rows || rows.length === 0) {
                console.log('[GSC SERVICE] No data returned from Google Search Console');
                return { updated: 0, errors: 0 };
            }

            console.log(`[GSC SERVICE] Fetched ${rows.length} rows from GSC`);

            let updatedCount = 0;
            let errorCount = 0;

            for (const row of rows) {
                const pageUrl = (row.keys?.[0] || '').split('?')[0].split('#')[0];
                const dateStr = row.keys?.[1] || ''; // YYYY-MM-DD

                if (!pageUrl || !dateStr) continue;

                // Extract slug from full URL
                const parts = pageUrl.split('/').filter(p => p);
                const slug = parts[parts.length - 1];

                if (!slug) continue;

                // Find article by slug
                const article = await db.query.articles.findFirst({
                    where: eq(articles.slug, slug),
                    columns: { id: true, title: true }
                });

                if (article) {
                    try {
                        const clicks = row.clicks || 0;
                        const impressions = row.impressions || 0;
                        const ctr = row.ctr || 0;
                        const position = row.position || 0;

                        console.log(`[GSC SERVICE] Updating metrics for "${article.title}" on ${dateStr}: ${clicks} clicks`);

                        await db
                            .insert(articleMetrics)
                            .values({
                                articleId: article.id,
                                source: 'google_search_console',
                                metricDate: dateStr,
                                scClicks: clicks,
                                scImpressions: impressions,
                                scCtr: ctr,
                                scAvgPosition: position,
                                syncedAt: new Date(),
                            })
                            .onConflictDoUpdate({
                                target: [articleMetrics.articleId, articleMetrics.source, articleMetrics.metricDate],
                                set: {
                                    scClicks: clicks,
                                    scImpressions: impressions,
                                    scCtr: ctr,
                                    scAvgPosition: position,
                                    syncedAt: new Date(),
                                }
                            });

                        updatedCount++;
                    } catch (err) {
                        console.error(`[GSC SERVICE] Error updating article ${slug}:`, err);
                        errorCount++;
                    }
                }
            }

            return { updated: updatedCount, errors: errorCount };

        } catch (error) {
            console.error('[GSC SERVICE] Batch sync failed:', error);
            return { updated: 0, errors: 1 };
        }
    }
}

export const googleSearchConsoleService = new GoogleSearchConsoleService();
