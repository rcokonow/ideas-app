import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createServerClient();
  const { name } = await request.json();

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  }

  const trimmedName = name.trim();

  const { data, error } = await supabase
    .from("categories")
    .insert({ name: trimmedName, is_default: false })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
