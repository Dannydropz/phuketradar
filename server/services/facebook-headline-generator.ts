/**
 * Facebook Headline Generator - Curiosity Gap Strategy
 * 
 * Goal: Generate headlines that maximize CTR to PhuketRadar.com by leveraging
 * the "Curiosity Gap" strategy WITHOUT using "Withholding Information" clickbait.
 * 
 * Core Strategy: "Tease the Asset" - Make users click to see a specific asset
 * or detail that cannot be fully conveyed in a headline.
 * 
 * ❌ BAD (Penalty Risk): "You won't believe who was arrested." (Withholds the subject)
 * ❌ BAD (Penalty Risk): "This one thing happened in Patong." (Withholds the event)
 * ✅ GOOD (Curiosity Gap): "Patong Arrest: The viral moment police boxed in the biker gang." (States the subject/event, teases the visual)
 */

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface FacebookHeadlineVariants {
    /** "Visual Proof" Angle - Implies there's something to see on the site */
    visualProof: string;
    /** "Specific Consequence" Angle - Drills down into specific outcomes */
    specificConsequence: string;
    /** "Breaking/Update" Angle - Urgency and status updates */
    breakingUpdate: string;
    /** The AI's recommended best headline for this story */
    recommended: string;
    /** Which angle was recommended: 'visualProof' | 'specificConsequence' | 'breakingUpdate' */
    recommendedAngle: 'visualProof' | 'specificConsequence' | 'breakingUpdate';
    /** Reasoning for why this angle was recommended */
    recommendingReason: string;
}

export interface HeadlineGenerationInput {
    title: string;
    content: string;
    excerpt: string;
    category: string;
    interestScore: number;
    hasVideo?: boolean;
    hasMultipleImages?: boolean;
    hasCCTV?: boolean;
    hasMap?: boolean;
    isDeveloping?: boolean;
}

/**
 * Generate Facebook headlines using the Curiosity Gap strategy.
 * 
 * This function creates 3 distinct headline variants:
 * 1. Visual Proof Angle - Teases visuals (video, photos, CCTV, maps)
 * 2. Specific Consequence Angle - Teases specific outcomes (fines, charges, laws)
 * 3. Breaking/Update Angle - Urgency and status updates
 */
