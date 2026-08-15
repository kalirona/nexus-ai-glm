import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware — Logto-compatible authentication protection.
 *
 * When Logto is configured (env vars set):
 *   - Checks for a valid Logto session cookie on every request
 *   - Public routes pass through without authentication
 *   - API routes without a session get 401 JSON (not a redirect)
 *   - App routes without a session redirect to /api/logto/sign-in
 *
 * When Logto is NOT configured (demo/dev mode):
 *   - All routes pass through (demo mode)
 *   - getCurrentUser() handles the demo fallback
 *
 * SECURITY:
 *   - API routes fail closed (401) — no redirect for API calls
 *   - App routes redirect to sign-in — user-friendly
 *   - Public routes are explicitly listed (never accidentally protected)
 */

const AUTH_MODE = process.env.AUTH_MODE || (process.env.NODE_ENV === "production" ? "logto" : "demo");

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/api/logto/sign-in",
  "/api/logto/sign-in-callback",
  "/api/logto/sign-out",
  "/api", // Health check endpoint (returns basic info, no sensitive data)
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route === "/api") return pathname === "/api";
    return pathname.startsWith(route);
  });
}

export default async function middleware(req: NextRequest) {
  // Demo mode or Logto not configured — pass through everything
  if (AUTH_MODE === "demo") {
    return NextResponse.next();
  }

  // Check if Logto is actually configured (all env vars must be set)
  const endpoint = process.env.LOGTO_ENDPOINT;
  const appId = process.env.LOGTO_APP_ID;
  const appSecret = process.env.LOGTO_APP_SECRET;
  const cookieSecret = process.env.LOGTO_COOKIE_SECRET;
  const baseUrl = (process.env.LOGTO_BASE_URL || "").replace(/\/+$/, "");

  const logtoConfigured = !!(endpoint && appId && appSecret && cookieSecret && baseUrl);

  // If Logto is not configured but AUTH_MODE is "logto", fall back to pass-through
  if (!logtoConfigured) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // Public routes — pass through
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Sanitize endpoint: strip trailing slashes AND /oidc suffix
  const cleanEndpoint = endpoint!.replace(/\/+$/, "").replace(/\/oidc$/, "");

  // Dynamically import LogtoClient only when needed
  const { default: LogtoClient } = await import("@logto/next/edge");

  const client = new LogtoClient({
    endpoint: cleanEndpoint,
    appId: appId!,
    appSecret: appSecret!,
    baseUrl,
    cookieSecret: cookieSecret!,
    cookieSecure: process.env.NODE_ENV === "production",
  });

  try {
    const context = await client.getLogtoContext(req, { fetchUserInfo: false });

    if (!context.isAuthenticated) {
      // API routes get 401 JSON (no redirect)
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      // App routes redirect to sign-in
      // Use LOGTO_BASE_URL for the redirect URL (not req.url which may be internal)
      const signInUrl = new URL("/api/logto/sign-in", baseUrl);
      signInUrl.searchParams.set("returnTo", pathname);
      return NextResponse.redirect(signInUrl);
    }
  } catch {
    // Logto session check failed — treat as unauthenticated
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const signInUrl = new URL("/api/logto/sign-in", baseUrl);
    signInUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|zip|pdf)).*)",
    "/(api|trpc)(.*)",
  ],
};
