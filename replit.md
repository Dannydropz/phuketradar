# Phuket Radar

## Overview
Phuket Radar is a news aggregation platform for Phuket's international community. It scrapes Thai Facebook news, translates it to English using AI, and delivers it in a fast, mobile-optimized, newsletter-style format. The platform focuses on providing curated, relevant news, distinguishing it from promotional content.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Frameworks**: React 18 with TypeScript, Vite, Wouter, TanStack Query.
- **UI/UX**: shadcn/ui, Radix UI, Tailwind CSS, Inter font, responsive design, light/dark mode.
- **Component Architecture**: Atomic design, reusable components, React Context for theme, custom hooks.

### Backend
- **Server**: Express.js with TypeScript for RESTful APIs.
- **Data Layer**: Drizzle ORM, PostgreSQL (Neon-backed) for `users`, `articles` (with embedding vectors), and `subscribers`.
- **Business Logic**:
    - **ScraperService**: Uses JINA AI Reader API for Facebook post scraping.
    - **TranslatorService**: OpenAI GPT-4-mini for Thai-to-English translation, content rewriting, news filtering, category classification (Breaking, Tourism, Business, Events, Other), and interest scoring (1-5 scale).
    - **Interest Scoring**: GPT-4-mini rates articles 1-5 (5=urgent/dramatic, 4=important, 3=moderate, 2=mundane, 1=trivial). Thai keyword boosting (+1 for hot keywords like drownings/crime/accidents, -1 for cold keywords like meetings/ceremonies) adjusts final scores.
    - **Auto-Publish Logic**: Only stories with interest_score >= 4 are auto-published. Lower-scored stories (1-3) saved as drafts for manual review.
    - **Embedding Generation**: OpenAI text-embedding-3-small for semantic analysis from Thai titles.
    - **Semantic Similarity**: Cosine similarity for duplicate detection.
- **API Endpoints**: CRUD for articles, admin endpoint for triggering scrapes.

### Architectural Decisions
- **Scraping**: Pluggable architecture supporting multiple providers (JINA AI Reader via `scrapecreators` is current). Scrapes configurable sources from `server/config/news-sources.ts` with 3-page pagination depth per source to ensure fast-posting sources like Newshawk are fully captured.
- **Translation**: Hybrid pipeline using Google Translate for complex Thai text and GPT-4-mini for polishing and style. Enriches content with Phuket-specific context and location descriptions.
- **Data Flow**: Unidirectional: Scraper → Image Check → Duplicate Check → Text Graphic Filter → Semantic Similarity Check → Translator → Database → API → Frontend. Includes pre-translation checks to optimize API costs.
- **Image Requirement**: Posts with 0 images are automatically skipped - only posts with 1+ photos are published.
- **Text Graphic Filtering**: Three-layer system to prevent text-only announcement posts from being published:
    - Layer 1: Fast, free check for Facebook native colored background text posts via `text_format_preset_id` API field
    - Layer 2: GPT-4o-mini vision OCR to count words visible on each image - images with ≥15 words are flagged as text graphics
    - Layer 3: Multi-image analysis - only skips if ALL images are text graphics (at least one real photo = approved)
- **Duplicate Detection**: A six-layer system including URL normalization, in-memory checks, Facebook Post ID and source URL database checks, multi-image comparison, semantic similarity on titles, and database UNIQUE constraints for `source_url` and `facebook_post_id`.
- **Facebook Posting**: Automated posting of articles to Facebook with multi-image support, smart fallback, and atomic double-post prevention using a claim-before-post pattern. Posts include title, excerpt, "Read more" link in comments, and category-specific hashtags. Auto-posting occurs both during automated scraping (for high-interest articles) and when manually publishing draft articles via the admin dashboard.
- **Deployment**: Utilizes environment variables, separate client (Vite) and server (esbuild) builds.

### Automated Scraping
- **Mechanism**: GitHub Actions runs `scripts/scheduled-scrape.ts` every 2 hours, making an HTTP POST request to `/api/cron/scrape`.
- **Error Handling**: Cron endpoint always returns HTTP 200 OK with success status in payload.

### Email Newsletter System
- **Database**: `subscribers` table.
- **Integration**: Resend email service via Replit connector.
- **Email Template**: Morning Brew-style HTML, responsive, with category-specific color badges, article cards, and unsubscribe link.
- **Content**: Sends last 24 hours of published articles (max 10).
- **Scheduling**: GitHub Actions runs daily at 8 AM Thailand time.
- **API Endpoints**: `POST /api/subscribe`, `GET /api/unsubscribe/:token`, `POST /api/cron/newsletter`.

## External Dependencies

### Third-Party Services
- **JINA AI Reader API**: `https://r.jina.ai` for converting Facebook pages to markdown.
- **OpenAI API**: GPT-4-mini for translation/classification/rewriting, text-embedding-3-small for embeddings, GPT-4o-mini for vision.
- **Neon Database**: Serverless PostgreSQL hosting.
- **Resend**: Email delivery service.

### Key Libraries
- **Authentication**: `connect-pg-simple`.
- **Validation**: Zod with `drizzle-zod`.
- **Date Handling**: `date-fns`.
- **Form Management**: React Hook Form with `@hookform/resolvers`.
- **UI Primitives**: Radix UI components.