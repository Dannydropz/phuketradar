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
- **Duplicate Detection**: Two-layer system: (1) Exact image URL match, (2) 70% semantic similarity threshold on Thai title embeddings. Within-batch duplicate detection ensures articles created in the same scrape run are compared against each other.
- **Deployment**: Utilizes environment variables (DATABASE_URL, OPENAI_API_KEY, CRON_API_KEY, FB_PAGE_ACCESS_TOKEN). Separate client (Vite) and server (esbuild) builds.

### Automated Scraping
- **Scheduled Deployments**: Uses Replit Scheduled Deployments (separate from main web deployment) to run automated scraping every 2 hours.
- **Script**: `scripts/scheduled-scrape.ts` - A standalone script that makes one HTTP POST request to `/api/cron/scrape` and exits cleanly.
- **Command**: `tsx scripts/scheduled-scrape.ts`
- **Configuration**:
  - Schedule: `0 */2 * * *` (every 2 hours on the hour)
  - Run command: `tsx scripts/scheduled-scrape.ts`
  - Timeout: 120 seconds (adjustable based on scraping volume)
  - Machine: 1 vCPU / 2 GiB RAM (Replit Scheduled Deployment default)
- **Important**: The scheduled deployment runs the standalone script, NOT the web server. This prevents continuous scraping and excessive API usage. The script exits after making a single request to the cron endpoint on the main web deployment.

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