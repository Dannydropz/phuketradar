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
    originalThaiTitle?: string | null;
    originalThaiContentSnippet?: string | null;
    adjustedBy: string;
    adjustedAt: Date;
}

export interface ScoreLearningInsight {
    category: string;
    avgAdjustment: number; // Positive = AI scores too low, Negative = AI scores too high
    totalAdjustments: number;
    commonPatterns: string[];
    biasDirection: 'overscoring' | 'underscoring' | 'balanced';
}

export interface CategoryBias {
    category: string;
    avgBias: number; // Negative = AI over-scores, Positive = AI under-scores
    sampleSize: number;
    recommendation: string;
}

/**
 * Extract important Thai keywords from text for learning purposes
 */
function extractThaiKeywords(text: string): string[] {
    if (!text) return [];

    // Common Thai news keywords that affect scoring
    const importantPatterns = [
        // High-interest indicators
        /ไฟไหม้|จมน้ำ|เสียชีวิต|อุบัติเหตุ|ชน|จับกุม|ตำรวจ|กู้ภัย|โจร|ปล้น|ฆ่า/g,
        // Feel-good indicators  
        /เต่าทะเล|ช่วยเหลือ|กู้ชีพ|วางไข่|อนุรักษ์|สัตว์ป่า|ช้าง|โลมา|ฉลามวาฬ/g,
        // Low-interest indicators
        /ประชุม|มอบหมาย|สัมมนา|แถลงข่าว|โครงการ|ตรวจเยี่ยม|พิธี|เปิดตัว/g,
        // Foreigner/tourist indicators (high interest for expat audience)
        /ฝรั่ง|นักท่องเที่ยว|ต่างชาติ|ชาวต่างประเทศ|ชาวรัสเซีย|ชาวจีน|ชาวอเมริกัน/g,
        // Politics indicators (capped at 3)
        /เลือกตั้ง|ส\.ส\.|นักการเมือง|พรรค|รัฐบาล|รัฐมนตรี/g,
        // Location indicators
        /ภูเก็ต|ป่าตอง|กะตะ|กะรน|ราไวย์|ฉลอง|ถลาง/g,
    ];

    const keywords: string[] = [];
    for (const pattern of importantPatterns) {
        const matches = text.match(pattern);
        if (matches) {
            keywords.push(...matches);
        }
    }

    // Remove duplicates and limit to 10 keywords
    return Array.from(new Set(keywords)).slice(0, 10);
}

export class ScoreLearningService {
    /**
     * Record a manual score adjustment by an admin with rich context
     */
    async recordAdjustment(params: {
        articleId: string;
        originalScore: number;
        adjustedScore: number;
        adjustmentReason?: string;
    }): Promise<ScoreAdjustment | null> {
        try {
            // Get article details including original Thai content
            const article = await db.query.articles.findFirst({
                where: eq(articles.id, params.articleId),
            });

            if (!article) {
                console.error(`Article ${params.articleId} not found for score adjustment`);
                return null;
            }

            // Extract Thai keywords from ORIGINAL Thai content for pattern learning
            const originalThaiText = `${article.originalTitle || ''} ${article.originalContent || ''}`;
            const thaiKeywords = extractThaiKeywords(originalThaiText);

            // Also check translated content for English keywords
            const englishText = `${article.title} ${article.content || ''}`;
            const englishKeywordPatterns = [
                /accident|crash|fire|drown|arrest|crime|rescue|tourist|foreigner|expat/gi,
                /turtle|dolphin|whale|elephant|conservation|wildlife/gi,
                /meeting|ceremony|project|development|investment|launch/gi,
            ];

            for (const pattern of englishKeywordPatterns) {
                const matches = englishText.match(pattern);
                if (matches) {
                    thaiKeywords.push(...matches.map(m => m.toLowerCase()));
                }
            }

            // Determine adjustment direction for logging
            const direction = params.adjustedScore < params.originalScore ? 'down' :
                params.adjustedScore > params.originalScore ? 'up' : 'unchanged';

            const adjustmentContext = direction === 'down'
                ? `AI over-scored: ${params.originalScore} → ${params.adjustedScore}. Story was less interesting than AI thought.`
                : direction === 'up'
                    ? `AI under-scored: ${params.originalScore} → ${params.adjustedScore}. Story was more interesting than AI thought.`
                    : 'No change';

            const [adjustment] = await db
                .insert(scoreAdjustments)
                .values({
                    articleId: params.articleId,
                    originalScore: params.originalScore,
                    adjustedScore: params.adjustedScore,
                    adjustmentReason: params.adjustmentReason || adjustmentContext,
                    articleTitle: article.title,
                    articleCategory: article.category,
                    articleContentSnippet: article.content?.substring(0, 500),
                    thaiKeywords: Array.from(new Set(thaiKeywords)).slice(0, 15) || null,
                    adjustedBy: "admin",
                })
                .returning();

            console.log(
                `📊 [SCORE LEARNING] Recorded adjustment: "${article.title.substring(0, 60)}..." | ${params.originalScore} → ${params.adjustedScore} (${params.adjustedScore - params.originalScore > 0 ? "+" : ""}${params.adjustedScore - params.originalScore})`
            );

            if (thaiKeywords.length > 0) {
                console.log(`   🔑 Keywords captured: ${thaiKeywords.slice(0, 5).join(', ')}${thaiKeywords.length > 5 ? '...' : ''}`);
            }

            return adjustment;
        } catch (error) {
            console.error("Error recording score adjustment:", error);
            return null;
        }
    }

