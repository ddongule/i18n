import { Tool } from "@modelcontextprotocol/sdk/types";
import path from "path";
import { importGoogleSheet } from "../../core/src/google/importGoogleSheet";

export const importI18nFromSheetTool: Tool = {
  name: "import_i18n_from_sheet",
  description:
    "Import i18n translations from a Google Spreadsheet into locale JSON files",

  inputSchema: {
    type: "object",
    properties: {
      sheetId: { type: "string" },
      sheetName: {
        type: "string",
        description: "Spreadsheet tab name",
        default: "Sheet1",
      },
      localesDir: {
        type: "string",
        default: "locales",
      },
      dryRun: {
        type: "boolean",
        default: false,
      },
    },
    required: ["sheetId"],
  },

  async run({
    sheetId,
    sheetName = "Sheet1",
    localesDir = "locales",
    dryRun = false,
  }) {
    const result = await importGoogleSheet({
      sheetId,
      sheetName,
      localesDir: path.resolve(process.cwd(), localesDir),
      dryRun,
    });

    return {
      success: true,
      dryRun,
      importedLocales: Object.keys(result ?? {}),
      message: dryRun
        ? "Dry run completed. No files were written."
        : "Locales successfully imported from Google Sheet.",
    };
  },
};
