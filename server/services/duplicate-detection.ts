import OpenAI from 'openai';
import { Article } from '@shared/schema';
import { db } from '../db';
import { articles } from '@shared/schema';
import { eq, and, isNull, gte, sql } from 'drizzle-orm';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface DetectionResult {
  isDuplicate: boolean;
  confidence: number;
  matchedArticle?: Article;
  reason?: string;
}

interface Entity {
  type: 'location' | 'person' | 'organization' | 'event';
  value: string;
}

export class DuplicateDetectionService {

  /**
   * Main duplicate detection method - uses multi-layer approach
   */
  async findDuplicates(article: {
    title: string;
    content: string;
    originalTitle?: string;
    originalContent?: string;
    embedding?: number[];
    publishedAt?: Date;
  }): Promise<DetectionResult[]> {
    console.log('[DUPLICATE DETECTION] Starting multi-layer detection...');

    // Layer 1: Embedding similarity (fast)
    const embeddingMatches = await this.findByEmbedding(article.embedding);
    console.log(`[DUPLICATE DETECTION] Embedding layer found ${embeddingMatches.length} potential matches`);

    if (embeddingMatches.length === 0) {
      return [];
    }

    // Layer 2: Entity matching (filter)
    const entityMatches = await this.filterByEntities(article, embeddingMatches);
    console.log(`[DUPLICATE DETECTION] Entity layer filtered to ${entityMatches.length} candidates`);

    if (entityMatches.length === 0) {
      return [];
    }

    // Layer 3: GPT-4 verification (precise)
    const verifiedMatches = await this.verifyWithGPT4(article, entityMatches);
    console.log(`[DUPLICATE DETECTION] GPT-4 verification confirmed ${verifiedMatches.length} duplicates`);

    return verifiedMatches;
  }

  /**
   * Find related stories that might be updates (broader than duplicates)
   * Used by the enrichment coordinator to merge developing stories
   */
  async findRelatedStories(article: Article): Promise<Article[]> {
    console.log(`[RELATED STORY SEARCH] Looking for updates/related stories for: "${article.title}"`);

    // 1. Find candidates with similar embeddings (broader threshold)
    const candidates = await this.findByEmbedding(article.embedding, 0.35); // Lower threshold for related stories

    if (candidates.length === 0) return [];

    // 2. Filter by entities (must share location or event type)
    const entityMatches = await this.filterByEntities({
      title: article.title,
      content: article.content,
      originalTitle: article.originalTitle || undefined,
      originalContent: article.originalContent || undefined
    }, candidates);

    if (entityMatches.length === 0) return [];

    // 3. Use GPT-4 to check if they are related/updates
    const relatedStories: Article[] = [];

    for (const candidate of entityMatches) {
      // Skip self
      if (candidate.id === article.id) continue;

      try {
        const isRelated = await this.checkIfRelated(article, candidate);
        if (isRelated) {
          relatedStories.push(candidate);
        }
      } catch (error) {
        console.error(`[RELATED STORY SEARCH] Error checking relation:`, error);
      }
    }

    console.log(`[RELATED STORY SEARCH] Found ${relatedStories.length} related stories`);
    return relatedStories;
  }