    /**
     * Get category-specific bias data for prompt injection
     * This tells the model HOW it's been wrong for each category
     */
    async getCategoryBiases(): Promise<CategoryBias[]> {
        try {
            const adjustments = await db.query.scoreAdjustments.findMany({
                orderBy: [desc(scoreAdjustments.adjustedAt)],
                limit: 200, // Use more data for better patterns
            });

            if (adjustments.length === 0) {
                return [];
            }

            // Group by category and calculate bias
            const categoryMap = new Map<string, {
                totalBias: number;
                count: number;
                examples: { title: string; from: number; to: number }[];
            }>();

            for (const adj of adjustments) {
                const bias = adj.originalScore - adj.adjustedScore; // Positive = AI over-scored
                const existing = categoryMap.get(adj.articleCategory) || {
                    totalBias: 0,
                    count: 0,
                    examples: [],
                };

                existing.totalBias += bias;
                existing.count += 1;
                if (existing.examples.length < 3) {
                    existing.examples.push({
                        title: adj.articleTitle.substring(0, 50),
                        from: adj.originalScore,
                        to: adj.adjustedScore,
                    });
                }

                categoryMap.set(adj.articleCategory, existing);
            }

            // Convert to bias reports with recommendations
            const biases: CategoryBias[] = [];
            for (const [category, data] of Array.from(categoryMap.entries())) {
                const avgBias = data.totalBias / data.count;

                let recommendation = '';
                if (avgBias > 0.5) {
                    recommendation = `REDUCE scores for "${category}" stories by ~${Math.round(avgBias)} point(s). You consistently over-score this category.`;
                } else if (avgBias < -0.5) {
                    recommendation = `INCREASE scores for "${category}" stories by ~${Math.round(Math.abs(avgBias))} point(s). You consistently under-score this category.`;
                } else {
                    recommendation = `Your "${category}" scoring is well-calibrated.`;
                }

                biases.push({
                    category,
                    avgBias,
                    sampleSize: data.count,
                    recommendation,
                });
            }

            return biases.sort((a, b) => Math.abs(b.avgBias) - Math.abs(a.avgBias));
        } catch (error) {
            console.error("Error getting category biases:", error);
            return [];
        }
    }

