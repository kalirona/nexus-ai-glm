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
  const endpoint = process.env.LOGTO_ENDPOINT || "";
  const appId = process.env.LOGTO_APP_ID || "";
  const appSecret = process.env.LOGTO_APP_SECRET || "";
  const baseUrl = (process.env.LOGTO_BASE_URL || "").replace(/\/+$/, "");
  const cookieSecret = process.env.LOGTO_COOKIE_SECRET || "";

  // Demo mode — no Logto configured, redirect home
  if (!endpoint || !appId || !appSecret || !cookieSecret || !baseUrl) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Sanitize endpoint: strip trailing slashes AND /oidc suffix
  // The SDK appends /oidc/.well-known/openid-configuration automatically
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

  const url = new URL(req.url);
  const returnTo = url.searchParams.get("returnTo") || "/";

  // The redirect_uri MUST be the public-facing URL, not the internal container URL
  // LOGTO_BASE_URL must be set to https://nex.sitenexai.com in Dokploy env vars
  const redirectUri = `${baseUrl}/api/logto/sign-in-callback`;

  // Use the new object parameter format (old string format is deprecated)
  const signInHandler = client.handleSignIn({
    redirectUri,
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
