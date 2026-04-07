import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getIdeas, appendIdea, createTask } from "@/lib/google";
import { ActionItem } from "@/types";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.accessToken || !session.sheetId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ideas = await getIdeas(session.accessToken, session.sheetId);
    return NextResponse.json(ideas);
  } catch (err) {
    console.error("[GET /api/ideas]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load ideas" },
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

    const body = await request.json();
    const { rawText, submittedBy, title, summary, category, actionItems } = body;

    if (!rawText || !title || !category) {
      return NextResponse.json(
        { error: "rawText, title, and category are required" },
        { status: 400 }
      );
    }

    // Push checked action items to Google Tasks
    const processedItems: ActionItem[] = [];
    for (const item of actionItems as { text: string; dueDate: string; checked: boolean }[]) {
      let taskId: string | undefined;
      if (item.checked && session.tasksListId) {
        try {
          taskId = await createTask(
            session.accessToken,
            session.tasksListId,
            item.text,
            item.dueDate
          );
          console.log("[POST /api/ideas] Created task:", taskId, "for:", item.text);
        } catch (taskErr) {
          console.error("[POST /api/ideas] Failed to create task for:", item.text, taskErr);
        }
      }
      processedItems.push({
        text: item.text,
        dueDate: item.dueDate,
        pushed: item.checked && !!taskId,
        taskId,
      });
    }

    const idea = {
      id: randomUUID(),
      submittedBy: submittedBy || session.user?.name || "Unknown",
      rawText,
      category,
      title,
      summary,
      actionItems: processedItems,
    };

    await appendIdea(session.accessToken, session.sheetId, idea);

    return NextResponse.json(
      { ...idea, createdAt: new Date().toISOString() },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/ideas]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save idea" },
      { status: 500 }
    );
  }
}
