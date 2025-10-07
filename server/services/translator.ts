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
2. If it's news, translate from Thai to English and rewrite it in a clear, professional news style similar to Morning Brew
3. Extract a concise excerpt (2-3 sentences)
4. Categorize the article (Breaking, Tourism, Business, Events, or Other)

Original Title: ${title}

Original Content: ${content}

Respond in JSON format:
{
  "isActualNews": true/false,
  "translatedTitle": "clear, compelling English headline",
  "translatedContent": "professional news article in HTML format with <p> tags and <h2> for subheadings",
  "excerpt": "2-3 sentence summary",
  "category": "Breaking|Tourism|Business|Events|Other"
}

If this is NOT actual news (promotional content, greetings, ads, etc.), set isActualNews to false and leave other fields empty.`;

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
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      return {
        translatedTitle: result.translatedTitle || title,
        translatedContent: result.translatedContent || content,
        excerpt: result.excerpt || "",
        category: result.category || "Other",
        isActualNews: result.isActualNews || false,
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
