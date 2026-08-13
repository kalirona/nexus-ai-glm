import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listItems, createItem, isDirectusConfigured } from "@/lib/directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "nexusai_test_projects";

interface TestProject {
  id: number;
  clerk_user_id: string;
  name: string;
  created_at: string;
}

/**
 * GET /api/test/projects
 *
 * Lists all test projects OWNED BY THE CURRENT CLERK USER.
 * User A will see only User A's projects.
 * User B will see only User B's projects.
 *
 * Ownership is determined by clerk_user_id, which is set server-side
 * from the authenticated session — NEVER from client input.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!isDirectusConfigured()) {
    return NextResponse.json({
      error: "Directus is not configured. See DIRECTUS-SETUP.md.",
      configured: false,
    }, { status: 503 });
  }

  // Use clerkId if available, fall back to user.id (demo mode)
  const clerkUserId = user.clerkId || user.id;

  try {
    const projects = await listItems<TestProject>(COLLECTION, clerkUserId, {
      fields: ["id", "clerk_user_id", "name", "created_at"],
      sort: "-created_at",
      limit: 50,
    });

    return NextResponse.json({
      projects,
      count: projects.length,
      owner: {
        clerkUserId,
        name: user.name,
      },
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Failed to list projects",
    }, { status: 502 });
  }
}

/**
 * POST /api/test/projects
 *
 * Creates a new test project OWNED BY THE CURRENT CLERK USER.
 * The clerk_user_id is set server-side — the client CANNOT set it.
 *
 * Body: { name: string }
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!isDirectusConfigured()) {
    return NextResponse.json({
      error: "Directus is not configured. See DIRECTUS-SETUP.md.",
      configured: false,
    }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const clerkUserId = user.clerkId || user.id;

  try {
    const project = await createItem<TestProject>(COLLECTION, clerkUserId, { name });

    return NextResponse.json({
      project,
      owner: {
        clerkUserId,
        name: user.name,
      },
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Failed to create project",
    }, { status: 502 });
  }
}
