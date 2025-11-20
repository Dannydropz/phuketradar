# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

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

# Expose the port the app runs on
EXPOSE 5000

# Start the application
CMD ["npm", "run", "start"]
