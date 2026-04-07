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

// ─── Constants ────────────────────────────────────────────────────────────────

const GOOGLE_BLUE = { red: 0.259, green: 0.522, blue: 0.957 }; // #4285F4
const WHITE = { red: 1, green: 1, blue: 1 };
const LIGHT_GRAY = { red: 0.973, green: 0.976, blue: 0.980 }; // #F8F9FA
// Columns A-J widths in pixels
const COLUMN_WIDTHS = [120, 130, 280, 130, 220, 320, 280, 110, 180, 60];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeParseJSON<T>(val: unknown, fallback: T): T {
  if (typeof val !== "string") return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

/** Derive a 4-letter uppercase code from a category name (e.g. "Business Development" → "BUSI") */
function deriveCategoryCode(name: string): string {
  const letters = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return letters.substring(0, 4).padEnd(4, "X");
}

/** Format a Date as "Apr 7, 2026, 2:43 PM" */
function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Format action items array as plain readable text (one per line) */
function formatActionItemsDisplay(items: ActionItem[]): string {
  return items.map((item) => `• ${item.text} (due: ${item.dueDate})`).join("\n");
}

// ─── Sheet formatting ─────────────────────────────────────────────────────────

async function applyIdeasSheetFormatting(
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  const auth = oauthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  // Get sheetId for the "Ideas" tab
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const ideasSheet = meta.data.sheets?.find(
    (s) => s.properties?.title === "Ideas"
  );
  if (!ideasSheet) return;
  const sheetId = ideasSheet.properties!.sheetId!;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requests: any[] = [];

  // 1. Header row: bold, light gray background
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
      cell: {
        userEnteredFormat: {
          backgroundColor: LIGHT_GRAY,
          textFormat: { bold: true },
          verticalAlignment: "MIDDLE",
        },
      },
      fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment)",
    },
  });

  // 2. Freeze row 1
  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: "gridProperties.frozenRowCount",
    },
  });

  // 3. Column widths (A–J)
  COLUMN_WIDTHS.forEach((width, idx) => {
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: idx,
          endIndex: idx + 1,
        },
        properties: { pixelSize: width },
        fields: "pixelSize",
      },
    });
  });

  // 4. Data rows: vertical align TOP
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 1 },
      cell: {
        userEnteredFormat: {
          verticalAlignment: "TOP",
        },
      },
      fields: "userEnteredFormat.verticalAlignment",
    },
  });

  // 5. Wrap on columns C (2), F (5), G (6) — 0-indexed
  [2, 5, 6].forEach((colIdx) => {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          startColumnIndex: colIdx,
          endColumnIndex: colIdx + 1,
        },
        cell: {
          userEnteredFormat: {
            wrapStrategy: "WRAP",
          },
        },
        fields: "userEnteredFormat.wrapStrategy",
      },
    });
  });

  // 6. Hide column J (index 9) — JSON backup, not for human viewing
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: "COLUMNS", startIndex: 9, endIndex: 10 },
      properties: { hiddenByUser: true },
      fields: "hiddenByUser",
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
}

/** Format a single newly-appended row (rowNumber is 1-based sheet row) */
async function formatNewRow(
  accessToken: string,
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  const auth = oauthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const ideasSheet = meta.data.sheets?.find(
    (s) => s.properties?.title === "Ideas"
  );
  if (!ideasSheet) return;
  const sheetId = ideasSheet.properties!.sheetId!;
  const rowIdx = rowNumber - 1; // 0-based

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requests: any[] = [
    // Vertical align TOP
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: rowIdx,
          endRowIndex: rowIdx + 1,
        },
        cell: { userEnteredFormat: { verticalAlignment: "TOP" } },
        fields: "userEnteredFormat.verticalAlignment",
      },
    },
    // Wrap on C (2), F (5), G (6)
    ...[2, 5, 6].map((colIdx) => ({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: rowIdx,
          endRowIndex: rowIdx + 1,
          startColumnIndex: colIdx,
          endColumnIndex: colIdx + 1,
        },
        cell: { userEnteredFormat: { wrapStrategy: "WRAP" } },
        fields: "userEnteredFormat.wrapStrategy",
      },
    })),
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
}

// ─── Category code lookup ─────────────────────────────────────────────────────

