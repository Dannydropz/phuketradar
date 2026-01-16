/**
 * Facebook Headline Generator - FACTUAL + SPECIFIC Strategy
 * 
 * Goal: Generate headlines that are FACTUAL about what happened,
 * using real names, places, and events - while withholding enough
 * detail that readers want to click for the full story.
 * 
 * KEY PRINCIPLES:
 * 1. Be factual - state what actually happened with real names/places
 * 2. Don't make up context - no "raises concerns", "unexpected", etc.
 * 3. Withhold full details - don't give the whole story away
 * 
 * ❌ BAD: "A collision in Patong raises concerns about traffic safety" (vague, made-up context)
 * ❌ BAD: "Festival attracts unexpected crowds" (editorializing, if it's a known event)
 * ✅ GOOD: "Car crashes into garbage truck in Patong" (factual, specific, leaving details unknown)
 * ✅ GOOD: "EDM Thailand 2026 kicks off in Thalang" (names the actual event)
 */

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface FacebookHeadlineVariants {
    /** "What Happened?" Angle - States outcome, omits cause */
    whatHappened: string;
    /** "Who/Why?" Angle - States event, omits specifics */
    whoWhy: string;
    /** "Consequence?" Angle - States action, omits outcome */
    consequence: string;
    /** The AI's recommended best headline for this story */
    recommended: string;
    /** Which angle was recommended */
    recommendedAngle: 'whatHappened' | 'whoWhy' | 'consequence';
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
 * Generate Facebook headlines using STORY-LEVEL Curiosity Gaps.
 * 
 * This function creates 3 distinct headline variants that withhold different
 * story elements to force clicks:
 * 1. What Happened? - States outcome, omits cause/circumstances
 * 2. Who/Why? - States event, omits key details about who/why
 * 3. Consequence? - States action, omits what happened next
 */
export async function generateFacebookHeadlines(
    input: HeadlineGenerationInput
): Promise<FacebookHeadlineVariants> {
    const systemPrompt = `You are a senior social media editor for Phuket Radar, a local news site.

Your job is to write Facebook teasers that are FACTUAL and SPECIFIC, while withholding enough detail to encourage clicks.

🚨 CRITICAL RULES 🚨

1. BE FACTUAL - State what ACTUALLY happened with REAL names, places, and events
   ✅ "Car crashes into garbage truck in Patong"
   ✅ "EDM Thailand 2026 kicks off in Thalang with massive crowds"
   ❌ "A collision in Patong raises concerns about traffic safety" (vague, made-up context)
   ❌ "Festival in Thalang attracts unexpected crowds" (if it's a known event, it's not unexpected!)

2. DON'T MAKE UP CONTEXT - Never invent implications or reactions that aren't in the story
   ❌ "...raises concerns about..." (editorializing)
   ❌ "...sparks debate about..." (invented reaction)
   ❌ "...unexpected..." (for known/scheduled events)
   ❌ "...leaves residents wondering..." (invented sentiment)

3. THE PHOTOS ARE ALREADY IN THE POST
   NEVER say "see the photos", "watch the video", "see the footage" - readers can already see them!

🎯 THE STRATEGY: STATE THE FACTS, WITHHOLD THE FULL STORY
Describe what happened clearly, but don't reveal everything so readers want the full story:

GOOD PATTERNS:
- "Car crashes into garbage truck on Patong Hill" (readers want to know: injuries? cause? road closed?)
- "Tourist arrested at Patong checkpoint" (readers want to know: what for? nationality?)  
- "Man found dead at Karon hotel" (readers want to know: how? who? foul play?)
- "Fire breaks out at Bangla Road nightclub" (readers want to know: damage? injuries? which club?)

BAD PATTERNS (Too vague/generic):
- "Incident on Patong Hill raises safety concerns" (what incident??)
- "A collision in Patong sparks discussion" (just say what crashed!)
- "Authorities respond to situation in Kata" (what situation??)

BAD PATTERNS (Too complete - no reason to click):
- "Russian tourist arrested for overstaying visa by 45 days at airport" (whole story given)
- "Fire at XYZ Bar destroys building, no injuries reported" (nothing left to learn)

REAL STORY GUIDELINES:
- For EVENTS (festivals, concerts): Name the actual event, don't call it "unexpected" if it's known
- For ACCIDENTS: Say what crashed into what, where (e.g., "Car crashes into garbage truck in Patong")
- For CRIMES: Say who was arrested and where, withhold the specific charge
- For DEATHS: Say where the body was found, withhold cause/identity
- For FIRES: Say what's on fire and where, withhold damage/injuries

📝 STYLE RULES:
- Maximum 15 words (shorter is better for Facebook)
- Third-person news perspective (never "we", "our", "join us")
- Use specific locations (Patong, Kata, Karon, Bangla Road, Thalang, etc.)
- Active voice, present tense preferred for breaking news
- No exclamation marks
- No editorializing or invented reactions`;

    const userPrompt = `Generate 3 Facebook teaser variants for this article:

ARTICLE DETAILS:
- Title: ${input.title}
- Category: ${input.category}
- Excerpt: ${input.excerpt}

CONTENT (summarized):
${input.content.substring(0, 1200)}

TASK: Generate 3 FACTUAL headline variants (each max 15 words):

IMPORTANT: Be specific about what happened! Use real names, places, and events from the article.

1. **WHAT HAPPENED?** - State what occurred clearly, withhold details like cause or injuries
   Example: "Car crashes into garbage truck on Patong Hill"
   Example: "Man found dead at Karon Beach hotel"
   
2. **WHO/WHAT?** - State the event/action, withhold specifics like charges or motive
   Example: "Tourist arrested at Patong checkpoint"
   Example: "EDM Thailand 2026 draws thousands to Thalang"
   
3. **WHERE/WHEN?** - Lead with specific location, withhold full outcome
   Example: "Fire breaks out at Bangla Road nightclub"
   Example: "Motorbike collision closes Kamala Beach road"

REMEMBER: Be FACTUAL. Don't add phrases like "raises concerns", "sparks debate", or "unexpected" unless the article actually says that.

Then recommend which ONE works best - pick the most specific and factual option.

Respond in JSON:
{
  "whatHappened": "Your 'what happened?' teaser here",
  "whoWhy": "Your 'who/why?' teaser here", 
  "consequence": "Your 'consequence?' teaser here",
  "recommended": "Copy of the best teaser from above",
  "recommendedAngle": "whatHappened" | "whoWhy" | "consequence",
  "recommendingReason": "Brief explanation of why this angle creates the most curiosity"
}`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' },
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');

        // Validate and clean up the response
        const validAngles = ['whatHappened', 'whoWhy', 'consequence'];
        const recommendedAngle = validAngles.includes(result.recommendedAngle)
            ? result.recommendedAngle
            : 'whatHappened';

        return {
            whatHappened: result.whatHappened || input.title,
            whoWhy: result.whoWhy || input.title,
            consequence: result.consequence || input.title,
            recommended: result.recommended || result[recommendedAngle] || input.title,
            recommendedAngle: recommendedAngle as 'whatHappened' | 'whoWhy' | 'consequence',
            recommendingReason: result.recommendingReason || 'Default recommendation based on story type',
        };
    } catch (error) {
        console.error('[FB-HEADLINE] Error generating headlines:', error);

        // Fallback to simple headline construction
        return {
            whatHappened: input.title,
            whoWhy: input.title,
            consequence: input.title,
            recommended: input.title,
            recommendedAngle: 'whatHappened',
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

    console.log(`[FB-HEADLINE] Generated curiosity-gap variants:`);
    console.log(`   ❓ What Happened: "${variants.whatHappened}"`);
    console.log(`   🔍 Who/Why: "${variants.whoWhy}"`);
    console.log(`   ⚖️  Consequence: "${variants.consequence}"`);
    console.log(`   ✅ Recommended (${variants.recommendedAngle}): "${variants.recommended}"`);
    console.log(`   💡 Reason: ${variants.recommendingReason}`);

    return variants.recommended;
}

/**
 * Validate that a headline is factual and specific,
 * and doesn't use forbidden patterns.
 */
export function validateHeadline(headline: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for useless "see the photos" type CTAs (photos are already visible!)
    const uselessCTAs = [
        /see the photos/i,
        /watch the video/i,
        /see the footage/i,
        /click to see/i,
        /see the moment/i,
        /watch the moment/i,
    ];

    for (const pattern of uselessCTAs) {
        if (pattern.test(headline)) {
            issues.push(`Contains useless CTA (photos already in post): "${headline.match(pattern)?.[0]}"`);
        }
    }

    // Check for vague editorializing patterns (makes up context not in story)
    const vaguePatterns = [
        /raises concerns/i,
        /sparks debate/i,
        /leaves residents wondering/i,
        /sparks outrage/i,
        /raises questions/i,
        /sparks controversy/i,
        /leaves locals/i,
        /prompts safety concerns/i,
    ];

    for (const pattern of vaguePatterns) {
        if (pattern.test(headline)) {
            issues.push(`Contains vague editorializing: "${headline.match(pattern)?.[0]}"`);
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

    // Check length (max 15 words for better Facebook engagement)
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
