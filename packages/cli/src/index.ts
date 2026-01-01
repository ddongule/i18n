#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import readline from "readline";
import { loadLocales, scanCode, analyzeDiff } from "i18n-mcp-core";

const program = new Command();

program.name("i18n-mcp").description("i18n automation tool").version("0.0.1");

program
  .command("scan")
  .description("scan project & generate report")
  .option("--md", "output as markdown & save file")
  .option("--json", "output as json & save file")
  .option("--no-save", "do not save report when using md/json")
  .option("--lang <code>", "base locale language", "en")
  .option("--delete-unused", "delete unused keys")
  .option("--create-missing", "create missing keys with placeholder")
  .option(
    "--locale <code>",
    "apply fixes to only specific locale (default = ALL)"
  )
  .option("--check-consistency", "verify all locale structures are aligned")
  .option("--fix-structure", "force align locale structures to base locale")
  .option("--dry-run", "simulate changes only (no file writes)")
  .option("--backup", "backup locale files before modifying", false)
  .option("--no-confirm", "do not ask before applying changes")
  .action(async (options) => {
    const {
      md,
      json,
      lang,
      save,
      deleteUnused,
      createMissing,
      locale,
      checkConsistency,
      fixStructure,
      dryRun,
      backup,
      confirm,
    } = options;

    console.log(chalk.blue("\n📦 Running i18n scan...\n"));
    console.log(chalk.cyan(`Base Locale: ${lang}\n`));

    const localesDir = path.join(process.cwd(), "locales");
    const locales = loadLocales(localesDir);
    const codeKeys = scanCode(process.cwd());
    const diff = analyzeDiff(locales, codeKeys, lang);
    diff.missing = diff.missing.filter(
      (k: string) => k && k.trim() && k !== "." && !/^\.+$/.test(k)
    );

    diff.unused = diff.unused.filter(
      (k: string) => k && k.trim() && k !== "." && !/^\.+$/.test(k)
    );

    // ---- 출력 ----
    if (md) {
      printMarkdown(diff);
      if (save !== false) saveMarkdown(diff);
    } else if (json) {
      printJson(diff);
      if (save !== false) saveJson(diff);
    } else {
      printPretty(diff);
    }

    // ---- Consistency Check (읽기 전용) ----
    if (checkConsistency) {
      runConsistencyCheck(locales, lang);
    }

    const willModify = !!deleteUnused || !!createMissing || !!fixStructure;

    if (!willModify) {
      return;
    }

    const targetLocales = locale ? [locale] : Object.keys(locales);
    const backupDir = path.join(
      localesDir,
      ".i18n-mcp-backup",
      new Date().toISOString().replace(/[:.]/g, "-")
    );

    // ---- Confirm before modifying (만약 dry-run 아니고 confirm 켜져 있으면) ----
    if (!dryRun && confirm !== false) {
      console.log(
        chalk.yellow(`\nAbout to modify locales: ${targetLocales.join(", ")}`)
      );
      console.log(
        chalk.yellow(
          `Options: deleteUnused=${!!deleteUnused}, createMissing=${!!createMissing}, fixStructure=${!!fixStructure}, dryRun=${!!dryRun}, backup=${
            backup !== false
          }`
        )
      );

      const ok = await askForConfirmation("Continue?");
      if (!ok) {
        console.log(chalk.red("\n❌ Aborted by user.\n"));
        return;
      }
    }

    // ---- 수정 로직(코드 기준 diff 기반) ----
    if (deleteUnused || createMissing) {
      applyFixes({
        diff,
        baseLang: lang,
        localesDir,
        targetLocale: locale,
        locales,
        deleteUnused,
        createMissing,
        dryRun: !!dryRun,
        backup: !!backup,
        backupDir,
      });
    }

    // ---- 구조 정렬 (baseLang 기준 구조 align) ----
    if (fixStructure) {
      fixLocaleStructure({
        baseLang: lang,
        localesDir,
        locales,
        targetLocale: locale,
        dryRun: !!dryRun,
        backup: !!backup,
        backupDir,
      });
    }
  });