  /**
   * Check if two articles are related (updates of each other)
   */
  private async checkIfRelated(article1: Article, article2: Article): Promise<boolean> {
    const systemPrompt = `You are a news editor determining if two articles are about the SAME evolving event.
    
    They are related if:
    - They describe the same event (e.g. "Landslide in Patong")
    - One is an update to the other
    - They cover different aspects of the same specific incident
    
    Return JSON: { "isRelated": true/false, "reason": "..." }`;

    const userPrompt = `Article 1: "${article1.title}"\n${article1.content.substring(0, 500)}\n\nArticle 2: "${article2.title}"\n${article2.content.substring(0, 500)}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.isRelated === true;
  }

  /**
   * Layer 1: Find articles with similar embeddings
   */
  private async findByEmbedding(
    embedding: number[],
    threshold: number = 0.85
  ): Promise<Article[]> {
    if (!embedding || embedding.length === 0) {
      console.log('[DUPLICATE DETECTION] No embedding provided, skipping embedding search');
      return [];
    }

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Supabase-compatible query using generate_series() instead of unnest()
      // This avoids PostgreSQL function overload ambiguity issues
      const similarArticles = await db.execute(sql`
        WITH query_embedding AS (
          SELECT ${embedding}::real[] as vec
        )
        SELECT 
          a.*,
          (
            SELECT COALESCE(SUM(a.embedding[i] * qe.vec[i]), 0)
            FROM generate_series(1, array_length(a.embedding, 1)) i, query_embedding qe
          ) AS similarity
        FROM articles a, query_embedding qe
        WHERE a.embedding IS NOT NULL
          AND a.published_at >= ${twentyFourHoursAgo}
          AND a.merged_into_id IS NULL
          AND array_length(a.embedding, 1) = ${embedding.length}
        ORDER BY similarity DESC
        LIMIT 10
      `);

      const filtered = (similarArticles.rows as any[]).filter(row => row.similarity >= threshold);
      console.log(`[DUPLICATE DETECTION] Embedding search found ${filtered.length} matches (threshold: ${threshold})`);
      return filtered as Article[];
    } catch (error) {
      // Non-fatal: If embedding search fails, log and continue without it
      console.error('[DUPLICATE DETECTION] Embedding search failed - continuing without it:', error?.message || error);
      return [];
    }
  }

  /**
   * Layer 2: Extract entities and filter by matching location/time
   */
  private async filterByEntities(
    article: { title: string; content: string; originalTitle?: string; originalContent?: string },
    candidates: Article[]
  ): Promise<Article[]> {
    try {
      // Extract entities from the new article
      const entities = await this.extractEntities(article.originalTitle || article.title, article.originalContent || article.content);

      if (entities.length === 0) {
        // If we can't extract entities, fall back to all candidates
        return candidates;
      }

      // Filter candidates that share key entities (especially locations)
      const filtered = candidates.filter(candidate => {
        const candidateText = `${candidate.originalTitle || candidate.title} ${candidate.originalContent || candidate.content}`;

        // Check if candidate contains any of the extracted locations
        const locationEntities = entities.filter(e => e.type === 'location');
        if (locationEntities.length > 0) {
          const hasMatchingLocation = locationEntities.some(entity =>
            candidateText.toLowerCase().includes(entity.value.toLowerCase())
          );
          if (hasMatchingLocation) {
            return true;
          }
        }

        // Check for event/person matches
        const eventEntities = entities.filter(e => e.type === 'event' || e.type === 'person');
        if (eventEntities.length > 0) {
          const matchCount = eventEntities.filter(entity =>
            candidateText.toLowerCase().includes(entity.value.toLowerCase())
          ).length;

          // If at least 30% of entities match, consider it
          if (matchCount / eventEntities.length >= 0.3) {
            return true;
          }
        }

        return false;
      });

      // If filtering is too aggressive and we have no matches, return top candidates
      return filtered.length > 0 ? filtered : candidates.slice(0, 5);
    } catch (error) {
      console.error('[DUPLICATE DETECTION] Error in entity filtering:', error);
      return candidates;
    }
  }

  /**
   * Extract key entities from text using GPT-4
   */
  private async extractEntities(title: string, content: string): Promise<Entity[]> {
    try {
      const text = title + "\n\n" + content.substring(0, 500);

      const systemPrompt = 'Extract key entities from this Thai news article. Return a JSON array of entities with type (location, person, organization, event) and value. Focus on specific locations (beaches, roads, districts), event types (accident, rescue, drowning), and key people/organizations.';

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: text
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"entities":[]}');
      return result.entities || [];
    } catch (error) {
      console.error('[DUPLICATE DETECTION] Error extracting entities:', error);
      return [];
    }
  }

  /**
   * Layer 3: Use GPT-4 to verify if articles are about the same incident
   */
  private async verifyWithGPT4(
    article: { title: string; content: string; originalTitle?: string; originalContent?: string },
    candidates: Article[]
  ): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    for (const candidate of candidates) {
      try {
        const systemPrompt = `You are analyzing if two news articles report on the SAME incident or event. 

Consider them the same if:
- They describe the same specific event/incident at the same location
- They may be at different stages (e.g., search to rescue to body found)
- They may have different details but share the core incident

Consider them different if:
- They are about different incidents at different locations
- They are about similar but separate events (e.g., two different drownings)

Return JSON with:
{
  "isSameIncident": true/false,
  "confidence": 0-100,
  "reason": "brief explanation"
}`;

        const article1Title = article.originalTitle || article.title;
        const article1Content = (article.originalContent || article.content).substring(0, 800);
        const article2Title = candidate.originalTitle || candidate.title;
        const article2Content = (candidate.originalContent || candidate.content).substring(0, 800);

        const userPrompt = `Article 1 (NEW):
Title: ${article1Title}
Content: ${article1Content}

Article 2 (EXISTING):
Title: ${article2Title}
Content: ${article2Content}

Are these about the same incident?`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');

        if (result.isSameIncident && result.confidence >= 70) {
          results.push({
            isDuplicate: true,
            confidence: result.confidence / 100,
            matchedArticle: candidate,
            reason: result.reason
          });
        }
      } catch (error) {
        console.error('[DUPLICATE DETECTION] Error in GPT-4 verification:', error);
      }
    }

    return results;
  }
}
