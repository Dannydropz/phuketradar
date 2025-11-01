import OpenAI from "openai";
import { translate } from "@vitalets/google-translate-api";

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
  embedding?: number[];
}

// Phuket location context map for richer rewrites
const PHUKET_CONTEXT_MAP: Record<string, string> = {
  "ป่าตอง": "Patong, a major tourist beach area on Phuket's west coast",
  "Patong": "Patong, a major tourist beach area on Phuket's west coast",
  "กะตะ": "Kata, a family-friendly beach known for surfing",
  "Kata": "Kata, a family-friendly beach known for surfing",
  "ราวัย": "Rawai, a local seafood area in southern Phuket",
  "Rawai": "Rawai, a local seafood area in southern Phuket",
  "กมลา": "Kamala, a quiet beach community north of Patong",
  "Kamala": "Kamala, a quiet beach community north of Patong",
  "เมืองภูเก็ต": "Phuket Town, the island's cultural and administrative center",
  "Phuket Town": "Phuket Town, the island's cultural and administrative center",
  "ฉลอง": "Chalong, a district known for the Big Buddha and pier area",
  "Chalong": "Chalong, a district known for the Big Buddha and pier area",
  "กะรน": "Karon, a long beach popular with families and tourists",
  "Karon": "Karon, a long beach popular with families and tourists",
  "บางเทา": "Bang Tao, home to luxury resorts and Laguna Phuket",
  "Bang Tao": "Bang Tao, home to luxury resorts and Laguna Phuket",
  "สุรินทร์": "Surin, an upscale beach area with fine dining",
  "Surin": "Surin, an upscale beach area with fine dining",
};

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

// Detect if Thai text is complex and needs Google Translate first
function isComplexThaiText(thaiText: string): boolean {
  // Complex if:
  // - Longer than 400 characters
  // - Contains formal/government keywords
  const complexKeywords = ["แถลง", "เจ้าหน้าที่", "ประกาศ", "กระทรวง", "นายกรัฐมนตรี", "ผู้ว่าราชการ"];
  
  return (
    thaiText.length > 400 ||
    complexKeywords.some(keyword => thaiText.includes(keyword))
  );
}

// Enrich Thai text with Phuket location context
function enrichWithPhuketContext(text: string): string {
  let enrichedText = text;
  
  // Add context notes for known Phuket locations
  for (const [location, context] of Object.entries(PHUKET_CONTEXT_MAP)) {
    if (enrichedText.includes(location)) {
      // Add context as a note that the translator can use
      enrichedText = enrichedText.replace(
        new RegExp(location, 'g'),
        `${location} (${context})`
      );
    }
  }
  
  return enrichedText;
}

