import { google } from "googleapis";
import { ActionItem } from "@/types";

// ─── Auth client ─────────────────────────────────────────────────────────────

function oauthClient(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

// ─── Ensure required tabs exist ───────────────────────────────────────────────
// Called after both finding AND creating the spreadsheet.
// Safely creates "Ideas" and "Categories" tabs if they're missing,
// then seeds headers + default categories.

async function ensureSheetTabs(
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  const auth = oauthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  // 1. Get current tab names + ids
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = (meta.data.sheets ?? []).map((s) => ({
    title: s.properties?.title ?? "",
    sheetId: s.properties?.sheetId ?? 0,
  }));

  const hasIdeas = existing.some((s) => s.title === "Ideas");
  const hasCategories = existing.some((s) => s.title === "Categories");

  if (hasIdeas && hasCategories) return; // Nothing to do

  // 2. Build batchUpdate requests to create missing tabs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requests: any[] = [];
  const ideasMissing = !hasIdeas;
  const categoriesMissing = !hasCategories;

  if (ideasMissing) {
    // Rename "Sheet1" (or whatever the first unnamed tab is) → "Ideas"
    const sheet1 = existing.find(
      (s) => s.title === "Sheet1" || s.title === ""
    );
    if (sheet1) {
      requests.push({
        updateSheetProperties: {
          properties: { sheetId: sheet1.sheetId, title: "Ideas" },
          fields: "title",
        },
      });
    } else {
      requests.push({ addSheet: { properties: { title: "Ideas", index: 0 } } });
    }
  }

  if (categoriesMissing) {
    requests.push({
      addSheet: {
        properties: {
          title: "Categories",
          index: existing.length + (ideasMissing ? 1 : 0),
        },
      },
    });
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  // 3. Write headers (and seed categories) for newly created tabs
  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const valueRanges: any[] = [];

  if (ideasMissing) {
    valueRanges.push({
      range: "Ideas!A1:I1",
      values: [[
        "ID", "Submitted By", "Raw Text", "Category",
        "Title", "Summary", "Action Items", "Tasks Pushed", "Created At",
      ]],
    });
  }

  if (categoriesMissing) {
    valueRanges.push({
      range: "Categories!A1:B4",
      values: [
        ["Name", "Created At"],
        ["Business Development", now],
        ["Personal", now],
        ["Open Question", now],
      ],
    });
  }

  if (valueRanges.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: valueRanges },
    });
  }
}

// ─── First-time setup ─────────────────────────────────────────────────────────

export async function setupGoogleResources(accessToken: string): Promise<{
  sheetId: string;
  tasksListId: string;
}> {
  const auth = oauthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });
  const tasks = google.tasks({ version: "v1", auth });

  // ── Find or create the "Ideas" spreadsheet ──
  let sheetId: string;

  const search = await drive.files.list({
    q: "name='Ideas' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    fields: "files(id)",
    spaces: "drive",
    pageSize: 1,
  });

  if (search.data.files && search.data.files.length > 0) {
    sheetId = search.data.files[0].id!;
    console.log("[setup] Found existing spreadsheet:", sheetId);
  } else {
    // Create a fresh spreadsheet — just the title; ensureSheetTabs handles the rest
    const created = await sheets.spreadsheets.create({
      requestBody: { properties: { title: "Ideas" } },
    });
    sheetId = created.data.spreadsheetId!;
    console.log("[setup] Created new spreadsheet:", sheetId);
  }

  // Always ensure tabs + headers + seed data exist (handles both paths above)
  await ensureSheetTabs(accessToken, sheetId);

  // ── Find or create "Ideas — Action Items" Tasks list ──
  let tasksListId: string;

  const listsResult = await tasks.tasklists.list({ maxResults: 100 });
  const existingList = listsResult.data.items?.find(
    (l) => l.title === "Ideas \u2014 Action Items"
  );

  if (existingList) {
    tasksListId = existingList.id!;
    console.log("[setup] Found existing tasks list:", tasksListId);
  } else {
    const newList = await tasks.tasklists.insert({
      requestBody: { title: "Ideas \u2014 Action Items" },
    });
    tasksListId = newList.data.id!;
    console.log("[setup] Created tasks list:", tasksListId);
  }

  return { sheetId, tasksListId };
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(
  accessToken: string,
  sheetId: string
): Promise<string[]> {
  const auth = oauthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Categories!A2:A",
  });

  const rows = res.data.values ?? [];
  return rows.map((r) => r[0]).filter(Boolean);
}

export async function addCategory(
  accessToken: string,
  sheetId: string,
  name: string
): Promise<void> {
  const auth = oauthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Categories!A:B",
    valueInputOption: "RAW",
    requestBody: { values: [[name, new Date().toISOString()]] },
  });
}

// ─── Ideas ────────────────────────────────────────────────────────────────────

export async function getIdeas(accessToken: string, sheetId: string) {
  const auth = oauthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Ideas!A2:I",
  });

  const rows = res.data.values ?? [];
  return rows
    .filter((r) => r[0])
    .map((r) => ({
      id: r[0] ?? "",
      submittedBy: r[1] ?? "",
      rawText: r[2] ?? "",
      category: r[3] ?? "",
      title: r[4] ?? "",
      summary: r[5] ?? "",
      actionItems: safeParseJSON<ActionItem[]>(r[6], []),
      createdAt: r[8] ?? "",
    }))
    .reverse();
}

export async function appendIdea(
  accessToken: string,
  sheetId: string,
  idea: {
    id: string;
    submittedBy: string;
    rawText: string;
    category: string;
    title: string;
    summary: string;
    actionItems: ActionItem[];
  }
): Promise<void> {
  const auth = oauthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  const pushedCount = idea.actionItems.filter((a) => a.pushed).length;

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Ideas!A1",   // anchor to A1; Sheets API finds first empty row automatically
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        idea.id,
        idea.submittedBy,
        idea.rawText,
        idea.category,
        idea.title,
        idea.summary,
        JSON.stringify(idea.actionItems),
        pushedCount,
        new Date().toISOString(),
      ]],
    },
  });
}

export async function updateIdeaActionItems(
  accessToken: string,
  sheetId: string,
  ideaId: string,
  actionItems: ActionItem[]
): Promise<void> {
  const auth = oauthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Ideas!A:A",
  });

  const rows = res.data.values ?? [];
  const rowIndex = rows.findIndex((r) => r[0] === ideaId);
  if (rowIndex === -1) throw new Error("Idea not found in sheet");

  const sheetRow = rowIndex + 1;
  const pushedCount = actionItems.filter((a) => a.pushed).length;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [{
        range: `Ideas!G${sheetRow}:H${sheetRow}`,
        values: [[JSON.stringify(actionItems), pushedCount]],
      }],
    },
  });
}

// ─── Google Tasks ─────────────────────────────────────────────────────────────

export async function createTask(
  accessToken: string,
  tasksListId: string,
  title: string,
  dueDate: string
): Promise<string> {
  const auth = oauthClient(accessToken);
  const tasks = google.tasks({ version: "v1", auth });

  const due = new Date(`${dueDate}T00:00:00.000Z`).toISOString();
  const res = await tasks.tasks.insert({
    tasklist: tasksListId,
    requestBody: { title, due },
  });

  return res.data.id!;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeParseJSON<T>(val: unknown, fallback: T): T {
  if (typeof val !== "string") return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}
