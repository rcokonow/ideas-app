import { google } from "googleapis";
import { ActionItem } from "@/types";

// ─── Auth client ────────────────────────────────────────────────────────────

function oauthClient(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

// ─── First-time setup ────────────────────────────────────────────────────────

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
  } else {
    const now = new Date().toISOString();
    const created = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: "Ideas" },
        sheets: [
          {
            properties: { title: "Ideas", sheetId: 0, index: 0 },
            data: [
              {
                rowData: [
                  {
                    values: [
                      "ID",
                      "Submitted By",
                      "Raw Text",
                      "Category",
                      "Title",
                      "Summary",
                      "Action Items",
                      "Tasks Pushed",
                      "Created At",
                    ].map((h) => ({
                      userEnteredValue: { stringValue: h },
                      userEnteredFormat: { textFormat: { bold: true } },
                    })),
                  },
                ],
              },
            ],
          },
          {
            properties: { title: "Categories", sheetId: 1, index: 1 },
            data: [
              {
                rowData: [
                  {
                    values: ["Name", "Created At"].map((h) => ({
                      userEnteredValue: { stringValue: h },
                      userEnteredFormat: { textFormat: { bold: true } },
                    })),
                  },
                  {
                    values: [
                      { userEnteredValue: { stringValue: "Business Development" } },
                      { userEnteredValue: { stringValue: now } },
                    ],
                  },
                  {
                    values: [
                      { userEnteredValue: { stringValue: "Personal" } },
                      { userEnteredValue: { stringValue: now } },
                    ],
                  },
                  {
                    values: [
                      { userEnteredValue: { stringValue: "Open Question" } },
                      { userEnteredValue: { stringValue: now } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    sheetId = created.data.spreadsheetId!;
  }

  // ── Find or create "Ideas — Action Items" Tasks list ──
  let tasksListId: string;

  const listsResult = await tasks.tasklists.list({ maxResults: 100 });
  const existing = listsResult.data.items?.find(
    (l) => l.title === "Ideas \u2014 Action Items"
  );

  if (existing) {
    tasksListId = existing.id!;
  } else {
    const newList = await tasks.tasklists.insert({
      requestBody: { title: "Ideas \u2014 Action Items" },
    });
    tasksListId = newList.data.id!;
  }

  return { sheetId, tasksListId };
}

// ─── Categories ──────────────────────────────────────────────────────────────

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
    requestBody: {
      values: [[name, new Date().toISOString()]],
    },
  });
}

// ─── Ideas ───────────────────────────────────────────────────────────────────

export async function getIdeas(
  accessToken: string,
  sheetId: string
) {
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
    .reverse(); // newest first
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
    range: "Ideas!A:I",
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          idea.id,
          idea.submittedBy,
          idea.rawText,
          idea.category,
          idea.title,
          idea.summary,
          JSON.stringify(idea.actionItems),
          pushedCount,
          new Date().toISOString(),
        ],
      ],
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

  // Find the row for this idea
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Ideas!A:A",
  });

  const rows = res.data.values ?? [];
  const rowIndex = rows.findIndex((r) => r[0] === ideaId);
  if (rowIndex === -1) throw new Error("Idea not found");

  const sheetRow = rowIndex + 1; // 1-indexed, row 1 is header so data starts at row 2
  const pushedCount = actionItems.filter((a) => a.pushed).length;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        {
          range: `Ideas!G${sheetRow}:H${sheetRow}`,
          values: [[JSON.stringify(actionItems), pushedCount]],
        },
      ],
    },
  });
}

// ─── Google Tasks ─────────────────────────────────────────────────────────────

export async function createTask(
  accessToken: string,
  tasksListId: string,
  title: string,
  dueDate: string // YYYY-MM-DD
): Promise<string> {
  const auth = oauthClient(accessToken);
  const tasks = google.tasks({ version: "v1", auth });

  // Google Tasks due date must be RFC 3339 with time set to midnight UTC
  const due = new Date(`${dueDate}T00:00:00.000Z`).toISOString();

  const res = await tasks.tasks.insert({
    tasklist: tasksListId,
    requestBody: { title, due },
  });

  return res.data.id!;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeParseJSON<T>(val: unknown, fallback: T): T {
  if (typeof val !== "string") return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}