export async function generateFacebookHeadlines(
    input: HeadlineGenerationInput
): Promise<FacebookHeadlineVariants> {
    const systemPrompt = `You are a senior social media editor for PhuketRadar.com, a news site covering Phuket, Thailand.

Your job is to write Facebook headlines that MAXIMIZE click-through rate (CTR) to the website using the "Curiosity Gap" strategy.

🚨 CRITICAL CONSTRAINT - NO WITHHOLDING CLICKBAIT 🚨
Facebook PENALIZES posts that withhold information. You MUST state the subject and event clearly.

❌ FORBIDDEN (Will be penalized by Facebook):
- "You won't believe who was arrested." (Withholds the subject)
- "This one thing happened in Patong." (Withholds the event)
- "Shocking twist in Phuket case." (Vague and withholds)
- "What they found will shock you." (Classic clickbait)

✅ ALLOWED (Curiosity Gap - Teases the Asset):
- "Patong Arrest: The viral moment police boxed in the biker gang." (States subject, teases the visual)
- "French Tourist Arrested: See the 3 visa laws that were broken." (States event, teases the list)
- "UPDATE: Kathu Floods - Drone footage shows the worst-hit streets." (States event, teases visual)

🎯 THE STRATEGY: "TEASE THE ASSET"
Your goal is to make users click to see a specific asset that cannot be fully conveyed in a headline:

1️⃣ **TEASE VISUALS**: Mention there's something to SEE
   - "Video shows...", "CCTV captures...", "See the photos of...", "Watch the moment...", "Drone footage reveals..."
   - "The viral clip of...", "See where it happened on the map"
   
2️⃣ **TEASE LISTS/SPECIFICS**: Mention there's a list or specific detail
   - "The 3 charges filed", "The 5 locations affected", "The full list of..."
   - "The exact laws broken", "All 7 items found", "The complete timeline"
   
3️⃣ **TEASE UTILITY**: Mention useful information
   - "The fines you could face", "Deportation criteria explained", "Visa rules that apply"
   - "What tourists need to know", "The emergency numbers to call"

📝 HEADLINE STRUCTURE TEMPLATES:

VISUAL PROOF ANGLE:
- [Location]: [Event Summary] - [Visual Hook]
- "[Event]: See the [video/photos/CCTV footage/drone footage] of [teaser]"
- "[Subject] caught on camera: The [viral/shocking/dramatic] moment [teaser]"

SPECIFIC CONSEQUENCE ANGLE:
- [Event] in [Location]: [The specific detail hook]
- "[Subject] faces [consequence]: The exact [charges/fines/laws] that [teaser]"
- "[Category] breakdown: The [number] [things] that [teaser]"

BREAKING/UPDATE ANGLE:
- "UPDATE: [New Development] - [status hook]"
- "CONFIRMED: [Official statement] + [what this means]"
- "BREAKING: [Event] - [current status hook]"

🎨 STYLE RULES:
- Maximum 15 words per headline
- Use colons to separate hooks
- Be specific about locations (Patong, Kata, Karon, etc.)
- Never use first-person ("Join us", "We", "Our")
- Write from third-person news perspective
- Use active voice
- Include numbers when possible ("3 arrests", "5 locations")
- No exclamation marks (they trigger spam filters)
- AVOID these words: "shocking", "unbelievable", "incredible", "amazing" (clickbait triggers)
- PREFER these words: "viral", "dramatic", "intense", "critical", "full", "exact"

📊 CATEGORY-SPECIFIC HOOKS:

CRIME: "The charges", "arrest footage", "what police found", "the evidence"
TRAFFIC: "collision photos", "the vehicles involved", "road closure map", "the moment of impact"
WEATHER: "drone footage", "satellite imagery", "affected areas map"
TOURISM: "the regulations", "official rules", "what visitors need to know"
LOCAL: "community response", "the timeline", "eyewitness accounts"`;

    const userPrompt = `Generate 3 Facebook headline variants for this article:

ARTICLE DETAILS:
- Title: ${input.title}
- Category: ${input.category}
- Interest Score: ${input.interestScore}/5
- Excerpt: ${input.excerpt}

CONTENT:
${input.content.substring(0, 1500)}

AVAILABLE ASSETS:
- Has Video: ${input.hasVideo ? 'YES - You CAN say "See the video" or "Watch the footage"' : 'NO - Do NOT mention video/footage/watch - USE PHOTOS INSTEAD'}
- Has Multiple Images: ${input.hasMultipleImages ? 'YES - You CAN say "See the photos" or "images"' : 'NO - Do NOT say "photos" or "images" (only 1 image exists)'}
- Has CCTV Footage: ${input.hasCCTV ? 'YES - You CAN mention "CCTV footage"' : 'NO - Do NOT mention CCTV'}
- Has Map: ${input.hasMap ? 'YES' : 'NO'}
- Is Developing Story: ${input.isDeveloping ? 'YES (use UPDATE angle)' : 'NO'}

🚨 CRITICAL ASSET RULE - NO FALSE PROMISES 🚨
- If "Has Video" is NO: Do NOT use words like "video", "footage", "watch", "clip" - instead use "details", "report", "story"
- If "Has Video" is YES: You CAN use "See the video", "Watch the moment", "footage shows"
- If "Has Multiple Images" is YES but no video: Use "See the photos" instead of "Watch the video"
- For the visual angle when no video exists: Focus on "the full story", "exclusive details", or specific consequences

TASK: Generate exactly 3 headline variants following these angles:

1. **VISUAL PROOF ANGLE** - Imply there's something to see on the site
   Structure: [Event Summary] + [Visual Hook]
   ${input.hasVideo ? 'Example: "Flash floods hit Kathu: See the drone footage of the worst-hit areas."' : 'Example (NO VIDEO): "Jet ski scam exposed: See the photos and full victim account."'}

2. **SPECIFIC CONSEQUENCE ANGLE** - Drill into specific outcomes (fines, laws, charges)
   Structure: [Event] + [Specific Detail Hook]
   Example: "French motorbike racer arrested: The exact visa laws that were broken."

3. **BREAKING/UPDATE ANGLE** - Urgency and status updates
   Structure: "UPDATE:" or "CONFIRMED:" + [New Development]
   Example: "UPDATE: Patong Police confirm checkpoints will continue tonight at these 3 locations."

Then recommend which ONE headline to use based on:
- The available assets (if video exists, visual angle is strong; if no video, prefer consequence or update angle)
- The story type (crime stories → consequence angle, developing stories → update angle)
- Maximum CTR potential

Respond in JSON:
{
  "visualProof": "Your Visual Proof headline here",
  "specificConsequence": "Your Specific Consequence headline here",
  "breakingUpdate": "Your Breaking/Update headline here",
  "recommended": "Copy of the best headline from above",
  "recommendedAngle": "visualProof" | "specificConsequence" | "breakingUpdate",
  "recommendingReason": "Brief explanation of why this angle works best for this story"
}`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7, // Slightly higher for creative headlines
            response_format: { type: 'json_object' },
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');

        // Validate and clean up the response
        const validAngles = ['visualProof', 'specificConsequence', 'breakingUpdate'];
        const recommendedAngle = validAngles.includes(result.recommendedAngle)
            ? result.recommendedAngle
            : 'visualProof';

        return {
            visualProof: result.visualProof || input.title,
            specificConsequence: result.specificConsequence || input.title,
            breakingUpdate: result.breakingUpdate || `UPDATE: ${input.title}`,
            recommended: result.recommended || result[recommendedAngle] || input.title,
            recommendedAngle: recommendedAngle as 'visualProof' | 'specificConsequence' | 'breakingUpdate',
            recommendingReason: result.recommendingReason || 'Default recommendation based on story type',
        };
    } catch (error) {
        console.error('[FB-HEADLINE] Error generating headlines:', error);

        // Fallback to simple headline construction
        return {
            visualProof: `${input.category} Update: ${input.title.substring(0, 80)}`,
            specificConsequence: input.title,
            breakingUpdate: `UPDATE: ${input.title.substring(0, 80)}`,
            recommended: input.title,
            recommendedAngle: 'visualProof',
            recommendingReason: 'Fallback due to generation error',
        };
    }
}

