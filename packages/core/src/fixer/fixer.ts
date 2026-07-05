import fs from "fs";
import path from "path";
import type { DiffResult } from "../analyzer/diffAnalyzer";

/**
 * Console-free i18n fixing logic, promoted from the CLI so both the CLI and the
 * MCP server can share it. Every function returns structured results instead of
 * logging, so callers decide how to present them.
 */

export interface LocaleFixResult {
  locale: string;
  deleted: number;
  created: number;
}

export interface ApplyFixesOptions {
  diff: DiffResult;
  localesDir: string;
  locales: Record<string, Record<string, any>>;
  targetLocale?: string;
  deleteUnused?: boolean;
  createMissing?: boolean;
  dryRun?: boolean;
  backup?: boolean;
  backupDir?: string;
}

export interface FixStructureOptions {
  baseLang: string;
  localesDir: string;
  locales: Record<string, Record<string, any>>;
  targetLocale?: string;
  dryRun?: boolean;
  backup?: boolean;
  backupDir?: string;
}

function defaultBackupDir(localesDir: string, backupDir?: string): string {
  return backupDir ?? path.join(localesDir, ".i18n-backup");
}

/**
 * Delete unused keys and/or create missing keys across the target locales.
 * Unused keys come from `diff.unused`; missing keys from `diff.missing`.
 */
export function applyFixes({
  diff,
  localesDir,
  locales,
  targetLocale,
  deleteUnused = false,
  createMissing = false,
  dryRun = true,
  backup = false,
  backupDir,
}: ApplyFixesOptions): LocaleFixResult[] {
  const targets = targetLocale ? [targetLocale] : Object.keys(locales);
  const resolvedBackupDir = defaultBackupDir(localesDir, backupDir);
  const results: LocaleFixResult[] = [];

  targets.forEach((lang) => {
    const file = path.join(localesDir, `${lang}.json`);
    if (!fs.existsSync(file)) return;

    const obj = JSON.parse(fs.readFileSync(file, "utf-8"));

    let deleted = 0;
    let created = 0;

    if (deleteUnused && diff.unused?.length)
      deleted = deleteUnusedKeysFromObject(obj, diff.unused);

    if (createMissing && diff.missing?.length)
      created = createMissingKeysInObject(obj, diff.missing, "");

    pruneEmptyObjects(obj);

    if (!dryRun) {
      if (backup) ensureBackup(file, lang, resolvedBackupDir);
      fs.writeFileSync(file, JSON.stringify(obj, null, 2));
    }

    results.push({ locale: lang, deleted, created });
  });

  return results;
}

/**
 * Align every target locale to the base locale's structure: remove keys that
 * are not in the base, add keys that are missing (empty value), and reorder to
 * match the base key order.
 */
export function fixLocaleStructure({
  baseLang,
  localesDir,
  locales,
  targetLocale,
  dryRun = true,
  backup = false,
  backupDir,
}: FixStructureOptions): LocaleFixResult[] {
  const baseFile = path.join(localesDir, `${baseLang}.json`);
  if (!fs.existsSync(baseFile)) {
    throw new Error(
      `Base locale file not found: ${baseFile} (baseLang="${baseLang}")`
    );
  }

  const baseNested = JSON.parse(fs.readFileSync(baseFile, "utf-8"));
  const baseFlat = flattenLocaleObject(baseNested);
  const baseKeys = Object.keys(baseFlat);

  const targets = targetLocale ? [targetLocale] : Object.keys(locales);
  const resolvedBackupDir = defaultBackupDir(localesDir, backupDir);
  const results: LocaleFixResult[] = [];

  targets.forEach((lang) => {
    const file = path.join(localesDir, `${lang}.json`);
    if (!fs.existsSync(file)) return;

    let obj = JSON.parse(fs.readFileSync(file, "utf-8"));

    const langFlat = flattenLocaleObject(obj);
    const langKeys = Object.keys(langFlat);

    const extra = langKeys.filter((k) => !baseKeys.includes(k));
    const missing = baseKeys.filter((k) => !langKeys.includes(k));

    const deleted = deleteUnusedKeysFromObject(obj, extra);
    const created = createMissingKeysInObject(obj, missing, "");

    pruneEmptyObjects(obj);
    obj = sortLocaleByBase(baseNested, obj);

    if (!dryRun) {
      if (backup) ensureBackup(file, lang, resolvedBackupDir);
      fs.writeFileSync(file, JSON.stringify(obj, null, 2));
    }

    results.push({ locale: lang, deleted, created });
  });

  return results;
}

/* ---------------- helpers ---------------- */

function sortLocaleByBase(base: any, target: any): any {
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

function pruneEmptyObjects(obj: any): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "object") {
      if (pruneEmptyObjects(obj[key])) delete obj[key];
    }
  }
  return Object.keys(obj).length === 0;
}

function ensureBackup(file: string, lang: string, dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(file, path.join(dir, `${lang}.json`));
}

function deleteUnusedKeysFromObject(root: any, keys: string[]): number {
  let count = 0;
  keys.forEach((k) => deletePath(root, k.split(".")) && count++);
  return count;
}

function deletePath(obj: any, parts: string[]): boolean {
  const [h, ...r] = parts;
  if (obj == null || !(h in obj)) return false;
  if (!r.length) {
    delete obj[h];
    return true;
  }
  return deletePath(obj[h], r);
}

function createMissingKeysInObject(
  root: any,
  keys: string[],
  value: any
): number {
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
