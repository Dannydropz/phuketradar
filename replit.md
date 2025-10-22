# Phuket Radar

## Overview
Phuket Radar is a modern news aggregation platform designed for the international community in Phuket, Thailand. It scrapes Thai-language news from Facebook, translates it to English using OpenAI, and presents it in a fast-loading, mobile-optimized, newsletter-style interface similar to Morning Brew. The platform aims to provide curated, relevant news, distinguishing actual news from promotional content.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Frameworks**: React 18 with TypeScript, Vite for bundling, Wouter for routing, TanStack Query for server state management.
- **UI/UX**: shadcn/ui with Radix UI, Tailwind CSS for styling, Inter font family, light/dark mode, responsive design.
- **Component Architecture**: Atomic design, reusable UI components, React Context for global theme management, custom hooks.

### Backend Architecture
- **Server**: Express.js with TypeScript for RESTful API development.
- **Data Layer**: Drizzle ORM, PostgreSQL (Neon-backed) for persistent storage. Schema includes `users` and `articles` with an embedding vector for semantic duplicate detection.
- **Business Logic**:
    - **ScraperService**: Uses JINA AI Reader API to scrape Facebook posts and extract markdown.
    - **TranslatorService**: Integrates OpenAI GPT-4-mini for Thai-to-English translation, content rewriting, news filtering, and category classification (Breaking, Tourism, Business, Events, Other).
    - **Embedding Generation**: Uses OpenAI text-embedding-3-small for 1536-dimension vectors from Thai titles for semantic analysis.
    - **Semantic Similarity**: Cosine similarity check (80% threshold) for duplicate detection.
- **API Endpoints**: CRUD operations for articles and an admin endpoint to trigger scraping.

### Architectural Decisions
- **Scraping**: JINA AI for Facebook scraping, avoids Graph API complexity. Scrapes multiple sources (Phuket Time News, Phuket Info Center, Newshawk Phuket), configurable via `server/config/news-sources.ts`. Limits processing to 10 recent posts per source to manage API costs.
- **Translation**: GPT-4-mini for cost-effective, quality translation with news filtering via prompt engineering.
- **Data Flow**: Unidirectional: Scraper → Duplicate Check → Semantic Similarity Check → Translator → Database → API → Frontend. Features pre-translation duplicate and semantic similarity checks to optimize API costs.
- **Duplicate Detection**: Three-layer system with database-level protection:
    1. **In-memory Set**: Tracks normalized source URLs within each batch to catch API duplicates (ScrapeCreators sometimes returns same post twice)
    2. **Database source URL check**: Queries database before translation to avoid expensive API calls for known posts
    3. **Post-translation checks**: (a) Image URL exact match, (b) 70% semantic similarity on Thai title embeddings
    4. **Database UNIQUE constraint**: PostgreSQL UNIQUE constraint on `articles.source_url` prevents race condition duplicates (error code 23505 handled gracefully)
    
    **Production Setup**: After publishing, add the UNIQUE constraint to production database:
    1. Open Replit Database UI → Navigate to production database
    2. Go to Database tab → Select `articles` table
    3. First check for duplicates: `SELECT source_url, COUNT(*) FROM articles GROUP BY source_url HAVING COUNT(*) > 1;`
    4. Clean duplicates if found (delete duplicate rows keeping only the earliest one)
    5. Run SQL: `ALTER TABLE articles ADD CONSTRAINT articles_source_url_unique UNIQUE (source_url);`
    
