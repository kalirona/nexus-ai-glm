import { PrismaClient } from '@prisma/client'

// Cache-busting key — bump when the Prisma schema changes to force a fresh
// client instance in the already-running dev server.
const CACHE_KEY = 'nexus-prisma-v2'

const globalForPrisma = globalThis as unknown as Record<string, PrismaClient | undefined>

export const db =
  globalForPrisma[CACHE_KEY] ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma[CACHE_KEY] = db
