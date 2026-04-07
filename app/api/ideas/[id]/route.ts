import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateIdeaActionItems, createTask, getOrCreateTaskList } from "@/lib/google";
import { ActionItem } from "@/types";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.accessToken || !session.sheetId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { actionItems, category } = await request.json();

    let categoryTasksListId: string | undefined;
    const updatedItems: ActionItem[] = [];
    for (const item of actionItems as (ActionItem & { checked?: boolean })[]) {
      if (!item.pushed && item.checked) {
        let taskId: string | undefined;
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
        } catch (err) {
          console.error("[PATCH /api/ideas] Failed to create task:", err);
        }
        updatedItems.push({ ...item, pushed: !!taskId, taskId });
      } else {
        updatedItems.push(item);
      }
    }

    await updateIdeaActionItems(
      session.accessToken,
      session.sheetId,
      id,
      updatedItems
    );

    return NextResponse.json({ actionItems: updatedItems });
  } catch (err) {
    console.error("[PATCH /api/ideas/:id]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update idea" },
      { status: 500 }
    );
  }
}
