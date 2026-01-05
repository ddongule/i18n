import { Tool } from "@modelcontextprotocol/sdk/types";
import path from "path";
import {
  loadLocales,
  scanCode,
  analyzeDiff,
  applyFixes,
  fixLocaleStructure,
} from "../../core/src/index";

export const fixI18nTool: Tool = {
  name: "fix_i18n",
  description:
    "Scan and fix i18n locale issues (missing / unused keys, structure mismatch)",

  inputSchema: {
    type: "object",
    properties: {
      baseLang: {
        type: "string",
        description: "Base locale language",
        default: "en",
      },
      deleteUnused: {
        type: "boolean",
        description: "Delete unused translation keys",
        default: false,
      },
      createMissing: {
        type: "boolean",
        description: "Create missing keys with empty value",
        default: false,
      },
      fixStructure: {
        type: "boolean",
        description: "Align locale structures to base locale",
        default: false,
      },
      locale: {
        type: "string",
        description: "Apply only to a specific locale (optional)",
      },
      apply: {
        type: "boolean",
        description: "Actually write changes (default: dry-run)",
        default: false,
      },
    },
  },

  async run(args) {
    const {
      baseLang = "en",
      deleteUnused,
      createMissing,
      fixStructure,
      locale,
      apply,
    } = args;

    const cwd = process.cwd();
    const localesDir = path.join(cwd, "locales");

    const locales = loadLocales(localesDir);
    const codeKeys = scanCode(cwd);
    const diff = analyzeDiff(locales, codeKeys, baseLang);

    const dryRun = !apply;

    if (deleteUnused || createMissing) {
      applyFixes({
        diff,
        baseLang,
        localesDir,
        locales,
        targetLocale: locale,
        deleteUnused,
        createMissing,
        dryRun,
        backup: false,
      });
    }

    if (fixStructure) {
      fixLocaleStructure({
        baseLang,
        locales,
        localesDir,
        targetLocale: locale,
        dryRun,
        backup: false,
      });
    }

    return {
      summary: {
        baseLang,
        dryRun,
        deleteUnused,
        createMissing,
        fixStructure,
      },
      stats: {
        missing: diff.missing.length,
        unused: diff.unused.length,
      },
      message: dryRun
        ? "Dry-run completed. No files were modified."
        : "i18n fixes applied successfully.",
      nextActions: dryRun
        ? ["Review changes", "Re-run with apply=true"]
        : ["Create PR"],
    };
  },
};
