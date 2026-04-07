import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateIdeaActionItems, createTask } from "@/lib/google";
import { ActionItem } from "@/types";

export const dynamic = "force-dynamic";

// PATCH /api/ideas/:id — push additional tasks from an existing idea
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.accessToken || !session.sheetId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { actionItems } = await request.json();

  const updatedItems: ActionItem[] = [];
  for (const item of actionItems as ActionItem[]) {
    // Only push newly-checked items (pushed: false → checked now)
    if (!item.pushed && (item as ActionItem & { checked?: boolean }).checked) {
      let taskId: string | undefined;
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
}
