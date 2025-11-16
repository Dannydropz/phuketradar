# Phuket Radar

## Overview
Phuket Radar is a news aggregation platform designed for Phuket's international community. It scrapes Thai Facebook news, translates it to English using AI, and presents it in a fast, mobile-optimized, newsletter-style format. The platform aims to provide curated, relevant news, distinguishing itself from promotional content, and supports both automated content aggregation and manual content creation. The project envisions becoming the primary English news source for Phuket.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Frameworks**: React 18 with TypeScript, Vite, Wouter, TanStack Query.
- **UI/UX**: shadcn/ui, Radix UI, Tailwind CSS, Inter font, responsive design, light/dark mode.
- **Content Editor**: TipTap WYSIWYG editor with rich text formatting (bold, italic, headings, lists, links, inline images).

### Backend
- **Server**: Express.js with TypeScript for RESTful APIs.
- **Data Layer**: Drizzle ORM, PostgreSQL (Neon-backed) for `users`, `articles` (with embedding vectors), `subscribers`, and dynamic `categories`.
- **Business Logic**:
    - **ScraperService**: Uses scrapecreators.com API for Facebook post scraping with multi-image carousel support.
    - **TranslatorService**: Hybrid tiered translation system:
      - **Tier 1 (Interest Score 1-3)**: GPT-4o-mini with enhanced context/background instructions for engaging news style
      - **Tier 2 (Interest Score 4-5)**: GPT-4o-mini translation → GPT-4 premium enrichment (adds deep journalism, area statistics, historical context, professional narrative)
      - All stories get local context, but high-priority stories receive exceptional journalistic depth
    - **Manual Review System**: High-interest posts (score 4-5) flagged as "non-news" are saved as drafts for manual expansion/editing.
    - **Interest Scoring**: GPT-4o-mini rates articles 1-5, adjusted by Thai keyword boosting. Only stories with `interest_score >= 4` are auto-published.
    - **Embedding Generation**: OpenAI text-embedding-3-large for semantic analysis from full Thai content (title + first 8000 chars).
    - **Duplicate Verification**: Hybrid system using embeddings (50% similarity threshold) and GPT-4o-mini for verification, with a safety net check against top 5 similar stories.
- **API Endpoints**: CRUD for articles, admin endpoints for scraping, category management, article creation/editing, and articles needing review.

### Content Management
- **Hybrid CMS**: Combines automated scraping with manual content creation and review.
- **WYSIWYG Editor**: TipTap-based rich text editor for creating/editing articles.
- **Dynamic Categories**: Database-driven category system for custom content types (Guides, Lifestyle, etc.).
- **Manual Review Workflow**: High-interest "non-news" posts are flagged for manual review and editing before publication.
- **Original Content Creation**: Admin feature for creating guides, SEO articles, and other non-scraped content with interest score selector (1-5) to control auto-posting behavior.

### Architectural Decisions
- **Scraping**: Uses scrapecreators.com API with configurable sources and smart pagination logic to ensure timely capture of new posts.
- **Translation**: Multi-tier hybrid pipeline:
  - Google Translate for complex Thai text (400+ chars) → GPT-4o-mini refinement with local context
  - Simple Thai text → direct GPT-4o-mini translation with area-specific enrichment
  - High-priority stories (score 4-5) → additional GPT-4 premium enrichment pass for deep journalism
- **Data Flow**: Unidirectional: Scraper → Image Check → Duplicate Check → Text Graphic Filter → Semantic Similarity Check → Translator → Database → API → Frontend. Includes pre-translation checks to optimize API costs.
- **Image Requirement**: Only posts with 1+ images are published; posts with 0 images are skipped.
- **Text Graphic Filtering**: Multi-stage system using `text_format_preset_id`, file size, and color dominance analysis to reject text-on-background images.
- **Duplicate Detection**: Multi-layer system including URL normalization, Facebook Post ID/source URL checks, exact image URL matching, entity matching, and hybrid semantic analysis with GPT verification.
- **Multi-Platform Social Media Posting**: Automated cross-platform posting to Facebook, Instagram, and Threads for high-interest articles (score ≥ 4) using a unified claim-before-post architecture and sequential execution to manage rate limits.
- **Automated Scraping**: GitHub Actions triggers scraping every 2 hours via an HTTP POST request to `/api/cron/scrape`. Comprehensive skip-reason tracking and logging for debugging.
- **Email Newsletter System**: `subscribers` table, Resend integration, Morning Brew-style HTML template, sends last 24 hours of published articles (max 10), scheduled daily via GitHub Actions.

## External Dependencies

### Third-Party Services
- **scrapecreators.com API**: For Facebook post scraping.
- **OpenAI API**: GPT-4o-mini (translation, classification, rewriting), GPT-4 (premium enrichment for high-priority stories), text-embedding-3-large (embeddings), GPT-4o-mini (duplicate verification, vision analysis).
- **Neon Database**: Serverless PostgreSQL hosting.
- **Resend**: Email delivery service.
- **Meta Graph API**: Facebook, Instagram, and Threads posting APIs.

### Key Libraries
- **Authentication**: `connect-pg-simple`.
- **Validation**: Zod with `drizzle-zod`.
- **Date Handling**: `date-fns`.
- **Form Management**: React Hook Form with `@hookform/resolvers`.
- **UI Primitives**: Radix UI components.
- **Image Processing**: `sharp` for image manipulation.