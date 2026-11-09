import type { ImportWarning } from "../finance/types";

export interface ReadOnlyWorkbookStatus {
  warnings: readonly ImportWarning[];
  failedTabs: readonly string[];
  readOnly: true;
}

export function workbookReadiness(workbook: ReadOnlyWorkbookStatus): {
  complete: boolean;
  warningCount: number;
  failedTabCount: number;
} {
  // Financial totals must never be presented as verified when any source is
  // absent, malformed, unavailable, or possibly duplicated.
  return {
    complete:
      workbook.readOnly === true &&
      workbook.warnings.length === 0 &&
      workbook.failedTabs.length === 0,
    warningCount: workbook.warnings.length,
    failedTabCount: workbook.failedTabs.length,
  };
}
