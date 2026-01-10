/**
 * Facebook Headline Generator - STORY-LEVEL Curiosity Gap Strategy
 * 
 * Goal: Generate headlines that maximize CTR by WITHHOLDING KEY STORY DETAILS
 * so readers MUST click to learn what happened.
 * 
 * CRITICAL INSIGHT: "See the photos" is USELESS when photos are already in the post!
 * Instead, withhold WHO/WHAT/WHY/HOW so readers must click for the story.
 * 
 * ❌ BAD: "See the photos of the accident" (photos already visible in post)
 * ❌ BAD: "Tourist arrested for drug possession in Patong" (whole story given)
 * ✅ GOOD: "Tourist arrested after police search at Patong checkpoint" (what did they find?)
 * ✅ GOOD: "A man has been found dead in Phuket after..." (how? why?)
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
    const systemPrompt = `You are a senior social media editor for a news site.

Your job is to write Facebook teasers that MAXIMIZE click-through by creating STORY-LEVEL CURIOSITY GAPS.

🚨 CRITICAL: THE PHOTOS ARE ALREADY IN THE POST! 🚨
NEVER say "see the photos", "watch the video", "see the footage" - readers can already see them!
Your job is to withhold STORY DETAILS, not promise visual "assets".

🎯 THE STRATEGY: WITHHOLD KEY STORY DETAILS
Make readers curious about WHO/WHAT/WHY/HOW - things they can ONLY learn by clicking:

PATTERN 1 - STATE OUTCOME, OMIT CAUSE:
- "A man has been found dead after..." (how? why? click to find out)
- "Tourist hospitalized after incident at..." (what happened?)
- "Police arrest foreigner following..." (what did he do?)

PATTERN 2 - STATE EVENT, OMIT KEY DETAILS:
- "Police investigating after incident in Patong" (what incident?)
- "Locals fighting back as authorities issue notices" (what notices? why?)
- "Cases surging once again in Phuket" (what cases?)

PATTERN 3 - STATE ACTION, OMIT CONSEQUENCE:
- "Tourist arrested after altercation with taxi driver" (what happened next?)
- "Authorities issue warning after discovery at beach" (what was found?)
- "Expat faces deportation after police search" (what did they find?)

❌ FORBIDDEN (Too much detail - no reason to click):
- "Tourist arrested for drug possession at Patong Beach checkpoint"
- "Man dies after drowning at Kata Beach despite lifeguard warnings"
- "Russian tourist arrested for overstaying visa by 45 days"

❌ FORBIDDEN (Useless CTAs - photos already visible):
- "See the photos of..."
- "Watch the moment..."
- "See the video of..."
- "Click to see..."

✅ EXAMPLES THAT WORK:
- "Foreigner found unconscious on Bangla Road" (what happened to him?)
- "Tourist arrested after police discover..." (what did police discover?)
- "Phuket vendor goes viral after encounter with..." (encounter with who?)
- "Locals outraged after authorities announce..." (announce what?)

📝 STYLE RULES:
- Maximum 20 words
- Third-person news perspective (never "we", "our", "join us")
- Be specific about locations (Patong, Kata, Karon, Bangla Road, etc.)
- Use "after", "following", "as" to create trailing suspense
- Active voice
- No exclamation marks`;

    const userPrompt = `Generate 3 Facebook teaser variants for this article:

ARTICLE DETAILS:
- Title: ${input.title}
- Category: ${input.category}
- Excerpt: ${input.excerpt}

CONTENT (summarized):
${input.content.substring(0, 1200)}

TASK: Generate 3 teasers that WITHHOLD different story elements:

1. **WHAT HAPPENED?** - State the outcome but omit the cause/circumstances
   Example: "A man has been found dead after incident at Patong hotel"
   
2. **WHO/WHY?** - State the event but omit specifics about who did it or why
   Example: "Police investigating after discovery at Kata Beach"
   
3. **CONSEQUENCE?** - State the action but omit what happened next
   Example: "Tourist arrested following altercation with local vendor"

Then recommend which ONE works best based on story type and maximum curiosity potential.

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
 * Validate that a headline follows Curiosity Gap principles
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

    // Check length (max 20 words)
    const wordCount = headline.split(/\s+/).length;
    if (wordCount > 20) {
        issues.push(`Too long: ${wordCount} words (max 20)`);
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
