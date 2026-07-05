#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "path";
import {
  loadLocales,
  scanCode,
  analyzeDiff,
  applyFixes,
  fixLocaleStructure,
  importGoogleSheet,
  exportGoogleSheet,
} from "i18n-mcp-core";
import { execSync } from "child_process";
import {
  resolveLocalesDir,
  resolveBaseLang,
  getLocalesOverview,
  getNamespacesOverview,
  getStatusOverview,
} from "./context.js";

const json = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

const fail = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true,
});

const server = new McpServer({
  name: "i18n-mcp",
  version: "1.1.0",
});

/* ----------------------------- Tools ----------------------------- */

server.registerTool(
  "scan_i18n",
  {
    title: "Scan i18n",
    description:
      "Scan the project and report translation keys that are missing from the base locale or unused by the code.",
    inputSchema: {
      baseLang: z
        .string()
        .optional()
        .describe("Base locale language (default: en)"),
    },
  },
  async ({ baseLang }) => {
    try {
      const localesDir = resolveLocalesDir();
      const base = resolveBaseLang(baseLang);
      const locales = loadLocales(localesDir);
      const codeKeys = scanCode(process.cwd());
      const diff = analyzeDiff(locales, codeKeys, base);
      return json({
        baseLang: base,
        summary: {
          totalLocaleKeys: diff.totalLocaleKeys,
          totalCodeKeys: diff.totalCodeKeys,
          missing: diff.missing.length,
          unused: diff.unused.length,
        },
        missingKeys: diff.missing,
        unusedKeys: diff.unused,
      });
    } catch (err) {
      return fail(`scan_i18n failed: ${(err as Error).message}`);
    }
  }
);

server.registerTool(
  "fix_i18n",
  {
    title: "Fix i18n",
    description:
      "Fix locale issues: delete unused keys, create missing keys, and/or align locale structures to the base. Dry-run by default; set apply=true to write files.",
    inputSchema: {
      baseLang: z.string().optional().describe("Base locale language (default: en)"),
      deleteUnused: z
        .boolean()
        .optional()
        .describe("Delete keys present in the base locale but unused in code"),
      createMissing: z
        .boolean()
        .optional()
        .describe("Create keys used in code but missing from locales (empty value)"),
      fixStructure: z
        .boolean()
        .optional()
        .describe("Align every locale's structure and key order to the base locale"),
      locale: z
        .string()
        .optional()
        .describe("Apply only to this specific locale (optional)"),
      apply: z
        .boolean()
        .optional()
        .describe("Actually write changes. Default false (dry-run)."),
      backup: z
        .boolean()
        .optional()
        .describe("Back up locale files before writing (only when apply=true)"),
    },
  },
  async (args) => {
    try {
      const {
        baseLang,
        deleteUnused = false,
        createMissing = false,
        fixStructure = false,
        locale,
        apply = false,
        backup = false,
      } = args;
      const localesDir = resolveLocalesDir();
      const base = resolveBaseLang(baseLang);
      const dryRun = !apply;

      const locales = loadLocales(localesDir);
      const codeKeys = scanCode(process.cwd());
      const diff = analyzeDiff(locales, codeKeys, base);

      const applied: Record<string, unknown> = {};

      if (deleteUnused || createMissing) {
        applied.keyFixes = applyFixes({
          diff,
          localesDir,
          locales,
          targetLocale: locale,
          deleteUnused,
          createMissing,
          dryRun,
          backup,
        });
      }

      if (fixStructure) {
        applied.structureFixes = fixLocaleStructure({
          baseLang: base,
          localesDir,
          locales,
          targetLocale: locale,
          dryRun,
          backup,
        });
      }

      return json({
        baseLang: base,
        dryRun,
        options: { deleteUnused, createMissing, fixStructure, locale },
        stats: { missing: diff.missing.length, unused: diff.unused.length },
        applied,
        message: dryRun
          ? "Dry-run completed. No files were modified. Re-run with apply=true to write."
          : "i18n fixes applied successfully.",
      });
    } catch (err) {
      return fail(`fix_i18n failed: ${(err as Error).message}`);
    }
  }
);