program.parse();

/* ---------------- Pretty Output ---------------- */
function printPretty(diff: any) {
  console.log(chalk.green("✔ Locales Loaded (base):"), diff.totalLocaleKeys);
  console.log(chalk.green("✔ Code Keys:"), diff.totalCodeKeys);

  console.log(chalk.red(`\n❗ Missing Keys (${diff.missing.length})`));
  if (diff.missing.length === 0) console.log(chalk.gray("  (none)"));
  else diff.missing.forEach((k: string) => console.log(chalk.red("  - " + k)));

  console.log(chalk.yellow(`\n🧹 Unused Keys (${diff.unused.length})`));
  if (diff.unused.length === 0) console.log(chalk.gray("  (none)"));
  else
    diff.unused.forEach((k: string) => console.log(chalk.yellow("  - " + k)));

  console.log("\n" + chalk.gray("──────────────────────────────\n"));
}

/* ---------------- Markdown Output ---------------- */
function printMarkdown(diff: any) {
  console.log(`## 📦 i18n Scan Result\n`);

  console.log(`- Base Locale: **${diff.baseLang}**`);
  console.log(`- Locale Keys: **${diff.totalLocaleKeys}**`);
  console.log(`- Code Keys: **${diff.totalCodeKeys}**\n`);
  console.log(`---\n`);

  console.log(`### ❗ Missing (${diff.missing.length})`);
  if (diff.missing.length === 0) console.log(`- none`);
  else diff.missing.forEach((k: string) => console.log(`- ${k}`));
  console.log("\n");

  console.log(`### 🧹 Unused (${diff.unused.length})`);
  if (diff.unused.length === 0) console.log(`- none`);
  else diff.unused.forEach((k: string) => console.log(`- ${k}`));

  console.log("\n");
}

/* ---------------- Save Markdown ---------------- */
function saveMarkdown(diff: any) {
  const filename = "i18n-report.md";

  const content = `
## 📦 i18n Scan Result

- Base Locale: **${diff.baseLang}**
- Locale Keys: **${diff.totalLocaleKeys}**
- Code Keys: **${diff.totalCodeKeys}**

---

### ❗ Missing (${diff.missing.length})
${
  diff.missing.length === 0
    ? "- none"
    : diff.missing.map((k: string) => `- ${k}`).join("\n")
}

### 🧹 Unused (${diff.unused.length})
${
  diff.unused.length === 0
    ? "- none"
    : diff.unused.map((k: string) => `- ${k}`).join("\n")
}
`;

  fs.writeFileSync(filename, content.trim());
  console.log(chalk.green(`\n💾 Markdown saved → ${filename}\n`));
}

/* ---------------- JSON Mode ---------------- */
function printJson(diff: any) {
  console.log(JSON.stringify(diff, null, 2));
}

function saveJson(diff: any) {
  const filename = "i18n-report.json";
  fs.writeFileSync(filename, JSON.stringify(diff, null, 2));
  console.log(chalk.green(`\n💾 JSON saved → ${filename}\n`));
}

/* ---------------- Consistency Check ---------------- */

function runConsistencyCheck(
  locales: Record<string, Record<string, any>>,
  baseLang: string
) {
  const base = locales[baseLang];
  if (!base) {
    console.log(
      chalk.red(
        `⚠ Base locale "${baseLang}" not found. Skip consistency check.`
      )
    );
    return;
  }

  const baseKeys = new Set(Object.keys(base));
  console.log(chalk.magenta("\n🌍 Locale Consistency Report\n"));

  Object.entries(locales).forEach(([lang, map]) => {
    const keys = new Set(Object.keys(map));
    const missing: string[] = [];
    const extra: string[] = [];

    baseKeys.forEach((k) => {
      if (!keys.has(k)) missing.push(k);
    });
    keys.forEach((k) => {
      if (!baseKeys.has(k)) extra.push(k);
    });

    if (missing.length === 0 && extra.length === 0) {
      console.log(chalk.green(`✅ ${lang}: consistent with ${baseLang}`));
      return;
    }

    console.log(chalk.yellow(`\n🔸 ${lang}`));
    if (missing.length > 0) {
      console.log(chalk.red(`  ❗ Missing (${missing.length})`));
      missing.forEach((k) => console.log(`    - ${k}`));
    }
    if (extra.length > 0) {
      console.log(chalk.yellow(`  ⚠ Extra (${extra.length})`));
      extra.forEach((k) => console.log(`    - ${k}`));
    }
  });

  console.log();
}

