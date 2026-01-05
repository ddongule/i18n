import chalk from "chalk";
import fs from "fs";
import path from "path";
import readline from "readline";
import { loadLocales, scanCode, analyzeDiff } from "i18n-mcp-core";
import { createPullRequest } from "../utils/createPullRequest";
import { ensureGhInstalled } from "../utils/checkGh";

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

      if (options.pr && options.dryRun) {
        console.log(
          chalk.red(
            "\n❌ Cannot create PR in dry-run mode.\n" +
              "Remove --dry-run to allow file changes and PR creation.\n"
          )
        );
        return;
      }

      console.log(
        chalk.bgBlue.black(`  BASE LOCALE  `),
        chalk.white.bold(lang),
        "\n"
      );

      const localesDir = path.join(process.cwd(), "locales");
      const locales = loadLocales(localesDir); // { en: {...}, ko: {...} }
      const codeKeys = scanCode(process.cwd());
      const diff = analyzeDiff(locales, codeKeys, lang);

      // --- classify unused keys ---
      const baseLang = lang;
      const baseFlat = flattenLocaleObject(locales[baseLang]);

      const localeFlats: Record<string, any> = {};
      Object.entries(locales).forEach(([l, obj]) => {
        localeFlats[l] = flattenLocaleObject(obj);
      });

      const safeUnused: string[] = [];
      const unusedAndMissing: { key: string; missingIn: string[] }[] = [];

      diff.unused.forEach((key: string) => {
        const missingIn: string[] = [];

        Object.entries(localeFlats).forEach(([l, flat]) => {
          if (!(key in flat)) missingIn.push(l);
        });

        if (missingIn.length === 0) {
          safeUnused.push(key);
        } else {
          unusedAndMissing.push({ key, missingIn });
        }
      });

      // "." 같은 이상한 값 방지
      diff.missing = diff.missing.filter(
        (k: string) => k && k.trim() && k !== "." && !/^\.+$/.test(k)
      );
      diff.unused = diff.unused.filter(
        (k: string) => k && k.trim() && k !== "." && !/^\.+$/.test(k)
      );

      // 출력 포맷
      if (md) {
        printMarkdown(diff);
        if (save !== false) saveMarkdown(diff);
      } else if (json) {
        printJson(diff);
        if (save !== false) saveJson(diff);
      } else {
        printPretty(diff, locales);
      }

      // 구조 일관성 체크
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

      // unused 삭제 / missing 생성
      if (deleteUnused || createMissing) {
        applyFixes({
          diff,
          safeUnused,
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

      // 구조 강제 정렬
      if (fixStructure) {
        fixLocaleStructure({
          baseLang: lang,
          locales,
          localesDir,
          targetLocale: locale,
          dryRun: !!dryRun,
          backup: !!backup,
          backupDir,
        });
      }

      const hasChanges =
        (deleteUnused && safeUnused.length > 0) ||
        (createMissing && diff.missing.length > 0) ||
        fixStructure;

      if (!options.pr) {
        return;
      }

      if (!hasChanges) {
        console.log(
          chalk.yellow(
            "\n⚠ No changes detected.\n" +
              "PR creation skipped because there are no file modifications.\n"
          )
        );
        return;
      }

      try {
        ensureGhInstalled();
      } catch (e: any) {
        console.log(chalk.red("\n❌ " + e.message + "\n"));
        return;
      }

      if (!dryRun) {
        const branch = `i18n/update-${Date.now()}`;

        const body = `
            ## 🧩 i18n Update Summary
            
            ### Changes
            - 🧹 Removed unused keys: ${safeUnused.length}
            - ✨ Created missing keys: ${diff.missing.length}
            - 🏗 Fixed locale structure: ${fixStructure ? "yes" : "no"}
            
            ### Affected Locales
            ${Object.keys(locales)
              .map((l) => `- ${l}`)
              .join("\n")}
            
            ---

            Generated by i18n-mcp 🤖
            `.trim();

        createPullRequest({
          title: options.prTitle,
          body,
          draft: options.prDraft,
          branch,
        });
      }
    });
}

function buildMissingByLocale(
  baseLang: string,
  locales: Record<string, any>
): Record<string, string[]> {
  const base = locales[baseLang];
  if (!base) return {};

  const baseFlat = flattenLocaleObject(base);
  const baseKeys = Object.keys(baseFlat);

  const result: Record<string, string[]> = {};

  baseKeys.forEach((key) => {
    Object.entries(locales).forEach(([lang, obj]) => {
      if (lang === baseLang) return;

      const flat = flattenLocaleObject(obj);
      if (!(key in flat)) {
        if (!result[key]) result[key] = [];
        result[key].push(lang);
      }
    });
  });

  return result;
}

