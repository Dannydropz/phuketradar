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
  facebookHeadline?: string;
  needsReview?: boolean;
  reviewReason?: string;
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
  "ชน", // collision/crash
  "รถชน", // car crash
  "ขับหนี", // hit and run
  "หนีหาย", // fled/escaped
  "สาหัส", // seriously injured
  "ระเบิด", // explosion
  "โจรกรรม", // robbery
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
  "เตรียมความพร้อม", // preparation
  "ตรวจเยี่ยม", // inspection visit
  "ลงพื้นที่", // area visit
  "แก้ไขปัญหา", // solve problem/tackle issue
  "ดูแลเรื่อง", // take care of/address
  "ทำงานเพื่อ", // work to/work on
  "บรรเทา", // alleviate/ease
  "ร่วมกัน", // together/jointly (often in meeting contexts)
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

    // Prepare context string from the map
    const contextMapString = Object.entries(PHUKET_CONTEXT_MAP)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join("\n");

    const prompt = `You are a Senior International Correspondent for a major wire service (like AP, Reuters, or AFP) stationed in Phuket, Thailand.
    
YOUR MISSION:
Take the provided local news report and rewrite it into a WORLD-CLASS PIECE OF JOURNALISM that rivals the quality of the New York Times or BBC.

INPUT ARTICLE:
Title: ${params.title}
Category: ${params.category}
Content: ${params.content}

AVAILABLE LOCAL CONTEXT (Use this to add depth):
${contextMapString}

CRITICAL LOCATION VERIFICATION (READ BEFORE WRITING):
- **DATELINE = EVENT LOCATION, NOT PERSON'S ORIGIN:** If "KB Jetski Phuket team helps in Songkhla floods", the dateline should be "**SONGKHLA –**" or "**HAT YAI, SONGKHLA –**" (where the event is), NOT "**PHUKET TOWN –**" (where the team is from).
- **DO NOT HALLUCINATE PHUKET:** If the event is in Hat Yai, Bangkok, Songkhla, or any other location, DO NOT use a Phuket dateline.
- **PERSON'S ORIGIN ≠ EVENT LOCATION:** Just because someone is FROM Phuket does not mean the event HAPPENED in Phuket.
- **READ THE CATEGORY:** If the category is "National", the event is likely NOT in Phuket.
- **VERIFY BEFORE WRITING:** Look at the content - does it mention specific non-Phuket cities, provinces, or landmarks? If yes, use THAT location in the dateline.

STRICT WRITING GUIDELINES:
1. **DATELINE:** Start the article with a dateline in bold caps showing WHERE THE EVENT HAPPENED. E.g., "**HAT YAI, SONGKHLA –**" for Hat Yai events, "**PATONG, PHUKET –**" for Patong events, "**BANGKOK –**" for Bangkok events.
2. **LEDE PARAGRAPH:** Write a powerful, summary lede that answers Who, What, Where, When, and Why in the first sentence.
3. **TONE:** Professional, objective, and authoritative. Avoid "police speak" (e.g., change "proceeded to the scene" to "rushed to the scene"). Use active voice.
4. **STRUCTURE:**
   - **The Narrative:** Tell the story chronologically or by importance.
   - **The "Context" Section:** You MUST end the article with a distinct section titled "<h3>Context: [Topic]</h3>". In this section, explain the broader background (e.g., "Bangla Road's History of Incidents", "Phuket's Struggle with Flooding"). Use the provided context map or general knowledge to explain *why* this matters.
5. **FACTUALITY:** Do NOT invent quotes or specific numbers. You MAY add general context (e.g., "The area is popular with tourists") but not specifics ("5,000 people were there") unless in the source.

EXAMPLE OUTPUT FORMAT:
"**PATONG, PHUKET –** A violent altercation between American tourists turned one of Phuket's most famous nightlife strips into a scene of chaos Saturday night...

The incident unfolded on Bangla Road... [Story continues]...

<h3>Context: Bangla Road's Ongoing Challenge</h3>
This incident highlights ongoing public safety concerns along Bangla Road, which attracts thousands of international visitors nightly..."

Respond in JSON format:
{
  "enrichedTitle": "Compelling, AP-Style Headline (Title Case)",
  "enrichedContent": "Full HTML article starting with DATELINE and ending with CONTEXT SECTION",
  "enrichedExcerpt": "2-3 sentence professional summary"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // UPGRADE: Using GPT-4o for maximum reasoning and writing quality
      messages: [
        {
          role: "system",
          content: "You are a world-class journalist and editor. You write with precision, depth, and narrative flair. You always output valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5, // Balanced for creativity and accuracy
      response_format: { type: "json_object" }, // Enabled for GPT-4o
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
    precomputedEmbedding?: number[],
    checkInLocation?: string
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

      // SCORE LEARNING: Fetch recent manual adjustments to inject as learning examples
      let learningContext = "";
      try {
        const { scoreLearningService } = await import("./score-learning");
        // Get last 10 adjustments across all categories
        const adjustments = await scoreLearningService.getAdjustmentsByCategory("all", 10);

        if (adjustments && adjustments.length > 0) {
          learningContext = `
