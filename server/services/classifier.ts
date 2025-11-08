import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ClassificationResult {
  eventType: string;
  severity: string;
}

// Event types for Phuket news stories
const EVENT_TYPES = [
  "Accident",
  "Crime", 
  "Weather",
  "Health",
  "Public Order",
  "Tourism",
  "Infrastructure",
  "Government",
  "Environment",
  "Other"
];

// Severity levels for news urgency
const SEVERITY_LEVELS = [
  "Critical",  // Immediate threat to life/safety
  "High",      // Significant impact, developing situation
  "Medium",    // Notable news, local impact
  "Low",       // Minor incident, routine news
  "Info"       // General information, announcements
];

export class ClassificationService {
  /**
   * Classify a news article by event type and severity using GPT-4o-mini
   * Optimized for cost: uses minimal input tokens and structured output
   */
  async classifyArticle(
    title: string,
    excerpt: string
  ): Promise<ClassificationResult> {
    try {
      // Keep input short to minimize token cost
      // Title + first 200 chars of excerpt is enough for classification
      const shortExcerpt = excerpt.substring(0, 200);
      const inputText = `${title}\n\n${shortExcerpt}`;

      // System prompt will be cached by OpenAI (90% discount on repeated use!)
      const systemPrompt = `You are a news classifier for Phuket Radar, a news site covering Phuket, Thailand.

Classify each story by EVENT TYPE and SEVERITY.

EVENT TYPES: ${EVENT_TYPES.join(", ")}
SEVERITY: ${SEVERITY_LEVELS.join(", ")}

Rules:
- Accident: Traffic crashes, injuries, falls, drownings
- Crime: Theft, assault, arrests, illegal activities
- Weather: Storms, flooding, monsoons, climate
- Health: Disease outbreaks, hospital news, medical emergencies
- Public Order: Protests, demonstrations, curfews, police operations
- Tourism: Tourist incidents, attractions, festivals, visitor services
- Infrastructure: Roads, utilities, construction, public works
- Government: Policy, elections, official announcements
- Environment: Pollution, conservation, wildlife, beaches
- Other: Everything else

SEVERITY:
- Critical: Deaths, major disasters, immediate safety threats
- High: Serious injuries, major crimes, developing emergencies
- Medium: Moderate incidents, local disruptions, ongoing issues
- Low: Minor problems, routine police work, small accidents
- Info: Announcements, schedules, general information

Return ONLY valid JSON: {"eventType": "...", "severity": "..."}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Cost-effective model for classification
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Classify this Phuket news story:\n\n${inputText}`,
          },
        ],
        response_format: { type: "json_object" }, // Force JSON output
        temperature: 0.3, // Lower temperature for consistent classification
        max_tokens: 50, // Limit response to minimize cost
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      const classification = JSON.parse(content) as ClassificationResult;

      // Validate the response
      if (!EVENT_TYPES.includes(classification.eventType)) {
        console.warn(`Invalid event type: ${classification.eventType}, defaulting to Other`);
        classification.eventType = "Other";
      }

      if (!SEVERITY_LEVELS.includes(classification.severity)) {
        console.warn(`Invalid severity: ${classification.severity}, defaulting to Info`);
        classification.severity = "Info";
      }

      console.log(`[CLASSIFIER] Classified as ${classification.eventType} / ${classification.severity}: "${title.substring(0, 60)}..."`);

      return classification;
    } catch (error) {
      console.error("Error classifying article:", error);
      
      // Fallback to safe defaults if classification fails
      return {
        eventType: "Other",
        severity: "Info",
      };
    }
  }

  /**
   * Batch classify multiple articles efficiently
   * Uses parallel API calls for speed
   */
  async classifyBatch(
    articles: Array<{ title: string; excerpt: string }>
  ): Promise<ClassificationResult[]> {
    const promises = articles.map((article) =>
      this.classifyArticle(article.title, article.excerpt)
    );

    return Promise.all(promises);
  }
}

// Export singleton instance
export const classificationService = new ClassificationService();
