#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import fs from "fs";
import path from "path";
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
  .action((options) => {
    const { md, json, lang, save, deleteUnused, createMissing, locale } =
      options;

    console.log(chalk.blue("\n📦 Running i18n scan...\n"));
    console.log(chalk.cyan(`Base Locale: ${lang}\n`));

    const localesDir = path.join(process.cwd(), "locales");
    const locales = loadLocales(localesDir);
    const codeKeys = scanCode(process.cwd());
    const diff = analyzeDiff(locales, codeKeys, lang);

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

    // ---- 수정 ----
    if (deleteUnused || createMissing) {
      applyFixes({
        diff,
        baseLang: lang,
        localesDir,
        targetLocale: locale,
        locales,
        deleteUnused,
        createMissing,
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

/* ---------------- JSON ---------------- */
function printJson(diff: any) {
  console.log(JSON.stringify(diff, null, 2));
}

function saveJson(diff: any) {
  const filename = "i18n-report.json";
  fs.writeFileSync(filename, JSON.stringify(diff, null, 2));
  console.log(chalk.green(`\n💾 JSON saved → ${filename}\n`));
}

/* ---------------- APPLY FIXES ---------------- */
function applyFixes({
  diff,
  baseLang,
  localesDir,
  targetLocale,
  locales,
  deleteUnused,
  createMissing,
}: any) {
  const targetLocales = targetLocale ? [targetLocale] : Object.keys(locales);

  console.log(
    chalk.magenta(
      `\n🔧 Applying fixes to: ${targetLocale ? targetLocale : "ALL locales"}\n`
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
      deleted = deleteUnusedKeys(obj, diff.unused);
    }

    if (createMissing && diff.missing?.length) {
      created = createMissingKeys(
        obj,
        diff.missing,
        lang === baseLang ? "" : ""
      );
    }

    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));

    if (deleteUnused)
      console.log(chalk.green(`🧹 ${lang}: deleted ${deleted} unused`));
    if (createMissing)
      console.log(chalk.green(`✨ ${lang}: created ${created} missing`));
  });
}

/* ---------------- Helpers ---------------- */
function deleteUnusedKeys(root: any, unusedKeys: string[]) {
  let count = 0;
  unusedKeys.forEach((k) => {
    const parts = k.split(".");
    if (deletePath(root, parts)) count++;
  });
  return count;
}

function deletePath(obj: any, parts: string[]): boolean {
  const [head, ...rest] = parts;
  if (!obj || !(head in obj)) return false;

  if (rest.length === 0) {
    delete obj[head];
    return true;
  }

  return deletePath(obj[head], rest);
}

function createMissingKeys(root: any, missing: string[], placeholder: any) {
  let count = 0;

  missing
    .filter((k) => k && k.trim())
    .forEach((k) => {
      const parts = k.split(".").filter(Boolean);
      if (createPath(root, parts, placeholder)) count++;
    });

  return count;
}

function createPath(obj: any, parts: string[], value: any): boolean {
  const [head, ...rest] = parts;

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
