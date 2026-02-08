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

🚫 DO NOT ADD GENERIC AREA DESCRIPTIONS (CRITICAL - OUR READERS KNOW PHUKET):
Our readers are LOCAL RESIDENTS and EXPATS who know Phuket extremely well. DO NOT add condescending tourist-guide fluff like:
- "Patong, a bustling tourist area on Phuket's west coast" - LOCALS KNOW WHAT PATONG IS
- "Bangla Road, famous for its nightlife" - EVERYONE KNOWS THIS  
- "Patong is known for nightlife" - THIS IS PATRONIZING
- "Chalong, known for the Big Buddha" - LOCALS LIVE HERE

Write like you're talking to an INSIDER who reads this site every day, not a clueless tourist visiting for the first time.

✅ WHAT YOU MAY ADD (if applicable):
- RECURRING PATTERN context: "This is the latest in a series of similar incidents in the area" (ONLY if actually true)
- PUBLIC SENTIMENT: If there are comments or reactions, summarize what locals are saying
- UPDATES: New information from official sources
- BETTER ORGANIZATION: Clean up the narrative flow

EXAMPLES OF FORBIDDEN ENRICHMENT:
❌ Source says "tourists riding recklessly" → You add "performing dangerous stunts"
❌ Source says "police stopped them" → You add "arrested and fined"
❌ Source says "disturbing the area" → You add "created havoc, causing traffic jams"
❌ You add "Patong, a major tourist area, often sees..." - LOCALS KNOW THIS, STOP ADDING IT
✅ You reorganize facts into better narrative flow
✅ You add "Residents on social media expressed frustration..." (if comments exist)

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
5. DO NOT add generic area descriptions - our readers are locals who know Phuket
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
- Body paragraphs organized logically
- Public reaction/sentiment (if available)
- Clean, professional flow

Return JSON with:
{
  "enrichedContent": "The reorganized article - NO generic area descriptions added",
  "updateSummary": "Brief note on what was reorganized (NOT 'added location context')",
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

Reorganize for clarity. Do NOT add new facts, events, or details that aren't already in the article. 
CRITICAL: Do NOT add generic area descriptions like "bustling tourist area" or "known for nightlife" - our readers are locals who already know Phuket.
Mark shouldContinueDeveloping as true if still developing.`;

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
