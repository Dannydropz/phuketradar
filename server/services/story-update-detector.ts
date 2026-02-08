/**
 * Story Update Detector
 * 
 * Detects when a new article is an UPDATE to a previously published story.
 * Unlike duplicate detection (same story from different sources), this identifies
 * story PROGRESSIONS like:
 * - "Man missing" → "Body found"
 * - "Accident reported" → "Victim dies in hospital"
 * - "Search underway" → "Rescue successful"
 * 
 * When an update is detected, the system:
 * 1. Links the new story to the original via relatedStoryId
 * 2. Adds "UPDATE:" context to the article body with link to original
 * 3. Optionally creates/adds to a timeline for developing stories
 */

import OpenAI from 'openai';
import { Article, InsertArticle } from '@shared/schema';
import { IStorage } from '../storage';
import { cosineSimilarity } from '../lib/semantic-similarity';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Event progression patterns - first stage can lead to second stage
 */
const EVENT_PROGRESSIONS = [
    // Missing person stories
    { from: ['missing', 'disappear', 'search', 'searching', 'seek', 'looking'], to: ['found', 'body', 'drowns', 'drowned', 'dead', 'dies', 'recovered', 'rescue'] },
    // Accident stories
    { from: ['accident', 'crash', 'collision', 'injured', 'hospitalized', 'critical'], to: ['dies', 'dead', 'death', 'fatal', 'killed', 'passes away', 'succumbs'] },
    // Fire stories
    { from: ['fire', 'blaze', 'burning', 'flames'], to: ['extinguished', 'contained', 'damage', 'destroyed', 'deaths', 'casualties'] },
    // Arrest/Investigation stories
    { from: ['suspect', 'investigation', 'manhunt', 'search'], to: ['arrested', 'caught', 'apprehended', 'charged', 'sentenced'] },
    // Rescue stories
    { from: ['stranded', 'trapped', 'stuck', 'rescue underway'], to: ['rescued', 'saved', 'recovered', 'freed'] },
    // Storm/Weather stories
    { from: ['approaching', 'warning', 'expected', 'forecast'], to: ['hits', 'struck', 'damage', 'aftermath', 'recovery'] },
];

interface UpdateDetectionResult {
    isUpdate: boolean;
    originalStory?: Article;
    confidence: number;
    progressionType?: string;
    reasoning?: string;
}

interface UpdateLinkResult {
    success: boolean;
    linkedStoryId?: string;
    modifiedContent?: string;
    timelineCreated?: boolean;
    seriesId?: string;
}

export class StoryUpdateDetectorService {

    /**
     * Check if a new article is an update to an existing story
     * Uses multi-stage detection:
     * 1. Find candidate stories from last 48 hours with similar embeddings
     * 2. Check for event progression patterns
     * 3. Use GPT to verify the relationship
     */
    async detectStoryUpdate(
        newArticle: InsertArticle,
        storage: IStorage
    ): Promise<UpdateDetectionResult> {
        console.log(`\n🔄 [STORY UPDATE DETECTOR] Checking for story updates...`);
        console.log(`   Title: "${newArticle.title?.substring(0, 60)}..."`);

        // Skip if no embedding
        if (!newArticle.embedding) {
            console.log(`   ⚠️ No embedding available - skipping update detection`);
            return { isUpdate: false, confidence: 0 };
        }

        // Step 1: Get recent articles (last 48 hours) with embeddings
        const recentArticles = await storage.getRecentArticlesWithEmbeddings(2); // 2 days
        console.log(`   📰 Found ${recentArticles.length} recent articles to check`);

        if (recentArticles.length === 0) {
            return { isUpdate: false, confidence: 0 };
        }

        // Step 2: Find candidates with moderate similarity (35-85%)
        // We use a lower threshold than duplicate detection because updates tell a different story
        const candidates: Array<{ article: any; similarity: number }> = [];

        const embedding = newArticle.embedding as number[];

        for (const existing of recentArticles) {
            if (!existing.embedding) continue;

            const similarity = cosineSimilarity(embedding, existing.embedding);

            // Updates typically have 35-85% similarity (same event, different angle)
            // Duplicates have >85% similarity (same story, same angle)
            if (similarity >= 0.35 && similarity < 0.85) {
                candidates.push({ article: existing, similarity });
            }
        }

        if (candidates.length === 0) {
            console.log(`   ❌ No candidate stories found in 35-85% similarity range`);
            return { isUpdate: false, confidence: 0 };
        }

        // Sort by similarity descending
        candidates.sort((a, b) => b.similarity - a.similarity);
        console.log(`   🔍 Found ${candidates.length} candidate stories for update check`);

        // Step 3: Check for event progression patterns
        const newTitleLower = (newArticle.title || '').toLowerCase();
        const newContentLower = (newArticle.content || '').toLowerCase();
        const newText = newTitleLower + ' ' + newContentLower;

        for (const { article: candidate, similarity } of candidates.slice(0, 5)) {
            const existingTitleLower = candidate.title.toLowerCase();
            const existingContentLower = (candidate.content || '').toLowerCase();
            const existingText = existingTitleLower + ' ' + existingContentLower;

            // Check for event progression
            for (const progression of EVENT_PROGRESSIONS) {
                const existingHasFromKeyword = progression.from.some(kw => existingText.includes(kw));
                const newHasToKeyword = progression.to.some(kw => newText.includes(kw));

                if (existingHasFromKeyword && newHasToKeyword) {
                    console.log(`   ⚡ Event progression detected: "${progression.from.find(kw => existingText.includes(kw))}" → "${progression.to.find(kw => newText.includes(kw))}"`);

                    // Step 4: Use GPT to verify this is actually the same event
                    const gptResult = await this.verifyUpdateWithGPT(newArticle, candidate, similarity);

                    if (gptResult.isUpdate) {
                        // Fetch full article details
                        const fullArticle = await storage.getArticleById(candidate.id);
                        return {
                            isUpdate: true,
                            originalStory: fullArticle || undefined,
                            confidence: gptResult.confidence,
                            progressionType: `${progression.from[0]} → ${progression.to[0]}`,
                            reasoning: gptResult.reasoning,
                        };
                    }
                }
            }

            // Also check with GPT even without explicit progression pattern
            // (Some updates don't follow clear patterns)
            if (similarity >= 0.50) {
                console.log(`   🧠 High similarity (${(similarity * 100).toFixed(1)}%) - checking with GPT...`);
                const gptResult = await this.verifyUpdateWithGPT(newArticle, candidate, similarity);

                if (gptResult.isUpdate) {
                    const fullArticle = await storage.getArticleById(candidate.id);
                    return {
                        isUpdate: true,
                        originalStory: fullArticle || undefined,
                        confidence: gptResult.confidence,
                        reasoning: gptResult.reasoning,
                    };
                }
            }
        }

        console.log(`   ✅ No story update detected - this is a new story`);
        return { isUpdate: false, confidence: 0 };
    }

