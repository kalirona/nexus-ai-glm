# NexusAI — Final Architecture (Phase 1.6)

## Architecture

```
                 ┌──────────────┐
                 │    Logto     │
                 │ Authentication│
                 └──────┬───────┘
                        │ OIDC
                        ▼
                 ┌──────────────┐
                 │   Next.js    │
                 │  NexusAI API │
                 └──────┬───────┘
                        │ Prisma ORM
                        ▼
                 ┌──────────────┐
                 │ PostgreSQL   │
                 │   nexusai    │
                 └──────────────┘
```

## 1. Authentication

- **Provider:** Logto (OIDC)
- **SDK:** `@logto/next` v4.2.10 (edge export)
- **Flow:** Browser → `/api/logto/sign-in` → Logto OIDC → `/api/logto/sign-in-callback` → session cookie
- **Session validation:** Server-side via `next/headers` `cookies()` + Logto SDK
- **Fail-closed:** `AUTH_MODE=logto` + no session → 401 (API) or redirect (pages)
- **Demo mode:** `AUTH_MODE=demo` returns demo user (sandbox/dev only — never in production)
- **User sync:** Lazy — `getCurrentUser()` creates User on first authenticated request
- **isAdmin:** NEVER from Logto — only from local PostgreSQL database

## 2. Application Server

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5, React 19
- **UI:** Tailwind CSS 4 + shadcn/ui (New York style)
- **State:** Zustand (client) + TanStack Query (server)
- **Port:** 3011 (Dokploy)

## 3. ORM

- **Prisma** v6.11.1
- **Datasource:** `postgresql`
- **Migration strategy:** `prisma migrate deploy` (production-safe)
- **18 models:** User, Folder, Chat, Message, Document, DocumentVersion, Image, CreditTransaction, AuditLog, ApiKey, Template, Agent, BrandVoice, GeneratorHistory, PlatformSetting, AiUsageLog, PromptConfig, AiModel

## 4. Database

- **PostgreSQL** — dedicated `nexusai` database
- **User:** `nexusai` (dedicated, restricted to `nexusai` database only)
- **Not shared with:** App 1 or any other application

## 5. Deployment

- **Platform:** Dokploy (Docker)
- **Container:** `node:20-slim` runtime
- **Startup:** `tini` → `npx prisma migrate deploy` → `node server.js`
- **Health check:** `wget http://localhost:3011/api`

## 6. External Services

- **Logto:** OIDC authentication (user's existing instance)
- **AI providers:** Z.ai (default), OpenRouter, OpenAI, Anthropic, etc. (admin-configured)
- **No Directus:** Removed from NexusAI in Phase 1.6
- **No Clerk:** Removed in Phase 1.4
- **No SQLite:** Migrated to PostgreSQL in Phase 1.5

## 7. Security Boundaries

| Boundary | Mechanism |
|----------|-----------|
| Browser → Next.js | Logto OIDC session cookie (HTTPS) |
| Next.js → PostgreSQL | Prisma connection string (server-side env var) |
| Logto app secret | Server-side env var (`LOGTO_APP_SECRET`) |
| Logto cookie secret | Server-side env var (`LOGTO_COOKIE_SECRET`) |
| Encryption key | Server-side env var (`ENCRYPTION_KEY`) |
| Database URL | Server-side env var (`DATABASE_URL`) |

**The browser NEVER receives:** database credentials, Logto app secret, Logto cookie secret, encryption key, or any privileged token.

## 8. Environment Variables

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://nexusai:PASSWORD@HOST:5432/nexusai

# Authentication
AUTH_MODE=logto
LOGTO_ENDPOINT=https://logto.yourdomain.com
LOGTO_APP_ID=...
LOGTO_APP_SECRET=...
LOGTO_BASE_URL=https://nexusai.yourdomain.com
LOGTO_COOKIE_SECRET=...

# Encryption
ENCRYPTION_KEY=...
```

**No `NEXT_PUBLIC_` prefix on any privileged variable.**

## 9. What is Intentionally NOT Used

| Technology | Status | Reason |
|-----------|--------|--------|
| Directus | ❌ Removed | Not part of NexusAI data flow |
| Clerk | ❌ Removed | Replaced by Logto |
| SQLite | ❌ Removed (production) | Replaced by PostgreSQL |
| PocketBase | ❌ Never used | Not part of architecture |
| Appwrite | ❌ Never used | Not part of architecture |
| NextAuth | ❌ Never used | Replaced by Logto |
| Firebase | ❌ Never used | Not part of architecture |
| Supabase | ❌ Never used | Not part of architecture |

## 10. Legacy Fields

| Field | Model | Status | Reason |
|-------|-------|--------|--------|
| `clerkId` | User | Kept (nullable, unique) | Legacy data compatibility — existing migrated records may have this field populated. Safe to remove in a future phase after confirming no production data depends on it. |

## 11. Data Migration

- **Script:** `scripts/migrate-sqlite-to-postgres.ts`
- **Source:** SQLite (`SQLITE_DATABASE_URL`)
- **Target:** PostgreSQL (`DATABASE_URL`)
- **Strategy:** Idempotent upsert, preserves IDs/timestamps/relations
- **Status:** Code ready — NOT YET EXECUTED (requires PostgreSQL)
