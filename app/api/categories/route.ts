import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCategories, addCategory } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken || !session.sheetId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await getCategories(session.accessToken, session.sheetId);
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
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
}
