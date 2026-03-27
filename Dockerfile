# Build stage
# Force rebuild: 2026-03-27 01:47 UTC
FROM node:20-alpine AS builder

WORKDIR /app

# Set development mode to ensure devDependencies are installed for build
ENV NODE_ENV=development

# Install native build dependencies required by sharp (image analysis)
# sharp needs python3/make/g++ for native compilation on Alpine Linux
RUN apk add --no-cache python3 make g++ vips-dev

# Install ALL dependencies including devDependencies (vite, esbuild, etc.)
COPY package*.json ./
RUN npm ci --include=dev

# Copy source code
COPY . .

# Increase Node.js heap size to prevent OOM during vite build (large bundle ~1GB peak usage)
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install vips runtime library needed by sharp for image analysis
RUN apk add --no-cache vips

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
# Railway issue: npm doesn't forward SIGTERM correctly, causing abrupt kills
CMD ["node", "dist/index.js"]
