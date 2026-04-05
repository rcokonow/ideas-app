import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
import { createServerClient } from "@/lib/supabase";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ProcessedIdea {
  title: string;
  summary: string;
  action_items: string[];
  suggested_category: string;
}

export async function POST(request: Request) {
  const { raw_text, category, categories } = await request.json();

  if (!raw_text || typeof raw_text !== "string" || raw_text.trim().length === 0) {
    return NextResponse.json({ error: "Idea text is required" }, { status: 400 });
  }

  const categoryList: string[] = Array.isArray(categories) ? categories : [];
  const selectedCategory: string | null = category && typeof category === "string" ? category.trim() : null;

  const categoryInstruction = selectedCategory
    ? `The user has already selected the category: "${selectedCategory}". Use this exact category in the suggested_category field.`
    : `Suggest the single best-fitting category for this idea from the following list: ${categoryList.join(", ")}. Pick only one.`;

  const prompt = `You are an idea capture assistant. Analyze the following idea and respond with ONLY a valid JSON object — no markdown, no commentary, no code blocks.

Idea: "${raw_text.trim()}"

${categoryInstruction}

Respond with this exact JSON structure:
{
  "title": "4-8 word concise title capturing the core idea",
  "summary": "1-2 sentence clear and actionable summary",
  "action_items": ["specific next action 1", "specific next action 2", "specific next action 3"],
  "suggested_category": "exactly one category from the list"
}`;

  let processed: ProcessedIdea;

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Strip any accidental markdown code fences
    const rawText = content.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    processed = JSON.parse(rawText) as ProcessedIdea;
  } catch (err) {
    console.error("Claude API error:", err);
    return NextResponse.json(
      { error: "Failed to process idea with AI" },
      { status: 500 }
    );
  }

  // Validate the parsed output
  if (
    typeof processed.title !== "string" ||
    typeof processed.summary !== "string" ||
    !Array.isArray(processed.action_items) ||
    typeof processed.suggested_category !== "string"
  ) {
    return NextResponse.json(
      { error: "Invalid AI response structure" },
      { status: 500 }
    );
  }

  const finalCategory = selectedCategory || processed.suggested_category;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ideas")
    .insert({
      raw_text: raw_text.trim(),
      category: finalCategory,
      title: processed.title,
      summary: processed.summary,
      action_items: processed.action_items.slice(0, 3),
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
