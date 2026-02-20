# Build stage
# Force rebuild: 2026-01-10 12:30 UTC
FROM node:20-alpine AS builder

WORKDIR /app

# Set development mode to ensure devDependencies are installed for build
ENV NODE_ENV=development

# Install ALL dependencies including devDependencies (vite, esbuild, etc.)
COPY package*.json ./
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

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
