# NexusAI — Clerk Manual Setup Guide

## Prerequisites

- A Clerk account (free at https://dashboard.clerk.com)
- NexusAI repository with the Phase 1.0 implementation applied

---

## Step-by-Step Setup

### 1. Create a Clerk Application

1. Go to https://dashboard.clerk.com
2. Click **Add Application**
3. Select **Next.js** as the framework
4. Name it "NexusAI"
5. Clerk will generate your API keys

### 2. Copy API Keys

From your Clerk application dashboard → **API Keys**:

| Key | Env Variable |
|-----|-------------|
| Publishable Key (starts with `pk_`) | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| Secret Key (starts with `sk_`) | `CLERK_SECRET_KEY` |

### 3. Configure the Webhook

1. In Clerk Dashboard → **Webhooks** → **Add Endpoint**
2. Set the endpoint URL to:
   ```
   https://your-domain.com/api/auth/webhook
   ```
   (For local development: use a tunnel like ngrok or Clerk's tunnel)
3. Select these events:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`
4. Click **Create**
5. Copy the **Signing Secret** (starts with `whsec_`)

### 4. Set Environment Variables

Edit `.env` in the NexusAI project root:

```bash
# Set to "clerk" for production, "demo" for sandbox
AUTH_MODE=clerk

# From Clerk Dashboard → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# From Clerk Dashboard → Webhooks → Endpoint → Signing Secret
CLERK_WEBHOOK_SECRET=whsec_your_secret_here

# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=your_generated_hex_key_here
```

### 5. Generate the Encryption Key

Run this command and copy the output:

```bash
openssl rand -hex 32
```

Paste it as the `ENCRYPTION_KEY` value in `.env`.

### 6. Restart the Application

```bash
# Stop the dev server
pkill -f "next"

# Start fresh
bun run dev
```

### 7. Test User A

1. Open the app in your browser
2. You should be redirected to Clerk's sign-in page
3. Click **Sign up** and create a test account:
   - Email: `usera@test.com`
   - Password: (choose any)
4. After signup, you should be redirected back to NexusAI
5. Verify:
   - `GET /api/user` returns User A's profile with a `clerkId`
   - Dashboard loads with empty data (new user)
   - Chat works — send a message
   - Create a document
   - Generate an image
6. Record the resource IDs (chat ID, document ID, image ID)

### 8. Test User B

1. Open the app in a **different browser** or **incognito window**
2. Sign up as User B:
   - Email: `userb@test.com`
   - Password: (choose any)
3. Verify:
   - `GET /api/user` returns User B's profile (different `clerkId`)
   - Dashboard shows empty data (User B's own data)

### 9. Cross-User Isolation Test

While authenticated as **User B**, try to access **User A's** resources:

| Test | How | Expected Result |
|------|-----|-----------------|
| User A's chat | `GET /api/chats/{USER_A_CHAT_ID}` | 404 Not Found |
| User A's document | `GET /api/documents/{USER_A_DOC_ID}` | 404 Not Found |
| User A's image | `GET /api/images/{USER_A_IMAGE_ID}` | 404 Not Found |
| User A's brand voice | `GET /api/brand-voices/{USER_A_VOICE_ID}` | 404 Not Found |
| Modify User A's chat | `PATCH /api/chats/{USER_A_CHAT_ID}` | 404 Not Found |
| Delete User A's document | `DELETE /api/documents/{USER_A_DOC_ID}` | 404 Not Found |

**All should return 404** (not 403) — no existence leak.

### 10. Admin Setup (Optional)

To make a user an admin:

1. Sign in as the user you want to be admin
2. Open the SQLite database directly:
   ```bash
   sqlite3 db/custom.db
   ```
3. Run:
   ```sql
   UPDATE User SET isAdmin = 1 WHERE email = 'your-admin@email.com';
   ```
4. The user can now access Super Admin and AI Infrastructure modules

### 11. Webhook Verification

1. In Clerk Dashboard → **Webhooks** → your endpoint
2. Check the **Attempts** tab
3. Verify that `user.created` events show as delivered (200 response)
4. If not delivered:
   - Check the endpoint URL is correct
   - Check `CLERK_WEBHOOK_SECRET` matches
   - Check the server is running and accessible

---

## Environment Variables Summary

| Variable | Required In | Purpose |
|----------|------------|---------|
| `AUTH_MODE` | Always | `demo` or `clerk` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | clerk mode | Client-side Clerk |
| `CLERK_SECRET_KEY` | clerk mode | Server-side Clerk API |
| `CLERK_WEBHOOK_SECRET` | clerk mode | Webhook signature verification |
| `ENCRYPTION_KEY` | clerk mode | AES-256-GCM for API key encryption |
| `DATABASE_URL` | Always | SQLite path |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Redirect loop | Ensure `AUTH_MODE` is set correctly |
| 401 on all APIs | Clerk keys not set, but `AUTH_MODE=clerk` |
| Webhook not delivering | Check URL is publicly accessible (use ngrok for dev) |
| User not created in DB | Check webhook attempts in Clerk dashboard |
| Encryption error | Set `ENCRYPTION_KEY` with `openssl rand -hex 32` |
