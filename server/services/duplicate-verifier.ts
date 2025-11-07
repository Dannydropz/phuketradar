import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface StoryAnalysis {
  eventType: string;
  location: string[];
  people: string[];
  timing: string;
  coreFacts: string[];
}

interface DuplicateVerificationResult {
  isDuplicate: boolean;
  confidence: number;
  reasoning: string;
  newStoryAnalysis: StoryAnalysis;
  existingStoryAnalysis: StoryAnalysis;
}

export class DuplicateVerifierService {
  /**
   * Use GPT-4o-mini to analyze two stories and determine if they're about the same event
   * This is used for borderline cases (70-85% embedding similarity) where we need
   * deeper semantic understanding
   * 
   * Now analyzes FULL CONTENT, not just titles, for accurate duplicate detection
   */
  async verifyDuplicate(
    newTitle: string,
    newContent: string,
    existingTitle: string,
    existingContent: string,
    similarityScore: number
  ): Promise<DuplicateVerificationResult> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a news editor analyzing whether two news stories describe the same event.

Your task is to:
1. Read the FULL CONTENT of both stories carefully
2. Extract key information from both stories
3. Determine if they're reporting on the SAME EVENT (not just similar topics)
4. Provide clear reasoning for your decision

Two stories are DUPLICATES if they report on the same specific incident, even if:
- They have different framing or angles
- Different sources posted them
- The headlines emphasize different aspects
- The wording is completely different
- One focuses on the rescue, the other on the stranding

Two stories are NOT DUPLICATES if they:
- Report on different incidents (even of the same type)
- Occurred at different times or dates
- Involve different people or locations
- Are general updates vs. specific events

IMPORTANT: Read the full story content, not just the titles. Many duplicates have different titles but identical facts in the body.

Return your analysis in JSON format.`
          },
          {
            role: "user",
            content: `Analyze these two news stories and determine if they're about the same event:

**New Story:**
Title: "${newTitle}"
Content: "${newContent.substring(0, 1500)}" ${newContent.length > 1500 ? '...(truncated)' : ''}

**Existing Story:**
Title: "${existingTitle}"
Content: "${existingContent.substring(0, 1500)}" ${existingContent.length > 1500 ? '...(truncated)' : ''}

**Embedding Similarity:** ${(similarityScore * 100).toFixed(1)}%

Return a JSON object with:
{
  "isDuplicate": boolean,
  "confidence": number (0-1),
  "reasoning": "detailed explanation",
  "newStoryAnalysis": {
    "eventType": "type of event (rescue, accident, crime, etc.)",
    "location": ["specific locations mentioned"],
    "people": ["people, groups, or entities involved"],
    "timing": "when it happened (if mentioned)",
    "coreFacts": ["key facts about what happened"]
  },
  "existingStoryAnalysis": {
    "eventType": "type of event",
    "location": ["specific locations mentioned"],
    "people": ["people, groups, or entities involved"],
    "timing": "when it happened (if mentioned)",
    "coreFacts": ["key facts about what happened"]
  }
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, // Low temperature for consistent analysis
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");

      return {
        isDuplicate: result.isDuplicate || false,
        confidence: result.confidence || 0,
        reasoning: result.reasoning || "No reasoning provided",
        newStoryAnalysis: result.newStoryAnalysis || {
          eventType: "unknown",
          location: [],
          people: [],
          timing: "unknown",
          coreFacts: []
        },
        existingStoryAnalysis: result.existingStoryAnalysis || {
          eventType: "unknown",
          location: [],
          people: [],
          timing: "unknown",
          coreFacts: []
        }
      };
    } catch (error) {
      console.error("Error verifying duplicate:", error);
      // On error, default to DUPLICATE to avoid false negatives (safer)
      // Better to skip a unique story than publish a duplicate
      return {
        isDuplicate: true,
        confidence: 0.5,
        reasoning: "Error occurred during verification - defaulting to duplicate for safety",
        newStoryAnalysis: {
          eventType: "unknown",
          location: [],
          people: [],
          timing: "unknown",
          coreFacts: []
        },
        existingStoryAnalysis: {
          eventType: "unknown",
          location: [],
          people: [],
          timing: "unknown",
          coreFacts: []
        }
      };
    }
  }
}
