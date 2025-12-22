# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create public directory if it doesn't exist (Next.js may not have one)
RUN mkdir -p public

# Build the Next.js application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files for dependencies
COPY package*.json ./

# Install all dependencies (needed for next start to work)
RUN npm ci && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.js ./next.config.js

# Copy public directory (created in builder stage, so it always exists even if empty)
COPY --from=builder /app/public ./public

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose port (Cloud Run sets PORT environment variable)
EXPOSE 8080

# Start the application
# Cloud Run sets PORT env var automatically
# Use full path to next binary and pass PORT explicitly
CMD ["sh", "-c", "node_modules/.bin/next start -p ${PORT:-8080}"]

