import "server-only";
import { z } from "zod";
import { readSpreadsheetMetadata, readSpreadsheetRange } from "./sheets";
import { normalizeReadOnlyWorkbook, READ_TABS, type WorkbookRows } from "../finance/workbook";

const metadataSchema = z.object({
  sheets: z.array(z.object({
    properties: z.object({
      title: z.string(),
      gridProperties: z.object({ rowCount: z.number().int().positive() }).optional(),
    }),
  })).default([]),
});

const valuesSchema = z.object({
  values: z.array(z.array(z.unknown())).default([]),
});

export async function loadReadOnlyWorkbook(spreadsheetId: string, accessToken: string) {
  const metadata = metadataSchema.parse(await readSpreadsheetMetadata(spreadsheetId, accessToken));
  const known = new Map(metadata.sheets.map((item) => [item.properties.title, item.properties]));
  const tabs: WorkbookRows = {};
  const failures: string[] = [];

  await Promise.all(READ_TABS.map(async (tab) => {
    const properties = known.get(tab);
    if (!properties) return;
    try {
      const lastRow = Math.max(1, Math.min(properties.gridProperties?.rowCount ?? 500, 1000));
      const response = valuesSchema.parse(await readSpreadsheetRange(
        spreadsheetId, tab, 1, lastRow, accessToken,
      ));
      tabs[tab] = response.values;
    } catch {
      failures.push(tab);
    }
  }));

  const normalized = normalizeReadOnlyWorkbook(tabs);
  return { ...normalized, failedTabs: failures, readOnly: true as const };
}
