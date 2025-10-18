import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { neon } from "@neondatabase/serverless";
import cron from "node-cron";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { runScheduledScrape } from "./scheduler";
import { withSchedulerLock } from "./lib/scheduler-lock";

const app = express();

// Trust proxy for secure cookies behind HTTPS proxies (Replit, etc.)
app.set('trust proxy', 1);

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

  // Automated scraping with cron scheduler
  // ONLY runs in production to prevent excessive API usage during development
  // Runs every 4 hours at minute 0 (12:00 AM, 4:00 AM, 8:00 AM, 12:00 PM, 4:00 PM, 8:00 PM)
  // Database lock prevents duplicate runs when multiple server instances exist
  if (process.env.NODE_ENV === 'production') {
    const instanceId = Math.random().toString(36).substring(7);
    
    cron.schedule('0 */4 * * *', async () => {
      log(`📅 [Instance ${instanceId}] Automated scraping triggered by cron scheduler`);
      
      await withSchedulerLock(
        runScheduledScrape,
        () => {
          log(`⏭️  [Instance ${instanceId}] Skipping scrape - another instance is already running`);
        }
      );
    });

    log(`📅 Automated scraping ENABLED in production: every 4 hours at minute 0 (Instance ${instanceId})`);
  } else {
    log('📅 Automated scraping DISABLED in development mode (use admin dashboard to manually trigger scraping)');
  }
})();
