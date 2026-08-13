# NexusAI — Directus Setup Guide (Phase 1.2)

This guide walks through setting up a **separate Directus instance + separate PostgreSQL database** for NexusAI on your Dokploy server.

## Architecture

```
Dokploy Server
├── Existing App (unchanged)
├── Existing Directus (unchanged)
├── NexusAI Next.js (port 3011)
├── NexusAI Directus (port 3012) ← NEW
└── NexusAI PostgreSQL (port 5433) ← NEW
```

## Prerequisites

- Dokploy server with Docker support
- Existing PostgreSQL instance (shared) OR ability to run a new PostgreSQL container
- Sufficient RAM (~250MB for Directus + PostgreSQL)

---

## Step 1: Create NexusAI PostgreSQL Database

### Option A: Use existing PostgreSQL server (recommended)

Connect to your existing PostgreSQL server and create a dedicated database + user for NexusAI:

```sql
-- Create NexusAI database
CREATE DATABASE nexusai ENCODING 'UTF8' LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8' TEMPLATE template0;

-- Create dedicated user (replace password!)
CREATE USER nexusai WITH ENCRYPTED PASSWORD 'YOUR_STRONG_PASSWORD_HERE';

-- Grant access ONLY to the nexusai database
GRANT ALL PRIVILEGES ON DATABASE nexusai TO nexusai;

-- Connect to the nexusai database and grant schema access
\c nexusai
GRANT ALL ON SCHEMA public TO nexusai;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nexusai;
```

### Option B: Run a separate PostgreSQL container

```yaml
# Add to your NexusAI docker-compose.yml
services:
  nexusai-postgres:
    image: postgres:16-alpine
    container_name: nexusai-postgres
    restart: unless-stopped
    ports:
      - "5433:5432"
    volumes:
      - nexusai-pg:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: nexusai
      POSTGRES_USER: nexusai
      POSTGRES_PASSWORD: YOUR_STRONG_PASSWORD_HERE

volumes:
  nexusai-pg:
```

---

## Step 2: Deploy NexusAI Directus

### Docker Compose for NexusAI Directus

```yaml
services:
  nexusai-directus:
    image: directus/directus:11
    container_name: nexusai-directus
    restart: unless-stopped
    ports:
      - "3012:8055"
    volumes:
      - nexusai-directus-uploads:/directus/uploads
      - nexusai-directus-extensions:/directus/extensions
    environment:
      # Security keys (generate with: openssl rand -hex 16)
      KEY: YOUR_DIRECTUS_KEY_HERE
      SECRET: YOUR_DIRECTUS_SECRET_HERE

      # Admin user (for Directus Admin UI)
      ADMIN_EMAIL: admin@nexusai.app
      ADMIN_PASSWORD: YOUR_STRONG_ADMIN_PASSWORD_HERE

      # Database (connect to the nexusai database)
      DB_CLIENT: pg
      DB_HOST: nexusai-postgres        # or your existing PG host
      DB_PORT: 5432                     # or your existing PG port
      DB_NAME: nexusai
      DB_USER: nexusai
      DB_PASSWORD: YOUR_STRONG_PASSWORD_HERE

      # Storage (optional — for R2/S3, see Step 4)
      # STORAGE_LOCATIONS: s3
      # STORAGE_S3_DRIVER: s3
      # STORAGE_S3_KEY: YOUR_R2_KEY
    volumes:
      nexusai-directus-uploads:
      nexusai-directus-extensions:
```

### Deploy on Dokploy

1. Create a new Dokploy project/service for NexusAI Directus
2. Set the port to `3012`
3. Configure the environment variables above
4. Deploy

---

## Step 3: Create the Test Collection

Once Directus is running, create the test collection:

1. Open the NexusAI Directus Admin UI (e.g., `https://directus.yourdomain.com`)
2. Log in with the admin email/password
3. Go to **Settings → Data Model → Create Collection**
4. Set collection name: `nexusai_test_projects`
5. Add fields:

| Field Name | Type | Notes |
|-----------|------|-------|
| `id` | Auto-increment integer | Primary key (Directus default) |
| `clerk_user_id` | String | **Required** — used for ownership filtering |
| `name` | String | The project name |
| `created_at` | Timestamp | Auto-set on creation |

