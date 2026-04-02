import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { getAuthFromCookies } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { apiError } from "@/lib/api-error";

export async function POST() {
  try {
    const auth = await getAuthFromCookies();

    if (auth) {
      // Invalidate session server-side
      await db.delete(sessions).where(eq(sessions.tokenJti, auth.jti));
    }

    // Clear cookie
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");

    return NextResponse.json({ message: "Logged out" });
  } catch (error) {
    return apiError("Logout", error);
  }
}