/* ---------------- Fixes: delete-unused / create-missing ---------------- */

function applyFixes(params: {
  diff: any;
  baseLang: string;
  localesDir: string;
  targetLocale?: string;
  locales: Record<string, Record<string, any>>;
  deleteUnused: boolean;
  createMissing: boolean;
  dryRun: boolean;
  backup: boolean;
  backupDir: string;
}) {
  const {
    diff,
    baseLang,
    localesDir,
    targetLocale,
    locales,
    deleteUnused,
    createMissing,
    dryRun,
    backup,
    backupDir,
  } = params;

  const targetLocales = targetLocale ? [targetLocale] : Object.keys(locales);

  console.log(
    chalk.magenta(
      `\n🔧 Applying code-based fixes to: ${
        targetLocale ? targetLocale : "ALL locales"
      } (dryRun=${dryRun})\n`
    )
  );

  targetLocales.forEach((lang) => {
    const filePath = path.join(localesDir, `${lang}.json`);
    if (!fs.existsSync(filePath)) return;

    const raw = fs.readFileSync(filePath, "utf-8");
    let obj: any;
    try {
      obj = JSON.parse(raw);
    } catch {
      console.log(chalk.red(`⚠ Failed to parse ${lang}.json`));
      return;
    }

    let deleted = 0;
    let created = 0;

    if (deleteUnused && diff.unused?.length) {
      deleted = deleteUnusedKeysFromObject(obj, diff.unused);
    }

    if (createMissing && diff.missing?.length) {
      // baseLang과 상관 없이 모두 placeholder "" 로 맞춤
      created = createMissingKeysInObject(obj, diff.missing, "");
    }

    // 🧹 remove empty objects
    pruneEmptyObjects(obj);

    if (dryRun) {
      console.log(
        chalk.gray(
          `[DRY-RUN] ${lang}: would delete ${deleted} unused, create ${created} missing`
        )
      );
    } else {
      if (backup) ensureBackup(filePath, lang, backupDir);
      fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
      if (deleteUnused)
        console.log(chalk.green(`🧹 ${lang}: deleted ${deleted} unused`));
      if (createMissing)
        console.log(chalk.green(`✨ ${lang}: created ${created} missing`));
    }
  });
}

/* ---------------- Fix Structure: baseLang 기준 align ---------------- */

