# Manual Facebook Scrape Feature

## Overview
Added a manual scraping feature that allows admins to scrape:
1. **Individual Facebook posts** by URL (single post)
2. **Entire Facebook pages** by page name or URL (all recent posts)

This is useful for scraping interesting stories from sources not in the regular rotation.

## Key Features

### ✅ What It Does
- Allows manual scraping of any Facebook source (not just pre-configured ones)
- **Page name:** Scrapes all recent posts from the page
- **Post URL:** Scrapes a single specific post (bypasses quality filters)
- Goes through full translation and premium GPT-4o enrichment
- **Always saves as DRAFT** for admin review before publishing
- Tracks progress like automated scraping

### 🎯 User Flow
1. Admin clicks "Manual Scrape" button in dashboard
2. Dialog opens with input field
3. Admin enters either:
   - **Page name:** e.g., `PhuketTimeNews` → Scrapes all recent posts from that page
   - **Post URL:** e.g., `https://www.facebook.com/share/p/1BkUiuMKhr/` → Scrapes just that post
4. Click "Scrape" button
5. Posts are processed in background with premium enrichment
6. Articles appear in "Pending Review" as DRAFTs
7. Admin can review and publish manually

## Input Modes

### Page Scrape (Page Name)
- Input: `PhuketTimeNews` or `facebook.com/PhuketTimeNews`
- Behavior: Scrapes latest posts from the page
- Filters: Quality filters still apply (no colored backgrounds, requires images)
- Duplicates: Skips posts already in database (by source URL or FB post ID)
- Enrichment: Premium GPT-4o applied to all articles

### Single Post Scrape (Post URL)
- Input: URLs containing `/posts/`, `/share/`, `/reel/`, `/videos/`, `/watch`, or `pfbid`
- Behavior: Scrapes just that specific post
- Filters: **BYPASSES** quality filters (user already vetted it)
- Duplicates: Still checked but user can force-add anyway
- Enrichment: Premium GPT-4o applied

## Backend Changes

### API Endpoint
- **Route**: `POST /api/admin/scrape/manual`
- **Body**: `{ postUrl: string }` (can be page name or post URL)
- **Returns**: `{ success: boolean, jobId: string, message: string }`
- **Protected**: Requires admin authentication

### Functions

#### `runManualPageScrape(pageIdentifier, callbacks)`
**Location**: `server/scheduler.ts`

Scrapes all recent posts from any Facebook page:
1. ✅ Resolves page name to URL
2. ✅ Scrapes latest posts from page
3. ⏭️ Applies quality filters (colored backgrounds, no-image posts)
4. ⏭️ Checks for existing duplicates by source URL/FB post ID
5. ✅ Translates content (Thai → English)
6. ✅ **Premium GPT-4o enrichment** (manual = pre-selected = highest quality)
7. ✅ Downloads and saves images
8. ✅ Classifies article category
9. ✅ Auto-detects tags
10. ✅ **Always creates as DRAFT** (isPublished: false)

#### `runManualPostScrape(postUrl, callbacks)`
**Location**: `server/scheduler.ts`

Scrapes a single specific Facebook post:
1. ✅ Scrapes the post (works with share URLs)
2. ❌ **SKIPS** image quality checks
3. ❌ **SKIPS** colored background filtering
4. ❌ **SKIPS** video post filtering
5. ❌ **SKIPS** duplicate detection
6. ✅ Translates content (Thai → English)
7. ✅ **Premium GPT-4o enrichment**
8. ✅ Fetches community comments for context
9. ✅ Downloads and saves images
10. ✅ Auto-detects tags
11. ✅ Auto-matches to timelines
12. ✅ **Always creates as DRAFT**

## Frontend Changes

### UI Components
**Location**: `client/src/pages/AdminDashboard.tsx`

1. **"Manual Scrape" Button**
   - Opens manual scrape dialog
   - Disabled when a scrape is already running

2. **Manual Scrape Dialog**
   - Accepts page names OR post URLs
   - Clear instructions for each mode
   - Shows progress during scraping

## Usage Examples

### Scrape a specific page
```
Input: PhuketTimeNews
Mode: PAGE SCRAPE
Result: All recent posts from facebook.com/PhuketTimeNews processed
```

### Scrape from share link
```
Input: https://www.facebook.com/share/p/1BkUiuMKhr/
Mode: SINGLE POST SCRAPE
Result: Just that post is scraped (bypasses filters)
```

## Technical Notes

### Premium Enrichment
All manually scraped content receives premium GPT-4o enrichment because:
- Admin manually selected the source/post
- Pre-selected content deserves highest quality journalism
- Ensures professional output for stories from non-regular sources

### Always Draft
Even though the user selected the source, articles are saved as drafts to allow:
- Final review of translated content
- Category adjustments
- Title/headline editing before publication

## Files Modified

### Backend
- `server/routes.ts` - Updated `/api/admin/scrape/manual` to handle both modes
- `server/scheduler.ts` - Added `runManualPageScrape()`, enhanced `runManualPostScrape()`

### Frontend  
- `client/src/pages/AdminDashboard.tsx` - Updated dialog UI and validation

