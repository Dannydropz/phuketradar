import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { db, pool } from "./db";
import { sql } from "drizzle-orm";

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
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// Serve static files from attached_assets folder at /assets route
app.use('/assets', express.static(path.join(process.cwd(), 'attached_assets')));

// Serve uploaded images from public/uploads folder
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

app.use(express.json());
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

// SEO: 301 redirect old /category/:category URLs to new /:category URLs
app.get('/category/:category', (req, res) => {
  const { category } = req.params;
  res.redirect(301, `/${category}`);
});

// SEO: 301 redirect old /article/:slug URLs to new /:category/:slug URLs
app.get('/article/:slugOrId', async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const { resolveFrontendCategory } = await import('@shared/category-map');
    const { storage } = await import('./storage');

    // Look up article to get its category
    let article = await storage.getArticleBySlug(slugOrId);
    if (!article) {
      article = await storage.getArticleById(slugOrId);
    }

    if (article) {
      const frontendCategory = resolveFrontendCategory(article.category);
      const slug = article.slug || article.id;
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
    // Register routes first
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error(`❌ [EXPRESS ERROR] ${status} ${message}`, err);
      res.status(status).json({ message });
      // Don't throw here, let Express handle it or just log it
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);

    // CRITICAL: Start server IMMEDIATELY to satisfy Railway health checks
    // Do NOT wait for database checks before listening
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`✅ Server serving on port ${port}`);

      // Run database checks in background AFTER server is listening
      // This prevents Railway 502 errors caused by slow Neon cold starts
      (async () => {
        try {
          log("🔧 [SCHEMA] Ensuring database schema is up to date...");

          // Add timeout to prevent indefinite hangs
          const schemaCheckPromise = db.execute(sql`
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS facebook_headline text;
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS author varchar;
            ALTER TABLE journalists ADD COLUMN IF NOT EXISTS nickname varchar;
          `);

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Schema check timeout after 30s')), 30000)
          );

          await Promise.race([schemaCheckPromise, timeoutPromise]);
          log("✅ [SCHEMA] Database schema verified");
        } catch (error: any) {
          if (error.message?.includes('timeout')) {
            log("⚠️  [SCHEMA] Schema check timed out - database may be cold starting");
            log("   Server is running, schema will be checked on first query");
          } else {
            log("❌ [SCHEMA] Error ensuring schema:");
            console.error(error);
          }
          // Don't throw - server is already running
        }
      })();
    });

    server.on('error', (error: any) => {
      console.error('❌ [SERVER ERROR] Server failed to start:', error);
      process.exit(1);
    });

    // Automated scraping DISABLED - Use external cron service instead
    log('📅 Automated internal scraping DISABLED');
    log(`📅 CRON_API_KEY loaded: ${process.env.CRON_API_KEY ? 'YES (' + process.env.CRON_API_KEY.substring(0, 3) + '...)' : 'NO'}`);
    log('📅 External cron endpoint: POST /api/cron/scrape (requires CRON_API_KEY)');
    log('📅 Manual scraping available at: /api/admin/scrape (requires admin session)');

  } catch (error) {
    console.error('❌ [FATAL] Failed to initialize application:', error);
    process.exit(1);
  }
})();
