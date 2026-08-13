import { NextResponse, type NextRequest } from "next/server";
import { getLogtoClient, isLogtoConfigured } from "@/lib/logto";

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
  // Demo mode — pass through everything
  if (AUTH_MODE === "demo" || !isLogtoConfigured()) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // Public routes — pass through
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check Logto session
  const client = getLogtoClient();
  if (!client) {
    return NextResponse.next();
  }

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
      const signInUrl = new URL("/api/logto/sign-in", req.url);
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

    const signInUrl = new URL("/api/logto/sign-in", req.url);
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
