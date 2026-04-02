import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookies } from "@/lib/auth";
import { translateText } from "@/lib/llm";
import { apiError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromCookies();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { text, from, to, context } = await req.json();

    if (!text || !from || !to) {
      return NextResponse.json({ error: "text, from, and to are required" }, { status: 400 });
    }
    if ((from !== "en" && from !== "zh") || (to !== "en" && to !== "zh") || from === to) {
      return NextResponse.json({ error: "from/to must be 'en' or 'zh' and different" }, { status: 400 });
    }

    const translated = await translateText(text, from, to);

    return NextResponse.json({
      original_text: text,
      translated_text: translated,
      from,
      to,
      context: context || null,
    });
  } catch (error) {
    return apiError("Translate text", error);
  }
}