async function getCategoryCode(
  accessToken: string,
  sheetId: string,
  categoryName: string
): Promise<string> {
  const auth = oauthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Categories!A2:B",
  });

  const rows = res.data.values ?? [];
  const match = rows.find((r) => r[1] === categoryName);
  if (match) return match[0] as string;

  // Fall back to deriving from name if category not found in sheet
  return deriveCategoryCode(categoryName);
}

// ─── Readable ID generation ───────────────────────────────────────────────────

async function generateIdeaId(
  accessToken: string,
  sheetId: string,
  categoryName: string
): Promise<string> {
  const auth = oauthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  const code = await getCategoryCode(accessToken, sheetId, categoryName);

  // Count rows where column D matches this category
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Ideas!D:D",
  });

  const rows = res.data.values ?? [];
  const count = rows.filter((r) => r[0] === categoryName).length;
  const seq = String(count + 1).padStart(4, "0");

  return `${code}-${seq}`;
}

// ─── Ensure required tabs exist ───────────────────────────────────────────────

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

  // 2. Build batchUpdate requests to create missing tabs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requests: any[] = [];
  const ideasMissing = !hasIdeas;
  const categoriesMissing = !hasCategories;

  if (ideasMissing) {
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

  // 3. Write headers and seed data for newly created tabs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const valueRanges: any[] = [];

  if (ideasMissing) {
    valueRanges.push({
      range: "Ideas!A1:J1",
      values: [[
        "ID", "Submitted By", "Raw Text", "Category",
        "Title", "Summary", "Action Items", "Tasks Pushed", "Created At", "Action Items (JSON)",
      ]],
    });
  }

  if (categoriesMissing) {
    valueRanges.push({
      range: "Categories!A1:B4",
      values: [
        ["Code", "Name"],
        ["BUSI", "Business Development"],
        ["PERS", "Personal"],
        ["OPEN", "Open Question"],
      ],
    });
  } else {
    // Migrate existing Categories tab: check if it uses old schema (Name | Created At)
    const catMeta = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Categories!A1:B1",
    });
    const header = catMeta.data.values?.[0] ?? [];
    if (header[0] === "Name" || (header[0] !== "Code" && header[1] !== "Name")) {
      // Old schema — rewrite headers and migrate rows
      const oldData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Categories!A2:A",
      });
      const oldNames = (oldData.data.values ?? []).map((r) => r[0] as string).filter(Boolean);

      const newRows = oldNames.map((name) => [deriveCategoryCode(name), name]);
      valueRanges.push({
        range: "Categories!A1:B1",
        values: [["Code", "Name"]],
      });
      if (newRows.length > 0) {
        // Clear old data and rewrite with code + name
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: "Categories!A2:B",
        });
        valueRanges.push({
          range: "Categories!A2:B",
          values: newRows,
        });
      }
    } else {
      // New schema — fix any BUIS typo from earlier seeding
      const catData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Categories!A2:B",
      });
      const catRows = catData.data.values ?? [];
      const fixedRows = catRows.map((r, i) =>
        r[0] === "BUIS" ? { row: i + 2, values: ["BUSI", r[1]] } : null
      ).filter(Boolean) as { row: number; values: string[] }[];

      for (const fix of fixedRows) {
        valueRanges.push({
          range: `Categories!A${fix.row}:B${fix.row}`,
          values: [fix.values],
        });
      }
    }
  }

  if (valueRanges.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: valueRanges },
    });
  }

  // 4. Apply Ideas sheet formatting (non-fatal — don't let formatting break tab setup)
  try {
    await applyIdeasSheetFormatting(accessToken, spreadsheetId);
  } catch (err) {
    console.error("[ensureSheetTabs] Formatting failed (non-fatal):", err);
  }
}

// ─── First-time setup ─────────────────────────────────────────────────────────

export async function setupGoogleResources(accessToken: string): Promise<{
  sheetId: string;
}> {
  const auth = oauthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

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
    const created = await sheets.spreadsheets.create({
      requestBody: { properties: { title: "Ideas" } },
    });
    sheetId = created.data.spreadsheetId!;
    console.log("[setup] Created new spreadsheet:", sheetId);
  }

  // Always ensure tabs + headers + seed data + formatting exist
  await ensureSheetTabs(accessToken, sheetId);

  return { sheetId };
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(
  accessToken: string,
  sheetId: string
): Promise<string[]> {
  const auth = oauthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  console.log("[getCategories] fetching from sheetId:", sheetId);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Categories!A1:B",
  });

  console.log("[getCategories] raw rows:", JSON.stringify(res.data.values));

  const rows = res.data.values ?? [];
  // Skip header row; column B (index 1) is Name in new schema, column A (index 0) is Name in old schema
  const header = rows[0] ?? [];
  const nameCol = header[0] === "Code" ? 1 : 0;
  const result = rows.slice(1).map((r) => r[nameCol]).filter(Boolean);

  console.log("[getCategories] returning:", result);
  return result;
}

