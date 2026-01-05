import { Tool } from "@modelcontextprotocol/sdk/types";
import path from "path";
import { loadLocales, scanCode, analyzeDiff } from "i18n-mcp-core";

export const scanI18nTool: Tool = {
  name: "scan_i18n",
  description: "Scan project i18n status and report missing/unused keys",
  inputSchema: {
    type: "object",
    properties: {
      baseLang: {
        type: "string",
        description: "Base locale language",
        default: "en",
      },
    },
  },

  async run({ baseLang = "en" }) {
    const localesDir = path.join(process.cwd(), "locales");
    const locales = loadLocales(localesDir);
    const codeKeys = scanCode(process.cwd());

    const diff = analyzeDiff(locales, codeKeys, baseLang);

    return {
      baseLang,
      summary: {
        totalLocaleKeys: diff.totalLocaleKeys,
        totalCodeKeys: diff.totalCodeKeys,
        missing: diff.missing.length,
        unused: diff.unused.length,
      },
      missingKeys: diff.missing,
      unusedKeys: diff.unused,
    };
  },
};
