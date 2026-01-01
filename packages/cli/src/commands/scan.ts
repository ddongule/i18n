import chalk from "chalk";
import fs from "fs";
import path from "path";
import readline from "readline";
import { loadLocales, scanCode, analyzeDiff } from "i18n-mcp-core";

export function scanCommand(program: any) {
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
    .option("--dry-run", "simulate changes only")
    .option("--backup", "backup locale files before modifying", false)
    .option("--no-confirm", "do not ask before applying changes")
    .action(async (options: any) => {
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

      if (md) {
        printMarkdown(diff);
        if (save !== false) saveMarkdown(diff);
      } else if (json) {
        printJson(diff);
        if (save !== false) saveJson(diff);
      } else {
        printPretty(diff);
      }

      if (checkConsistency) {
        runConsistencyCheck(locales, lang);
      }

      const willModify = !!deleteUnused || !!createMissing || !!fixStructure;

      if (!willModify) return;

      const targetLocales = locale ? [locale] : Object.keys(locales);
      const backupDir = path.join(
        localesDir,
        ".i18n-mcp-backup",
        new Date().toISOString().replace(/[:.]/g, "-")
      );

      if (!dryRun && confirm !== false) {
        console.log(
          chalk.yellow(`\nAbout to modify locales: ${targetLocales.join(", ")}`)
        );
        const ok = await askForConfirmation("Continue?");
        if (!ok) {
          console.log(chalk.red("\n❌ Aborted by user.\n"));
          return;
        }
      }

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
}

/* ---------------- OUTPUT ---------------- */

function printPretty(diff: any) {
  console.log(chalk.green("✔ Locales Loaded (base):"), diff.totalLocaleKeys);
  console.log(chalk.green("✔ Code Keys:"), diff.totalCodeKeys);

  console.log(chalk.red(`\n❗ Missing Keys (${diff.missing.length})`));
  diff.missing.length === 0
    ? console.log(chalk.gray("  (none)"))
    : diff.missing.forEach((k: string) => console.log(chalk.red("  - " + k)));

  console.log(chalk.yellow(`\n🧹 Unused Keys (${diff.unused.length})`));
  diff.unused.length === 0
    ? console.log(chalk.gray("  (none)"))
    : diff.unused.forEach((k: string) => console.log(chalk.yellow("  - " + k)));

  console.log("\n" + chalk.gray("──────────────────────────────\n"));
}

function printMarkdown(diff: any) {
  console.log(`## 📦 i18n Scan Result\n`);
  console.log(`- Base Locale: **${diff.baseLang}**`);
  console.log(`- Locale Keys: **${diff.totalLocaleKeys}**`);
  console.log(`- Code Keys: **${diff.totalCodeKeys}**\n`);
  console.log(`---\n`);

  console.log(`### ❗ Missing (${diff.missing.length})`);
  diff.missing.length === 0
    ? console.log("- none")
    : diff.missing.forEach((k: string) => console.log(`- ${k}`));

  console.log(`\n### 🧹 Unused (${diff.unused.length})`);
  diff.unused.length === 0
    ? console.log("- none")
    : diff.unused.forEach((k: string) => console.log(`- ${k}`));
}

function saveMarkdown(diff: any) {
  fs.writeFileSync(
    "i18n-report.md",
    `
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
`.trim()
  );
  console.log(chalk.green("\n💾 Markdown saved → i18n-report.md\n"));
}

function printJson(diff: any) {
  console.log(JSON.stringify(diff, null, 2));
}

function saveJson(diff: any) {
  fs.writeFileSync("i18n-report.json", JSON.stringify(diff, null, 2));
  console.log(chalk.green("\n💾 JSON saved → i18n-report.json\n"));
}

/* ---------------- CONSISTENCY ---------------- */

function runConsistencyCheck(
  locales: Record<string, Record<string, any>>,
  baseLang: string
) {
  const base = locales[baseLang];
  if (!base) {
    console.log(chalk.red(`⚠ base locale "${baseLang}" missing`));
    return;
  }

  const baseKeys = new Set(Object.keys(base));
  console.log(chalk.magenta("\n🌍 Locale Consistency Report\n"));

  Object.entries(locales).forEach(([lang, map]) => {
    if (lang === baseLang) return;

    const keys = new Set(Object.keys(map));
    const missing: string[] = [];
    const extra: string[] = [];

    baseKeys.forEach((k) => !keys.has(k) && missing.push(k));
    keys.forEach((k) => !baseKeys.has(k) && extra.push(k));

    if (!missing.length && !extra.length) {
      console.log(chalk.green(`✅ ${lang}: consistent`));
      return;
    }

    console.log(chalk.yellow(`\n🔸 ${lang}`));
    if (missing.length) {
      console.log(chalk.red(`  ❗ Missing`));
      missing.forEach((k) => console.log(`    - ${k}`));
    }
    if (extra.length) {
      console.log(chalk.yellow(`  ⚠ Extra`));
      extra.forEach((k) => console.log(`    - ${k}`));
    }
  });

  console.log();
}

/* ---------------- APPLY FIXES ---------------- */

function applyFixes({
  diff,
  localesDir,
  targetLocale,
  locales,
  deleteUnused,
  createMissing,
  dryRun,
  backup,
  backupDir,
}: any) {
  const targets = targetLocale ? [targetLocale] : Object.keys(locales);

  console.log(
    chalk.magenta(
      `\n🔧 Applying fixes to ${targets.join(", ")} (dryRun=${dryRun})\n`
    )
  );

  targets.forEach((lang) => {
    const file = path.join(localesDir, `${lang}.json`);
    if (!fs.existsSync(file)) return;

    let obj = JSON.parse(fs.readFileSync(file, "utf-8"));

    let deleted = 0;
    let created = 0;

    if (deleteUnused && diff.unused?.length)
      deleted = deleteUnusedKeysFromObject(obj, diff.unused);

    if (createMissing && diff.missing?.length)
      created = createMissingKeysInObject(obj, diff.missing, "");

    pruneEmptyObjects(obj);

    if (dryRun)
      console.log(
        chalk.gray(`[DRY-RUN] ${lang}: delete ${deleted}, create ${created}`)
      );
    else {
      if (backup) ensureBackup(file, lang, backupDir);
      fs.writeFileSync(file, JSON.stringify(obj, null, 2));
      console.log(
        chalk.green(`✔ ${lang}: deleted ${deleted}, created ${created}`)
      );
    }
  });
}

/* ---------------- FIX STRUCTURE ---------------- */

function fixLocaleStructure({
  baseLang,
  locales,
  localesDir,
  targetLocale,
  dryRun,
  backup,
  backupDir,
}: any) {
  const base = locales[baseLang];
  if (!base) {
    console.log(chalk.red(`⚠ base ${baseLang} missing`));
    return;
  }

  const baseKeys = Object.keys(base);
  const targets = targetLocale ? [targetLocale] : Object.keys(locales);

  console.log(
    chalk.magenta(
      `\n🧱 Fixing structure to match "${baseLang}" (dryRun=${dryRun})\n`
    )
  );

  targets.forEach((lang) => {
    const file = path.join(localesDir, `${lang}.json`);
    if (!fs.existsSync(file)) return;

    let obj = JSON.parse(fs.readFileSync(file, "utf-8"));
    const langKeys = Object.keys(locales[lang] ?? {});

    const extra = langKeys.filter((k) => !baseKeys.includes(k));
    const missing = baseKeys.filter((k) => !langKeys.includes(k));

    let deleted = deleteUnusedKeysFromObject(obj, extra);
    let created = createMissingKeysInObject(obj, missing, "");

    pruneEmptyObjects(obj);

    if (dryRun)
      console.log(
        chalk.gray(`[DRY-RUN] ${lang}: delete ${deleted}, create ${created}`)
      );
    else {
      if (backup) ensureBackup(file, lang, backupDir);
      fs.writeFileSync(file, JSON.stringify(obj, null, 2));
      console.log(
        chalk.green(
          `🏗 ${lang}: aligned (deleted ${deleted}, created ${created})`
        )
      );
    }
  });
}

/* ---------------- HELPERS ---------------- */

function pruneEmptyObjects(obj: any): boolean {
  if (typeof obj !== "object" || obj === null) return false;

  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "object") {
      if (pruneEmptyObjects(obj[key])) delete obj[key];
    }
  }
  return Object.keys(obj).length === 0;
}

