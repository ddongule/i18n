import path from "path";
import { loadLocales, scanCode, analyzeDiff } from "i18n-mcp-core";

/**
 * Shared project context for tools and resources.
 *
 * The locales directory and base language default to `<cwd>/locales` and `en`,
 * but can be overridden with the I18N_LOCALES_DIR / I18N_BASE_LANG environment
 * variables so a client can point the server at a non-standard layout.
 */

export function resolveLocalesDir(override?: string): string {
  const dir = override ?? process.env.I18N_LOCALES_DIR ?? "locales";
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

export function resolveBaseLang(override?: string): string {
  return override ?? process.env.I18N_BASE_LANG ?? "en";
}

export interface LocalesOverview {
  localesDir: string;
  locales: { locale: string; keyCount: number }[];
}

/** List each locale file and how many (flattened) keys it holds. */
export function getLocalesOverview(localesDir: string): LocalesOverview {
  const locales = loadLocales(localesDir);
  return {
    localesDir,
    locales: Object.entries(locales).map(([locale, map]) => ({
      locale,
      keyCount: Object.keys(map).length,
    })),
  };
}

export interface NamespacesOverview {
  baseLang: string;
  namespaces: { namespace: string; keyCount: number }[];
  totalKeys: number;
}

/**
 * Derive the top-level key namespaces of the base locale (e.g. `home`,
 * `settings`) so an agent can grasp the translation structure without scanning.
 */
export function getNamespacesOverview(
  localesDir: string,
  baseLang: string
): NamespacesOverview {
  const locales = loadLocales(localesDir);
  const base = locales[baseLang];
  if (!base) {
    throw new Error(
      `Base locale "${baseLang}" not found in ${localesDir}. Available: ${Object.keys(locales).join(", ") || "(none)"}`
    );
  }

  const counts = new Map<string, number>();
  for (const key of Object.keys(base)) {
    const ns = key.includes(".") ? key.slice(0, key.indexOf(".")) : key;
    counts.set(ns, (counts.get(ns) ?? 0) + 1);
  }

  return {
    baseLang,
    totalKeys: Object.keys(base).length,
    namespaces: [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([namespace, keyCount]) => ({ namespace, keyCount })),
  };
}

export interface StatusOverview {
  baseLang: string;
  localesDir: string;
  totalLocaleKeys: number;
  totalCodeKeys: number;
  missingCount: number;
  unusedCount: number;
  missingKeys: string[];
  unusedKeys: string[];
  inSync: boolean;
}

/**
 * Run a full scan and summarise i18n health: keys used in code but missing from
 * the base locale, and keys in the base locale unused by the code.
 */
export function getStatusOverview(
  localesDir: string,
  baseLang: string,
  cwd = process.cwd()
): StatusOverview {
  const locales = loadLocales(localesDir);
  const codeKeys = scanCode(cwd);
  const diff = analyzeDiff(locales, codeKeys, baseLang);

  return {
    baseLang,
    localesDir,
    totalLocaleKeys: diff.totalLocaleKeys,
    totalCodeKeys: diff.totalCodeKeys,
    missingCount: diff.missing.length,
    unusedCount: diff.unused.length,
    missingKeys: diff.missing,
    unusedKeys: diff.unused,
    inSync: diff.missing.length === 0 && diff.unused.length === 0,
  };
}
