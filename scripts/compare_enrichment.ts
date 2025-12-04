
import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Sample Story (Simulated Raw Input)
const sampleStory = {
    title: "Tourist injured in jet ski collision at Patong Beach",
    category: "Local",
    content: "At 14:30 today, Patong Police received a report of a jet ski accident. Officers arrived at the scene near the lifeguard tower. A 25-year-old Russian tourist, Mr. Ivan Petrov, was driving a jet ski and collided with another jet ski driven by a Thai national, Somchai Jai-dee. The tourist suffered a broken leg and was taken to Patong Hospital. The Thai driver was uninjured. Police are investigating who was at fault. The waves were high today due to the monsoon season.",
    excerpt: "A Russian tourist was hospitalized with a broken leg after a jet ski collision at Patong Beach this afternoon."
};

const PHUKET_CONTEXT_MAP = {
    "Patong": "Patong, a major tourist beach area on Phuket's west coast",
    "Patong Hospital": "the primary government hospital serving the tourist district"
};

const contextMapString = Object.entries(PHUKET_CONTEXT_MAP)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

async function runComparison() {
    console.log("🚀 Starting Model Comparison: GPT-4o vs GPT-4o-mini");
    console.log("---------------------------------------------------");
    console.log(`Input Story: "${sampleStory.title}"`);
    console.log("---------------------------------------------------\n");

    // 1. Run GPT-4o (Current Production Prompt)
    console.log("1️⃣  Running GPT-4o (Current Production)...");
    const start4o = Date.now();

    const prompt4o = `You are a Senior International Correspondent for a major wire service (like AP, Reuters, or AFP) stationed in Phuket, Thailand.
    
YOUR MISSION:
Take the provided local news report and rewrite it into a WORLD-CLASS PIECE OF JOURNALISM that rivals the quality of the New York Times or BBC.

INPUT ARTICLE:
Title: ${sampleStory.title}
Category: ${sampleStory.category}
Content: ${sampleStory.content}

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

    const completion4o = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "system",
                content: "You are a world-class journalist and editor. You write with precision, depth, and narrative flair. You always output valid JSON.",
            },
            {
                role: "user",
                content: prompt4o,
            },
        ],
        temperature: 0.5,
        response_format: { type: "json_object" },
    });

    const result4o = JSON.parse(completion4o.choices[0].message.content || "{}");
    const time4o = Date.now() - start4o;
    console.log(`✅ GPT-4o finished in ${time4o}ms\n`);


    // 2. Run GPT-4o-mini (Refined Prompt)
    console.log("2️⃣  Running GPT-4o-mini (Refined Prompt)...");
    const startMini = Date.now();

    const promptMini = `You are a Senior Editor for a top-tier international news wire (AP/Reuters).
    
TASK: Rewrite this local report into a polished, professional news article.

INPUT:
Title: ${sampleStory.title}
Category: ${sampleStory.category}
Content: ${sampleStory.content}

CONTEXT:
${contextMapString}

GUIDELINES:
1. **Dateline:** Start with "**PATONG, PHUKET –**" (or relevant location).
2. **Style:** 
   - Use "Inverted Pyramid" structure (most important facts first).
   - **Active Voice** only. (e.g., "Police investigated" not "The investigation was carried out by police").
   - **Objective Tone:** No sensationalism, no exclamation points.
   - **Concise:** Short paragraphs (1-2 sentences).
3. **Context Section:** End with "<h3>Context: [Topic]</h3>". Explain *why* this matters (e.g., safety trends, weather impact).
4. **Factuality:** Stick strictly to the facts provided. Do not hallucinate details.

JSON OUTPUT:
{
  "enrichedTitle": "Strong, AP-Style Headline",
  "enrichedContent": "HTML content with dateline and context section",
  "enrichedExcerpt": "Summary"
}`;

    const completionMini = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: "You are a precise, no-nonsense news editor. You value clarity, accuracy, and speed. You hate fluff and passive voice.",
            },
            {
                role: "user",
                content: promptMini,
            },
        ],
        temperature: 0.3, // Lower temp for mini to keep it focused
        response_format: { type: "json_object" },
    });

    const resultMini = JSON.parse(completionMini.choices[0].message.content || "{}");
    const timeMini = Date.now() - startMini;
    console.log(`✅ GPT-4o-mini finished in ${timeMini}ms\n`);

    // Output Comparison
    console.log("===================================================");
    console.log("COMPARISON RESULTS");
    console.log("===================================================\n");

    console.log("--- GPT-4o (Current Premium) ---");
    console.log(`HEADLINE: ${result4o.enrichedTitle}`);
    console.log(`CONTENT:\n${result4o.enrichedContent.replace(/<[^>]*>/g, '')}\n`); // Strip HTML for readability
    console.log(`(Cost: ~High | Time: ${time4o}ms)`);
    console.log("\n---------------------------------------------------\n");

    console.log("--- GPT-4o-mini (Proposed Budget) ---");
    console.log(`HEADLINE: ${resultMini.enrichedTitle}`);
    console.log(`CONTENT:\n${resultMini.enrichedContent.replace(/<[^>]*>/g, '')}\n`);
    console.log(`(Cost: ~30x Cheaper | Time: ${timeMini}ms)`);
    console.log("\n===================================================");
}

runComparison().catch(console.error);
