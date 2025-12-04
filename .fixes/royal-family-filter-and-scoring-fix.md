# Royal Family Filter & Interest Score Calibration Fix

**Date**: 2025-12-04  
**Issue**: Story about King Bhumibol Adulyadej blood donation drive was published with interest score 4

## Problems Identified

### 1. **CRITICAL: Lese Majeste Compliance Failure** ⚖️
- A story about the Thai royal family (King Bhumibol Adulyadej) was published
- Thailand's lese majeste laws make ANY royal family content extremely risky
- Even positive stories (blood donations, tributes) should be blocked
- **The rule existed but was not comprehensive enough**

### 2. **Interest Score Miscalibration**
- A blood donation drive was scored as 4/5 (high interest)
- Score 4-5 should be reserved for: crime, accidents, disasters, major incidents
- Blood drives are routine community events and should max out at 3

## Solutions Implemented

### 1. Three-Layer Royal Family Filter

#### Layer 1: Pre-Flight Keyword Blocking (NEW)
```typescript
const BLOCKED_KEYWORDS = [
  // Thai terms
  "พระราชา", // King
  "ในหลวง", // His Majesty
  "พระบาทสมเด็จพระเจ้าอยู่หัว", // His Majesty the King (formal)
  "ภูมิพลอดุลยเดช", // King Bhumibol Adulyadej
  "รัชกาลที่", // Reign/Era
  // English terms
  "King Bhumibol",
  "King Rama",
  "Thai King",
  "Thai royal",
  "monarchy",
  "majesty",
];
```

**How it works:**
- Checks title + content BEFORE translation
- Immediately rejects if any blocked keyword found
- Marks as `isActualNews: false` to prevent publication
- Logs rejection reason for audit trail

#### Layer 2: AI Prompt Filter (STRENGTHENED)
Updated the AI prompt to explicitly state:
- Reject ALL royal family content (even positive stories)
- Specifically mentions King Bhumibol, Rama IX, Rama X
- Explains lese majeste compliance requirement
- Applies to donations, ceremonies, tributes

#### Layer 3: AI System Message (UPDATED)
Reinforced in system instructions that royal content is blocked

### 2. Donation/Charity Event Scoring Fix

#### Added Donation Keywords to COLD_KEYWORDS
```typescript
const COLD_KEYWORDS = [
  // ... existing keywords
  "บริจาค", // donate/donation
  "บริจาคโลหิต", // blood donation
  "รับบริจาค", // receive donation
  "ช่วยเหลือ", // help/assist (charity)
  "กุศล", // charity/merit
];
```

These keywords trigger a -1 score penalty in the keyword boosting logic.

#### Updated AI Scoring Rules
Added explicit examples to the AI prompt:
```
**CRITICAL DISTINCTIONS:**
- "Blood donation drive" = Score 3 MAX (community charity, NOT urgent)
- "Donation ceremony" = Score 2-3 MAX (routine charity, NOT news)
- "Fundraiser for flood victims" = Score 3 MAX (charity, NOT breaking)
- "Community helps disaster victims" = Score 3 MAX (charitable response)

**CHARITY/DONATION EVENT RULES:**
- Blood drives, donation ceremonies, fundraisers = ABSOLUTE MAX SCORE 3
- Even if honoring someone famous (including royalty) = STILL capped at 3
- Community help efforts = Score 3 (unless covering the actual disaster)
```

## How It Works Now

### Royal Family Story Flow
```
1. Thai story scraped → 
2. Pre-flight keyword check → 
3. "ภูมิพลอดุลยเดช" detected → 
4. 🚫 INSTANT REJECTION:
   - isActualNews: false
   - interestScore: 0
   - Logged: "LESE MAJESTE COMPLIANCE: Rejecting story"
5. Story never saved to database
```

### Blood Donation Story Flow
```
1. Thai story scraped →
2. No blocked keywords (safe to translate) →
3. AI translation with strengthened rules:
   - Sees "บริจาคโลหิต" (blood donation)
   - AI prompt says "Blood donation = MAX 3"
   - AI assigns score: 2-3
4. Keyword penalty applied:
   - "บริจาค" detected → -1 penalty
   - Final score: 1-2
5. Story saved as DRAFT (score < 3)
6. Never auto-posted to Facebook
```

## Testing Checklist

- [ ] Royal family story (positive) → Blocked before translation
- [ ] Royal family story (negative) → Blocked before translation  
- [ ] Blood donation drive → Score ≤ 3, saved as draft
- [ ] Charity fundraiser → Score ≤ 3, saved as draft
- [ ] Actual crime/accident → Score 4-5, auto-published
- [ ] Disaster (Phuket) → Score 4-5, auto-published
- [ ] Disaster (Hat Yai) → Score ≤ 3, category "National"

## Files Modified

- `/server/services/translator.ts`
  - Added `BLOCKED_KEYWORDS` array (18 terms)
  - Added pre-flight blocking logic
  - Expanded `COLD_KEYWORDS` with donation terms
  - Strengthened AI prompt with explicit royal family rejection
  - Added charity/donation scoring rules

## Impact

### Before
- ✗ Royal family story published (legal risk)
- ✗ Blood donation scored 4/5 (auto-posted to Facebook)
- ✗ Only AI prompt filter (bypass possible)

### After
- ✓ Triple-layer royal family blocking (keyword + AI + system)
- ✓ Blood donation capped at 3 (saved as draft)
- ✓ Explicit charity event scoring rules
- ✓ Audit trail for rejected content

## Why This Matters

1. **Legal Protection**: Lese majeste laws in Thailand carry severe penalties. Complete avoidance is the only safe strategy.
2. **Editorial Quality**: Readers expect score 4-5 to be serious news (crime, accidents). Blood drives dilute feed quality.
3. **Auto-Post Accuracy**: Only truly high-engagement stories should auto-post to Facebook.

## Notes

- The keyword filter runs BEFORE translation to save API costs
- Even if AI misses it, the pre-flight filter catches it
- Rejection is logged for compliance auditing
- Stories are marked `isActualNews: false` so they're never saved
