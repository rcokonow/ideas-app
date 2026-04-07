import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getIdeas, appendIdea, createTask, getOrCreateTaskList } from "@/lib/google";
import { ActionItem } from "@/types";

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

    // Push checked action items to Google Tasks (category-specific list)
    const processedItems: ActionItem[] = [];
    let categoryTasksListId: string | undefined;
    for (const item of actionItems as { text: string; dueDate: string; checked: boolean }[]) {
      let taskId: string | undefined;
      if (item.checked) {
        try {
          if (!categoryTasksListId) {
            categoryTasksListId = await getOrCreateTaskList(session.accessToken, category);
          }
          taskId = await createTask(
            session.accessToken,
            categoryTasksListId,
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

    const ideaData = {
      submittedBy: submittedBy || session.user?.name || "Unknown",
      rawText,
      category,
      title,
      summary,
      actionItems: processedItems,
    };

    const id = await appendIdea(session.accessToken, session.sheetId, ideaData);

    return NextResponse.json(
      { id, ...ideaData, createdAt: new Date().toISOString() },
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
