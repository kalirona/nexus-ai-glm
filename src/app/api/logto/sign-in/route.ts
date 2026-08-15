import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/logto/sign-in
 *
 * Redirects the user to the Logto sign-in page.
 * In demo mode (no Logto configured), redirects to home page.
 *
 * Query params:
 *   returnTo — the path to redirect to after sign-in (default: /)
 */
export async function GET(req: Request) {
  const endpoint = process.env.LOGTO_ENDPOINT;
  const appId = process.env.LOGTO_APP_ID;
  const appSecret = process.env.LOGTO_APP_SECRET;
  const baseUrl = process.env.LOGTO_BASE_URL || new URL(req.url).origin;
  const cookieSecret = process.env.LOGTO_COOKIE_SECRET;

  // Demo mode — no Logto configured, redirect home
  if (!endpoint || !appId || !appSecret || !cookieSecret) {
    return NextResponse.redirect(new URL("/", baseUrl));
  }

  // Strip trailing slash from endpoint (Logto SDK appends paths)
  const cleanEndpoint = endpoint.replace(/\/+$/, "");

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

  const url = new URL(req.url);
  const returnTo = url.searchParams.get("returnTo") || "/";

  // Use the new object parameter format (old string format is deprecated)
  const signInHandler = client.handleSignIn({
    redirectUri: `${baseUrl}/api/logto/sign-in-callback`,
  });
  const response = await signInHandler(req);

  // Store returnTo in a cookie so the callback can read it
  response.headers.append(
    "Set-Cookie",
    `logto_return_to=${encodeURIComponent(returnTo)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );

  return response;
}
