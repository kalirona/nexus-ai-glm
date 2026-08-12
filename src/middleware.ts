import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Clerk middleware — protects routes based on AUTH_MODE.
 *
 * AUTH_MODE=demo (default in development):
 *   All routes pass through. getCurrentUser() handles the demo user fallback.
 *   This is necessary because keyless Clerk cannot enforce auth.protect().
 *
 * AUTH_MODE=clerk (production):
 *   All non-public routes require a valid Clerk session.
 *   Unauthenticated users are redirected to Clerk's login page.
 *
 * Public routes (always accessible, no session required):
 *   - /api/auth/webhook  (authenticates via Svix signature, not Clerk session)
 *   - /api                (health check)
 */

const AUTH_MODE = process.env.AUTH_MODE || (process.env.NODE_ENV === "production" ? "clerk" : "demo");

const isPublicRoute = createRouteMatcher([
  "/api/auth/webhook",
  "/api",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return;
  }

  // In demo mode, pass all routes through — getCurrentUser() handles fallback
  if (AUTH_MODE === "demo") {
    return;
  }

  // In clerk mode, require authentication on all non-public routes
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|zip|pdf)).*)",
    "/(api|trpc)(.*)",
  ],
};
