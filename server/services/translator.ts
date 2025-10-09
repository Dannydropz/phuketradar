import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TranslationResult {
  translatedTitle: string;
  translatedContent: string;
  excerpt: string;
  category: string;
  isActualNews: boolean;
  author: string;
}

const THAI_FEMALE_AUTHORS = [
  "Ploy Srisawat",
  "Natcha Petcharat",
  "Siriporn Rattana",
  "Apinya Thongchai",
  "Kannika Jirasakul",
  "Ornuma Phongphan",
  "Wassana Choosuk",
];

function getRandomAuthor(): string {
  return THAI_FEMALE_AUTHORS[Math.floor(Math.random() * THAI_FEMALE_AUTHORS.length)];
}

export class TranslatorService {
  async translateAndRewrite(
    title: string,
    content: string
  ): Promise<TranslationResult> {
    try {
      const prompt = `You are a professional news editor for an English-language news site covering Phuket, Thailand. 

Your task:
1. Determine if this is actual NEWS content (not promotional posts, greetings, or filler content)
2. REJECT and mark as NOT news if the content is about:
   - The Thai royal family, monarchy, or king (sensitive political content)
   - "Phuket Times" or "Phuket Time News" itself (self-referential content about the news source)
3. If it's acceptable news, translate from Thai to English and rewrite it in a clear, professional news style

GRAMMAR & STYLE REQUIREMENTS:
- Follow AP Style for headlines: capitalize main words, use title case
- ALWAYS include company suffixes: Co., Ltd., Inc., Corp., Plc., etc.
- Use proper articles (a, an, the) - never skip them
- Ensure subject-verb agreement
- Write in active voice when possible
- Use specific numbers and dates, not vague terms

HEADLINE EXAMPLES (Good):
✓ "Thai Seaplane Co. Hosts Community Meeting in Phuket to Discuss Proposed Water Airport Project"
✓ "Local Government Officials Announce New Tourism Initiative for Old Phuket Town"
✓ "Patong Beach Vendors Face New Regulations Under City Cleanup Plan"

HEADLINE EXAMPLES (Bad):
✗ "Thai Seaplane Hosts Community Meeting" (missing "Co.")
✗ "government announce new initiative" (wrong capitalization, grammar)
✗ "Beach vendors to face regulations" (passive voice)

4. Extract a concise excerpt (2-3 sentences) with perfect grammar
5. Categorize the article (Breaking, Tourism, Business, Events, or Other)

Original Title: ${title}

Original Content: ${content}

Respond in JSON format:
{
  "isActualNews": true/false,
  "translatedTitle": "clear, compelling English headline following AP Style with proper company names",
  "translatedContent": "professional news article in HTML format with <p> tags and <h2> for subheadings, perfect grammar",
  "excerpt": "2-3 sentence summary with flawless grammar and complete sentences",
  "category": "Breaking|Tourism|Business|Events|Other"
}

If this is NOT actual news (promotional content, greetings, ads, royal family content, or self-referential Phuket Times content), set isActualNews to false and leave other fields empty.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional news editor and translator specializing in Thai to English translation for a Phuket news publication.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.5,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      return {
        translatedTitle: result.translatedTitle || title,
        translatedContent: result.translatedContent || content,
        excerpt: result.excerpt || "",
        category: result.category || "Other",
        isActualNews: result.isActualNews || false,
        author: getRandomAuthor(),
      };
    } catch (error) {
      console.error("Error translating content:", error);
      throw new Error("Failed to translate content");
    }
  }

  async detectLanguage(text: string): Promise<string> {
    // Simple language detection - check for Thai characters
    const thaiPattern = /[\u0E00-\u0E7F]/;
    return thaiPattern.test(text) ? "th" : "en";
  }
}

export const translatorService = new TranslatorService();
