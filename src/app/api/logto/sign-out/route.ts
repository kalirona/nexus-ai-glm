import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/logto/sign-out
 *
 * Signs the user out of Logto and clears the session.
 * In demo mode (no Logto configured), redirects to home page.
 */
export async function GET(req: Request) {
  const endpoint = process.env.LOGTO_ENDPOINT || "";
  const appId = process.env.LOGTO_APP_ID || "";
  const appSecret = process.env.LOGTO_APP_SECRET || "";
  const baseUrl = (process.env.LOGTO_BASE_URL || "").replace(/\/+$/, "");
  const cookieSecret = process.env.LOGTO_COOKIE_SECRET || "";

  // Demo mode — no Logto configured, just redirect home
  if (!endpoint || !appId || !appSecret || !cookieSecret || !baseUrl) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Sanitize endpoint
  const cleanEndpoint = endpoint.replace(/\/+$/, "").replace(/\/oidc$/, "");

  // Dynamically import LogtoClient only when configured
  const { default: LogtoClient } = await import("@logto/next/edge");

  const client = new LogtoClient({
    endpoint: cleanEndpoint,
    appId,
    appSecret,
    baseUrl,
    cookieSecret,
    cookieSecure: process.env.NODE_ENV === "production",
  });

  try {
    // Use the new object parameter format
    const signOutHandler = client.handleSignOut({
      redirectUri: baseUrl,
    });
    const response = await signOutHandler(req as any);
    return response;
  } catch (err) {
    // If sign-out fails, redirect to home
    return NextResponse.redirect(new URL("/", baseUrl));
  }
}
