import OpenAI from 'openai';
import { Article, articles } from '@shared/schema';
import { db } from '../db';
import { eq, and, isNull, gte, sql } from 'drizzle-orm';
import { IStorage } from '../storage';
import { cosineSimilarity } from '../lib/semantic-similarity';

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
  }, storage: IStorage): Promise<DetectionResult[]> {
    console.log('[DUPLICATE DETECTION] Starting multi-layer detection...');

    if (!article.embedding) {
      console.log('[DUPLICATE DETECTION] No embedding provided, skipping semantic detection');
      return [];
    }

    // Layer 1: Embedding similarity (fast)
    const embeddingMatches = await this.findByEmbedding(article.embedding, storage);
    console.log(`[DUPLICATE DETECTION] Embedding layer found ${embeddingMatches.length} potential matches`);

    if (embeddingMatches.length === 0) {
      return [];
    }

    // Layer 1.5: Title similarity with location matching (NEW - catches "Fire at Chalong Bay" variations)
    const titleMatches = this.findByTitleSimilarity(article.title, embeddingMatches);
    if (titleMatches.length > 0) {
      console.log(`[DUPLICATE DETECTION] Title similarity layer found ${titleMatches.length} strong matches - skipping GPT verification`);
      return titleMatches.map(match => ({
        isDuplicate: true,
        confidence: match.similarity,
        matchedArticle: match.article,
        reason: `Title similarity: ${(match.similarity * 100).toFixed(0)}% match with "${match.article.title.substring(0, 50)}..."`
      }));
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

  async findRelatedStories(article: Article, storage: IStorage): Promise<Article[]> {
    console.log(`[RELATED STORY SEARCH] Looking for updates/related stories for: "${article.title}"`);

    if (!article.embedding) {
      console.log(`[RELATED STORY SEARCH] No embedding for article, skipping related search`);
      return [];
    }

    // 1. Find candidates with similar embeddings (broader threshold)
    const candidates = await this.findByEmbedding(article.embedding, storage, 0.35); // Lower threshold for related stories

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
      model: 'gpt-4o-mini', // Cost optimization: mini is sufficient for duplicate detection
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
   * Layer 1.5: Find articles with similar titles + matching key terms
   * This catches obvious duplicates like "Fire at Chalong Bay" vs "Fire Breaks Out at Chalong Bay"
   * that might have lower embedding similarity due to different wording
   */
  private findByTitleSimilarity(
    newTitle: string,
    candidates: Article[]
  ): { article: Article; similarity: number }[] {
    const matches: { article: Article; similarity: number }[] = [];

    // Normalize and tokenize the new title
    const newTokens = this.tokenizeTitle(newTitle);
    const newBigrams = this.getBigrams(newTokens);

    for (const candidate of candidates) {
      const candidateTokens = this.tokenizeTitle(candidate.title);
      const candidateBigrams = this.getBigrams(candidateTokens);

      // Calculate Jaccard similarity on bigrams (more robust than word overlap)
      const similarity = this.jaccardSimilarity(newBigrams, candidateBigrams);

      // Also check for key term overlap (locations, event types)
      const keyTermOverlap = this.calculateKeyTermOverlap(newTokens, candidateTokens);

      // Combined score: if bigram similarity > 60% OR (>40% + strong key term overlap)
      const combinedScore = Math.max(similarity, similarity * 0.7 + keyTermOverlap * 0.3);

      // Threshold: 65% combined similarity = likely same event
      if (combinedScore >= 0.65) {
        console.log(`[DUPLICATE DETECTION] Title match found:`);
        console.log(`   New: "${newTitle.substring(0, 60)}..."`);
        console.log(`   Existing: "${candidate.title.substring(0, 60)}..."`);
        console.log(`   Bigram similarity: ${(similarity * 100).toFixed(0)}%, Key terms: ${(keyTermOverlap * 100).toFixed(0)}%, Combined: ${(combinedScore * 100).toFixed(0)}%`);
        matches.push({ article: candidate, similarity: combinedScore });
      }
    }

    return matches;
  }

  /**
   * Tokenize a title into lowercase words, removing common articles/prepositions
   */
  private tokenizeTitle(title: string): string[] {
    const stopWords = new Set([
      'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'by',
      'with', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'after', 'before', 'during', 'while', 'about', 'into', 'through'
    ]);

    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Generate bigrams from tokens for more robust matching
   */
  private getBigrams(tokens: string[]): Set<string> {
    const bigrams = new Set<string>();
    for (let i = 0; i < tokens.length - 1; i++) {
      bigrams.add(`${tokens[i]}_${tokens[i + 1]}`);
    }
    // Also add individual important words (locations, event types)
    const importantPatterns = /^(fire|accident|crash|rescue|drowning|dead|killed|injured|arrest|police|phuket|patong|chalong|karon|kata|rawai|kamala|mai\s*khao|airport|beach|pier|bay|road|hospital)/i;
    for (const token of tokens) {
      if (importantPatterns.test(token)) {
        bigrams.add(`_key_${token}`);
      }
    }
    return bigrams;
  }

  /**
   * Calculate Jaccard similarity between two sets
   */
  private jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) return 0;

    const intersection = new Set(Array.from(setA).filter(x => setB.has(x)));
    const union = new Set([...Array.from(setA), ...Array.from(setB)]);

    return intersection.size / union.size;
  }

  /**
   * Calculate overlap of key terms (locations, event types, numbers)
   */
  private calculateKeyTermOverlap(tokensA: string[], tokensB: string[]): number {
    // Key locations in Phuket
    const locations = new Set([
      'phuket', 'patong', 'chalong', 'karon', 'kata', 'rawai', 'kamala', 'surin',
      'bang', 'tao', 'nai', 'harn', 'mai', 'khao', 'airport', 'town', 'pier',
      'bay', 'beach', 'road', 'hospital', 'school', 'temple', 'market'
    ]);

    // Event types
    const eventTypes = new Set([
      'fire', 'accident', 'crash', 'rescue', 'drowning', 'dead', 'death', 'killed',
      'injured', 'arrest', 'arrested', 'police', 'robbery', 'theft', 'assault',
      'flood', 'storm', 'landslide', 'collapse', 'explosion', 'shooting'
    ]);

    const keyTermsA = new Set(tokensA.filter(t => locations.has(t) || eventTypes.has(t)));
    const keyTermsB = new Set(tokensB.filter(t => locations.has(t) || eventTypes.has(t)));

    if (keyTermsA.size === 0 || keyTermsB.size === 0) return 0;

    const intersection = new Set(Array.from(keyTermsA).filter(x => keyTermsB.has(x)));
    const minSize = Math.min(keyTermsA.size, keyTermsB.size);

    return intersection.size / minSize;
  }

  /**
   * Layer 1: Find articles with similar embeddings
   */
  private async findByEmbedding(
    embedding: number[],
    storage: IStorage,
    threshold: number = 0.55 // Lowered from 0.75 to match scheduler's pre-translation check - catches more duplicates
  ): Promise<Article[]> {
    if (!embedding || embedding.length === 0) {
      console.log('[DUPLICATE DETECTION] No embedding provided, skipping embedding search');
      return [];
    }

    try {
      // Fetch only articles from the last 3 days to keep memory usage low and performance high
      // This is the "low resource" stable version requested by the user
      const recentCandidates = await storage.getRecentArticlesWithEmbeddings(3);

      if (recentCandidates.length === 0) {
        return [];
      }

      // Perform cosine similarity in-memory using Node.js instead of DB
      // This is extremely efficient for hundreds of items and avoids DB crashes
      const matches: Article[] = [];

      for (const candidate of recentCandidates) {
        if (!candidate.embedding) continue;

        const similarity = cosineSimilarity(embedding, candidate.embedding);

        if (similarity >= threshold) {
          // Fetch full article details for the match
          const fullArticle = await storage.getArticleById(candidate.id);
          if (fullArticle) {
            matches.push(fullArticle);
          }
        }
      }

      // Sort by similarity descending
      return matches;
    } catch (error) {
      console.error('[DUPLICATE DETECTION] Embedding search failed:', error);
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
          model: 'gpt-4o-mini', // Cost optimization: mini is sufficient for duplicate verification
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
