import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getItem, updateItem, deleteItem, isDirectusConfigured } from "@/lib/directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "nexusai_test_projects";

interface TestProject extends Record<string, unknown> {
  id: number;
  clerk_user_id: string;
  name: string;
  created_at: string;
}

/**
 * GET /api/poc/projects/:id
 *
 * Returns a single test project IF AND ONLY IF it belongs to the current
 * authenticated user. If User B tries to read User A's project, they get 404.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!isDirectusConfigured()) {
    return NextResponse.json({ error: "Directus is not configured" }, { status: 503 });
  }

  const ownerId = user.logtoId || user.id;

  try {
    const project = await getItem<TestProject>(COLLECTION, id, ownerId, {
      fields: ["id", "clerk_user_id", "name", "created_at"],
    });

    if (!project) {
      // 404 — either doesn't exist OR doesn't belong to this user
      // Don't leak existence to unauthorized users
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Failed to get project",
    }, { status: 502 });
  }
}

/**
 * PATCH /api/poc/projects/:id
 *
 * Updates a test project IF AND ONLY IF it belongs to the current
 * authenticated user. If User B tries to update User A's project, they get 404.
 *
 * Body: { name: string }
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!isDirectusConfigured()) {
    return NextResponse.json({ error: "Directus is not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const ownerId = user.logtoId || user.id;

  try {
    const project = await updateItem<TestProject>(COLLECTION, id, ownerId, { name });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Failed to update project",
    }, { status: 502 });
  }
}

/**
 * DELETE /api/poc/projects/:id
 *
 * Deletes a test project IF AND ONLY IF it belongs to the current
 * authenticated user. If User B tries to delete User A's project, they get 404.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!isDirectusConfigured()) {
    return NextResponse.json({ error: "Directus is not configured" }, { status: 503 });
  }

  const ownerId = user.logtoId || user.id;

  try {
    const deleted = await deleteItem(COLLECTION, id, ownerId);

    if (!deleted) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Failed to delete project",
    }, { status: 502 });
  }
}
