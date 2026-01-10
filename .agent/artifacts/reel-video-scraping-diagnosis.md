# Facebook Reel/Video Auto-Scraping Diagnosis & Fix Plan

## 📋 Summary

**Issue:** Auto-scraping skips Facebook video/reel posts (e.g., `https://www.facebook.com/reel/838405052487476`) while manual scraping works correctly.

**Status:** ✅ FIXED & DEPLOYED (Commit: f0cea26)

**Fix Applied:** Added `videoThumbnail` fallback chain to `parseScrapeCreatorsResponse()` (line 746 in `server/services/scraper.ts`)


---

## 🔍 Root Cause Analysis

### ✅ CONFIRMED: Missing `videoThumbnail` Fallbacks in Page Feed Parser

The video post **does appear in the page feed** (confirmed by user), but gets **skipped due to missing thumbnail**. Here's why:

**In `scrapeSingleFacebookPost()` (Manual Scrape - Line 395):**
```typescript
const videoThumbnail = post.video?.thumbnail || post.videoThumbnail || post.videoDetails?.thumbnail || post.full_picture || post.image;
```
This has **5 fallback sources** for the video thumbnail.

**In `parseScrapeCreatorsResponse()` (Auto Scrape - Line 746):**
```typescript
const videoThumbnail = post.videoDetails?.thumbnail;
```
This **only checks 1 source** - no fallbacks!

### The Skip Chain:
1. ScrapeCreators returns video post in page feed
2. `videoDetails?.thumbnail` is undefined (API doesn't return it for page feed videos)
3. `videoThumbnail` becomes `undefined`
4. In scheduler, check: `hasImages = (post.isVideo && post.videoThumbnail)` → **false**
5. Post is skipped with "No images" (line 255-258)

### Why Manual Scrape Works:
- Uses `full_picture || image` as fallbacks for video thumbnail
- These fields ARE returned by the single-post API
- So `videoThumbnail` is populated and the post passes the image check

---

## 🛠️ Proposed Fix Strategy

### Option A: Hybrid Page + Reels Scrape (Recommended)

Add a second API call after the regular page scrape to fetch recent Reels/Videos separately using the single-post endpoint for any video URLs detected.

**Pros:** 
- Catches reels that don't appear in page feed
- Minimal changes to existing logic
- Uses existing reel handling in `scrapeSingleFacebookPost()`

**Cons:**
- Additional API calls (cost)
- Need to identify reel URLs somehow

### Option B: Post-Process Video URLs from Page Data

When parsing page feed responses, look for any posts with reel/video URL patterns and re-fetch them using the single-post endpoint to get full video metadata.

**Implementation:**
1. In `parseScrapeCreatorsResponse()`, detect reel URLs in `permalink` or `url`
2. For any detected reels, queue them for re-fetch via `scrapeSingleFacebookPost()`
3. Merge enriched video data back into the scraped posts

### Option C: Improve Video Detection Fallbacks (Quick Fix)

Strengthen the existing thumbnail fallback logic to handle edge cases where video info is incomplete.

**Changes:**
1. If `isVideo` is true but no `videoThumbnail`, try to fetch thumbnail from source URL
2. Accept video posts with minimal metadata rather than skipping
3. Add logging to track which reels are being missed

---

## 📝 Implementation Plan (Pending Approval)

### Phase 1: Data Collection (Non-Breaking)
1. Add detailed logging in `parseScrapeCreatorsResponse()` to track:
   - Total posts from API
   - Posts with `/reel/` or `/videos/` in URL
   - Posts skipped and why
   - Video metadata completeness

2. Run test scrape and analyze logs to confirm root cause

### Phase 2: Implement Fix
Based on Option B (post-process video URLs):

**File: `server/services/scraper.ts`**
1. Modify `scrapeFacebookPageWithPagination()`:
   - After parsing page feed, identify posts with reel/video URLs that lack video metadata
   - Re-fetch these posts individually using `scrapeSingleFacebookPost()`
   - Merge the complete video data back

2. Modify `parseScrapeCreatorsResponse()`:
   - Return a flag indicating which posts need video metadata enrichment
   - Add helper method to detect incomplete video posts

**File: `server/scheduler.ts`**
1. Improve video thumbnail fallback:
   - If `post.isVideo` but no thumbnail, attempt to use `post.imageUrl` as fallback
   - Don't skip video posts purely due to missing thumbnail

### Phase 3: Testing
1. Test with 3 sample Facebook Reel URLs:
   - `https://www.facebook.com/reel/838405052487476` (original example)
   - 2 additional reels from monitored pages
2. Verify auto-scrape captures these reels
3. Verify they publish correctly to site

### Phase 4: Deploy
1. Git push to trigger Coolify auto-deploy
2. Monitor production logs for reel detection
3. Create summary artifact with before/after comparison

---

## 📊 Test Cases

| Test URL | Current Behavior | Expected Behavior |
|----------|------------------|-------------------|
| `facebook.com/reel/838405052487476` | Skipped by auto-scrape | Should be captured and imported |
| Manual scrape of same URL | ✅ Works | ✅ Should continue to work |
| Regular posts with photos | ✅ Works | ✅ Should continue to work |

---

## ⚠️ Constraints Checklist

- [x] No breaking existing text/image scraping
- [x] Uses current stack (ScrapeCreators + Apify fallback)
- [x] No Facebook login changes
- [x] Respects robots.txt (via API providers)
- [ ] Ready for Coolify deploy

---

## 🤔 Questions for Approval

1. **Which fix option preferred?** Option A (separate reel API call), Option B (re-fetch video URLs), or Option C (quick fallback fix)?

2. **API cost concern?** Option B may increase ScrapeCreators API calls by ~10-20% for video-heavy pages

3. **Should we proceed with Phase 1 (logging only) first to confirm diagnosis?**

---

## 📁 Files to Modify

- `server/services/scraper.ts` - Main changes
- `server/scheduler.ts` - Minor video handling improvements
- (Optional) `server/services/apify-scraper.ts` - If Apify fallback needed for reels

---

*Plan created: 2026-01-10T10:30:47+07:00*
*Awaiting explicit approval before implementing code changes.*
