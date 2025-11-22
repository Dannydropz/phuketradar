# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- **Database Connection Timeouts**: Significantly improved database reliability during scraping operations
  - Increased connection timeout from 60s to 120s to handle Neon cold starts
  - Increased connection pool size from 5 to 10 for better concurrency
  - Added minimum 2 warm connections to prevent cold start delays
  - Implemented exponential backoff with jitter in retry logic (was linear)
  - Enhanced error detection to catch Neon-specific timeout messages
  - Added database health checking before scrapes start
  - Implemented circuit breaker pattern to prevent cascade failures
  - Added operation throttling to prevent overwhelming the database
  - Enabled Neon-specific optimizations (connection caching, disabled pipelining)
  - Set statement timeout on each connection to prevent indefinite queries
  - See `DATABASE_IMPROVEMENTS.md` for full details
- **Category Dropdown**: Fixed an issue where articles with capitalized categories in the database (e.g., "Crime", "Traffic") were not being displayed in the frontend dropdown due to case-sensitive mapping. Updated `shared/category-map.ts` to include these variants.

