# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Cache bust: 2026-03-27 06:28 UTC — forces fresh layer after .dockerignore was added
ARG CACHEBUST=2026-03-27-0628

# Set development mode to ensure devDependencies are installed for build
ENV NODE_ENV=development

# Install native build dependencies required by sharp (image analysis)
# Using slim (Debian) not Alpine — avoids musl/glibc incompatibility with rollup/esbuild native binaries
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libvips-dev \
    && rm -rf /var/lib/apt/lists/*

# Install ALL dependencies including devDependencies (vite, esbuild, etc.)
COPY package*.json ./
RUN npm ci --include=dev

# Copy source code (node_modules is excluded via .dockerignore)
COPY . .

# Increase Node.js heap size to prevent OOM during vite build (large bundle)
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Build the application
RUN npm run build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install vips runtime library needed by sharp for image analysis at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*

# Copy built assets and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
# Copy public assets if they exist (for static files)
COPY --from=builder /app/public ./public
COPY --from=builder /app/attached_assets ./attached_assets
# Copy docs folder (contains newsletter-template.html read at runtime)
COPY --from=builder /app/docs ./docs

# Expose the port the app runs on
EXPOSE 5000

# Start the application
# CRITICAL: Use node directly instead of npm to properly handle SIGTERM
CMD ["node", "dist/index.js"]