6. Set `clerk_user_id` to **required** (not nullable)
7. Save the collection

### Create a Service Token

1. Go to **Settings → API Tokens → Create Token**
2. Name it: `NexusAI Service Token`
3. Set role: **Admin** (for the proof of concept — we'll restrict this later)
4. Copy the token (starts with a long string)
5. Store it securely — you'll need it for the NexusAI env vars

---

## Step 4: Configure NexusAI Environment Variables

In your Dokploy NexusAI service settings (or `.env`), add:

```env
# Directus (server-side only — NEVER use NEXT_PUBLIC_ prefix)
DIRECTUS_URL=http://nexusai-directus:8055
DIRECTUS_SERVICE_TOKEN=your_service_token_here
```

If Directus is on a different server, use the full URL:
```env
DIRECTUS_URL=https://directus.yourdomain.com
DIRECTUS_SERVICE_TOKEN=your_service_token_here
```

---

## Step 5: Verify the Connection

Once Directus is running and env vars are set, test the connection:

### Health Check

```bash
curl -H "Authorization: Bearer YOUR_CLERK_JWT" \
  https://your-nexusai-domain.com/api/test/directus-health
```

Expected response:
```json
{
  "ok": true,
  "configured": true,
  "url": "http://nexusai-directus:8055/server/ping",
  "latencyMs": 12,
  "clerkUser": {
    "id": "...",
    "clerkId": "user_abc123",
    "name": "Alex Founder",
    "email": "alex@example.com"
  }
}
```

### Authorization Test (User A / User B)

1. **As User A**, create a project:
```bash
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_A_CLERK_JWT" \
  -d '{"name":"User A Project"}' \
  https://your-nexusai-domain.com/api/test/projects
```

2. **As User A**, list projects — should see "User A Project":
```bash
curl -H "Authorization: Bearer USER_A_CLERK_JWT" \
  https://your-nexusai-domain.com/api/test/projects
```

3. **As User B**, list projects — should see EMPTY list:
```bash
curl -H "Authorization: Bearer USER_B_CLERK_JWT" \
  https://your-nexusai-domain.com/api/test/projects
```

4. **As User B**, try to read User A's project — should get 404:
```bash
curl -H "Authorization: Bearer USER_B_CLERK_JWT" \
  https://your-nexusai-domain.com/api/test/projects/1
```

---

## Step 6: Storage Configuration (Optional — for Phase 1.3+)

When ready to store images in R2/S3:

1. Create a dedicated R2/S3 bucket: `nexusai-files`
2. Create API credentials for the bucket
3. Add to Directus environment variables:

```env
STORAGE_LOCATIONS: s3
STORAGE_S3_DRIVER: s3
STORAGE_S3_KEY: YOUR_R2_ACCESS_KEY
STORAGE_S3_SECRET: YOUR_R2_SECRET_KEY
STORAGE_S3_BUCKET: nexusai-files
STORAGE_S3_REGION: auto
STORAGE_S3_ENDPOINT: https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

NexusAI will use a prefix structure:
```
nexusai-files/
├── images/
├── uploads/
└── generated/
```

---

## Security Checklist

- [ ] `DIRECTUS_URL` does NOT start with `NEXT_PUBLIC_`
- [ ] `DIRECTUS_SERVICE_TOKEN` does NOT start with `NEXT_PUBLIC_`
- [ ] Directus admin password is strong
- [ ] NexusAI PostgreSQL user has access ONLY to the `nexusai` database
- [ ] Directus service token is stored in env vars, never committed to Git
- [ ] `.env` is in `.gitignore`
- [ ] Directus Admin UI is protected behind a strong admin password
- [ ] R2/S3 bucket (if configured) is dedicated to NexusAI

---

## What NOT to Do

- Do NOT use `NEXT_PUBLIC_DIRECTUS_URL` or `NEXT_PUBLIC_DIRECTUS_SERVICE_TOKEN`
- Do NOT expose the Directus service token to the browser
- Do NOT let the browser call Directus directly (all calls go through Next.js)
- Do NOT use Directus native authentication for NexusAI users (Clerk is the auth provider)
- Do NOT share the existing app's Directus database
- Do NOT mix NexusAI collections with existing app collections
