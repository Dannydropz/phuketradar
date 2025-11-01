import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractedEntities {
  people: string[];
  locations: string[];
  crimeTypes: string[];
  organizations: string[];
  rawText: string;
}

export interface EntityMatchScore {
  score: number;
  matchedPeople: number;
  matchedLocations: number;
  matchedCrimeTypes: number;
  matchedOrganizations: number;
  totalEntities: number;
}

export class EntityExtractionService {
  /**
   * Extract entities from Thai text using GPT-4o-mini
   * Focuses on: people names, locations, crime types, organizations
   */
  async extractEntities(thaiTitle: string): Promise<ExtractedEntities> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an entity extraction system for Thai news articles. Extract key entities from Thai text.

Output ONLY a JSON object with these fields:
- people: array of person names (suspects, victims, officials)
- locations: array of locations (cities, districts, landmarks)
- crimeTypes: array of crime/incident types (theft, assault, drugs, etc)
- organizations: array of organizations (police stations, companies, government bodies)

Rules:
1. Normalize similar entities (e.g., "ตำรวจฉลอง" and "สน.ฉลอง" both become "Chalong Police")
2. Extract both Thai and transliterated English forms when present
3. For locations, include district/area names
4. For crimes, use general categories (drugs, assault, theft, fraud)
5. Return empty arrays if no entities found in a category
6. Keep person names as they appear (don't translate)

Example input: "ตำรวจฉลองจับผู้ต้องหาพร้อมยาบ้า 60 เม็ด"
Example output:
{
  "people": [],
  "locations": ["Chalong", "ฉลอง"],
  "crimeTypes": ["drugs", "methamphetamine"],
  "organizations": ["Chalong Police", "ตำรวจฉลอง"]
}`
          },
          {
            role: "user",
            content: thaiTitle
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
        rawText: thaiTitle
      };
    }
  }

  /**
   * Compare two entity sets and calculate match score (0-100%)
   * Higher score = more likely to be the same story
   */
  compareEntities(entities1: ExtractedEntities, entities2: ExtractedEntities): EntityMatchScore {
    const normalize = (str: string) => str.toLowerCase().trim();
    
    // Count matches in each category
    const peopleMatches = this.countMatches(entities1.people, entities2.people, normalize);
    const locationMatches = this.countMatches(entities1.locations, entities2.locations, normalize);
    const crimeMatches = this.countMatches(entities1.crimeTypes, entities2.crimeTypes, normalize);
    const orgMatches = this.countMatches(entities1.organizations, entities2.organizations, normalize);
    
    // Calculate total entities (use max of both sets to avoid division issues)
    const totalEntities = Math.max(
      entities1.people.length + entities1.locations.length + entities1.crimeTypes.length + entities1.organizations.length,
      entities2.people.length + entities2.locations.length + entities2.crimeTypes.length + entities2.organizations.length,
      1 // Minimum 1 to avoid division by zero
    );
    
    // Weighted scoring:
    // - Crime type + Location = very strong signal (same crime in same place = likely same story)
    // - People = strong signal (same person = likely same story)
    // - Organizations = moderate signal (same police station = likely related)
    
    let weightedScore = 0;
    
    // Crime type matches are worth 30 points each (very important)
    weightedScore += crimeMatches * 30;
    
    // Location matches are worth 25 points each (very important)
    weightedScore += locationMatches * 25;
    
    // People matches are worth 20 points each (important)
    weightedScore += peopleMatches * 20;
    
    // Organization matches are worth 15 points each (moderately important)
    weightedScore += orgMatches * 15;
    
    // Normalize to 0-100 scale
    // If we have crime + location match, that's 55 points = likely duplicate
    // If we have all three (crime + location + org), that's 70 points = very likely duplicate
    const score = Math.min(100, weightedScore);
    
    return {
      score,
      matchedPeople: peopleMatches,
      matchedLocations: locationMatches,
      matchedCrimeTypes: crimeMatches,
      matchedOrganizations: orgMatches,
      totalEntities
    };
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
