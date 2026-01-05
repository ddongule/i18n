import { loadLocales } from "../scanner/localeScanner";
import { flattenLocales } from "../utils/objectTree";
import { buildSheetRows } from "../utils/objectTree";
import { writeToGoogleSheet } from "./writeToGoogleSheet";

export async function exportGoogleSheet({
  sheetId,
  sheetName,
  localesDir,
  dryRun,
}: {
  sheetId: string;
  sheetName: string;
  localesDir: string;
  dryRun?: boolean;
}) {
  const locales = loadLocales(localesDir);
  const flat = flattenLocales(locales);
  const rows = buildSheetRows(flat);

  if (dryRun) {
    return {
      dryRun: true,
      preview: rows.slice(0, 10),
    };
  }

  await writeToGoogleSheet({
    sheetId,
    sheetName,
    rows,
  });

  return { success: true, rows: rows.length };
}
