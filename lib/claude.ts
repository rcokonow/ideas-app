import Anthropic from "@anthropic-ai/sdk";
import { ProcessedIdea } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function processIdea(
  rawText: string,
  selectedCategory: string | null,
  availableCategories: string[]
): Promise<ProcessedIdea> {
  const today = new Date().toISOString().split("T")[0];

  const categoryInstruction = selectedCategory
    ? `The user selected category: "${selectedCategory}". Use this exactly.`
    : `Pick the best category from this list: ${availableCategories.join(", ")}`;

  const prompt = `You are an idea capture assistant. Today's date is ${today}.

Analyze the following idea and respond with ONLY a valid JSON object — no markdown, no code blocks.

Idea: "${rawText}"

${categoryInstruction}

For each action item, suggest a due date based on implied urgency:
- Urgent/time-sensitive (deadlines, legal, filings) → 1-3 days from today
- Important but not urgent (research, strategy, outreach) → 1-2 weeks from today
- Long-term/exploratory (product ideas, partnerships, concepts) → 2-4 weeks from today
- No urgency implied → 7 days from today

Respond with exactly this JSON structure:
{
  "title": "4-8 word concise title",
  "summary": "1-2 sentence actionable summary",
  "category": "one category from the list",
  "actionItems": [
    { "text": "specific next action", "dueDate": "YYYY-MM-DD" },
    { "text": "specific next action", "dueDate": "YYYY-MM-DD" },
    { "text": "specific next action", "dueDate": "YYYY-MM-DD" }
  ]
}`;

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected Claude response type");

  const raw = block.text
    .trim()
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "");

  const parsed = JSON.parse(raw) as ProcessedIdea;

  // Validate
  if (
    typeof parsed.title !== "string" ||
    typeof parsed.summary !== "string" ||
    typeof parsed.category !== "string" ||
    !Array.isArray(parsed.actionItems)
  ) {
    throw new Error("Invalid Claude response structure");
  }

  return {
    title: parsed.title,
    summary: parsed.summary,
    category: selectedCategory || parsed.category,
    actionItems: parsed.actionItems.slice(0, 3).map((item) => ({
      text: typeof item.text === "string" ? item.text : "",
      dueDate: typeof item.dueDate === "string" ? item.dueDate : today,
    })),
  };
}
