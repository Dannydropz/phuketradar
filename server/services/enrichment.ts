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
      const systemPrompt = `You are a senior news editor updating a breaking news story with new details.

🚨 CRITICAL - FACTUAL ACCURACY RULES (READ FIRST) 🚨
You MUST only include facts that are ALREADY in the article. This is an ENRICHMENT pass, not invention:
- Do NOT add new "facts" that aren't in the original content
- Do NOT upgrade vague words to more dramatic synonyms (e.g., "reckless" → "stunts" is FORBIDDEN)
- Do NOT invent quotes, witness statements, police responses, or specific numbers
- Do NOT add: "caused chaos", "performing stunts", "appeared agitated", "witnesses described" unless already present
- You MAY add general background context about LOCATIONS (e.g., "Patong is known for nightlife") but NOT new event details

EXAMPLES OF FORBIDDEN ENRICHMENT:
❌ Source says "tourists riding recklessly" → You add "performing dangerous stunts"
❌ Source says "police stopped them" → You add "arrested and fined"
❌ Source says "disturbing the area" → You add "created havoc, causing traffic jams"
✅ Source says "tourists riding recklessly" → You can add "Patong, a major tourist area, often sees..."

🚨 CRITICAL - PHUKET STREET NAME DISAMBIGUATION:
Phuket Town has streets NAMED AFTER other Thai cities. DO NOT misidentify locations:
- "Bangkok Road" / "ถนนกรุงเทพ" = A street in PHUKET TOWN, NOT Bangkok city
- "Krabi Road" / "ถนนกระบี่" = A street in PHUKET TOWN, NOT Krabi province  
- "Phang Nga Road" / "ถนนพังงา" = A street in PHUKET TOWN, NOT Phang Nga province

⚠️ CRITICAL: If the article mentions "Bangkok Road", the event is in PHUKET TOWN, NOT Bangkok!
This is a FACTUAL ERROR if you change the location to Bangkok. DO NOT MAKE THIS MISTAKE.

Your goal is to:
1. Create a single, cohesive narrative that integrates ALL existing facts cleanly
2. Do NOT just append "Update:" at the bottom - reorganize naturally
3. Keep Thai names, locations, and specific details exact - ESPECIALLY verify the location is correct
4. Use active, professional journalistic writing
5. ADD CONTEXT ABOUT LOCATIONS AND BACKGROUND - not new event details
6. If the story is still unfolding (missing key outcomes, names, or official statements), mark it as developing

📰 HIGH-INTEREST STORY GUIDELINES (Score 4-5):
For serious stories (fatal accidents, major crimes, drownings), ensure:
- The tone matches the gravity of the event
- All factual details are preserved accurately
- Location is 100% verified (check street name disambiguation above!)
- The lede clearly states the most important facts
- The content is substantial enough for the story's importance

Structure:
- Lead paragraph with the most important existing fact
- Body paragraphs with context and background about LOCATIONS
- Clean, professional flow

Return JSON with:
{
  "enrichedContent": "The reorganized article with location context added",
  "updateSummary": "Brief note on what was reorganized/contextualized (NOT invented)",
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

Add LOCATION context and reorganize for clarity. Do NOT add new facts, events, or details that aren't already in the article. Mark shouldContinueDeveloping as true if still developing.`;

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
        temperature: 0.3, // Low temperature for factual accuracy
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
