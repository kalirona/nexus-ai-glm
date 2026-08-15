import { NextResponse, type NextRequest } from "next/server";

export const runtime = "edge";

/**
 * GET /api/logto/sign-in-callback
 *
 * Handles the callback from Logto after successful authentication.
 * In demo mode (no Logto configured), redirects to home page.
 */
export async function GET(req: NextRequest) {
  const endpoint = process.env.LOGTO_ENDPOINT;
  const appId = process.env.LOGTO_APP_ID;
  const appSecret = process.env.LOGTO_APP_SECRET;
  const baseUrl = process.env.LOGTO_BASE_URL || new URL(req.url).origin;
  const cookieSecret = process.env.LOGTO_COOKIE_SECRET;

  // Demo mode — no Logto configured, redirect home
  if (!endpoint || !appId || !appSecret || !cookieSecret) {
    return NextResponse.redirect(new URL("/", baseUrl));
  }

  // Strip trailing slash from endpoint
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

  try {
    // Use the new object parameter format
    const callbackHandler = client.handleSignInCallback({
      redirectTo: baseUrl,
    });
    const response = await callbackHandler(req);

    // Read the returnTo cookie
    const returnTo = req.cookies.get("logto_return_to")?.value || "/";

    // Build redirect URL
    const redirectUrl = new URL(returnTo, baseUrl);

    // Create a redirect response, preserving the Set-Cookie headers from the callback
    const redirectResponse = NextResponse.redirect(redirectUrl);

    // Copy Set-Cookie headers from the callback response
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    for (const cookie of setCookieHeaders) {
      redirectResponse.headers.append("Set-Cookie", cookie);
    }

    // Clear the returnTo cookie
    redirectResponse.headers.append(
      "Set-Cookie",
      "logto_return_to=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
    );

    return redirectResponse;
  } catch (err) {
    // If callback fails, redirect to home
    return NextResponse.redirect(new URL("/", baseUrl));
  }
}
