# Story Score Classification Improvements

## Overview
This update refines the interest scoring system to reserve 4-5 scores for truly high-engagement content (accidents, fights, crime, deaths) and implements a learning system to track manual score adjustments.

## Changes Made

### 1. **Stricter Scoring Criteria** (`server/services/translator.ts`)
Updated the AI scoring guidelines to be much more conservative:

**Score 5 (BREAKING/URGENT):**
- Deaths, drownings, fatal accidents
- Violent crime with serious injuries
- Major fires, natural disasters causing casualties

**Score 4 (SERIOUS INCIDENTS):**
- Non-fatal accidents with injuries
- Arrests for serious crimes
- Active rescue operations
- Fights/assaults, hit-and-runs, robberies

**Score 3 (NOTEWORTHY) - CAP FOR ROUTINE NEWS:**
- Minor accidents (no injuries)
- Infrastructure complaints (potholes, flooding damage)
- Tourism developments, business openings
- Missing persons

**Score 2 (ROUTINE):**
- Officials inspecting/visiting
- Meetings, announcements
- Cultural events, preparations

**Score 1 (TRIVIAL):**
- Ceremonial events, ribbon cuttings

**Critical Distinctions Added:**
- "Road damaged by flooding" = Score 3 (infrastructure complaint, NOT a disaster)
- "Luxury hotel opens" = Score 3 (business news, NOT breaking)
- "Students win robotics award" = Score 3 (achievement, NOT urgent)
- "Tourism boom faces sustainability concerns" = Score 3 (discussion, NOT crisis)

### 2. **Enhanced Self-Learning Score System** (v2.0 - January 2026)
Created a comprehensive learning system that teaches the AI from your manual corrections:

**New Database Table:** `score_adjustments`
- Tracks every manual score change you make
- Records original vs adjusted score
- **NEW:** Extracts and stores Thai keywords from original source content
- Stores article details for pattern analysis
- Timestamps all adjustments

**Enhanced Service:** `server/services/score-learning.ts`
- `recordAdjustment()` - Logs when you change a score with **rich context extraction**
- `getLearningInsights()` - Analyzes patterns by category
- `getStatistics()` - Shows overall scoring accuracy
- **NEW:** `getCategoryBiases()` - Calculates how much the AI over/under-scores each category
- **NEW:** `generateLearningContext()` - Creates rich prompt injection for GPT learning

**How It Teaches the Model:**
When GPT-4o-mini scores new articles, it receives:
1. **Category Bias Warnings**: "You OVER-SCORE 'Local' stories by ~0.8 points. REDUCE scores for this category."
2. **Specific Example Corrections**: Shows exact stories you corrected with keywords
3. **Overall Tendency Analysis**: "You over-scored 75% of the time. Be more conservative."
4. **Pattern Recognition**: Identifies which Thai/English keywords led to mis-scoring

### 3. **Admin API Endpoints**
Added new endpoints to view learning insights:
- `GET /api/admin/score-learning/insights` - View scoring patterns and statistics
- `GET /api/admin/score-learning/category/:category` - View adjustments for specific category

## Database Migration Required

**IMPORTANT:** You need to run this migration to create the score_adjustments table:

```bash
# Connect to your database and run:
psql $DATABASE_URL -f migrations/score-learning.sql
```

Or manually execute the SQL in your database console:
```sql
CREATE TABLE IF NOT EXISTS score_adjustments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id TEXT NOT NULL,
  original_score INTEGER NOT NULL,
  adjusted_score INTEGER NOT NULL,
  adjustment_reason TEXT,
  article_title TEXT NOT NULL,
  article_category TEXT NOT NULL,
  article_content_snippet TEXT,
  thai_keywords TEXT[],
  adjusted_by TEXT NOT NULL DEFAULT 'admin',
  adjusted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS score_adjustments_article_id_idx ON score_adjustments(article_id);
CREATE INDEX IF NOT EXISTS score_adjustments_category_idx ON score_adjustments(article_category);
CREATE INDEX IF NOT EXISTS score_adjustments_adjusted_at_idx ON score_adjustments(adjusted_at);
```

## How to Use

### Adjusting Scores (As You Requested)
1. Open the admin dashboard
2. Find the articles you mentioned (tourism sustainability, luxury residences, robotics competition)
3. Edit each article and change the interest score from 4-5 down to 3
4. **The system will automatically log these adjustments for learning**

### Viewing Learning Insights (Future)
You can call the API endpoint to see patterns:
```bash
curl -X GET http://localhost:5001/api/admin/score-learning/insights \
  -H "Cookie: your-session-cookie"
```

This will show you:
- Which categories are consistently over-scored
- Which categories are consistently under-scored
- Common patterns in adjusted articles

## Expected Impact

### Immediate:
- New articles about infrastructure issues, tourism developments, and business news will be scored 3 (not 4-5)
- Only genuine emergencies (accidents with injuries, crime, deaths) will get 4-5 scores
- Fewer articles will auto-post to Facebook (only 4-5 scores auto-post)

### Over Time:
- As you adjust scores, the system learns your preferences
- You can review learning insights to see if certain categories need prompt adjustments
- Future: Could use this data to automatically fine-tune the AI scoring prompts

## Files Modified
1. `server/services/translator.ts` - Stricter scoring criteria
2. `shared/schema.ts` - Added scoreAdjustments table
3. `server/services/score-learning.ts` - New learning service
4. `server/routes.ts` - Integrated learning into PATCH endpoint, added insights endpoints
5. `migrations/score-learning.sql` - Database migration

## Next Steps
1. ✅ Run the database migration (see above)
2. ✅ Restart your server to load the new code
3. ✅ Adjust the two articles you mentioned to score 3
4. ✅ Monitor new articles to see if scoring is more conservative
5. 📊 (Optional) Check learning insights after a week to see patterns
