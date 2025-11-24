import OpenAI from 'openai';
import { Article } from '@shared/schema';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface EnrichmentResult {
  enrichedContent: string;
  updateSummary: string;
  shouldContinueDeveloping: boolean; // If still missing details
}

export class EnrichmentService {

  /**
   * Enrich a developing story with context, background, and updates
   */
  async enrichStory(article: Article): Promise<EnrichmentResult> {
    console.log(`[ENRICHMENT] Enriching article: ${article.title}`);

    try {
      const systemPrompt = `You are a news editor updating a breaking news story with new details.

Your goal is to:
1. Create a single, cohesive narrative that integrates ALL facts (old and new)
2. Do NOT just append "Update:" at the bottom - rewrite the story to include the new info naturally
3. Resolve any contradictions by prioritizing the most recent/specific details
4. Keep Thai names, locations, and specific details exact
5. Use active, professional journalistic writing
6. If the story is still unfolding (missing key outcomes, names, or official statements), mark it as developing

Structure:
- Strong, updated headline (if needed)
- Lead paragraph with the latest/most important development
- Body paragraphs with context and background
- "What we know so far" summary if complex

Return JSON with:
{
  "enrichedContent": "The fully rewritten, comprehensive article",
  "updateSummary": "Brief note on what was added/changed",
  "shouldContinueDeveloping": true/false (true if still missing key details)
}`;

      const enrichmentCount = article.enrichmentCount || 0;
      const lastEnriched = article.lastEnrichedAt ? new Date(article.lastEnrichedAt).toISOString() : 'never';

      const userPrompt = `Enrich this ${article.isDeveloping ? 'developing' : 'published'} news story.

Original Article:
Title: ${article.title}
Content: ${article.content}

Metadata:
- Category: ${article.category}
- Interest Score: ${article.interestScore || 'unknown'}
- Times previously enriched: ${enrichmentCount}
- Last enriched: ${lastEnriched}
- Source: ${article.sourceName || 'Unknown'}

Add context, background, and depth to make this story more comprehensive. If it's still developing (missing names, exact times, or full details), mark shouldContinueDeveloping as true.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Cost optimization: mini is sufficient for enrichment updates
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
        temperature: 0.5, // Slightly creative for good context
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      console.log(`[ENRICHMENT] Successfully enriched article`);
      console.log(`[ENRICHMENT] Update summary: ${result.updateSummary}`);
      console.log(`[ENRICHMENT] Should continue developing: ${result.shouldContinueDeveloping}`);

      return {
        enrichedContent: result.enrichedContent || article.content,
        updateSummary: result.updateSummary || 'Added context and background',
        shouldContinueDeveloping: result.shouldContinueDeveloping ?? false
      };
    } catch (error) {
      console.error('[ENRICHMENT] Error enriching story:', error);

      // Fallback: return original content
      return {
        enrichedContent: article.content,
        updateSummary: 'Enrichment failed, using original content',
        shouldContinueDeveloping: article.isDeveloping || false
      };
    }
  }

  /**
   * Find articles ready for enrichment
   * - Developing stories
   * - Not enriched recently (at least 15 mins ago)
   * - Published in last 24 hours
   */
  async findStoriesReadyForEnrichment(): Promise<Article[]> {
    // This will be implemented in the storage layer
    // For now, just a placeholder that returns empty array
    return [];
  }
}
