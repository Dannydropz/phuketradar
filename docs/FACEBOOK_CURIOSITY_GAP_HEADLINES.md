# Facebook Headline Generator - Curiosity Gap Strategy

This document explains the Facebook headline generation system implemented for PhuketRadar.com to maximize click-through rate (CTR) using the "Curiosity Gap" strategy.

## Overview

The system generates Facebook headlines that:
- ✅ **Maximize CTR** to PhuketRadar.com
- ✅ **Use Curiosity Gap** strategy to tease assets
- ❌ **Avoid clickbait penalties** from Facebook's algorithms

## Core Constraint: No Withholding Clickbait

Facebook penalizes posts that withhold information. We must state the subject and event clearly while teasing the *asset* (what they'll see on the site).

### ❌ BAD (Penalty Risk)
```
"You won't believe who was arrested."  → Withholds the subject
"This one thing happened in Patong."   → Withholds the event
"Shocking twist in Phuket case."       → Vague and withholds
```

### ✅ GOOD (Curiosity Gap)
```
"Patong Arrest: The viral moment police boxed in the biker gang." → States subject, teases the visual
"French Tourist Arrested: See the 3 visa laws broken."            → States event, teases the list
"UPDATE: Kathu Floods - Drone footage shows worst-hit streets."   → States event, teases visual
```

## The Strategy: "Tease the Asset"

Make users click to see a specific **asset** that cannot be fully conveyed in a headline:

### 1. Tease Visuals
Mention there's something to SEE:
- "Video shows...", "CCTV captures...", "See the photos of..."
- "Watch the moment...", "Drone footage reveals..."
- "The viral clip of...", "See where it happened on the map"

### 2. Tease Lists/Specifics
Mention there's a list or specific detail:
- "The 3 charges filed", "The 5 locations affected"
- "The full list of...", "The exact laws broken"
- "All 7 items found", "The complete timeline"

### 3. Tease Utility
Mention useful information:
- "The fines you could face", "Deportation criteria explained"
- "Visa rules that apply", "What tourists need to know"
- "The emergency numbers to call"

## Three Engagement Angles

For each article, the system generates 3 distinct headline variants:

### 1. Visual Proof Angle
Focus on implying there's something to see on the site.

**Structure:** `[Event Summary] + [Visual Hook]`

**Examples:**
- "Flash floods hit Kathu: See the drone footage of the worst-hit areas."
- "Patong brawl caught on camera: Watch the viral 90-second fight."
- "Karon turtle nesting: See all 124 eggs in the protected nest."

### 2. Specific Consequence Angle
Focus on drilling down into specific outcomes.

**Structure:** `[Event] + [Specific Detail Hook]`

**Examples:**
- "French motorbike racer arrested: The exact visa laws that were broken."
- "Jet ski scam exposed: The 3 charges operators face."
- "Beach overstay case: The 5-year ban criteria that apply."

### 3. Breaking/Update Angle
Focus on urgency and status updates.

**Structure:** `"UPDATE:" or "CONFIRMED:" + [New Development]`

**Examples:**
- "UPDATE: Patong Police confirm checkpoints continue tonight at 3 locations."
- "CONFIRMED: Kathu flood waters receding - 2 roads now open."
- "BREAKING: Search underway for missing British tourist in Rawai."

## Implementation

### Automatic Generation
For **high-interest stories (score 4-5)**, the system automatically generates a Curiosity Gap headline during the translation pipeline:

```typescript
// In translator.ts
if (finalInterestScore >= 4 && result.isActualNews) {
  facebookHeadline = await generateQuickFacebookHeadline(
    enrichedTitle,
    enrichedContent,
    enrichedExcerpt,
    category,
    finalInterestScore,
    hasVideo,
    hasMultipleImages
  );
}
```

### Manual Regeneration API
Admins can regenerate headlines for any article using the API:

```bash
# Regenerate with AI-recommended angle
curl -X POST "https://phuketradar.com/api/admin/articles/{id}/regenerate-headline" \
  -H "Authorization: Basic {credentials}" \
  -H "Content-Type: application/json"

# Force a specific angle
curl -X POST "https://phuketradar.com/api/admin/articles/{id}/regenerate-headline" \
  -H "Authorization: Basic {credentials}" \
  -H "Content-Type: application/json" \
  -d '{"angle": "visualProof"}'
```

**Response:**
```json
{
  "success": true,
  "previousHeadline": "Old headline",
  "newHeadline": "New Curiosity Gap headline",
  "selectedAngle": "visualProof",
  "variants": {
    "visualProof": {
      "headline": "Patong Arrest: Watch the moment police corner the group.",
      "valid": true,
      "issues": []
    },
    "specificConsequence": {
      "headline": "Patong Arrest: The 3 charges filed against the suspects.",
      "valid": true,
      "issues": []
    },
    "breakingUpdate": {
      "headline": "UPDATE: Patong arrest - all 5 suspects now in custody.",
      "valid": true,
      "issues": []
    }
  },
  "recommendation": {
    "angle": "visualProof",
    "reason": "Video content is available, making the visual angle most compelling."
  }
}
```

## Testing

Run the test script to verify headline generation:

```bash
npx tsx scripts/test-curiosity-gap-headlines.ts
```

## Category-Specific Hooks

| Category | Recommended Hooks |
|----------|------------------|
| **Crime** | "The charges", "arrest footage", "what police found", "the evidence" |
| **Traffic** | "collision photos", "the vehicles involved", "road closure map" |
| **Weather** | "drone footage", "satellite imagery", "affected areas map" |
| **Tourism** | "the regulations", "official rules", "what visitors need to know" |
| **Local** | "community response", "the timeline", "eyewitness accounts" |

## Files

- **Generator Service:** `server/services/facebook-headline-generator.ts`
- **Integration Points:** 
  - `server/services/translator.ts` (automatic generation)
  - `server/routes.ts` (manual regeneration API)
- **Test Script:** `scripts/test-curiosity-gap-headlines.ts`

## Validation Rules

Headlines are validated to ensure they don't trigger Facebook penalties:

1. **No withholding patterns:** "you won't believe", "what happened next", etc.
2. **No first-person language:** "join us", "our", "we"
3. **Maximum 15 words**
4. **No exclamation marks** (spam trigger)
5. **No trailing ellipsis** (withholding indicator)

## Best Practices

1. **Always lead with location:** "Patong:", "Kata Beach:", "Phuket Airport:"
2. **Use numbers:** "3 charges", "5 locations", "127 days"
3. **Be specific about the asset:** "the 90-second video" not just "the video"
4. **Match angle to content type:**
   - Video → Visual Proof
   - Legal consequences → Specific Consequence
   - Developing story → Breaking/Update
5. **Test variants:** The API returns all 3 angles so you can A/B test
