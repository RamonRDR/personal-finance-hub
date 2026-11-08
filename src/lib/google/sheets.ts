import "server-only";
const API = "https://sheets.googleapis.com/v4/spreadsheets/";
export function validateSpreadsheetId(id: string): string {
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) throw new Error("Invalid spreadsheet identifier");
  return id;
}
function safeRange(tab: string, from: number, to: number): string {
  if (!/^[\p{L}\p{N} _|()-]+$/u.test(tab)) throw new Error("Invalid sheet name");
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to - from > 999)
    throw new Error("Invalid range");
  return "'" + tab.replace(/'/g, "''") + "'!A" + from + ":M" + to;
}
async function readGoogle(path: string, token: string): Promise<unknown> {
  if (!token) throw new Error("Google authorization required");
  const response = await fetch(API + path, {
    headers: { Authorization: "Bearer " + token },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Google Sheets read failed (" + response.status + ")");
  return response.json();
}
export async function readSpreadsheetMetadata(id: string, accessToken: string): Promise<unknown> {
  return readGoogle(
    encodeURIComponent(validateSpreadsheetId(id)) +
      "?fields=properties(title,locale,timeZone),sheets(properties(title,gridProperties))",
    accessToken,
  );
}
export async function readSpreadsheetRange(
  id: string,
  tab: string,
  from: number,
  to: number,
  accessToken: string,
): Promise<unknown> {
  const range = safeRange(tab, from, to);
  return readGoogle(
    encodeURIComponent(validateSpreadsheetId(id)) +
      "/values/" +
      encodeURIComponent(range) +
      "?valueRenderOption=FORMATTED_VALUE",
    accessToken,
  );
}
