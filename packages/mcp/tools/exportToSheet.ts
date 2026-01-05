import { Tool } from "@modelcontextprotocol/sdk/types";
import path from "path";
import { exportGoogleSheet } from "../../core/src/google/exportGoogleSheet";

export const exportI18nToSheetTool: Tool = {
  name: "export_i18n_to_sheet",
  description:
    "Export locale JSON files into a Google Spreadsheet for translators",

  inputSchema: {
    type: "object",
    properties: {
      sheetId: { type: "string" },
      sheetName: {
        type: "string",
        default: "Sheet1",
      },
      localesDir: {
        type: "string",
        default: "locales",
      },
    },
    required: ["sheetId"],
  },

  async run({ sheetId, sheetName = "Sheet1", localesDir = "locales" }) {
    await exportToGoogleSheet({
      sheetId,
      sheetName,
      localesDir: path.resolve(process.cwd(), localesDir),
    });

    return {
      success: true,
      message: "Locales exported to Google Sheet successfully.",
    };
  },
};
