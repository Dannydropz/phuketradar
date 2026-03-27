/**
 * Production static file server — NO vite imports.
 * Extracted from server/vite.ts so that server/index.ts can import
 * `log` and `serveStatic` without pulling in vite/rollup/plugin dependencies
 * that are only needed in development.
 */

import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static assets with long-term caching
  app.use(express.static(distPath, {
    maxAge: '1y',
    immutable: true,
    index: false // Don't serve index.html as a static file, we handle it below
  }));

  // Fall through to index.html for all SPA routes
  app.use("*", (_req, res) => {
    res.set({
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      'CDN-Cache-Control': 'public, max-age=300',
      'Vary': 'Accept-Encoding',
    });
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
