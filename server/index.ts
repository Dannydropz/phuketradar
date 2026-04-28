import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { log, serveStatic } from "./static-server";
import path from "path";
import { db, pool } from "./db";
import { sql } from "drizzle-orm";
import { storage } from "./storage";
import { resolveFrontendCategory } from "@shared/category-map";
import { cache, CACHE_KEYS } from "./lib/cache";

// CRITICAL: Global error handlers to prevent crashes
// Note: We DON'T exit the process to keep the server running
// Scraping errors should be isolated and not crash the entire app
process.on('uncaughtException', (error) => {
  console.error('❌ [UNCAUGHT EXCEPTION]:', error);
  console.error('   Stack:', error.stack);
  console.error('   ⚠️  Process continuing - error logged but not fatal');
  // Do NOT exit - keep server running for user requests
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [UNHANDLED REJECTION]:', reason);
  console.error('   Promise:', promise);
  console.error('   ⚠️  Process continuing - rejection logged but not fatal');
  // Do NOT exit - keep server running
});

console.log("🚀 [STARTUP] Application starting...");
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   PORT: ${process.env.PORT || '5000'}`);

const app = express();

// Trust proxy for secure cookies behind HTTPS proxies (Replit, etc.)
app.set('trust proxy', 1);

// Health check endpoint (before any middleware/DB checks)
// CRITICAL: Must respond instantly even during heavy scraping
// Railway uses this to determine if the app is alive
const startTime = Date.now();
app.get('/health', (_req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  res.status(200).json({
    status: 'ok',
    uptime: `${uptime}s`,
    timestamp: new Date().toISOString()
  });
});

// Fallback health check on root for Railway
app.get('/', (_req, res, next) => {
  // If this is a health check request (no accept header or health check user agent)
  if (!_req.headers.accept || _req.headers['user-agent']?.includes('Health')) {
    return res.status(200).send('OK');
  }
  // Otherwise, let it fall through to the SPA handler
  next();
});

// Serve static files from attached_assets folder at /assets route with long-term caching
app.use('/assets', express.static(path.join(process.cwd(), 'attached_assets'), {
  maxAge: '30d',
  immutable: true
}));

// Serve uploaded images from public/uploads folder with reasonable caching
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads'), {
  maxAge: '7d'
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  console.error("❌ [FATAL] DATABASE_URL environment variable is missing");
  throw new Error("DATABASE_URL environment variable is required for database operations");
}

// PostgreSQL session store for production persistence
const PgSession = connectPgSimple(session);
const sessionStore = new PgSession({
  pool, // Use the shared pool with IPv4 fix
  createTableIfMissing: false, // Prevent startup DB query - table should exist
  errorLog: (error) => {
    console.error('[SESSION STORE] Error:', error);
  },
});

// Session middleware for admin authentication
// Capture SESSION_SECRET at startup to prevent runtime issues
let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  console.warn("⚠️  [WARNING] SESSION_SECRET is missing or too short. Using a temporary random secret.");
  console.warn("   Sessions will be invalidated on restart. Set SESSION_SECRET in environment variables.");
  // Generate a temporary secret if missing (prevents crash, but sessions won't persist across restarts)
  SESSION_SECRET = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

log(`Session configured with ${SESSION_SECRET.length}-character secret`);

app.use(
  session({
    store: sessionStore,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
  })
);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Debug version endpoint - register EARLY and SYNCHRONOUSLY
app.get("/api/debug/version", (req, res) => {
  res.json({
    version: "1.0.5-debug-fix",
    timestamp: new Date().toISOString(),
    deployment: "verified",
    note: "Registered directly in index.ts"
  });
});

// CRITICAL: Register API routes BEFORE legacy redirects to prevent conflicts
// and ensure API calls don't hit the database for redirect lookups
const serverPromise = registerRoutes(app);

// SEO: 301 redirect old /category/:category URLs to new /:category URLs
app.get('/category/:category', (req, res) => {
  const { category } = req.params;
  res.redirect(301, `/${category}`);
});

// SEO: 301 redirect legacy database category paths to correct frontend categories
// This fixes old Switchy links and Facebook posts that used incorrect paths
const LEGACY_CATEGORY_REDIRECTS: Record<string, string> = {
  'other': 'local',       // Other -> Local
  'info': 'local',        // Info -> Local
  'events': 'local',      // Events -> Local
  'local-news': 'local',  // Local News -> Local (old category slug, ~252 Google-indexed URLs)
};

// Handle legacy category paths like /breaking/:slug, /other/:slug, /business/:slug
app.get('/:legacyCategory/:slugOrId', (req, res, next) => {
  const { legacyCategory, slugOrId } = req.params;
  const legacyCategoryLower = legacyCategory.toLowerCase();

  // Skip if this is an API call or internal path
  if (legacyCategoryLower === 'api' || legacyCategoryLower === 'assets' || legacyCategoryLower === 'uploads') {
    return next();
  }

  // Check if this is a legacy category that needs redirecting
  const correctCategory = LEGACY_CATEGORY_REDIRECTS[legacyCategoryLower];

  if (correctCategory) {
    log(`🔄 [REDIRECT] Legacy category path: /${legacyCategory}/${slugOrId} -> /${correctCategory}/${slugOrId}`);
    res.redirect(301, `/${correctCategory}/${slugOrId}`);
  } else {
    // Not a legacy category, let it pass through to the SPA router
    next();
  }
});

// SEO: 301 redirect old /article/:slug URLs to new /:category/:slug URLs
// CACHED to prevent database saturation during Facebook traffic spikes
app.get('/article/:slugOrId', async (req, res, next) => {
  try {
    const { slugOrId } = req.params;

    // Check cache first for redirect mapping
    const cacheKey = `redirect:article:${slugOrId}`;
    const cachedRedirect = cache.get<{ category: string, slug: string }>(cacheKey);

    if (cachedRedirect) {
      return res.redirect(301, `/${cachedRedirect.category}/${cachedRedirect.slug}`);
    }

    // Look up article to get its category
    let article = await storage.getArticleBySlug(slugOrId);
    if (!article) {
      article = await storage.getArticleById(slugOrId);
    }

    if (article) {
      const frontendCategory = resolveFrontendCategory(article.category);
      const slug = article.slug || article.id;

      // Cache the redirect for 1 hour to protect DB from crawl spikes
      cache.set(cacheKey, { category: frontendCategory, slug }, 3600000);

      res.redirect(301, `/${frontendCategory}/${slug}`);
    } else {
      // Article not found, let it fall through to 404
      next();
    }
  } catch (error) {
    console.error('Error redirecting article URL:', error);
    next();
  }
});

(async () => {
  try {
    // Wait for routes to be registered
    const server = await serverPromise;

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error(`❌ [EXPRESS ERROR] ${status} ${message}`, err);
      res.status(status).json({ message });
      // Don't throw here, let Express handle it or just log it
    });

    // important: only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "development") {
      const { setupVite } = await import("./vite");
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = parseInt(process.env.PORT || '5000', 10);

    // CRITICAL: Start re-enrichment poller background task
    import("./scheduler").then(({ startReEnrichmentPoller }) => {
      startReEnrichmentPoller();
    }).catch(err => console.error("Failed to start re-enrichment poller:", err));

    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`✅ Server serving on port ${port}`);
    });

    server.on('error', (error: any) => {
      console.error('❌ [SERVER ERROR] Server failed to start:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ [FATAL] Failed to initialize application:', error);
    process.exit(1);
  }
})();