/**
 * Quick headline generator for use in the translation pipeline.
 * Returns just the recommended headline to minimize latency.
 */
export async function generateQuickFacebookHeadline(
    title: string,
    content: string,
    excerpt: string,
    category: string,
    interestScore: number,
    hasVideo: boolean = false,
    hasMultipleImages: boolean = false
): Promise<string> {
    const variants = await generateFacebookHeadlines({
        title,
        content,
        excerpt,
        category,
        interestScore,
        hasVideo,
        hasMultipleImages,
    });

    console.log(`[FB-HEADLINE] Generated variants:`);
    console.log(`   📸 Visual: "${variants.visualProof}"`);
    console.log(`   ⚖️  Consequence: "${variants.specificConsequence}"`);
    console.log(`   🚨 Breaking: "${variants.breakingUpdate}"`);
    console.log(`   ✅ Recommended (${variants.recommendedAngle}): "${variants.recommended}"`);
    console.log(`   💡 Reason: ${variants.recommendingReason}`);

    return variants.recommended;
}

/**
 * Validate that a headline follows Curiosity Gap principles
 * and doesn't use forbidden clickbait patterns.
 */
export function validateHeadline(headline: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for withholding clickbait patterns
    const withholdingPatterns = [
        /you won't believe/i,
        /this one thing/i,
        /what happened next/i,
        /shocking twist/i,
        /will shock you/i,
        /can't believe/i,
        /\.\.\.$/, // Trailing ellipsis (withholding)
        /you'll never guess/i,
        /what they found/i,
        /the reason why/i,
    ];

    for (const pattern of withholdingPatterns) {
        if (pattern.test(headline)) {
            issues.push(`Contains withholding pattern: "${headline.match(pattern)?.[0]}"`);
        }
    }

    // Check for first-person language
    const firstPersonPatterns = [
        /\bjoin us\b/i,
        /\bour\b/i,
        /\bwe\b/i,
        /\bour team\b/i,
    ];

    for (const pattern of firstPersonPatterns) {
        if (pattern.test(headline)) {
            issues.push(`Contains first-person language: "${headline.match(pattern)?.[0]}"`);
        }
    }

    // Check length (max 15 words)
    const wordCount = headline.split(/\s+/).length;
    if (wordCount > 15) {
        issues.push(`Too long: ${wordCount} words (max 15)`);
    }

    // Check for exclamation marks (spam trigger)
    if (headline.includes('!')) {
        issues.push('Contains exclamation mark (spam trigger)');
    }

    return {
        valid: issues.length === 0,
        issues,
    };
}