export class TranslatorService {
  async translateAndRewrite(
    title: string,
    content: string,
    precomputedEmbedding?: number[]
  ): Promise<TranslationResult> {
    try {
      // STEP 1: Enrich Thai text with Phuket context
      const enrichedTitle = enrichWithPhuketContext(title);
      const enrichedContent = enrichWithPhuketContext(content);
      
      // STEP 2: Determine translation strategy
      const isComplex = isComplexThaiText(enrichedContent);
      let sourceTextForGPT = `${enrichedTitle}\n\n${enrichedContent}`;
      
      // STEP 3: Pre-translate with Google Translate if complex
      if (isComplex) {
        try {
          console.log(`🌍 Complex text detected (${enrichedContent.length} chars) - using Google Translate → GPT-4o-mini pipeline`);
          const googleResult = await translate(sourceTextForGPT, { to: "en" });
          sourceTextForGPT = googleResult.text;
        } catch (googleError) {
          console.warn("⚠️  Google Translate failed, falling back to direct GPT-4o-mini:", googleError);
          // Fall back to direct translation if Google Translate fails
        }
      } else {
        console.log(`⚡ Simple text (${enrichedContent.length} chars) - using direct GPT-4o-mini translation`);
      }

      // STEP 4: Polish/rewrite with GPT-4o-mini
      const prompt = `You are a professional news editor for an English-language news site covering Phuket, Thailand. 

Your task:
1. Determine if this is actual NEWS content (not promotional posts, greetings, or filler content)
2. REJECT and mark as NOT news if the content is about:
   - The Thai royal family, monarchy, or king (sensitive political content)
   - "Phuket Times" or "Phuket Time News" itself (self-referential content about the news source)
3. If it's acceptable news, ${isComplex ? 'polish and rewrite the Google-translated text' : 'translate from Thai to English'} in a clear, professional news style

CONTEXT PRESERVATION:
- If you see location descriptions in parentheses (e.g., "Patong, a major tourist area"), preserve and incorporate them naturally
- Add brief contextual details about Phuket locations when relevant to help international readers
- Maintain all factual details, names, times, and numbers exactly as provided

GRAMMAR & STYLE REQUIREMENTS:
- Follow AP Style for headlines: capitalize main words, use title case
- ALWAYS include company suffixes: Co., Ltd., Inc., Corp., Plc., etc.
- Use proper articles (a, an, the) - never skip them
- Ensure subject-verb agreement and perfect grammar
- Write in active voice when possible
- Use specific numbers and dates, not vague terms
- Keep paragraphs concise and readable

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

${isComplex ? 'Google-Translated Text' : 'Original Thai Text'}: ${sourceTextForGPT}

Respond in JSON format:
{
  "isActualNews": true/false,
  "translatedTitle": "clear, compelling English headline following AP Style with proper company names and context",
  "translatedContent": "professional news article in HTML format with <p> tags and <h2> for subheadings, perfect grammar, natural Phuket context",
  "excerpt": "2-3 sentence summary with flawless grammar and complete sentences",
  "category": "Breaking|Tourism|Business|Events|Other"
}

If this is NOT actual news (promotional content, greetings, ads, royal family content, or self-referential Phuket Times content), set isActualNews to false and leave other fields empty.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional news editor and translator specializing in Thai to English translation for Phuket Radar, a news publication serving Phuket's international community.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent, factual output
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      // Use precomputed embedding (from Thai title) if provided
      // This ensures we always compare embeddings in the same language (Thai)
      const embedding = precomputedEmbedding;

      return {
        translatedTitle: result.translatedTitle || title,
        translatedContent: result.translatedContent || content,
        excerpt: result.excerpt || "",
        category: result.category || "Other",
        isActualNews: result.isActualNews || false,
        author: getRandomAuthor(),
        embedding,
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

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw new Error("Failed to generate embedding");
    }
  }

  async generateEmbeddingFromTitle(title: string): Promise<number[]> {
    // Generate embedding from the title for semantic duplicate detection
    return this.generateEmbedding(title);
  }

  async isRealPhoto(imageUrl: string): Promise<boolean> {
    try {
      // Decode HTML entities (&amp; -> &) for Facebook URLs
      const decodedUrl = imageUrl
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a strict image classifier for a news website. Analyze this image and determine if it's a REAL PHOTOGRAPH of actual people, places, events, or objects.

CRITICAL: Be VERY STRICT. Answer "yes" ONLY if this is an authentic, unedited photograph showing:
- Real people in real situations
- Actual locations or buildings
- Genuine news events
- Physical objects in real-world settings

Answer "no" (REJECT) if the image is ANY of these:

❌ FACEBOOK TEXT POSTS/ANNOUNCEMENTS:
- Text on solid colored backgrounds (black, blue, red, any color)
- News headlines displayed as graphics
- Announcement-style posts with just words
- Quote graphics or text overlays
- Even if the text describes a real news event

❌ OTHER NON-PHOTOS:
- Logos, branding, or icons
- Illustrations, cartoons, or drawings
- Infographics or charts
- Promotional graphics or ads
- Memes or heavily edited images
- Screenshots of websites or apps

EXAMPLES OF WHAT TO REJECT:
- "Phuket raids a major gambling website..." (white text on black background) → REJECT
- Police announcement with text on blue background → REJECT  
- Breaking news headline as a graphic → REJECT
- Any image where text is the main element → REJECT

CONFIDENCE REQUIREMENT:
- Only return isRealPhoto: true if you are HIGHLY CONFIDENT (90%+) it's a genuine photograph
- When in doubt, REJECT (return false)
- If the image quality is poor and you can't tell, REJECT

Return JSON: {"isRealPhoto": true/false, "confidence": 0-100, "reason": "brief explanation"}`
              },
              {
                type: "image_url",
                image_url: {
                  url: decodedUrl,
                  detail: "low" // Use low detail to save costs
                }
              }
            ]
          }
        ],
        max_tokens: 150,
        temperature: 0.1, // Lower temperature for more consistent classification
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      const isRealPhoto = result.isRealPhoto || false;
      const confidence = result.confidence || 0;
      
      // Require high confidence (>80) to accept as real photo
      const accepted = isRealPhoto && confidence > 80;
      
      console.log(`🖼️  Image classification: ${accepted ? "REAL PHOTO ✓" : "TEXT GRAPHIC ✗"}`);
      console.log(`   Confidence: ${confidence}%`);
      console.log(`   Reason: ${result.reason}`);
      
      return accepted;
    } catch (error) {
      console.error("Error classifying image:", error);
      // Re-throw the error so the caller can decide how to handle it
      // The scheduler will catch this and default to accepting the image (err on side of inclusion)
      throw error;
    }
  }
}

export const translatorService = new TranslatorService();
