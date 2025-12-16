import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractedEntities {
  people: string[];
  locations: string[];
  crimeTypes: string[];
  organizations: string[];
  numbers: string[]; // Key quantities, amounts, victim counts - strong duplicate signal
  rawText: string;
}

export interface EntityMatchScore {
  score: number;
  matchedPeople: number;
  matchedLocations: number;
  matchedCrimeTypes: number;
  matchedOrganizations: number;
  matchedNumbers: number; // Key quantities - VERY strong duplicate signal
  totalEntities: number;
}

export class EntityExtractionService {
  /**
   * Extract entities from Thai text using GPT-4o-mini
   * Focuses on: people names, locations, crime types, organizations, and KEY NUMBERS
   * 
   * Now uses BOTH title and content for better cross-source duplicate detection.
   * Numbers (quantities, amounts) are especially important for catching duplicates
   * where different sources report the same story with different headlines.
   */
  async extractEntities(thaiTitle: string, thaiContent?: string): Promise<ExtractedEntities> {
    try {
      // Combine title and first 500 chars of content for better entity extraction
      // This catches entities mentioned in body but not title (e.g., specific quantities)
      const textToAnalyze = thaiContent
        ? `${thaiTitle}\n\n${thaiContent.substring(0, 500)}`
        : thaiTitle;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an entity extraction system for Thai news articles. Extract key entities from Thai text.

Output ONLY a JSON object with these fields:
- people: array of person names (suspects, victims, officials)
- locations: array of locations (cities, districts, landmarks, street names, soi names)
- crimeTypes: array of crime/incident types (theft, assault, drugs, smuggling, tax evasion, etc)
- organizations: array of organizations (police stations, companies, government bodies)
- numbers: array of KEY QUANTITIES mentioned (number of items seized, money amounts, victim counts, etc.)
  - Format numbers consistently: "734 packs", "3 million baht", "2 dead", "5 injured"
  - Only include significant quantities, not dates/times

Rules:
1. Normalize similar entities (e.g., "ตำรวจฉลอง" and "สน.ฉลอง" both become "Chalong Police")
2. Extract both Thai and transliterated English forms when present
3. For locations, include street names and soi names - they are very specific!
4. For crimes, use general categories (drugs, assault, theft, fraud, smuggling)
5. For numbers, normalize to a consistent format e.g., "over 700 packs" → "700+ packs", "734 packets" → "734 packs"
6. Return empty arrays if no entities found in a category

Example input: "ตำรวจฉลองจับผู้ต้องหาพร้อมยาบ้า 734 เม็ดมูลค่า 50,000 บาท"
Example output:
{
  "people": [],
  "locations": ["Chalong", "ฉลอง"],
  "crimeTypes": ["drugs", "methamphetamine"],
  "organizations": ["Chalong Police", "ตำรวจฉลอง"],
  "numbers": ["734 pills", "50000 baht"]
}`
          },
          {
            role: "user",
            content: textToAnalyze
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from GPT");
      }

      const parsed = JSON.parse(content);

      return {
        people: parsed.people || [],
        locations: parsed.locations || [],
        crimeTypes: parsed.crimeTypes || [],
        organizations: parsed.organizations || [],
        numbers: parsed.numbers || [],
        rawText: thaiTitle
      };
    } catch (error) {
      console.error("Entity extraction failed:", error);
      // Return empty entities rather than failing the whole scrape
      return {
        people: [],
        locations: [],
        crimeTypes: [],
        organizations: [],
        numbers: [],
        rawText: thaiTitle
      };
    }
  }

  /**
   * Compare two entity sets and calculate match score (0-100%)
   * Higher score = more likely to be the same story
   * 
   * Numbers (quantities) are now the STRONGEST signal because they catch
   * cross-source duplicates like "734 packs seized" vs "over 700 packs seized"
   */
  compareEntities(entities1: ExtractedEntities, entities2: ExtractedEntities): EntityMatchScore {
    const normalize = (str: string) => str.toLowerCase().trim();

    // Count matches in each category
    const peopleMatches = this.countMatches(entities1.people, entities2.people, normalize);
    const locationMatches = this.countMatches(entities1.locations, entities2.locations, normalize);
    const crimeMatches = this.countMatches(entities1.crimeTypes, entities2.crimeTypes, normalize);
    const orgMatches = this.countMatches(entities1.organizations, entities2.organizations, normalize);
    
    // Special fuzzy matching for numbers (catches "734 packs" vs "over 700 packs")
    const numberMatches = this.countNumberMatches(
      entities1.numbers || [], 
      entities2.numbers || []
    );

    // Calculate total entities (use max of both sets to avoid division issues)
    const totalEntities = Math.max(
      entities1.people.length + entities1.locations.length + entities1.crimeTypes.length + entities1.organizations.length + (entities1.numbers?.length || 0),
      entities2.people.length + entities2.locations.length + entities2.crimeTypes.length + entities2.organizations.length + (entities2.numbers?.length || 0),
      1 // Minimum 1 to avoid division by zero
    );

    // Weighted scoring:
    // - Numbers = VERY STRONG signal (same quantity = almost certainly same story)
    // - Crime type + Location = very strong signal (same crime in same place = likely same story)
    // - People = strong signal (same person = likely same story)
    // - Organizations = moderate signal (same police station = likely related)

    let weightedScore = 0;

    // Number matches are worth 40 points each (STRONGEST signal)
    // If two stories mention "734 packs" - they're almost certainly about the same event
    weightedScore += numberMatches * 40;

    // Crime type matches are worth 30 points each (very important)
    weightedScore += crimeMatches * 30;

    // Location matches are worth 25 points each (very important)
    weightedScore += locationMatches * 25;

    // People matches are worth 20 points each (important)
    weightedScore += peopleMatches * 20;

    // Organization matches are worth 15 points each (moderately important)
    weightedScore += orgMatches * 15;

    // Normalize to 0-100 scale
    // If we have number + crime + location match, that's 95 points = very likely duplicate
    // If we have crime + location match, that's 55 points = likely duplicate
    const score = Math.min(100, weightedScore);

    return {
      score,
      matchedPeople: peopleMatches,
      matchedLocations: locationMatches,
      matchedCrimeTypes: crimeMatches,
      matchedOrganizations: orgMatches,
      matchedNumbers: numberMatches,
      totalEntities
    };
  }

  /**
   * Count number matches with fuzzy tolerance for approximate values
   * "734 packs" matches "over 700 packs" or "700+ packs"
   */
  private countNumberMatches(numbers1: string[], numbers2: string[]): number {
    if (numbers1.length === 0 || numbers2.length === 0) {
      return 0;
    }

    let matches = 0;

    for (const num1 of numbers1) {
      const extracted1 = this.extractNumericValue(num1);
      if (extracted1 === null) continue;

      for (const num2 of numbers2) {
        const extracted2 = this.extractNumericValue(num2);
        if (extracted2 === null) continue;

        // Check if numbers are within 10% of each other (fuzzy match)
        // This catches "734 packs" vs "over 700 packs"
        const tolerance = Math.max(extracted1, extracted2) * 0.10;
        if (Math.abs(extracted1 - extracted2) <= tolerance) {
          matches++;
          break; // Only count each number1 once
        }
      }
    }

    return matches;
  }

  /**
   * Extract numeric value from a string like "734 packs" or "3 million baht"
   */
  private extractNumericValue(str: string): number | null {
    // Handle "million", "ล้าน" multipliers
    const millionMatch = str.match(/(\d+(?:\.\d+)?)\s*(million|ล้าน)/i);
    if (millionMatch) {
      return parseFloat(millionMatch[1]) * 1000000;
    }

    // Handle "thousand", "พัน" multipliers  
    const thousandMatch = str.match(/(\d+(?:\.\d+)?)\s*(thousand|พัน)/i);
    if (thousandMatch) {
      return parseFloat(thousandMatch[1]) * 1000;
    }

    // Extract simple numbers (handles comma formatting)
    const simpleMatch = str.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
    if (simpleMatch) {
      return parseFloat(simpleMatch[0]);
    }

    return null;
  }

  /**
   * Count how many items from list1 appear in list2 (case-insensitive, normalized)
   */
  private countMatches(
    list1: string[],
    list2: string[],
    normalize: (s: string) => string
  ): number {
    if (list1.length === 0 || list2.length === 0) {
      return 0;
    }

    const normalized2 = list2.map(normalize);
    let matches = 0;

    for (const item of list1) {
      const norm1 = normalize(item);
      // Check for exact match or substring match (handles Thai + English versions)
      if (normalized2.some(norm2 =>
        norm2 === norm1 ||
        norm2.includes(norm1) ||
        norm1.includes(norm2)
      )) {
        matches++;
      }
    }

    return matches;
  }

  /**
   * Determine if two articles are duplicates based on entity matching
   * Returns true if entity match score >= threshold
   */
  isDuplicateByEntities(
    entities1: ExtractedEntities,
    entities2: ExtractedEntities,
    threshold: number = 50
  ): boolean {
    const matchScore = this.compareEntities(entities1, entities2);
    return matchScore.score >= threshold;
  }
}

export const entityExtractionService = new EntityExtractionService();