/* ---------------- OUTPUT ---------------- */

function printPretty(diff: any, locales: Record<string, any>) {
  console.log(chalk.green("📦 i18n Scan Result\n"));

  console.log(
    chalk.green("✔ Locale Keys in Base:"),
    diff.totalLocaleKeys,
    chalk.gray("(unique translation keys in base locale)")
  );
  console.log(
    chalk.green("✔ Keys Used in Code:"),
    diff.totalCodeKeys,
    chalk.gray("(detected from t('...') calls)")
  );

  console.log(chalk.gray("\n--------------------------------------\n"));

  /* ---------- PER LOCALE STATUS ---------- */

  console.log(chalk.magenta("🌍 Locale Status\n"));

  // base locale의 실제 nested JSON 기준으로 flatten
  const baseLocaleObj = locales[diff.baseLang];
  if (!baseLocaleObj) {
    console.log(
      chalk.red(`⚠ Base locale "${diff.baseLang}" not found in loaded locales.`)
    );
  } else {
    const baseFlat = flattenLocaleObject(baseLocaleObj);
    const baseKeys = Object.keys(baseFlat);
    const baseTotal = baseKeys.length;

    Object.entries(locales).forEach(([lang, obj]) => {
      const flat = flattenLocaleObject(obj);
      // base key 중 이 locale이 가지고 있는 key 수
      const present = baseKeys.filter((k) => k in flat).length;
      const missing = baseTotal - present;
      const extra = Object.keys(flat).filter((k) => !(k in baseFlat)).length;

      const health =
        baseTotal === 0 ? 100 : Math.round((present / baseTotal) * 100);

      const bar = healthBar(health);

      console.log(
        `${chalk.cyan(lang)}  →  ${health}% ${bar}  ` +
          chalk.gray(
            `(${present}/${baseTotal} keys present, ${missing} missing, ${extra} extra)`
          )
      );
    });
  }

  console.log(chalk.gray("\n--------------------------------------\n"));

  /* ---------- MISSING (DETAILED BY LOCALE) ---------- */

  const missingByLocale = buildMissingByLocale(diff.baseLang, locales);
  const missingKeys = Object.keys(missingByLocale);

  console.log(
    chalk.red(
      `❗ Missing Keys (${missingKeys.length})\n` +
        chalk.gray(
          "These keys exist in the base locale, but are missing in the following locales."
        )
    )
  );

  if (missingKeys.length === 0) {
    console.log(chalk.gray("  (None 🎉 All locales are up to date)"));
  } else {
    missingKeys.forEach((key) => {
      console.log(chalk.red(`  - ${key}`));
      missingByLocale[key].forEach((lang) => {
        console.log(chalk.gray(`      ↳ missing in: ${lang}`));
      });
    });
  }

  /* ---------- UNUSED (CLASSIFIED) ---------- */

  const baseLang = diff.baseLang;
  const baseFlat = flattenLocaleObject(locales[baseLang]);
  const localeFlats: Record<string, any> = {};

  Object.entries(locales).forEach(([lang, obj]) => {
    localeFlats[lang] = flattenLocaleObject(obj);
  });

  const safeUnused: string[] = [];
  const unusedAndMissing: {
    key: string;
    missingIn: string[];
  }[] = [];

  diff.unused.forEach((key: string) => {
    const missingIn: string[] = [];

    Object.entries(localeFlats).forEach(([lang, flat]) => {
      if (!(key in flat)) missingIn.push(lang);
    });

    if (missingIn.length === 0) {
      safeUnused.push(key);
    } else {
      unusedAndMissing.push({ key, missingIn });
    }
  });

  console.log(
    chalk.yellow(
      `\n🧹 Unused Keys (Safe to remove)\n` +
        chalk.gray(
          "These keys exist in all locale files, but are not used in code."
        )
    )
  );

  if (safeUnused.length === 0) {
    console.log(chalk.gray("  (None 👍 No safe unused keys found)"));
  } else {
    safeUnused.forEach((k) => console.log(chalk.yellow("  - " + k)));
  }

  console.log(
    chalk.magenta(
      `\n🧪 Unused & Missing Keys\n` +
        chalk.gray(
          "These keys are not used in code and are missing in some locales."
        )
    )
  );

  if (unusedAndMissing.length === 0) {
    console.log(chalk.gray("  (None)"));
  } else {
    unusedAndMissing.forEach(({ key, missingIn }) => {
      console.log(chalk.green("  - " + key));
      console.log(chalk.gray(`      ↳ missing in: ${missingIn.join(", ")}`));
    });
  }

  console.log("\n");

  /* ---------- NEXT ACTIONS ---------- */

  console.log(chalk.blue("💡 Next Actions"));

  console.log(
    chalk.gray("• Remove unused keys:"),
    chalk.white("i18n-mcp scan --delete-unused")
  );

  console.log(
    chalk.gray("• Create missing keys with placeholders:"),
    chalk.white("i18n-mcp scan --create-missing")
  );

  console.log(
    chalk.gray("• Align all locale structures to base:"),
    chalk.white("i18n-mcp scan --fix-structure")
  );

  console.log(
    chalk.gray("• Export markdown report:"),
    chalk.white("i18n-mcp scan --md")
  );

  console.log(
    chalk.gray("• Export json report:"),
    chalk.white("i18n-mcp scan --json")
  );

  console.log("\n" + chalk.gray("────────────────────────────────\n"));
}

