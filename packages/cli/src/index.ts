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
  .option("--lang <code>", "base locale language", "en")
  .action((options) => {
    const { md, json, lang } = options;

    console.log(chalk.blue("\n📦 Running i18n scan...\n"));
    console.log(chalk.cyan(`Base Locale: ${lang}\n`));

    const locales = loadLocales(path.join(process.cwd(), "locales"));
    const keys = scanCode(process.cwd());
    const diff = analyzeDiff(locales, keys, lang);

    if (md) {
      printMarkdown(diff);
      saveMarkdown(diff);
      return;
    }

    if (json) {
      printJson(diff);
      saveJson(diff);
      return;
    }

    printPretty(diff);
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
