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
  isDeveloping: boolean;
  embedding?: number[];
}

// High-priority keywords that boost interest scores (urgent/dramatic news)
// Note: "อุบัติเหตุ" (accident) removed - too generic, boosts infrastructure complaints
// GPT's improved scoring guidance now handles real accidents vs. damage reports
const HOT_KEYWORDS = [
  "ไฟไหม้", // fire
  "จมน้ำ", // drowning
  "จับกุม", // arrest
  "พายุ", // storm
  "ฝนตกหนัก", // heavy rain
  "โจร", // thief/robber
  "เสียชีวิต", // death/died
  "บาดเจ็บ", // injured
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
  // Premium GPT-4 enrichment for high-priority stories (score 4-5)
  private async enrichWithPremiumGPT4(params: {
    title: string;
    content: string;
    excerpt: string;
    category: string;
  }): Promise<{ enrichedTitle: string; enrichedContent: string; enrichedExcerpt: string }> {
    const prompt = `You are a premium news editor for Phuket Radar, tasked with taking a good news article and transforming it into an EXCEPTIONAL piece of journalism.

CURRENT ARTICLE:
Title: ${params.title}
Category: ${params.category}
Content: ${params.content}

YOUR MISSION:
Transform this article into a deeply engaging, journalistic masterpiece by adding:

1. CONTEXTUAL BACKGROUND:
   - Add relevant historical context about the location/venue/area
   - Include brief background on recurring issues or patterns if applicable
   - Mention relevant statistics or trends when they add depth
   - Example: For Bangla Road incident → mention its reputation, typical challenges, patrol presence

2. AREA-SPECIFIC ENRICHMENT:
   - Weave in details about landmarks, venues, or geographic significance
   - Add tourism context when relevant (visitor numbers, economic impact, area reputation)
   - Include local color that helps international readers visualize the setting
   - Example: "Bangla Road, which attracts thousands of visitors nightly to its bars and clubs"

3. PROFESSIONAL DEPTH:
   - Expand thin sections with journalistic context
   - Add "why this matters" framing for readers
   - Include broader implications or patterns when relevant
   - Structure with subheadings (<h2>) for longer pieces to improve readability

4. ENGAGING NARRATIVE:
   - Use vivid, professional language that draws readers in
   - Employ strong verbs and active voice
   - Create smooth transitions between ideas
   - Build narrative arc: incident → context → implications

CRITICAL REQUIREMENTS:
- NEVER invent facts, quotes, or statistics
- Maintain 100% factual accuracy from the original article
- Only add verifiable general context (e.g., "Bangla Road is known for nightlife" not "5,000 people visit daily" unless stated)
- Keep the same category and core story
- Preserve all names, times, numbers, and specific details exactly as provided
- Write in HTML with <p> tags and <h2> subheadings for structure
- Use AP Style for the headline

EXAMPLES OF GOOD ENRICHMENT:
✓ Adding: "Bangla Road, the heart of Patong's entertainment district, which generates substantial tourism revenue"
✓ Adding: "This incident highlights ongoing public safety concerns in the area"
✓ Adding: "Local authorities have increased patrols in recent months"
✗ BAD: "5,000 tourists visit nightly" (specific number not in original)
✗ BAD: "The victim said he was upset" (quote not in original)

Respond in JSON format:
{
  "enrichedTitle": "compelling headline with perfect AP Style",
  "enrichedContent": "deeply enriched HTML article with context, background, and journalistic depth",
  "enrichedExcerpt": "2-3 sentence summary that captures the enriched story's significance"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert news editor who transforms good articles into exceptional journalism by adding rich context, background, and professional depth while maintaining strict factual accuracy.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.4, // Slightly higher for creative enrichment while staying factual
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    
    return {
      enrichedTitle: result.enrichedTitle || params.title,
      enrichedContent: result.enrichedContent || params.content,
      enrichedExcerpt: result.enrichedExcerpt || params.excerpt,
    };
  }

  async translateAndRewrite(
    title: string,
    content: string,
    precomputedEmbedding?: number[]
  ): Promise<TranslationResult> {
    try {
      // STEP 1: Enrich Thai text with Phuket context
      const enrichedThaiTitle = enrichWithPhuketContext(title);
      const enrichedThaiContent = enrichWithPhuketContext(content);
      
      // STEP 2: Determine translation strategy
      const isComplex = isComplexThaiText(enrichedThaiContent);
      let sourceTextForGPT = `${enrichedThaiTitle}\n\n${enrichedThaiContent}`;
      
      // STEP 3: Pre-translate with Google Translate if complex
      if (isComplex) {
        try {
          console.log(`🌍 Complex text detected (${enrichedThaiContent.length} chars) - using Google Translate → GPT-4o-mini pipeline`);
          const googleResult = await translate(sourceTextForGPT, { to: "en" });
          sourceTextForGPT = googleResult.text;
        } catch (googleError) {
          console.warn("⚠️  Google Translate failed, falling back to direct GPT-4o-mini:", googleError);
          // Fall back to direct translation if Google Translate fails
        }
      } else {
        console.log(`⚡ Simple text (${enrichedThaiContent.length} chars) - using direct GPT-4o-mini translation`);
      }

      // STEP 4: Polish/rewrite with GPT-4o-mini
      const prompt = `You are a professional news editor for an English-language news site covering Phuket, Thailand. 

Your task:
1. Determine if this is actual NEWS content (not promotional posts, greetings, or filler content)
2. REJECT and mark as NOT news if the content is about:
   - The Thai royal family, monarchy, or king (sensitive political content)
   - "Phuket Times" or "Phuket Time News" itself (self-referential content about the news source)
3. If it's acceptable news, ${isComplex ? 'polish and rewrite the Google-translated text' : 'translate from Thai to English'} in a clear, professional news style

CONTEXT & ENRICHMENT REQUIREMENTS:
- If you see location descriptions in parentheses (e.g., "Patong, a major tourist area"), preserve and incorporate them naturally
- Add brief LOCAL CONTEXT about Phuket locations when relevant to help international readers understand the setting
- Include BACKGROUND INFORMATION when it adds depth (e.g., "Bangla Road, Patong's famous nightlife strip", "the island's main tourist beach")
- Weave in AREA-SPECIFIC DETAILS naturally (known landmarks, popular venues, geographic context)
- Use an ENGAGING NEWS STYLE that goes beyond basic facts - help readers understand WHY this matters
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
5. Categorize the article by TOPIC (not urgency) - READ CAREFULLY
6. Rate reader interest (1-5 scale)

CATEGORY GUIDE - Read the FULL story, not just the headline:

**Weather:** Natural disasters, typhoons, monsoons, flooding, landslides, heat waves, storms, weather warnings, climate events
  Examples: "Typhoon approaching Phuket", "Heavy flooding in Patong", "Landslide blocks road"

**Local:** Community news, missing persons, search/rescue operations, drownings, boat/sea accidents, water-related incidents, local government, general incidents
  Examples: "Search for missing tourist", "Rescue operation saves swimmers", "Tourist drowns at beach", "Boat capsizes off Phuket coast", "Missing swimmer found", "Community meeting held"

**Traffic:** Road accidents (non-criminal), road closures, construction, transportation disruptions
  Examples: "Car crashes on bypass road", "Road closed for repairs", "Traffic jam near airport"

**Crime:** ONLY intentional criminal activity - arrests, theft, assault, scams, police investigations of crimes
  Examples: "Police arrest theft suspect", "Scam targets tourists", "Assault investigation underway"
  NOT Crime: Accidents, drownings, missing persons, natural disasters, rescues

**Tourism:** Hotel openings, tourist attractions, travel advisories, visitor statistics, tourism developments
  Examples: "New resort opens in Kata", "Tourist arrivals increase", "Travel warning issued"

**Business:** Company news, openings/closings, economic developments, real estate
  Examples: "Restaurant chain expands to Phuket", "Mall announces new tenants"

**Politics:** Government decisions, elections, political meetings, policy changes
  Examples: "Governor announces new policy", "City council votes on budget"

**Economy:** Market trends, trade, economic indicators, financial news
  Examples: "Baht strengthens against dollar", "Export figures rise"

**WHEN UNCERTAIN:** If the story doesn't clearly fit any specific category above, use "Local" as the default fallback category.

IMPORTANT DISTINCTIONS:
- Drowning/boat accident/sea incident/missing swimmer → "Local" (water-related incidents are local news)
- Missing person/search operation → "Local" (NOT Crime)
- Car accident (no crime) → "Traffic" (NOT Crime)
- Typhoon/flood/landslide/weather events → "Weather" (natural disasters only)
- Criminal arrest/theft/assault → "Crime" (YES Crime)

INTEREST SCORE GUIDE (1-5):
- 5 = URGENT/DRAMATIC: Deaths, MAJOR structural failures (road collapse, sinkhole, building collapse), violent crime, natural disasters, severe weather
- 4 = IMPORTANT: Non-fatal traffic accidents (actual crashes/collisions), arrests, rescue operations, major service disruptions (power outages, water supply cuts)
- 3 = MODERATE: MINOR infrastructure issues (damaged roads, potholes, routine repairs, maintenance complaints), tourism developments, business openings, community events, policy changes, traffic warnings
- 2 = MUNDANE: Government meetings, routine announcements, administrative updates, inspection visits
- 1 = TRIVIAL: Ceremonial events, ribbon cuttings, minor celebrations

CRITICAL DISTINCTION FOR INFRASTRUCTURE:
- Damaged road with potholes/wear + safety concerns → Score 3 (moderate - routine maintenance issue)
- Road COLLAPSE or major sinkhole → Score 5 (urgent - structural failure)
- Road construction/closure announcement → Score 3 (moderate - planned disruption)

NOTE: Category = TOPIC (what type of story). Interest Score = URGENCY (how important).
Example 1: Typhoon warning → Category="Weather", interestScore=5 (urgent weather event)
Example 2: Tourist drowns at beach → Category="Local", interestScore=5 (death, high urgency)
Example 3: Road collapse causes major sinkhole → Category="Traffic", interestScore=5 (major structural failure)
Example 4: Damaged road with potholes, residents complain → Category="Traffic", interestScore=3 (minor infrastructure issue)
Example 5: Car crash on highway → Category="Traffic", interestScore=4 (actual accident)
Example 6: Missing swimmer search → Category="Local", interestScore=4 (important rescue operation)
Example 7: Police arrest thief → Category="Crime", interestScore=4 (criminal activity)

${isComplex ? 'Google-Translated Text' : 'Original Thai Text'}: ${sourceTextForGPT}

Respond in JSON format:
{
  "isActualNews": true/false,
  "translatedTitle": "clear, compelling English headline following AP Style with proper company names and context",
  "translatedContent": "professional news article in HTML format with <p> tags and <h2> for subheadings, perfect grammar, natural Phuket context",
  "excerpt": "2-3 sentence summary with flawless grammar and complete sentences",
  "category": "Weather|Local|Traffic|Tourism|Business|Politics|Economy|Crime",
  "categoryReasoning": "brief explanation of why you chose this category (1 sentence)",
  "interestScore": 1-5 (integer),
  "isDeveloping": true/false (true if story has limited details/developing situation - phrases like "authorities investigating", "more details to follow", "initial reports", "unconfirmed", sparse information, or breaking news with incomplete facts)
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

      // Log classification decision for debugging
      if (result.category && result.categoryReasoning) {
        console.log(`   🏷️  Category: ${result.category} - ${result.categoryReasoning}`);
      }

      // Validate category - ensure it's one of the allowed values
      const validCategories = ["Weather", "Local", "Traffic", "Tourism", "Business", "Politics", "Economy", "Crime"];
      const category = result.category && validCategories.includes(result.category) 
        ? result.category 
        : "Local";
      
      if (result.category && result.category !== category) {
        console.log(`   ⚠️  Invalid category "${result.category}" - defaulting to "Local"`);
      }

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

      // STEP 6: PREMIUM ENRICHMENT for high-priority stories (score 4-5)
      let enrichedTitle = result.translatedTitle || title;
      let enrichedContent = result.translatedContent || content;
      let enrichedExcerpt = result.excerpt || "";
      
      if (finalInterestScore >= 4) {
        console.log(`   ✨ HIGH-PRIORITY STORY (score ${finalInterestScore}) - Applying GPT-4 premium enrichment...`);
        
        try {
          const enrichmentResult = await this.enrichWithPremiumGPT4({
            title: enrichedTitle,
            content: enrichedContent,
            excerpt: enrichedExcerpt,
            category,
          });
          
          enrichedTitle = enrichmentResult.enrichedTitle;
          enrichedContent = enrichmentResult.enrichedContent;
          enrichedExcerpt = enrichmentResult.enrichedExcerpt;
          
          console.log(`   ✅ GPT-4 enrichment complete - story enhanced with deep journalism`);
        } catch (enrichmentError) {
          console.warn(`   ⚠️  GPT-4 enrichment failed, using GPT-4o-mini version:`, enrichmentError);
          // Fall back to the GPT-4o-mini version if enrichment fails
        }
      }

      // Use precomputed embedding (from Thai title) if provided
      // This ensures we always compare embeddings in the same language (Thai)
      const embedding = precomputedEmbedding;

      return {
        translatedTitle: enrichedTitle,
        translatedContent: enrichedContent,
        excerpt: enrichedExcerpt,
        category: category, // Use validated category (defaults to "Local" if invalid)
        isActualNews: result.isActualNews || false,
        interestScore: finalInterestScore,
        isDeveloping: result.isDeveloping || false,
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

  async generateEmbeddingFromContent(title: string, content: string): Promise<number[]> {
    // Generate embedding from FULL CONTENT (title + body) for more accurate duplicate detection
    // Truncate content to ~8000 chars to stay within embedding model limits (8191 tokens)
    const truncatedContent = content.substring(0, 8000);
    const combinedText = `${title}\n\n${truncatedContent}`;
    return this.generateEmbedding(combinedText);
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