/* ---------- HEALTH BAR UI ---------- */

function healthBar(percent: number) {
  const total = 20;
  const filled = Math.round((percent / 100) * total);
  return (
    chalk.green("█".repeat(filled)) + chalk.gray("█".repeat(total - filled))
  );
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
  `.trim();

  fs.writeFileSync("i18n-report.md", content);
  console.log(chalk.green("\n💾 Markdown saved → i18n-report.md\n"));
}

function printJson(diff: any) {
  console.log(JSON.stringify(diff, null, 2));
}

function saveJson(diff: any) {
  fs.writeFileSync("i18n-report.json", JSON.stringify(diff, null, 2));
  console.log(chalk.green("\n💾 JSON saved → i18n-report.json\n"));
}

/* ---------------- FLATTEN HELPER ---------------- */

// nested locale → flat { "a.b.c": value }
function flattenLocaleObject(
  obj: any,
  prefix = "",
  result: Record<string, any> = {}
): Record<string, any> {
  if (typeof obj !== "object" || obj === null) return result;

  Object.entries(obj).forEach(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      flattenLocaleObject(value, full, result);
    } else {
      result[full] = value;
    }
  });

  return result;
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

  const baseFlat = flattenLocaleObject(base);
  const baseKeys = new Set(Object.keys(baseFlat));

  console.log(chalk.magenta("\n🌍 Locale Consistency Report\n"));

  Object.entries(locales).forEach(([lang, map]) => {
    if (lang === baseLang) return;

    const flat = flattenLocaleObject(map);
    const keys = new Set(Object.keys(flat));
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
  safeUnused,
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
      deleted = deleteUnusedKeysFromObject(obj, safeUnused);

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
  const baseFile = path.join(localesDir, `${baseLang}.json`);

  if (!fs.existsSync(baseFile)) {
    console.log(
      chalk.red(
        `⚠ base locale file not found: ${baseFile} (baseLang="${baseLang}")`
      )
    );
    return;
  }

  // ✅ 실제 base JSON 파일 (nested 구조)
  const baseNested = JSON.parse(fs.readFileSync(baseFile, "utf-8"));
  const baseFlat = flattenLocaleObject(baseNested);
  const baseKeys = Object.keys(baseFlat);

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

    // 현재 locale도 실제 파일 기준(nested)으로 flatten
    const langFlat = flattenLocaleObject(obj);
    const langKeys = Object.keys(langFlat);

    const extra = langKeys.filter((k) => !baseKeys.includes(k));
    const missing = baseKeys.filter((k) => !langKeys.includes(k));

    let deleted = deleteUnusedKeysFromObject(obj, extra);
    let created = createMissingKeysInObject(obj, missing, "");

    pruneEmptyObjects(obj);

    // ✅ 여기에서 baseNested 기준으로 key 순서 맞춰 정렬
    obj = sortLocaleByBase(baseNested, obj);

    if (dryRun) {
      console.log(
        chalk.gray(`[DRY-RUN] ${lang}: delete ${deleted}, create ${created}`)
      );
    } else {
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

function sortLocaleByBase(base: any, target: any) {
  if (typeof base !== "object" || base === null) return target;
  if (typeof target !== "object" || target === null) return target;

  const sorted: any = {};

  Object.keys(base).forEach((key) => {
    const baseVal = base[key];
    const targetVal = target[key];

    if (typeof baseVal === "object" && baseVal !== null) {
      sorted[key] = sortLocaleByBase(baseVal, targetVal ?? {});
    } else {
      sorted[key] = targetVal ?? "";
    }
  });

  return sorted;
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
  if (!r.length) {
    delete obj[h];
    return true;
  }
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
  if (typeof obj[h] !== "object" || obj[h] === null) obj[h] = {};
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
