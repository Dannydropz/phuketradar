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
- **Deployment**: Utilizes environment variables (DATABASE_URL, OPENAI_API_KEY). Separate client (Vite) and server (esbuild) builds.

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