function fixLocaleStructure(params: {
  baseLang: string;
  localesDir: string;
  locales: Record<string, Record<string, any>>;
  targetLocale?: string;
  dryRun: boolean;
  backup: boolean;
  backupDir: string;
}) {
  const {
    baseLang,
    localesDir,
    locales,
    targetLocale,
    dryRun,
    backup,
    backupDir,
  } = params;

  const baseFlat = locales[baseLang];
  if (!baseFlat) {
    console.log(
      chalk.red(
        `⚠ Cannot fix structure: base locale "${baseLang}" not found in loaded locales`
      )
    );
    return;
  }

  const baseKeys = Object.keys(baseFlat);
  const targetLocales = targetLocale ? [targetLocale] : Object.keys(locales);

  console.log(
    chalk.magenta(
      `\n🧱 Fixing locale structures to match "${baseLang}" (dryRun=${dryRun})\n`
    )
  );

  targetLocales.forEach((lang) => {
    const filePath = path.join(localesDir, `${lang}.json`);
    if (!fs.existsSync(filePath)) return;

    const raw = fs.readFileSync(filePath, "utf-8");
    let obj: any;
    try {
      obj = JSON.parse(raw);
    } catch {
      console.log(chalk.red(`⚠ Failed to parse ${lang}.json`));
      return;
    }

    const langFlat = locales[lang] ?? {};
    const langKeys = Object.keys(langFlat);

    const missingRelativeToBase = baseKeys.filter((k) => !langKeys.includes(k));
    const extraRelativeToBase = langKeys.filter((k) => !baseKeys.includes(k));

    let deleted = 0;
    let created = 0;

    if (extraRelativeToBase.length > 0) {
      deleted = deleteUnusedKeysFromObject(obj, extraRelativeToBase);
    }

    if (missingRelativeToBase.length > 0) {
      created = createMissingKeysInObject(obj, missingRelativeToBase, "");
    }

    pruneEmptyObjects(obj);

    if (dryRun) {
      console.log(
        chalk.gray(
          `[DRY-RUN] ${lang}: would delete ${deleted} extra, create ${created} missing (structure)`
        )
      );
    } else {
      if (backup) ensureBackup(filePath, lang, backupDir);
      fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
      console.log(
        chalk.green(
          `🏗 ${lang}: structure aligned (deleted ${deleted}, created ${created})`
        )
      );
    }
  });

  console.log();
}

/* ---------------- Backup Helper ---------------- */

function ensureBackup(filePath: string, lang: string, backupDir: string) {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const destPath = path.join(backupDir, `${lang}.json`);
  if (!fs.existsSync(destPath)) {
    fs.copyFileSync(filePath, destPath);
    console.log(chalk.gray(`📦 Backup created: ${destPath}`));
  }
}

/* ---------------- Delete / Create Helpers ---------------- */

function deleteUnusedKeysFromObject(root: any, unusedKeys: string[]): number {
  let count = 0;

  unusedKeys.forEach((keyPath: string) => {
    const segments = keyPath.split(".");
    if (deletePath(root, segments)) {
      count++;
    }
  });

  return count;
}

function deletePath(obj: any, segments: string[]): boolean {
  if (!obj) return false;
  const [head, ...rest] = segments;

  if (!(head in obj)) return false;

  if (rest.length === 0) {
    delete obj[head];
    return true;
  }

  if (typeof obj[head] !== "object" || obj[head] === null) {
    return false;
  }

  return deletePath(obj[head], rest);
}

function createMissingKeysInObject(
  root: any,
  missingKeys: string[],
  placeholder: any
): number {
  let count = 0;

  missingKeys
    .filter((k) => k && k.trim())
    .forEach((keyPath: string) => {
      const segments = keyPath.split(".").filter(Boolean);
      if (segments.length === 0) return;
      if (createPath(root, segments, placeholder)) count++;
    });

  return count;
}

function createPath(obj: any, segments: string[], value: any): boolean {
  const [head, ...rest] = segments;

  if (!head) return false;

  if (rest.length === 0) {
    if (obj[head] === undefined) {
      obj[head] = value;
      return true;
    }
    return false;
  }

  if (typeof obj[head] !== "object" || obj[head] === null) {
    obj[head] = {};
  }

  return createPath(obj[head], rest, value);
}

/* ---------------- Confirm Helper ---------------- */

function askForConfirmation(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${question} (y/N) `, (answer: string) => {
      rl.close();
      const v = answer.trim().toLowerCase();
      resolve(v === "y" || v === "yes");
    });
  });
}

function pruneEmptyObjects(obj: any): boolean {
  if (typeof obj !== "object" || obj === null) return false;

  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      const shouldDelete = pruneEmptyObjects(obj[key]);
      if (shouldDelete) delete obj[key];
    }
  }

  return Object.keys(obj).length === 0;
}
