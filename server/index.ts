import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { neon } from "@neondatabase/serverless";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

const app = express();

// Trust proxy for secure cookies behind HTTPS proxies (Replit, etc.)
app.set('trust proxy', 1);

// Serve static files from attached_assets folder at /assets route
app.use('/assets', express.static(path.join(process.cwd(), 'attached_assets')));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required for database operations");
}

// PostgreSQL session store for production persistence
const PgSession = connectPgSimple(session);
const sessionStore = new PgSession({
  conString: process.env.DATABASE_URL,
  createTableIfMissing: true,
});

// Session middleware for admin authentication
// Capture SESSION_SECRET at startup to prevent runtime issues
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error(
    "SESSION_SECRET environment variable is required and must be at least 32 characters for secure session management. " +
    "Generate a secure random string using: openssl rand -base64 32"
  );
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
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Automated scraping DISABLED - Use external cron service instead
  // Internal cron scheduling had issues with unpredictable firing times
  // Use cron-job.org or similar service to trigger scraping via API endpoint
  // API endpoint: POST https://your-replit-url.replit.app/api/cron/scrape
  // Authentication: Add header "Authorization: Bearer YOUR_CRON_API_KEY"
  // Recommended schedule: Every 4 hours (0:00, 4:00, 8:00, 12:00, 16:00, 20:00 Bangkok time)
  // See EXTERNAL_CRON_SETUP.md for complete setup instructions
  log('📅 Automated internal scraping DISABLED');
  log('📅 External cron endpoint: POST /api/cron/scrape (requires CRON_API_KEY)');
  log('📅 Manual scraping available at: /api/admin/scrape (requires admin session)');
})();
