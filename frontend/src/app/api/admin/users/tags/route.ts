import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userTags } from "@/db/schema";
import { getAuthFromCookies } from "@/lib/auth";
import { apiError } from "@/lib/api-error";
import { eq, and } from "drizzle-orm";

// Assign tag to user
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromCookies();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, tagId } = await req.json();

    if (!userId || !tagId) {
      return NextResponse.json(
        { error: "userId and tagId are required" },
        { status: 400 }
      );
    }

    await db
      .insert(userTags)
      .values({
        userId,
        tagId,
        grantedById: auth.userId,
      })
      .onConflictDoNothing();

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError("Assign user tag", error);
  }
}

// Remove tag from user
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthFromCookies();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, tagId } = await req.json();

    if (!userId || !tagId) {
      return NextResponse.json(
        { error: "userId and tagId are required" },
        { status: 400 }
      );
    }

    await db
      .delete(userTags)
      .where(and(eq(userTags.userId, userId), eq(userTags.tagId, tagId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError("Remove user tag", error);
  }
}
