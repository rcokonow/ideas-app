import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getIdeas, appendIdea, createTask } from "@/lib/google";
import { ActionItem } from "@/types";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken || !session.sheetId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ideas = await getIdeas(session.accessToken, session.sheetId);
  return NextResponse.json(ideas);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || !session.sheetId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rawText, submittedBy, title, summary, category, actionItems } =
    await request.json();

  if (!rawText || !title || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Push checked action items to Google Tasks
  const processedItems: ActionItem[] = [];
  for (const item of actionItems as {
    text: string;
    dueDate: string;
    checked: boolean;
  }[]) {
    let taskId: string | undefined;
    if (item.checked && session.tasksListId) {
      try {
        taskId = await createTask(
          session.accessToken,
          session.tasksListId,
          item.text,
          item.dueDate
        );
      } catch (err) {
        console.error("Failed to create task:", err);
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
}
