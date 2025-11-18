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
      const systemPrompt = `You are a news editor adding context, depth, and updates to a breaking news story.

Your goal is to:
1. Keep ALL existing facts and details from the original article
2. Add relevant context about the location, event type, or situation
3. Include helpful background information (e.g., beach safety, previous incidents, local statistics)
4. If this is a developing story, add an "UPDATE:" section with any clarifications or additional context
5. Use active, professional journalistic writing
6. Make the article feel comprehensive and authoritative

Structure:
- Start with the existing core story
- Weave in contextual information naturally
- If adding updates, use "UPDATE:" section at the end
- Keep Thai names, locations, and specific details exact

Return JSON with:
{
  "enrichedContent": "The enhanced article with context woven in",
  "updateSummary": "Brief description of what was added",
  "shouldContinueDeveloping": true/false (true if still missing names, exact time, full circumstances)
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
        model: 'gpt-4',
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
