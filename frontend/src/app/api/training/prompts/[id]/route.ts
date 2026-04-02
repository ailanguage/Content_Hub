import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trainerPrompts } from "@/db/schema";
import { getAuthFromCookies } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { apiError } from "@/lib/api-error";

// PUT /api/training/prompts/:id — update prompt content/resources
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromCookies();
    if (!auth || !["admin", "supermod"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { content, resources } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (content !== undefined) updates.content = content;
    if (resources !== undefined) updates.resources = resources;

    const [updated] = await db
      .update(trainerPrompts)
      .set(updates)
      .where(eq(trainerPrompts.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    return apiError("Update prompt", err);
  }
}

// DELETE /api/training/prompts/:id — delete prompt
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromCookies();
    if (!auth || !["admin", "supermod"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await db.delete(trainerPrompts).where(eq(trainerPrompts.id, id));
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return apiError("Delete prompt", err);
  }
}