SCORING CORRECTIONS FROM ADMIN (LEARN FROM THESE MISTAKES):
The admin has previously corrected scores for similar stories. DO NOT repeat these mistakes:
${adjustments.map(adj => `- "${adj.articleTitle.substring(0, 50)}..." was scored ${adj.originalScore} but Admin corrected it to ${adj.adjustedScore}. Reason: ${adj.adjustmentReason || "Over/underscored"}`).join('\n')}
`;
          console.log(`   🧠 Injected ${adjustments.length} learning examples into prompt`);
        }
      } catch (err) {
        console.warn("   ⚠️ Failed to fetch score learning context:", err);
      }

      const prompt = `You are a professional news editor for an English-language news site covering Phuket, Thailand. 

Your task:
1. Determine if this is actual NEWS content (not promotional posts, greetings, or filler content)
2. REJECT and mark as NOT news if the content is about:
   - The Thai royal family, monarchy, or king (sensitive political content)
   - "Phuket Times" or "Phuket Time News" itself (self-referential content about the news source)
3. If it's acceptable news, ${isComplex ? 'polish and rewrite the Google-translated text' : 'translate from Thai to English'} in a clear, professional news style.

CONTEXT & ENRICHMENT REQUIREMENTS:
- If you see location descriptions in parentheses (e.g., "Patong, a major tourist area"), preserve and incorporate them naturally.
- Add brief LOCAL CONTEXT about Phuket locations when relevant to help international readers understand the setting.
- Include BACKGROUND INFORMATION when it adds depth (e.g., "Bangla Road, Patong's famous nightlife strip").
- Use an ENGAGING NEWS STYLE that goes beyond basic facts - help readers understand WHY this matters.
- Maintain all factual details, names, times, and numbers exactly as provided.

4. Extract a concise excerpt (2-3 sentences) written from a THIRD-PERSON NEWS REPORTING perspective with perfect grammar. CRITICAL: Never use first-person ('we', 'our', 'join us') or make it sound like the news site is organizing events. Report objectively.
5. Categorize the article by TOPIC (not urgency).
6. Rate reader interest (1-5 scale).


${isComplex ? 'Google-Translated Text' : 'Original Thai Text'}: ${sourceTextForGPT}
${checkInLocation ? `\nOFFICIAL CHECK-IN LOCATION: "${checkInLocation}"\n(CRITICAL: Use this location to verify where the event happened. If it says "Hat Yai" or "Songkhla", the event is NOT in Phuket.)` : ''}

Respond in JSON format:
{
  "isActualNews": true/false,
  "translatedTitle": "clear, compelling English headline following AP Style with proper company names and context",
  "translatedContent": "professional news article in HTML format with <p> tags and <h2> for subheadings, perfect grammar, natural Phuket context",
  "excerpt": "2-3 sentence summary with flawless grammar and complete sentences",
  "category": "Weather|Local|Traffic|Tourism|Business|Politics|Economy|Crime|National",
  "categoryReasoning": "brief explanation of why you chose this category (1 sentence)",
  "interestScore": 1-5 (integer),
  "isDeveloping": true/false (true if story has limited details/developing situation - phrases like "authorities investigating", "more details to follow", "initial reports", "unconfirmed", sparse information, or breaking news with incomplete facts),
  "needsReview": true/false (Set to TRUE if: 1. You are unsure about the location 2. The story seems like a rumor 3. You had to guess any details 4. It mentions a province outside Phuket but you aren't 100% sure if it's relevant 5. The source text is very short or ambiguous),
  "reviewReason": "Explanation of why this needs human review (required if needsReview is true)",
  "facebookHeadline": "A short, punchy, high-CTR headline specifically for Facebook written from a THIRD-PERSON NEWS REPORTING perspective. CRITICAL: Never use first-person ('Join Us', 'We', 'Our') or calls-to-action that make it sound like the news site is organizing the event. Instead, report the news objectively. Focus on emotion, urgency, location, and impact. Examples: 'Tragedy at Bang Tao: Two family members drown despite red-flag warnings' (GOOD), 'Phuket Community Rallies to Aid Trang Flood Victims' (GOOD), 'Join Us to Help Flood Victims' (BAD - sounds like we're organizing it). Max 15 words."
}

If this is NOT actual news (promotional content, greetings, ads, royal family content, or self-referential Phuket Times content), set isActualNews to false and leave other fields empty.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional news editor and translator for Phuket Radar, an English-language news site covering Phuket, Thailand.

