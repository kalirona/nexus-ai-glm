#!/bin/sh
set -e

echo "[NexusAI] Starting entrypoint…"

# Ensure the data directory exists (SQLite volume mount)
mkdir -p /app/data

# Sync the Prisma schema to the database.
# This is safe to run on every startup — it only applies changes if the
# schema differs from the database. --accept-data-loss is needed because
# SQLite doesn't support all migration operations natively.
# Using bunx (Bun's npx equivalent) since npx isn't in the bun:1-slim image.
echo "[NexusAI] Syncing database schema…"
bunx prisma db push --accept-data-loss 2>&1 || {
  echo "[NexusAI] WARNING: prisma db push failed — the app will start anyway."
  echo "[NexusAI] If this is a fresh database, tables may be missing."
}

echo "[NexusAI] Starting server on port ${PORT:-3000}…"
exec "$@"
