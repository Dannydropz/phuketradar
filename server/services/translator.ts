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
  interestScore: number;
  embedding?: number[];
}

// High-priority keywords that boost interest scores (urgent/dramatic news)
const HOT_KEYWORDS = [
  "อุบัติเหตุ", // accident
  "ไฟไหม้", // fire
  "จมน้ำ", // drowning
  "จับกุม", // arrest
  "พายุ", // storm
  "ฝนตกหนัก", // heavy rain
  "โจร", // thief/robber
  "เสียชีวิต", // death/died
  "บาดเจ็บ", // injured
  "ชนกัน", // collision
  "ตาย", // dead
  "ฆ่า", // kill
  "ยิง", // shoot
  "แทง", // stab
];

// Low-priority keywords that lower interest scores (routine/boring news)
const COLD_KEYWORDS = [
  "ประชุม", // meeting
  "มอบหมาย", // assign/delegate
  "สัมมนา", // seminar
  "แถลงข่าว", // press conference
  "โครงการ", // project/program
  "อบรม", // training
  "มอบของ", // giving/donation ceremony
  "พิธี", // ceremony
  "การประชุม", // conference
];

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
6. Rate reader interest (1-5 scale)

INTEREST SCORE GUIDE (1-5):
- 5 = URGENT/DRAMATIC: Deaths, drownings, major accidents, violent crime, natural disasters, severe weather alerts
- 4 = IMPORTANT: Non-fatal accidents, arrests, significant disruptions (road closures, power outages), rescue operations
- 3 = MODERATE: Tourism developments, business openings, community events, policy changes
- 2 = MUNDANE: Government meetings, routine announcements, administrative updates, planning sessions
- 1 = TRIVIAL: Ceremonial events, ribbon cuttings, minor celebrations, routine inspections

${isComplex ? 'Google-Translated Text' : 'Original Thai Text'}: ${sourceTextForGPT}

Respond in JSON format:
{
  "isActualNews": true/false,
  "translatedTitle": "clear, compelling English headline following AP Style with proper company names and context",
  "translatedContent": "professional news article in HTML format with <p> tags and <h2> for subheadings, perfect grammar, natural Phuket context",
  "excerpt": "2-3 sentence summary with flawless grammar and complete sentences",
  "category": "Breaking|Tourism|Business|Events|Other",
  "interestScore": 1-5 (integer)
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

      // STEP 5: Apply keyword boosting to interest score
      // Start with GPT's base score
      let finalInterestScore = result.interestScore || 3;
      
      // Boost for hot keywords (urgent news like drownings, crime, accidents)
      const hasHotKeyword = HOT_KEYWORDS.some(keyword => 
        title.includes(keyword) || content.includes(keyword)
      );
      if (hasHotKeyword) {
        finalInterestScore = Math.min(5, finalInterestScore + 1);
        console.log(`   🔥 HOT KEYWORD BOOST: ${finalInterestScore - 1} → ${finalInterestScore}`);
      }
      
      // Reduce for cold keywords (boring news like meetings, ceremonies)
      const hasColdKeyword = COLD_KEYWORDS.some(keyword => 
        title.includes(keyword) || content.includes(keyword)
      );
      if (hasColdKeyword) {
        finalInterestScore = Math.max(1, finalInterestScore - 1);
        console.log(`   ❄️  COLD KEYWORD PENALTY: ${finalInterestScore + 1} → ${finalInterestScore}`);
      }
      
      // Ensure score stays within 1-5 range
      finalInterestScore = Math.max(1, Math.min(5, finalInterestScore));
      
      console.log(`   📊 Final Interest Score: ${finalInterestScore}/5`);

      // Use precomputed embedding (from Thai title) if provided
      // This ensures we always compare embeddings in the same language (Thai)
      const embedding = precomputedEmbedding;

      return {
        translatedTitle: result.translatedTitle || title,
        translatedContent: result.translatedContent || content,
        excerpt: result.excerpt || "",
        category: result.category || "Other",
        isActualNews: result.isActualNews || false,
        interestScore: finalInterestScore,
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
        model: "text-embedding-3-large",
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

TASK 1: COUNT WORDS ON THE IMAGE
- Use OCR to extract ALL visible text on the image
- Count the total number of words (not characters, not sentences - WORDS)
- Include text of any size, color, or location on the image
- Return the exact word count

TASK 2: CLASSIFY IMAGE TYPE
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

WORD COUNT THRESHOLD:
- If the image has 15 OR MORE words on it → AUTOMATICALLY REJECT (these are text graphics)
- Even if it looks like a photo with text overlay, 15+ words = text graphic

EXAMPLES OF WHAT TO REJECT:
- "Phuket raids a major gambling website..." (white text on black background, 50+ words) → REJECT
- Police announcement with text on blue background (30+ words) → REJECT  
- Breaking news headline as a graphic (20+ words) → REJECT
- Any image where text is the main element (15+ words) → REJECT

EXAMPLES OF WHAT TO ACCEPT:
- Accident photo with caption "Car crash on Patong Hill" (5 words) → ACCEPT if photo is real
- Tourism photo with watermark "Phuket Times" (2 words) → ACCEPT if photo is real
- Event photo with date/time stamp (3-5 words) → ACCEPT if photo is real

CONFIDENCE REQUIREMENT:
- Only return isRealPhoto: true if you are HIGHLY CONFIDENT (90%+) it's a genuine photograph
- When in doubt, REJECT (return false)
- If the image quality is poor and you can't tell, REJECT

Return JSON: {"isRealPhoto": true/false, "confidence": 0-100, "wordCount": number, "reason": "brief explanation including word count"}`
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
      const wordCount = result.wordCount || 0;
      
      // Apply word count threshold: 15+ words = text graphic
      const hasTooManyWords = wordCount >= 15;
      
      // Explicit blank image detection: 0 words + very low confidence = blank/broken image
      const isProbablyBlank = wordCount === 0 && confidence < 50;
      
      // Require high confidence (>80) AND word count below threshold to accept
      // Also reject if it's probably a blank image
      const accepted = isRealPhoto && confidence > 80 && !hasTooManyWords && !isProbablyBlank;
      
      console.log(`🖼️  Image classification: ${accepted ? "REAL PHOTO ✓" : "TEXT GRAPHIC ✗"}`);
      console.log(`   Word count on image: ${wordCount} words ${hasTooManyWords ? "(≥15 = TEXT GRAPHIC)" : isProbablyBlank ? "(0 words + low conf = BLANK)" : "(< 15 = OK)"}`);
      console.log(`   Confidence: ${confidence}%`);
      console.log(`   Reason: ${result.reason}`);
      
      return accepted;
    } catch (error) {
      console.error("Error classifying image:", error);
      // Re-throw the error so the caller can decide how to handle it
      // The scheduler will catch this and reject the image (conservative approach for broken/blank images)
      throw error;
    }
  }
}

export const translatorService = new TranslatorService();