server.registerTool(
  "import_i18n_from_sheet",
  {
    title: "Import i18n from Google Sheet",
    description:
      "Import translations from a Google Spreadsheet into locale JSON files.",
    inputSchema: {
      sheetId: z.string().describe("Google Spreadsheet ID"),
      sheetName: z.string().optional().describe("Tab name (default: Sheet1)"),
      dryRun: z.boolean().optional().describe("Preview without writing files"),
    },
  },
  async ({ sheetId, sheetName = "Sheet1", dryRun = false }) => {
    try {
      const result = await importGoogleSheet({ sheetId, sheetName, dryRun });
      return json({
        success: true,
        dryRun,
        importedLocales: Object.keys(result ?? {}),
        message: dryRun
          ? "Dry run completed. No files were written."
          : "Locales imported from Google Sheet.",
      });
    } catch (err) {
      return fail(`import_i18n_from_sheet failed: ${(err as Error).message}`);
    }
  }
);

server.registerTool(
  "export_i18n_to_sheet",
  {
    title: "Export i18n to Google Sheet",
    description:
      "Export locale JSON files into a Google Spreadsheet for translators.",
    inputSchema: {
      sheetId: z.string().describe("Google Spreadsheet ID"),
      sheetName: z.string().optional().describe("Tab name (default: Sheet1)"),
      localesDir: z
        .string()
        .optional()
        .describe("Locales directory (default: ./locales)"),
      dryRun: z.boolean().optional().describe("Preview rows without writing"),
    },
  },
  async ({ sheetId, sheetName = "Sheet1", localesDir, dryRun = false }) => {
    try {
      const dir = resolveLocalesDir(localesDir);
      const result = await exportGoogleSheet({
        sheetId,
        sheetName,
        localesDir: dir,
        dryRun,
      });
      return json({
        success: true,
        dryRun,
        result,
        message: dryRun
          ? "Dry run completed. Preview only."
          : "Locales exported to Google Sheet.",
      });
    } catch (err) {
      return fail(`export_i18n_to_sheet failed: ${(err as Error).message}`);
    }
  }
);

server.registerTool(
  "create_i18n_pr",
  {
    title: "Create i18n Pull Request",
    description:
      "Commit locale changes on a branch and open a GitHub Pull Request (requires the gh CLI).",
    inputSchema: {
      title: z.string().optional().describe("PR / commit title"),
      body: z.string().optional().describe("PR description"),
      branch: z.string().optional().describe("Branch name (default: i18n/auto-fix)"),
    },
  },
  async ({
    title = "chore(i18n): fix translations",
    body = "Automated i18n fixes (missing / unused keys, structure alignment).",
    branch = "i18n/auto-fix",
  }) => {
    try {
      try {
        execSync("gh --version", { stdio: "ignore" });
      } catch {
        return fail("GitHub CLI (gh) is not installed. Install it first.");
      }

      const status = execSync("git status --porcelain", { encoding: "utf8" });
      if (!status.trim()) {
        return json({ created: false, message: "No changes detected. PR not created." });
      }

      execSync(`git checkout -B ${branch}`);
      execSync(`git add locales`);
      execSync(`git commit -m ${JSON.stringify(title)}`);
      execSync(`git push -u origin ${branch}`);
      execSync(
        `gh pr create --title ${JSON.stringify(title)} --body ${JSON.stringify(body)} --base main`
      );

      return json({ created: true, branch, message: "Pull Request created successfully." });
    } catch (err) {
      return fail(`create_i18n_pr failed: ${(err as Error).message}`);
    }
  }
);

/* --------------------------- Resources --------------------------- */
// These let an agent read the project's i18n context once per session instead
// of re-running scans every time.

server.registerResource(
  "locales",
  "i18n://locales",
  {
    title: "Available locales",
    description: "Locale files present in the project and their key counts.",
    mimeType: "application/json",
  },
  async (uri) => {
    const data = getLocalesOverview(resolveLocalesDir());
    return {
      contents: [
        { uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) },
      ],
    };
  }
);

server.registerResource(
  "namespaces",
  "i18n://namespaces",
  {
    title: "Key namespaces",
    description: "Top-level translation-key namespaces of the base locale.",
    mimeType: "application/json",
  },
  async (uri) => {
    const data = getNamespacesOverview(resolveLocalesDir(), resolveBaseLang());
    return {
      contents: [
        { uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) },
      ],
    };
  }
);

server.registerResource(
  "status",
  "i18n://status",
  {
    title: "i18n sync status",
    description: "Current missing / unused / out-of-sync summary from a fresh scan.",
    mimeType: "application/json",
  },
  async (uri) => {
    const data = getStatusOverview(resolveLocalesDir(), resolveBaseLang());
    return {
      contents: [
        { uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) },
      ],
    };
  }
);

/* ----------------------------- Boot ------------------------------ */

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is safe for logs; stdout is the JSON-RPC channel.
  console.error("i18n-mcp server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting i18n-mcp:", err);
  process.exit(1);
});
