import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCategories, addCategory } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    console.log("[GET /api/categories] sheetId:", session?.sheetId, "hasToken:", !!session?.accessToken);
    if (!session?.accessToken || !session.sheetId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await getCategories(session.accessToken, session.sheetId);
    console.log("[GET /api/categories] returning:", categories);
    return NextResponse.json(categories);
  } catch (err) {
    console.error("[GET /api/categories]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.accessToken || !session.sheetId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    await addCategory(session.accessToken, session.sheetId, name.trim());
    return NextResponse.json({ name: name.trim() }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/categories]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to add category" },
      { status: 500 }
    );
  }
}
