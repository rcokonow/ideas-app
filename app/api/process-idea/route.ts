import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { processIdea } from "@/lib/claude";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rawText, category, categories } = await request.json();

  if (!rawText?.trim()) {
    return NextResponse.json({ error: "rawText is required" }, { status: 400 });
  }

  const result = await processIdea(
    rawText.trim(),
    category || null,
    Array.isArray(categories) ? categories : []
  );

  return NextResponse.json(result);
}
