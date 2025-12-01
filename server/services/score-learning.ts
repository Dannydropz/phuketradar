import { db } from "../db";
import { scoreAdjustments, articles } from "../../shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface ScoreAdjustment {
    id: string;
    articleId: string;
    originalScore: number;
    adjustedScore: number;
    adjustmentReason?: string | null;
    articleTitle: string;
    articleCategory: string;
    articleContentSnippet?: string | null;
    thaiKeywords?: string[] | null;
    adjustedBy: string;
    adjustedAt: Date;
}

export interface ScoreLearningInsight {
    category: string;
    avgAdjustment: number; // Positive = AI scores too low, Negative = AI scores too high
    totalAdjustments: number;
    commonPatterns: string[];
}

export class ScoreLearningService {
    /**
     * Record a manual score adjustment by an admin
     */
    async recordAdjustment(params: {
        articleId: string;
        originalScore: number;
        adjustedScore: number;
        adjustmentReason?: string;
    }): Promise<ScoreAdjustment | null> {
        try {
            // Get article details
            const article = await db.query.articles.findFirst({
                where: eq(articles.id, params.articleId),
            });

            if (!article) {
                console.error(`Article ${params.articleId} not found for score adjustment`);
                return null;
            }

            // Extract Thai keywords from source content if available
            const thaiKeywords: string[] = [];
            // You could enhance this to extract actual Thai keywords from the original source

            const [adjustment] = await db
                .insert(scoreAdjustments)
                .values({
                    articleId: params.articleId,
                    originalScore: params.originalScore,
                    adjustedScore: params.adjustedScore,
                    adjustmentReason: params.adjustmentReason,
                    articleTitle: article.title,
                    articleCategory: article.category,
                    articleContentSnippet: article.content?.substring(0, 500),
                    thaiKeywords: thaiKeywords.length > 0 ? thaiKeywords : null,
                    adjustedBy: "admin",
                })
                .returning();

            console.log(
                `📊 [SCORE LEARNING] Recorded adjustment: "${article.title.substring(0, 60)}..." | ${params.originalScore} → ${params.adjustedScore} (${params.adjustedScore - params.originalScore > 0 ? "+" : ""}${params.adjustedScore - params.originalScore})`
            );

            return adjustment;
        } catch (error) {
            console.error("Error recording score adjustment:", error);
            return null;
        }
    }

    /**
     * Get learning insights from historical adjustments
     */
    async getLearningInsights(): Promise<ScoreLearningInsight[]> {
        try {
            const adjustments = await db.query.scoreAdjustments.findMany({
                orderBy: [desc(scoreAdjustments.adjustedAt)],
                limit: 100, // Last 100 adjustments
            });

            // Group by category
            const categoryMap = new Map<string, {
                totalAdjustment: number;
                count: number;
                titles: string[];
            }>();

            for (const adj of adjustments) {
                const existing = categoryMap.get(adj.articleCategory) || {
                    totalAdjustment: 0,
                    count: 0,
                    titles: [],
                };

                existing.totalAdjustment += (adj.adjustedScore - adj.originalScore);
                existing.count += 1;
                existing.titles.push(adj.articleTitle);

                categoryMap.set(adj.articleCategory, existing);
            }

            // Convert to insights
            const insights: ScoreLearningInsight[] = [];
            for (const [category, data] of categoryMap.entries()) {
                insights.push({
                    category,
                    avgAdjustment: data.totalAdjustment / data.count,
                    totalAdjustments: data.count,
                    commonPatterns: data.titles.slice(0, 5), // Top 5 examples
                });
            }

            return insights.sort((a, b) => Math.abs(b.avgAdjustment) - Math.abs(a.avgAdjustment));
        } catch (error) {
            console.error("Error getting learning insights:", error);
            return [];
        }
    }

    /**
     * Get recent adjustments for a specific category
     */
    async getAdjustmentsByCategory(category: string, limit: number = 20): Promise<ScoreAdjustment[]> {
        try {
            const adjustments = await db.query.scoreAdjustments.findMany({
                where: eq(scoreAdjustments.articleCategory, category),
                orderBy: [desc(scoreAdjustments.adjustedAt)],
                limit,
            });

            return adjustments;
        } catch (error) {
            console.error(`Error getting adjustments for category ${category}:`, error);
            return [];
        }
    }

    /**
     * Check if an article already has a recorded adjustment
     */
    async hasAdjustment(articleId: string): Promise<boolean> {
        try {
            const adjustment = await db.query.scoreAdjustments.findFirst({
                where: eq(scoreAdjustments.articleId, articleId),
            });

            return !!adjustment;
        } catch (error) {
            console.error("Error checking for existing adjustment:", error);
            return false;
        }
    }

    /**
     * Get adjustment statistics summary
     */
    async getStatistics(): Promise<{
        totalAdjustments: number;
        avgScoreChange: number;
        overscored: number; // AI scored too high
        underscored: number; // AI scored too low
    }> {
        try {
            const adjustments = await db.query.scoreAdjustments.findMany();

            const totalAdjustments = adjustments.length;
            const scoreChanges = adjustments.map(a => a.adjustedScore - a.originalScore);
            const avgScoreChange = scoreChanges.reduce((sum, change) => sum + change, 0) / totalAdjustments;
            const overscored = adjustments.filter(a => a.adjustedScore < a.originalScore).length;
            const underscored = adjustments.filter(a => a.adjustedScore > a.originalScore).length;

            return {
                totalAdjustments,
                avgScoreChange,
                overscored,
                underscored,
            };
        } catch (error) {
            console.error("Error getting adjustment statistics:", error);
            return {
                totalAdjustments: 0,
                avgScoreChange: 0,
                overscored: 0,
                underscored: 0,
            };
        }
    }
}

export const scoreLearningService = new ScoreLearningService();