CRITICAL LOCATION VERIFICATION:
- VERIFY THE LOCATION: Determine EXACTLY where the event happened.
- DO NOT HALLUCINATE PHUKET: If the story mentions Hat Yai, Songkhla, Bangkok, Chiang Mai, or other provinces, DO NOT change the location to Phuket.
- PHUKET SOURCE ≠ PHUKET STORY: Sources like "Phuket Info Center" often report on Southern Thailand events (Hat Yai, Trang, Narathiwat).
- CHECK LANDMARKS: "Pholphichai Road", "Wat Plakrim", "Wat Phutthikaram" are in HAT YAI, not Phuket.
- CRITICAL: PERSON'S ORIGIN ≠ EVENT LOCATION: If "Patong Jet Ski team helps with floods", READ CAREFULLY to see WHERE they are helping. They might be FROM Patong but HELPING IN Hat Yai. DO NOT assume the event is in Phuket just because the people are from Phuket.


CRITICAL FACTUALITY RULES:
- DO NOT INVENT FACTS: Do not add details, numbers, quotes, or events not in the source text.
- NO GUESSING: If source says "several people", do NOT change to "five people".
- CONTEXT VS. FICTION: You MAY add context (e.g., "Hat Yai is a major city") but MUST NOT add specific details about the event itself.

GRAMMAR & STYLE:
- Follow AP Style for headlines: capitalize main words
- ALWAYS include company suffixes: Co., Ltd., Inc., Corp., Plc.
- Use proper articles (a, an, the)
- Write in active voice when possible

CATEGORY GUIDE (read full story, not just headline):
- Weather: Natural disasters, typhoons, flooding, landslides, storms (IN PHUKET ONLY)
- Local: Community news, missing persons, drownings, boat accidents, local government
- Traffic: Road accidents (non-criminal), road closures, construction
- Crime: ONLY intentional criminal activity - arrests, theft, assault, scams
- National: Major news from outside Phuket (Bangkok, Hat Yai, Chiang Mai, etc.) AND Southern Thailand floods/disasters that are NOT in Phuket
- WHEN UNCERTAIN: Use "Local" as default

CRITICAL: "Southern Floods" in Hat Yai, Songkhla, Narathiwat, Yala = "National" (NOT "Weather" or "Local")

INTEREST SCORE (1-5) - BE VERY STRICT:
**RESERVE 4-5 FOR HIGH-ENGAGEMENT NEWS ONLY:**
- 5 = BREAKING/URGENT: Deaths, drownings, fatal accidents, violent crime with serious injuries, major fires, natural disasters causing casualties
- 4 = SERIOUS INCIDENTS: Non-fatal accidents with injuries, arrests for serious crimes, active rescue operations, fights/assaults, hit-and-runs, robberies

**CAP ROUTINE NEWS AT 3 OR BELOW:**
- 3 = NOTEWORTHY: Minor accidents (no injuries), infrastructure complaints (potholes, flooding damage), tourism developments, business openings, new property launches, missing persons
- 2 = ROUTINE: Officials inspecting/visiting, meetings, announcements, cultural events, preparations, planning
- 1 = TRIVIAL: Ceremonial events, ribbon cuttings, photo ops

**CRITICAL DISTINCTIONS:**
- "Road damaged by flooding" = Score 3 (infrastructure complaint, NOT a disaster)
- "Luxury hotel/villa launch" = Score 3 (business news, NOT breaking)
- "Art exhibition/Gallery opening" = Score 3 (cultural event, NOT urgent)
- "Students win robotics award" = Score 3 (achievement, NOT urgent)
- "Tourism boom faces sustainability concerns" = Score 3 (discussion, NOT crisis)
- "Car crash with injuries" = Score 4 (actual incident with victims)
- "Drowning at beach" = Score 5 (death/urgent)
- "Arrest for theft" = Score 4 (crime with action)

LOCATION-BASED SCORING:
This is a HYPER-LOCAL PHUKET site.
- Phuket stories: Score normally (1-5)
- Nearby provinces (Phang Nga, Krabi): Score normally if relevant to Phuket
- ALL OTHER LOCATIONS (Hat Yai, Songkhla, Bangkok, etc.): Category="National", ABSOLUTE MAX SCORE=3. NO EXCEPTIONS.
- SPECIFIC BAN: HAT YAI / SOUTHERN FLOODING stories must NEVER be scored above 3. Even if it's a disaster, if it's not in Phuket, it is NOT high interest for this site.

CRITICAL RULES:
- Officials tackle/inspect/discuss = Score 2 (just talk, not action)
- Accident/crash/collision WITH INJURIES = Score 4-5 (actual event with victims)
- Infrastructure damage/complaints = Score 3 (not urgent, just problems)
- Meetings ABOUT disasters ≠ disasters = Score 2
- Hat Yai floods, Bangkok explosions = Category="National", ABSOLUTE MAX SCORE 3 (Do not auto-post)

${learningContext}

Always output valid JSON.`,
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
      const validCategories = ["Weather", "Local", "Traffic", "Tourism", "Business", "Politics", "Economy", "Crime", "National"];
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
        needsReview: result.needsReview || false,
        reviewReason: result.reviewReason,
        embedding,
        facebookHeadline: result.facebookHeadline,
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