function ensureBackup(file: string, lang: string, dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(file, path.join(dir, `${lang}.json`));
}

function deleteUnusedKeysFromObject(root: any, keys: string[]) {
  let count = 0;
  keys.forEach((k) => deletePath(root, k.split(".")) && count++);
  return count;
}

function deletePath(obj: any, parts: string[]): boolean {
  const [h, ...r] = parts;
  if (!(h in obj)) return false;
  if (!r.length) return delete obj[h], true;
  return deletePath(obj[h], r);
}

function createMissingKeysInObject(root: any, keys: string[], value: any) {
  let count = 0;
  keys.forEach((k) => createPath(root, k.split("."), value) && count++);
  return count;
}

function createPath(obj: any, parts: string[], value: any): boolean {
  const [h, ...r] = parts;
  if (!h) return false;
  if (!r.length) {
    if (obj[h] === undefined) {
      obj[h] = value;
      return true;
    }
    return false;
  }
  if (typeof obj[h] !== "object") obj[h] = {};
  return createPath(obj[h], r, value);
}

function askForConfirmation(q: string) {
  return new Promise<boolean>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`${q} (y/N) `, (a) => {
      rl.close();
      a = a.trim().toLowerCase();
      resolve(a === "y" || a === "yes");
    });
  });
}
