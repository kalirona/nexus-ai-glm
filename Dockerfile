# ─────────────────────────────────────────────
# NexusAI Dockerfile (Bun + Next.js standalone)
# ─────────────────────────────────────────────

# Stage 1: Install dependencies
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

# Stage 3: Production image
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install system packages needed in the slim image:
# - adduser: provides addgroup + adduser for non-root user creation
# - wget: used by the healthcheck
# - tini: proper PID 1 init for signal handling (prevents zombie processes)
RUN apt-get update && apt-get install -y --no-install-recommends \
    adduser \
    wget \
    tini \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 nexus && \
    adduser --system --uid 1001 --ingroup nexus nexus

# Copy standalone server (build script already copies static + public into standalone)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma files (needed for SQLite + schema sync at startup)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Copy prisma CLI so we can run `prisma db push` at startup
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create data directory for SQLite + set ownership
RUN mkdir -p /app/data && chown -R nexus:nexus /app

# Switch to non-root user
USER nexus

# Expose port (3011 to avoid conflicts with other apps on 3000)
EXPOSE 3011

# Set hostname
ENV HOSTNAME="0.0.0.0"
ENV PORT=3011

# Health check (wget installed above)
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3011/api || exit 1

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["tini", "--", "/app/docker-entrypoint.sh"]

# Start the Next.js standalone server
CMD ["bun", "server.js"]
