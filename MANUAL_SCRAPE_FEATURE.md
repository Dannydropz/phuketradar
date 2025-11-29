# Manual Post Scrape Feature

## Overview
Added a manual scraping feature that allows admins to scrape individual Facebook posts by URL.

## Key Features

### ✅ What It Does
- Allows manual scraping of individual Facebook posts via URL
- **Skips all quality and duplicate checks** (user has already vetted the post)
- **Always saves as DRAFT** for admin review before publishing
- Goes through full translation and enrichment pipeline
- Tracks progress like automated scraping
- Auto-matches to timelines if applicable

### 🎯 User Flow
1. Admin clicks "Scrape Post URL" button in dashboard
2. Dialog opens with URL input field
3. Admin pastes Facebook post share URL (e.g., `https://www.facebook.com/share/p/1BkUiuMKhr/`)
4. Click "Scrape Post" button
5. Post is processed in background
6. Article appears in "Pending Review" as a DRAFT
7. Admin can review and publish manually

## Backend Changes

### New API Endpoint
- **Route**: `POST /api/admin/scrape/manual`
- **Body**: `{ postUrl: string }`
- **Returns**: `{ success: boolean, jobId: string, message: string }`
- **Protected**: Requires admin authentication

### New Function: `runManualPostScrape()`
**Location**: `server/scheduler.ts`

**What it does**:
1. ✅ Scrapes the post (works with share URLs)
2. ❌ **SKIPS** image quality checks
3. ❌ **SKIPS** colored background/text graphic filtering
4. ❌ **SKIPS** video post filtering  
5. ❌ **SKIPS** duplicate detection
6. ✅ Translates content (Thai → English)
7. ✅ Classifies article category
8. ✅ Downloads and saves images
9. ✅ Runs enrichment (timeline matching, merge detection)
10. ✅ **Always creates as DRAFT** (isPublished: false)
11. ✅ Auto-detects tags
12. ✅ Auto-matches to timelines

**Key Differences from Auto-Scrape**:
- Manual scrapes trust the user's judgment
- No quality filtering (the user already checked it's news)
- No duplicate prevention (user may want to manually add anyway)
- Always saves as draft for final review

## Frontend Changes

### New UI Components
**Location**: `client/src/pages/AdminDashboard.tsx`

1. **"Scrape Post URL" Button**
   - Located next to "Scrape New Articles" button
   - Opens manual scrape dialog
   - Disabled when a scrape is already running

2. **Manual Scrape Dialog**
   - Clean, focused UI for URL input
   - Validates Facebook URLs
   - Shows helpful notes about the process
   - Press Enter to submit
   - Loading states during scraping

### State Management
- `manualScrapeUrl`: Stores the input URL
- `manualScrapeDialogOpen`: Controls dialog visibility
- `manualScrapeMutation`: Handles API call and progress

## Usage in Screenshot Example

For the post shown in your screenshot:
```
URL: https://www.facebook.com/share/p/1BkUiuMKhr/
```

1. Click "Scrape Post URL"
2. Paste: `https://www.facebook.com/share/p/1BkUiuMKhr/`
3. Click "Scrape Post"
4. Wait for translation (background)
5. Article appears in "Pending Review" tab as DRAFT
6. Review, edit if needed, then publish

## Technical Notes

### Why Skip Checks?
The automated scraper uses conservative filtering to avoid publishing low-quality content. But when an admin manually selects a post, they've already made the editorial decision that it's news-worthy. Bypassing checks prevents:
- False rejections of breaking news
- Missing important stories due to image quality heuristics
- Losing posts that look "text-graphic-like" but are actually news

### Always Draft Why?
Even though the user selected the post, the translation might need editing or the category might need adjustment. Saving as draft allows final review before publication.

### Error Handling
- Invalid URLs are caught client-side
- Scraping failures return helpful error messages
- Database constraint violations are caught (though duplicate check is skipped, the DB unique constraint still applies)
- Translation failures are reported to the user

## Browser Testing

Build completed successfully ✅
- No TypeScript errors
- No compilation errors
- All components properly imported
- All handlers properly defined

## Next Steps

To use:
1. Deploy the changes
2. Go to Admin Dashboard
3. Click "Scrape Post URL"
4. Test with the example URL from your screenshot

## Files Modified

### Backend
- `server/routes.ts` - Added `/api/admin/scrape/manual` endpoint
- `server/scheduler.ts` - Added `runManualPostScrape()` function

### Frontend  
- `client/src/pages/AdminDashboard.tsx` - Added UI, state, mutations, handlers
