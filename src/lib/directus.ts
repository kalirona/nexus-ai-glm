import "server-only";

/**
 * Directus Server Client — NexusAI → Directus → PostgreSQL
 *
 * ARCHITECTURE:
 *   Browser → Logto → Next.js → Directus (this client) → PostgreSQL
 *
 * SECURITY:
 *   - Server-only module (import "server-only" prevents client bundling)
 *   - DIRECTUS_URL and DIRECTUS_SERVICE_TOKEN are server-side env vars
 *   - NO NEXT_PUBLIC_ prefix — browser never sees these credentials
 *   - All Directus API calls go through Next.js (browser never calls Directus directly)
 *
 * IDENTITY INTEGRATION:
 *   - The caller (Next.js API route) resolves the Logto user identity
 *   - The userId is passed to Directus as a filter (stored as clerk_user_id field
 *     in Directus for backward compatibility — the field name is legacy)
 *   - Directus does NOT authenticate users — it trusts Next.js's auth decision
 *   - Ownership is enforced by filtering on userId in every query
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL || "";
const DIRECTUS_SERVICE_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN || "";

/** Checks if Directus is configured (env vars present). */
export function isDirectusConfigured(): boolean {
  return !!(DIRECTUS_URL && DIRECTUS_SERVICE_TOKEN);
}

/** Throws a helpful error if Directus isn't configured. */
function requireDirectus() {
  if (!isDirectusConfigured()) {
    throw new Error(
      "Directus is not configured. Set DIRECTUS_URL and DIRECTUS_SERVICE_TOKEN in your .env file. " +
      "See DIRECTUS-SETUP.md for instructions."
    );
  }
}

/** Builds the full Directus API URL for a given path. */
function buildUrl(path: string): string {
  const base = DIRECTUS_URL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/** Standard headers for Directus API calls. */
function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${DIRECTUS_SERVICE_TOKEN}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DirectusItem {
  id?: string | number;
  [key: string]: unknown;
}

export interface DirectusListResponse<T> {
  data: T[];
  meta?: {
    total_count?: number;
    filter_count?: number;
  };
}

export interface DirectusError {
  errors: Array<{
    message: string;
    extensions?: Record<string, unknown>;
  }>;
}

// ---------------------------------------------------------------------------
// Generic CRUD helpers
// ---------------------------------------------------------------------------

/**
 * Lists items from a Directus collection, filtered by clerkUserId.
 * The caller MUST pass the authenticated user's clerkId — never trust client input.
 */
export async function listItems<T extends DirectusItem>(
  collection: string,
  clerkUserId: string,
  options?: {
    fields?: string[];
    sort?: string;
    limit?: number;
    extraFilter?: Record<string, unknown>;
  }
): Promise<T[]> {
  requireDirectus();

  const params = new URLSearchParams();
  params.set("filter", JSON.stringify({
    clerk_user_id: { _eq: clerkUserId },
    ...(options?.extraFilter || {}),
  }));
  if (options?.fields) params.set("fields", options.fields.join(","));
  if (options?.sort) params.set("sort", options.sort);
  if (options?.limit) params.set("limit", String(options.limit));

  const res = await fetch(buildUrl(`/items/${collection}?${params.toString()}`), {
    method: "GET",
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ errors: [{ message: res.statusText }] })) as DirectusError;
    throw new Error(`Directus list failed: ${err.errors?.[0]?.message || res.statusText}`);
  }

  const body = await res.json() as DirectusListResponse<T>;
  return body.data || [];
}

/**
 * Creates an item in a Directus collection.
 * The clerkUserId is set from the authenticated session — never from client input.
 */
export async function createItem<T extends DirectusItem>(
  collection: string,
  clerkUserId: string,
  data: Omit<T, "id" | "clerk_user_id" | "created_at" | "updated_at">
): Promise<T> {
  requireDirectus();

  const res = await fetch(buildUrl(`/items/${collection}`), {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      ...data,
      clerk_user_id: clerkUserId,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ errors: [{ message: res.statusText }] })) as DirectusError;
    throw new Error(`Directus create failed: ${err.errors?.[0]?.message || res.statusText}`);
  }

  const body = await res.json() as { data: T };
  return body.data;
}

/**
 * Gets a single item by ID, verifying ownership via clerkUserId filter.
 * Returns null if the item doesn't exist OR doesn't belong to the user.
 */
export async function getItem<T extends DirectusItem>(
  collection: string,
  id: string | number,
  clerkUserId: string,
  options?: { fields?: string[] }
): Promise<T | null> {
  requireDirectus();

  const params = new URLSearchParams();
  params.set("filter", JSON.stringify({
    id: { _eq: id },
    clerk_user_id: { _eq: clerkUserId },
  }));
  if (options?.fields) params.set("fields", options.fields.join(","));

  const res = await fetch(buildUrl(`/items/${collection}?${params.toString()}`), {
    method: "GET",
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ errors: [{ message: res.statusText }] })) as DirectusError;
    throw new Error(`Directus get failed: ${err.errors?.[0]?.message || res.statusText}`);
  }

  const body = await res.json() as DirectusListResponse<T>;
  return body.data?.[0] || null;
}

/**
 * Updates an item, verifying ownership via clerkUserId filter.
 * Returns null if the item doesn't exist OR doesn't belong to the user.
 */
export async function updateItem<T extends DirectusItem>(
  collection: string,
  id: string | number,
  clerkUserId: string,
  data: Partial<T>
): Promise<T | null> {
  requireDirectus();

  // Directus PATCH doesn't support filter in the same way as GET.
  // We first verify ownership, then update.
  const existing = await getItem<T>(collection, id, clerkUserId);
  if (!existing) return null;

  const res = await fetch(buildUrl(`/items/${collection}/${id}`), {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ errors: [{ message: res.statusText }] })) as DirectusError;
    throw new Error(`Directus update failed: ${err.errors?.[0]?.message || res.statusText}`);
  }

  const body = await res.json() as { data: T };
  return body.data;
}

/**
 * Deletes an item, verifying ownership via clerkUserId filter.
 * Returns false if the item doesn't exist OR doesn't belong to the user.
 */
export async function deleteItem(
  collection: string,
  id: string | number,
  clerkUserId: string
): Promise<boolean> {
  requireDirectus();

  // Verify ownership before deleting
  const existing = await getItem(collection, id, clerkUserId);
  if (!existing) return false;

  const res = await fetch(buildUrl(`/items/${collection}/${id}`), {
    method: "DELETE",
    headers: buildHeaders(),
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({ errors: [{ message: res.statusText }] })) as DirectusError;
    throw new Error(`Directus delete failed: ${err.errors?.[0]?.message || res.statusText}`);
  }

  return true;
}

/**
 * Pings the Directus server to verify connectivity.
 * Returns { ok, status, latencyMs, error? }.
 */
export async function pingDirectus(): Promise<{
  ok: boolean;
  url: string;
  latencyMs: number;
  error?: string;
}> {
  if (!isDirectusConfigured()) {
    return { ok: false, url: "", latencyMs: 0, error: "DIRECTUS_URL or DIRECTUS_SERVICE_TOKEN not set" };
  }

  const start = Date.now();
  try {
    const res = await fetch(buildUrl("/server/ping"), {
      method: "GET",
      headers: buildHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - start;

    if (res.ok) {
      return { ok: true, url: DIRECTUS_URL, latencyMs };
    }
    return { ok: false, url: DIRECTUS_URL, latencyMs, error: `HTTP ${res.status}` };
  } catch (err) {
    return {
      ok: false,
      url: DIRECTUS_URL,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
