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
   * Layer 1: Find articles with similar embeddings
   */
  private async findByEmbedding(embedding?: number[]): Promise<Article[]> {
    if (!embedding || embedding.length === 0) {
      console.log('[DUPLICATE DETECTION] No embedding provided, skipping embedding search');
      return [];
    }
    
    try {
      // Find articles from the last 24 hours with similar embeddings
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Use cosine similarity with a lower threshold (0.4 instead of 0.5)
      // to catch more potential matches for GPT verification
      const embeddingStr = `[${embedding.join(',')}]`;
      const similarArticles = await db.execute(sql`
        SELECT *,
          1 - (embedding <=> ${embeddingStr}::vector) AS similarity
        FROM articles
        WHERE embedding IS NOT NULL
          AND published_at >= ${twentyFourHoursAgo}
          AND merged_into_id IS NULL
          AND 1 - (embedding <=> ${embeddingStr}::vector) >= 0.4
        ORDER BY similarity DESC
        LIMIT 10
      `);
      
      return similarArticles.rows as Article[];
    } catch (error) {
      console.error('[DUPLICATE DETECTION] Error in embedding search:', error);
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
          model: 'gpt-4o-mini',
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
