import { NextResponse } from "next/server";

/**
 * Simple middleware — demo mode passes through.
 * Clerk middleware is only loaded when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set.
 */

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default async function middleware(req: Request) {
  if (!CLERK_KEY) {
    // Demo mode — pass through
    return NextResponse.next();
  }

  // Clerk mode — dynamically import and use clerkMiddleware
  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");

  const isPublicRoute = createRouteMatcher([
    "/api/auth/webhook",
    "/api",
  ]);

  const handler = clerkMiddleware(async (auth: any, req: any) => {
    if (isPublicRoute(req)) return;
    await auth.protect();
  });

  return handler(req as any, undefined as any);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|zip|pdf)).*)",
    "/(api|trpc)(.*)",
  ],
};