export async function addCategory(
  accessToken: string,
  sheetId: string,
  name: string
): Promise<void> {
  const auth = oauthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  const code = deriveCategoryCode(name);

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Categories!A:B",
    valueInputOption: "RAW",
    requestBody: { values: [[code, name]] },
  });
}

// ─── Ideas ────────────────────────────────────────────────────────────────────

export async function getIdeas(accessToken: string, sheetId: string) {
  const auth = oauthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  console.log("[getIdeas] fetching from sheetId:", sheetId);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Ideas!A:J",
  });

  // Skip header row (row 1) — filter by checking that first cell isn't the header label
  const rows = (res.data.values ?? []).slice(1);
  console.log("[getIdeas] raw row count:", rows.length, "first row:", JSON.stringify(rows[0]));

  const ideas = rows
    .filter((r) => r[0])
    .map((r) => ({
      id: r[0] ?? "",
      submittedBy: r[1] ?? "",
      rawText: r[2] ?? "",
      category: r[3] ?? "",
      title: r[4] ?? "",
      summary: r[5] ?? "",
      // Column J (r[9]) has JSON; fall back to column G (r[6]) for old rows
      actionItems: safeParseJSON<ActionItem[]>(r[9] ?? r[6], []),
      createdAt: r[8] ?? "",
    }))
    .reverse();

  console.log("[getIdeas] returning", ideas.length, "ideas");
  return ideas;
}

export async function appendIdea(
  accessToken: string,
  sheetId: string,
  idea: {
    submittedBy: string;
    rawText: string;
    category: string;
    title: string;
    summary: string;
    actionItems: ActionItem[];
  }
): Promise<string> {
  const auth = oauthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  const id = await generateIdeaId(accessToken, sheetId, idea.category);
  const pushedCount = idea.actionItems.filter((a) => a.pushed).length;
  const displayText = formatActionItemsDisplay(idea.actionItems);
  const jsonText = JSON.stringify(idea.actionItems);

  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Ideas!A1",
    valueInputOption: "RAW",
    includeValuesInResponse: true,
    requestBody: {
      values: [[
        id,
        idea.submittedBy,
        idea.rawText,
        idea.category,
        idea.title,
        idea.summary,
        displayText,
        pushedCount,
        formatTimestamp(new Date()),
        jsonText,
      ]],
    },
  });

  // Format the newly appended row
  const updatedRange = appendRes.data.updates?.updatedRange;
  if (updatedRange) {
    // Parse row number from range like "Ideas!A5:J5"
    const match = updatedRange.match(/!A(\d+)/);
    if (match) {
      const rowNumber = parseInt(match[1], 10);
      try {
        await formatNewRow(accessToken, sheetId, rowNumber);
      } catch (err) {
        console.error("[appendIdea] Failed to format row:", err);
      }
    }
  }

  return id;
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
  const displayText = formatActionItemsDisplay(actionItems);
  const jsonText = JSON.stringify(actionItems);

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        {
          range: `Ideas!G${sheetRow}:H${sheetRow}`,
          values: [[displayText, pushedCount]],
        },
        {
          range: `Ideas!J${sheetRow}`,
          values: [[jsonText]],
        },
      ],
    },
  });
}

// ─── Google Tasks ─────────────────────────────────────────────────────────────

export async function getOrCreateTaskList(
  accessToken: string,
  categoryName: string
): Promise<string> {
  const auth = oauthClient(accessToken);
  const tasks = google.tasks({ version: "v1", auth });

  const listTitle = `Ideas \u2014 ${categoryName}`;

  const listsResult = await tasks.tasklists.list({ maxResults: 100 });
  const existing = listsResult.data.items?.find((l) => l.title === listTitle);

  if (existing) {
    console.log("[getOrCreateTaskList] Found existing list:", existing.id, "for:", categoryName);
    return existing.id!;
  }

  const created = await tasks.tasklists.insert({
    requestBody: { title: listTitle },
  });
  console.log("[getOrCreateTaskList] Created list:", created.data.id, "for:", categoryName);
  return created.data.id!;
}

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
