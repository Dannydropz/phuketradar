# Single stage — no build step needed, dist is pre-built and committed to git.
# This avoids all cross-platform native binary issues (esbuild, rollup, sharp)
# that occurred when building on Coolify's Linux environment from a macOS lockfile.
#
# Workflow: run `npm run build` locally, commit dist/, then push.

FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

# Install vips runtime required by sharp for image analysis
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*

# Install production dependencies only (no devDeps needed — build already done)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy pre-built application and assets
COPY dist ./dist
COPY public ./public
COPY attached_assets ./attached_assets
COPY docs ./docs

# Expose the port the app runs on
EXPOSE 5000

# Start the application
CMD ["node", "dist/index.js"]
