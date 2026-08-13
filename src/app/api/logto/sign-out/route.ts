import LogtoClient from "@logto/next/edge";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/logto/sign-out
 *
 * Signs the user out of Logto and clears the session.
 * Redirects to the base URL after sign-out.
 */
export async function GET(req: Request) {
  const endpoint = process.env.LOGTO_ENDPOINT;
  const appId = process.env.LOGTO_APP_ID;
  const appSecret = process.env.LOGTO_APP_SECRET;
  const baseUrl = process.env.LOGTO_BASE_URL || new URL(req.url).origin;
  const cookieSecret = process.env.LOGTO_COOKIE_SECRET;

  if (!endpoint || !appId || !appSecret || !cookieSecret) {
    return NextResponse.json(
      { error: "Logto is not configured" },
      { status: 503 }
    );
  }

  const client = new LogtoClient({
    endpoint,
    appId,
    appSecret,
    baseUrl,
    cookieSecret,
    cookieSecure: process.env.NODE_ENV === "production",
  });

  try {
    // handleSignOut returns a handler function — call it with the request
    const signOutHandler = client.handleSignOut(baseUrl);
    const response = await signOutHandler(req as any);
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: "Sign-out failed", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}