- **Facebook Posting**:
    - **Auto-posting**: Articles are automatically posted to Facebook after creation and publication
    - **Multi-Image Support**: Articles with multiple images (imageUrls array) create grid posts on Facebook:
        1. **Upload Phase**: Each image uploaded individually with `published=false` to get photo IDs
        2. **Grid Creation**: Feed post created with `attached_media` parameter containing all photo IDs
        3. **Smart Fallback**: Tracks successfully uploaded images; if multi-image fails, falls back to single-image post using first successful image
        4. **Edge Case Handling**: Handles scenarios like primary image failing but secondary images succeeding
    - **Format**: Title → Excerpt → "Want the full story? Click the link in the first comment below..." → Category-specific hashtags
    - **Hashtags**: Breaking category uses #PhuketNews (changed from #PhuketBreaking for better search visibility)
    - **Comment with Link**: Posts a pinned comment with the article URL (pinning uses Graph API query parameters: `is_pinned=true&access_token={token}`)
    - **Atomic Double-Post Prevention**: Uses a claim-before-post pattern with database-level locking:
        1. **CLAIM**: Atomically acquires exclusive lock by setting `facebookPostId = 'LOCK:{token}'` (WHERE facebookPostId IS NULL)
        2. **POST**: Makes Facebook API call only if claim succeeded
        3. **FINALIZE**: Atomically updates with real post ID (WHERE facebookPostId = lock token)
        4. **CLEANUP**: Releases lock on any error to allow retry
    - **Lock Safety**: Locks are released on all error paths (API failures, exceptions) to prevent stuck articles
    - **Enhanced Logging**: All Facebook operations use `[FB-POST]` prefix for easy log filtering and debugging
- **Deployment**: Utilizes environment variables (DATABASE_URL, OPENAI_API_KEY, CRON_API_KEY, FB_PAGE_ACCESS_TOKEN). Separate client (Vite) and server (esbuild) builds.

### Automated Scraping
- **GitHub Actions**: Uses GitHub Actions to run automated scraping every 2 hours.
- **Script**: `scripts/scheduled-scrape.ts` - A standalone script that makes one HTTP POST request to `/api/cron/scrape` and exits cleanly.
- **Workflow**: `.github/workflows/scheduled-scrape.yml` - GitHub Actions workflow configuration.
- **Configuration**:
  - Schedule: `0 */2 * * *` (every 2 hours on the hour)
  - Run command: `npx tsx scripts/scheduled-scrape.ts`
  - Timeout: 10 minutes (configurable in workflow file)
  - Manual trigger: Available via GitHub Actions UI using `workflow_dispatch`

**Setup Instructions:**
1. **Push code to GitHub**: Ensure `.github/workflows/scheduled-scrape.yml` and `scripts/scheduled-scrape.ts` are in your repository
2. **Add GitHub Secret**:
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `CRON_API_KEY`
   - Value: Your CRON_API_KEY value (same as in Replit Secrets)
   - Click "Add secret"
3. **Verify workflow**:
   - Go to Actions tab in your GitHub repository
   - You should see "Scheduled Scraping" workflow
   - Click "Run workflow" to test manually
   - Check the logs to ensure it completes successfully

**Important**: The GitHub Action runs the standalone script, NOT the web server. This prevents continuous scraping and excessive API usage. The script exits after making a single request to the cron endpoint on the published Replit app (phuketradar.com).

**Error Handling**: The `/api/cron/scrape` endpoint always returns HTTP 200 OK (even on errors) to ensure GitHub Actions shows success when articles are published. The response payload includes `success: true/false` and detailed status information. This prevents false failures in GitHub Actions when partial scraping succeeds.

## External Dependencies

### Third-Party Services
- **JINA AI Reader API**: `https://r.jina.ai` for converting Facebook pages to markdown.
- **OpenAI API**: GPT-4-mini for translation, content rewriting, and classification; text-embedding-3-small for semantic embeddings.
- **Neon Database**: Serverless PostgreSQL hosting.

### Key Libraries
- **Authentication**: `connect-pg-simple` for session-based authentication with PostgreSQL.
- **Validation**: Zod schemas with `drizzle-zod`.
- **Date Handling**: `date-fns`.
- **Form Management**: React Hook Form with `@hookform/resolvers`.
- **UI Primitives**: Radix UI components.