    /**
     * Generate a rich learning context string for injection into GPT prompts
     * This is the main method used by translator.ts
     */
    async generateLearningContext(articleCategory?: string): Promise<string> {
        try {
            // Get category biases first
            const biases = await this.getCategoryBiases();

            // Get recent adjustments, prioritizing same-category examples
            let adjustments = await db.query.scoreAdjustments.findMany({
                orderBy: [desc(scoreAdjustments.adjustedAt)],
                limit: 30,
            });

            if (adjustments.length === 0) {
                return ''; // No learning data yet
            }

            // If we know the category, prioritize same-category examples
            if (articleCategory) {
                const sameCategoryAdj = adjustments.filter(a => a.articleCategory === articleCategory);
                const otherAdj = adjustments.filter(a => a.articleCategory !== articleCategory);
                adjustments = [...sameCategoryAdj.slice(0, 5), ...otherAdj.slice(0, 10)];
            } else {
                adjustments = adjustments.slice(0, 15);
            }

            // Build the learning context
            let context = `
🧠 SELF-LEARNING SCORING CALIBRATION (CRITICAL - READ AND APPLY):
The admin has corrected AI scoring mistakes. Learn from these patterns to avoid repeating errors:

`;

            // Add category-specific bias warnings
            const significantBiases = biases.filter(b => Math.abs(b.avgBias) > 0.3);
            if (significantBiases.length > 0) {
                context += `📊 CATEGORY BIAS CORRECTIONS:\n`;
                for (const bias of significantBiases.slice(0, 5)) {
                    if (bias.avgBias > 0) {
                        context += `⚠️  ${bias.category.toUpperCase()}: You OVER-SCORE by ~${bias.avgBias.toFixed(1)} points on average. REDUCE scores for this category.\n`;
                    } else {
                        context += `⚠️  ${bias.category.toUpperCase()}: You UNDER-SCORE by ~${Math.abs(bias.avgBias).toFixed(1)} points on average. INCREASE scores for this category.\n`;
                    }
                }
                context += `\n`;
            }

            // Add specific examples
            context += `📝 SPECIFIC CORRECTION EXAMPLES (DO NOT REPEAT THESE MISTAKES):\n`;

            // Group adjustments by direction
            const overscored = adjustments.filter(a => a.adjustedScore < a.originalScore);
            const underscored = adjustments.filter(a => a.adjustedScore > a.originalScore);

            if (overscored.length > 0) {
                context += `\n🔴 STORIES YOU OVER-SCORED (score too high):\n`;
                for (const adj of overscored.slice(0, 5)) {
                    const keywords = adj.thaiKeywords?.slice(0, 3).join(', ') || 'N/A';
                    context += `- "${adj.articleTitle.substring(0, 60)}..." [${adj.articleCategory}]\n`;
                    context += `  AI gave: ${adj.originalScore} → Admin corrected to: ${adj.adjustedScore}\n`;
                    context += `  Keywords: ${keywords}\n`;
                }
            }

            if (underscored.length > 0) {
                context += `\n🟢 STORIES YOU UNDER-SCORED (score too low):\n`;
                for (const adj of underscored.slice(0, 5)) {
                    const keywords = adj.thaiKeywords?.slice(0, 3).join(', ') || 'N/A';
                    context += `- "${adj.articleTitle.substring(0, 60)}..." [${adj.articleCategory}]\n`;
                    context += `  AI gave: ${adj.originalScore} → Admin corrected to: ${adj.adjustedScore}\n`;
                    context += `  Keywords: ${keywords}\n`;
                }
            }

            // Add overall statistics
            const stats = await this.getStatistics();
            if (stats.totalAdjustments > 0) {
                context += `\n📈 OVERALL PATTERN: Out of ${stats.totalAdjustments} corrections, you over-scored ${stats.overscored} times (${Math.round(stats.overscored / stats.totalAdjustments * 100)}%) and under-scored ${stats.underscored} times (${Math.round(stats.underscored / stats.totalAdjustments * 100)}%).\n`;

                if (stats.overscored > stats.underscored * 1.5) {
                    context += `⚠️  TENDENCY: You tend to OVER-SCORE stories. Be more conservative with your interest scores.\n`;
                } else if (stats.underscored > stats.overscored * 1.5) {
                    context += `⚠️  TENDENCY: You tend to UNDER-SCORE stories. Don't be afraid to give higher scores to genuinely interesting content.\n`;
                }
            }

            console.log(`   🧠 Generated rich learning context with ${adjustments.length} examples and ${significantBiases.length} bias warnings`);

            return context;
        } catch (error) {
            console.error("Error generating learning context:", error);
            return '';
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
            for (const [category, data] of Array.from(categoryMap.entries())) {
                const avgAdj = data.totalAdjustment / data.count;
                insights.push({
                    category,
                    avgAdjustment: avgAdj,
                    totalAdjustments: data.count,
                    commonPatterns: data.titles.slice(0, 5), // Top 5 examples
                    biasDirection: avgAdj < -0.3 ? 'overscoring' : avgAdj > 0.3 ? 'underscoring' : 'balanced',
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
                where: category === "all" ? undefined : eq(scoreAdjustments.articleCategory, category),
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

            if (adjustments.length === 0) {
                return {
                    totalAdjustments: 0,
                    avgScoreChange: 0,
                    overscored: 0,
                    underscored: 0,
                };
            }

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
