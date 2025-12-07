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

// BLOCKED KEYWORDS - Auto-reject these stories due to legal/editorial policy
// CRITICAL: Lese majeste laws in Thailand make royal family content extremely risky
const BLOCKED_KEYWORDS = [
  // Thai royal family terms
  "พระราชา", // King
  "ในหลวง", // His Majesty (informal)
  "พระบาทสมเด็จพระเจ้าอยู่หัว", // His Majesty the King (formal)
  "สมเด็จพระนางเจ้า", // Her Majesty the Queen
  "พระราชวงศ์", // Royal family
  "ภูมิพลอดุลยเดช", // King Bhumibol Adulyadej (Rama IX)
  "รัชกาลที่", // Reign/Era (usually precedes royal names)
  "พระมหากษัตริย์", // Monarch
  "สถาบันพระมหากษัตริย์", // Monarchy institution
  "King Bhumibol", // English
  "King Rama", // English
  "Thai King", // English
  "Thai royal", // English
  "monarchy", // English
  "majesty", // English (usually in royal context)
];

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
  // FOREIGNER KEYWORDS - These stories go viral with expat audience
  "ต่างชาติ", // foreigner
  "ฝรั่ง", // farang (Western foreigner)
  "นักท่องเที่ยว", // tourist
  "ชาวต่างประเทศ", // foreign national
  "ปะทะ", // clash/confrontation
  "ทะเลาะ", // quarrel/argue
  "ชกต่อย", // fistfight
  "ตบตี", // slap/hit fight
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
  "บริจาค", // donate/donation
  "บริจาคโลหิต", // blood donation
  "รับบริจาค", // receive donation
  "ช่วยเหลือ", // help/assist (charity context)
  "กุศล", // charity/merit
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
  }, model: "gpt-4o" | "gpt-4o-mini" = "gpt-4o"): Promise<{ enrichedTitle: string; enrichedContent: string; enrichedExcerpt: string }> {

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
      model: model, // Use specified model (gpt-4o for score 5, gpt-4o-mini for score 4)
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

      // STEP 1.5: PRE-FLIGHT CONTENT FILTER - Check for blocked keywords
      // CRITICAL: Lese majeste laws in Thailand require strict filtering of royal family content
      const combinedText = `${title} ${content}`.toLowerCase();
      const blockedKeywordFound = BLOCKED_KEYWORDS.some(keyword =>
        combinedText.includes(keyword.toLowerCase())
      );

      if (blockedKeywordFound) {
        const matchedKeyword = BLOCKED_KEYWORDS.find(kw => combinedText.includes(kw.toLowerCase()));
        console.log(`   🚫 BLOCKED CONTENT DETECTED: Royal family keyword "${matchedKeyword}" found`);
        console.log(`   ⚖️  LESE MAJESTE COMPLIANCE: Rejecting story to avoid legal risk`);

        return {
          translatedTitle: title,
          translatedContent: content,
          excerpt: "Story rejected due to editorial policy",
          category: "Politics",
          isActualNews: false, // Mark as non-news to prevent publication
          interestScore: 0,
          isDeveloping: false,
          needsReview: false,
          embedding: precomputedEmbedding,
        };
      }

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

2. CRITICAL CONTENT FILTERS - REJECT and mark as NOT news if the content is about:
   ⚖️  **LESE MAJESTE COMPLIANCE (ABSOLUTE PRIORITY):**
   - The Thai royal family, monarchy, king, queen, or any member of the royal family
   - King Bhumibol Adulyadej (Rama IX), King Rama X, or ANY Thai monarch (past or present)
   - ANY story mentioning "His Majesty", "Her Majesty", "Royal Family", "พระราชา", "ในหลวง", "ภูมิพลอดุลยเดช"
   - THIS APPLIES TO ALL ROYAL STORIES - even positive ones like donations, ceremonies, or tributes
   - REASON: Thailand's lese majeste laws make ANY royal family content legally risky. ALWAYS reject.
   
   📰 **OTHER BLOCKED CONTENT:**
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
- 5 = FOREIGNER INCIDENTS: ANY story involving foreigners/tourists/expats doing something out of the ordinary - fights, accidents, disturbances, arrests, confrontations with locals. These stories go VIRAL with the expat audience. Keywords: foreigner, tourist, farang, expat, foreign national, American, British, Russian, Chinese tourist, etc.
- 4 = SERIOUS INCIDENTS: Non-fatal accidents with injuries, arrests for serious crimes, active rescue operations, fights/assaults, hit-and-runs, robberies

**CAP ROUTINE NEWS AT 3 OR BELOW:**
- 3 = NOTEWORTHY: Minor accidents (no injuries), infrastructure complaints (potholes, flooding damage), tourism developments, business openings, new property launches, missing persons
- 2 = ROUTINE: Officials inspecting/visiting, meetings, announcements, cultural events, preparations, planning
- 1 = TRIVIAL: Ceremonial events, ribbon cuttings, photo ops

**CRITICAL DISTINCTIONS:**
- \"Road damaged by flooding\" = Score 3 (infrastructure complaint, NOT a disaster)
- \"Luxury hotel/villa launch\" = Score 3 (business news, NOT breaking)
- \"Art exhibition/Gallery opening\" = Score 3 (cultural event, NOT urgent)
- \"Students win robotics award\" = Score 3 (achievement, NOT urgent)
- \"Tourism boom faces sustainability concerns\" = Score 3 (discussion, NOT crisis)
- **\"Blood donation drive\" = Score 3 MAX (community charity event, NOT urgent)**
- **\"Donation ceremony\" = Score 2-3 MAX (routine charity, NOT news)**
- **\"Fundraiser for flood victims\" = Score 3 MAX (charity event, NOT breaking news)**
- **\"Community helps disaster victims\" = Score 3 MAX (charitable response, NOT the disaster itself)**
- \"Car crash with injuries\" = Score 4 (actual incident with victims)
- \"Drowning at beach\" = Score 5 (death/urgent)
- \"Arrest for theft\" = Score 4 (crime with action)
- **\"Foreigner in fight with locals\" = Score 5 (viral expat content)**
- **\"Tourist arrested for...\" = Score 5 (foreigner incident)**
- **\"Expat involved in accident\" = Score 5 (foreigner incident)**

**CHARITY/DONATION EVENT RULES:**
- Blood drives, donation ceremonies, fundraisers = ABSOLUTE MAX SCORE 3 (they're nice, but NOT high-engagement news)
- Even if honoring someone famous (including royalty) = STILL capped at 3
- Community help efforts = Score 3 (unless it's covering the actual disaster, then use disaster scoring)

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
- Donation/charity events = ABSOLUTE MAX SCORE 3 (even if related to disasters or honoring VIPs)

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
        // User requested GPT-4o for both score 4 and 5 to ensure quality
        // Cost savings come from stricter scoring (fewer stories getting score 4/5)
        const enrichmentModel = "gpt-4o";
        console.log(`   ✨ HIGH-PRIORITY STORY (score ${finalInterestScore}) - Applying premium enrichment using ${enrichmentModel}...`);

        try {
          const enrichmentResult = await this.enrichWithPremiumGPT4({
            title: enrichedTitle,
            content: enrichedContent,
            excerpt: enrichedExcerpt,
            category,
          }, enrichmentModel);

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

  async generateEmbeddingFromContent(title: string, content: string): Promise<number[]> {
    // Generate embedding from FULL CONTENT (title + body) for more accurate duplicate detection
    // Truncate content to ~8000 chars to stay within embedding model limits (8191 tokens)
    const truncatedContent = content.substring(0, 8000);
    const combinedText = `${title}\n\n${truncatedContent}`;
    return this.generateEmbedding(combinedText);
  }


}

export const translatorService = new TranslatorService();