    /**
     * Use GPT-4 to verify if the new article is an update to the existing story
     */
    private async verifyUpdateWithGPT(
        newArticle: InsertArticle,
        existingArticle: any,
        similarity: number
    ): Promise<{ isUpdate: boolean; confidence: number; reasoning: string }> {
        try {
            const systemPrompt = `You are a news editor determining if a NEW article is an UPDATE or FOLLOW-UP to an EXISTING article.

They are an UPDATE/FOLLOW-UP if:
- They describe the SAME specific incident/event (same person, same location, same situation)
- The new article provides NEW INFORMATION (outcome, developments, additional details)
- The new article is a PROGRESSION (e.g., "search" → "body found"; "accident" → "victim dies")
- The time between them makes sense for a developing story (hours to days)

They are NOT an update if:
- They are about DIFFERENT incidents (different people, different times)
- They are DUPLICATES (same story, no new information)
- They are about similar but SEPARATE events

CRITICAL: Pay attention to:
- Person descriptions (age, nationality, gender) - must match for it to be an update
- Specific locations - must be same general area
- Time references - new story should be later in timeline

Return JSON:
{
  "isUpdate": true/false,
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "personMatch": true/false,
  "locationMatch": true/false,
  "eventProgression": "description of how the story progressed, if applicable"
}`;

            const userPrompt = `EXISTING ARTICLE (published earlier):
Title: "${existingArticle.title}"
Content: ${(existingArticle.content || '').substring(0, 1000)}

NEW ARTICLE (just received):
Title: "${newArticle.title}"  
Content: ${(newArticle.content || '').substring(0, 1000)}

Embedding Similarity: ${(similarity * 100).toFixed(1)}%

Is the NEW article an update/follow-up to the EXISTING article?`;

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1,
            });

            const result = JSON.parse(response.choices[0].message.content || '{}');

            console.log(`   🧠 GPT Update Check Result:`);
            console.log(`      Is Update: ${result.isUpdate}`);
            console.log(`      Confidence: ${result.confidence}%`);
            console.log(`      Reasoning: ${result.reasoning}`);
            if (result.eventProgression) {
                console.log(`      Event Progression: ${result.eventProgression}`);
            }

