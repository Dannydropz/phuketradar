# Phuket Radar

## Overview

A modern news aggregation platform that scrapes Thai-language news from Facebook pages, translates content to English using OpenAI, and presents it in a clean, newsletter-style interface inspired by Morning Brew. The application targets the international community in Phuket, Thailand with fast-loading, mobile-optimized news delivery.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**October 10, 2025 - Automated Scraping with Built-in Cron Scheduler**
- ✅ Implemented node-cron scheduler inside Autoscale deployment (no second deployment needed)
- ✅ Automatic scraping runs every 4 hours at minute 0 (12:00 AM, 4:00 AM, 8:00 AM, 12:00 PM, 4:00 PM, 8:00 PM)
- ✅ Overlap protection: prevents concurrent scrapes if previous run exceeds 4 hours
- ✅ Enhanced logging: tracks duration, article counts, and skip events
- ✅ Production-ready with architect approval - no manual intervention required

**October 9, 2025 - Database Migration to Persistent Storage**
- ✅ Migrated from in-memory `MemStorage` to persistent `DatabaseStorage` using PostgreSQL
- ✅ Created database tables using Drizzle migrations: `users` and `articles`
- ✅ Verified article persistence across server restarts (5 articles tested successfully)
- ✅ Updated scheduler to work with persistent database - automated scraping now fully functional
- ✅ Removed warnings about in-memory storage limitations from scheduler and documentation
- Environment variables configured: DATABASE_URL, PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE

**October 9, 2025 - Author Attribution & UI Enhancements**
- Added author field to articles with randomized Thai female names (Ploy Srisawat, Natcha Petcharat, Kanya Rattanaporn, Nara Wongsawat, Apinya Thongchai)
- Author displayed with AI icon badge on article detail pages (Hoodline-style byline)
- Removed source attribution line from article detail (will add inline citations later)
- Added "Latest" sidebar to article detail pages with sticky positioning showing 5 most recent articles
- Logo size increased from h-12 to h-16 in header and footer for better visibility
- Footer tagline simplified to just "Phuket"
- Created scheduler.ts for automated scraping with auto-publish feature
- Created SCHEDULING_SETUP.md with comprehensive setup instructions

## System Architecture

### Frontend Architecture

**Framework & Tooling**
- React 18 with TypeScript for type safety and modern component patterns
- Vite as the build tool for fast development and optimized production builds
- Wouter for lightweight client-side routing (home, article detail, admin dashboard, category pages)
- TanStack Query for server state management with optimized caching and refetching strategies

**UI/UX Design System**
- shadcn/ui component library with Radix UI primitives for accessible, customizable components
- Tailwind CSS with custom design tokens following the design guidelines
- Typography-first approach using Inter font family (400-800 weights)
- Light/dark mode theming with HSL color system for precise control
- Responsive breakpoints optimized for mobile-first reading experience
- Custom elevation system using CSS variables (--elevate-1, --elevate-2) for hover/active states

**Component Architecture**
- Atomic design pattern with reusable UI components in `/client/src/components/ui`
- Feature components (Header, Footer, ArticleCard, HeroSection) with clear separation of concerns
- Theme provider using React Context for global theme state management
- Custom hooks for mobile detection and toast notifications

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for type-safe API development
- RESTful API design with clear route separation in `/server/routes.ts`
- In-development Vite middleware integration for HMR and SSR capabilities
- Custom logging middleware for request/response tracking

**Data Layer**
- Drizzle ORM for type-safe database operations
- PostgreSQL database (Neon-backed) with persistent storage via `DatabaseStorage` class
- Schema with two main tables: `users` and `articles`
- Articles schema includes: id (UUID), title, content, excerpt, category, author, source URL, publish status, translation metadata
- Automatic persistence - articles survive server restarts and are available across all deployments

**Business Logic Services**
- **ScraperService**: Facebook page scraping using JINA AI Reader API to extract markdown content from social media posts
- **TranslatorService**: OpenAI GPT-4-mini integration for Thai→English translation with intelligent news filtering (distinguishes actual news from promotional content)
- Translation includes content rewriting in professional news style, automatic excerpt generation, and category classification (Breaking, Tourism, Business, Events, Other)

**API Endpoints**
- `GET /api/articles` - Fetch all published articles
- `GET /api/articles/category/:category` - Filter articles by category
- `GET /api/articles/:id` - Fetch single article by ID
- `POST /api/admin/scrape` - Trigger scraping and translation pipeline (admin only)
- `PATCH /api/admin/articles/:id` - Update article status/content (admin only)

### External Dependencies

**Third-Party Services**
- **JINA AI Reader API** (`https://r.jina.ai`): Converts Facebook pages to clean markdown for parsing
- **OpenAI API** (GPT-4-mini model): Handles translation, content rewriting, and news classification
- **Neon Database** (@neondatabase/serverless): Serverless PostgreSQL hosting with connection pooling

**Key Libraries**
- **Authentication**: Session-based auth with connect-pg-simple for PostgreSQL session storage
- **Validation**: Zod schemas with drizzle-zod integration for runtime type checking
- **Date Handling**: date-fns for relative timestamps and formatting
- **Form Management**: React Hook Form with @hookform/resolvers for form validation
- **UI Primitives**: Complete Radix UI suite (dialogs, dropdowns, tooltips, etc.)

**Development Tools**
- Replit-specific plugins for dev banner, cartographer, and runtime error overlay
- esbuild for server-side bundling in production
- TypeScript with strict mode and path aliases (@/, @shared/, @assets/)

### Architectural Decisions

**Scraping Strategy**
- JINA AI chosen over direct Facebook Graph API to avoid authentication complexity and rate limits
- Markdown parsing approach allows flexible post extraction without DOM manipulation
- Limits processing to 10 most recent posts per scrape to control API costs

**Translation Pipeline**
- GPT-4-mini selected for cost-effective translation with quality output
- Prompt engineering includes news filtering to reduce noise from non-news content
- Structured JSON response format ensures consistent data extraction

**Data Flow**
- Unidirectional data flow: Scraper → Translator → Database → API → Frontend
- Articles stored in "pending" state until admin approval for quality control
- Published articles cached in TanStack Query with stale-while-revalidate pattern

**Deployment Considerations**
- Environment variables required: DATABASE_URL, OPENAI_API_KEY
- Build process separates client (Vite) and server (esbuild) for optimal bundle sizes
- Production server uses pre-built static assets with Express serving from /dist/public