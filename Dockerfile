# ─────────────────────────────────────────────
# NexusAI Dockerfile (Bun build + Node.js runtime)
# ─────────────────────────────────────────────

# Stage 1: Install dependencies (Bun for fast install)
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Stage 2: Build the app
FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN bun run db:generate

# Build Next.js (standalone output)
RUN bun run build

# Stage 3: Production image (Node.js slim — more compatible with Next.js standalone)
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install system packages:
# - wget: used by the healthcheck
# - tini: proper PID 1 init for signal handling
# node:20-slim already has addgroup/adduser and openssl
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    tini \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (node:20-slim already has the 'node' user, uid 1000)
# We'll use the existing node user instead of creating a new one
# This avoids addgroup/adduser compatibility issues

# Copy standalone server (build script already copies static + public into standalone)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma files (needed for SQLite + schema sync at startup)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Copy prisma CLI so we can run `npx prisma db push` at startup
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Create data directory (for any local file storage) + set ownership to node user
RUN mkdir -p /app/data && chown -R node:node /app

# Expose port (3011 to avoid conflicts with other apps on 3000)
EXPOSE 3011

# Set hostname and port
ENV HOSTNAME="0.0.0.0"
ENV PORT=3011

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3011/api || exit 1

# Switch to non-root user (node user already exists in node:20-slim)
USER node

# Use tini as PID 1, then run:
# 1. npx prisma migrate deploy (apply pending migrations — safe, non-destructive)
# 2. node server.js (Next.js standalone server)
ENTRYPOINT ["tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy 2>&1 || echo 'WARN: prisma migrate deploy failed, continuing...'; exec node server.js"]