            return {
                isUpdate: result.isUpdate === true && result.confidence >= 70,
                confidence: result.confidence || 0,
                reasoning: result.reasoning || 'No reasoning provided',
            };
        } catch (error) {
            console.error(`   ❌ GPT verification failed:`, error);
            return { isUpdate: false, confidence: 0, reasoning: 'GPT verification failed' };
        }
    }

    /**
     * Link a new article as an update to an existing story
     * Modifies the new article content to include reference to original
     * Optionally creates or updates a timeline
     */
    async linkAsUpdate(
        newArticle: InsertArticle,
        originalStory: Article,
        storage: IStorage,
        progressionType?: string
    ): Promise<UpdateLinkResult> {
        console.log(`\n🔗 [STORY UPDATE] Linking as update to: "${originalStory.title.substring(0, 50)}..."`);

        try {
            // Build the article URL for internal linking
            const { buildArticleUrl } = await import('../../shared/category-map');
            const originalUrl = buildArticleUrl({
                category: originalStory.category,
                slug: originalStory.slug || '',
                id: originalStory.id
            });

            // Generate update notice for the article body
            const updateNotice = this.generateUpdateNotice(originalStory, originalUrl, progressionType);

            // Prepend update notice to content
            const modifiedContent = updateNotice + '\n\n' + (newArticle.content || '');

            // Check if original story is already part of a timeline
            let seriesId = originalStory.seriesId;
            let timelineCreated = false;

            // If no timeline exists, create one
            if (!seriesId) {
                console.log(`   📅 Creating timeline for developing story...`);
                const { getTimelineService } = await import('./timeline-service');
                const timelineService = getTimelineService(storage);

                // Generate a series title based on the event
                const seriesTitle = this.generateSeriesTitle(originalStory, newArticle);

                const result = await timelineService.createStoryTimeline({
                    parentArticleId: originalStory.id,
                    seriesTitle,
                });

                seriesId = result.seriesId;
                timelineCreated = true;
                console.log(`   ✅ Created timeline: "${seriesTitle}" (${seriesId})`);
            }

            return {
                success: true,
                linkedStoryId: originalStory.id,
                modifiedContent,
                timelineCreated,
                seriesId,
            };
        } catch (error) {
            console.error(`   ❌ Failed to link as update:`, error);
            return { success: false };
        }
    }

    /**
     * Generate the update notice HTML to prepend to article content
     */
    private generateUpdateNotice(
        originalStory: Article,
        originalUrl: string,
        progressionType?: string
    ): string {
        const timeAgo = this.getTimeAgo(originalStory.publishedAt);

        return `<div class="story-update-notice" style="background: linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%); border-left: 4px solid #3b82f6; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
<p style="margin: 0 0 8px 0; font-size: 0.875rem; color: #60a5fa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">📰 Update to Developing Story</p>
<p style="margin: 0; color: #e2e8f0; font-size: 0.95rem;">This article is an update to <a href="${originalUrl}" style="color: #60a5fa; text-decoration: underline; font-weight: 500;">${originalStory.title}</a>, published ${timeAgo}.</p>
</div>`;
    }

    /**
     * Generate a timeline series title from the stories
     * Creates descriptive titles that include key identifying information
     */
    private generateSeriesTitle(originalStory: Article, updateStory: InsertArticle): string {
        const originalTitle = originalStory.title;
        const combinedTitle = originalTitle + ' ' + (updateStory.title || '');
        const combinedLower = combinedTitle.toLowerCase();

        // Look for location patterns - expanded list
        const locationPatterns = [
            /at\s+([^,]+(?:Beach|Road|Pier|Bay|Island|Hospital|Hotel|Airport))/i,
            /in\s+(Patong|Chalong|Karon|Kata|Rawai|Kamala|Phuket Town|Bang Tao|Thalang|Wichit|Kathu|Rassada|Saphan Hin|Phuket City)/i,
            /near\s+([^,]+)/i,
        ];

        let location = '';
        for (const pattern of locationPatterns) {
            const match = combinedTitle.match(pattern);
            if (match) {
                location = match[1].trim();
                break;
            }
        }

        // Extract victim/subject info patterns (nationality, age, etc.)
        const victimPatterns = [
            // "Iraqi National Ameer Mundher..." -> "Iraqi National"
            /(\w+)\s+(?:National|Citizen|Tourist|Man|Woman|Expat)/i,
            // "24-year-old Iraqi" -> "Iraqi"
            /(\d+)[\s-]*year[\s-]*old\s+(\w+)/i,
            // "Russian tourist" -> "Russian Tourist"
            /(Russian|Chinese|British|American|German|French|Thai|Burmese|Myanmar|Iraqi|Iranian|Indian|Australian|Swedish|Norwegian|Finnish|Danish|Korean|Japanese)\s+(tourist|national|citizen|man|woman|expat)/i,
        ];

        let victimInfo = '';
        for (const pattern of victimPatterns) {
            const match = combinedTitle.match(pattern);
            if (match) {
                if (pattern.source.includes('year')) {
                    // Pattern like "24-year-old Iraqi"
                    victimInfo = `${match[2]} National`;
                } else if (match[2]) {
                    // Pattern like "Russian tourist"
                    victimInfo = `${match[1]} ${match[2].charAt(0).toUpperCase() + match[2].slice(1)}`;
                } else {
                    victimInfo = match[1] + ' National';
                }
                break;
            }
        }

        // Look for event type - expanded with more patterns
        const eventPatterns = [
            { pattern: /shoot|shot|gunshot|gun|firearm/i, event: 'Shooting Incident', prefix: 'Phuket' },
            { pattern: /stab|stabbing|stabbed|knife/i, event: 'Stabbing Incident', prefix: 'Phuket' },
            { pattern: /murder|murdered|homicide|killed|killing/i, event: 'Fatal Incident', prefix: 'Phuket' },
            { pattern: /assault|attack|beaten|violence/i, event: 'Assault Case', prefix: 'Phuket' },
            { pattern: /drown|drowning|drowned|missing.*sea|missing.*water/i, event: 'Drowning Incident', prefix: 'Phuket' },
            { pattern: /fire|blaze|burn|inferno/i, event: 'Fire Incident', prefix: '' },
            { pattern: /crash|accident|collision|vehicle|motorcycle|car/i, event: 'Traffic Accident', prefix: '' },
            { pattern: /arrest|apprehend|custody|charged/i, event: 'Police Investigation', prefix: '' },
            { pattern: /drug|narcotics|trafficking|smuggling/i, event: 'Drug Case', prefix: 'Phuket' },
            { pattern: /rescue|stranded|trapped|saved/i, event: 'Rescue Operation', prefix: '' },
            { pattern: /flood|flooding|flooded|storm|weather|rain/i, event: 'Weather Event', prefix: '' },
            { pattern: /explosion|bomb|blast/i, event: 'Explosion Incident', prefix: 'Phuket' },
            { pattern: /robbery|robbed|theft|stolen/i, event: 'Robbery Case', prefix: '' },
            { pattern: /scam|fraud|deceived/i, event: 'Fraud Case', prefix: '' },
        ];

        let eventType = '';
        let prefix = 'Phuket';
        for (const { pattern, event, prefix: eventPrefix } of eventPatterns) {
            if (pattern.test(combinedLower)) {
                eventType = event;
                prefix = eventPrefix || 'Phuket';
                break;
            }
        }

        // If we have a specific event type and victim info, create a detailed title
        if (eventType && victimInfo) {
            if (location) {
                return `${prefix ? prefix + ' ' : ''}${eventType}: ${victimInfo} in ${location} - Developing`;
            }
            return `${prefix ? prefix + ' ' : ''}${eventType}: ${victimInfo} - Developing`;
        }

        // If we have event type with location but no victim info
        if (eventType && location) {
            return `${prefix ? prefix + ' ' : ''}${eventType} in ${location} - Developing`;
        }

        // If we just have event type
        if (eventType) {
            return `${prefix ? prefix + ' ' : ''}${eventType} - Developing`;
        }

        // Fallback: Use a cleaned version of the original title with "- Developing" suffix
        // This preserves the most descriptive information from the original story
        const cleanedTitle = this.cleanTitleForSeries(originalTitle);
        if (cleanedTitle.length > 0) {
            return cleanedTitle + ' - Developing';
        }

        // Ultimate fallback
        if (location) {
            return `Developing Story in ${location}`;
        }
        return 'Developing Story';
    }

    /**
     * Clean a title for use as a series title
     * Removes time-specific phrases, source attributions, etc.
     */
    private cleanTitleForSeries(title: string): string {
        let cleaned = title
            // Remove time-specific phrases
            .replace(/\b(breaking|just in|update|latest|now|today|yesterday|this morning|this evening|hours ago)\b:?\s*/gi, '')
            // Remove source attributions
            .replace(/[-–]\s*(source|report|reports|says|according to)[^,]*/gi, '')
            // Remove trailing punctuation and clean up
            .replace(/\s+/g, ' ')
            .trim();

        // If the title is too long, try to extract the most meaningful part
        if (cleaned.length > 80) {
            // Try to cut at a natural break point
            const colonIndex = cleaned.indexOf(':');
            if (colonIndex > 10 && colonIndex < 60) {
                cleaned = cleaned.substring(0, colonIndex + 1) + cleaned.substring(colonIndex + 1, 80).trim();
            } else {
                cleaned = cleaned.substring(0, 77).trim() + '...';
            }
        }

        return cleaned;
    }

    /**
     * Calculate time ago string
     */
    private getTimeAgo(date: Date | string): string {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
}

// Singleton instance
let storyUpdateDetectorInstance: StoryUpdateDetectorService | null = null;

export function getStoryUpdateDetectorService(): StoryUpdateDetectorService {
    if (!storyUpdateDetectorInstance) {
        storyUpdateDetectorInstance = new StoryUpdateDetectorService();
    }
    return storyUpdateDetectorInstance;
}
