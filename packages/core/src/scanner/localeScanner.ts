import fs from "fs";
import path from "path";

export type LocaleMap = Record<string, string>;

function flattenObject(obj: any, prefix = ""): LocaleMap {
  const result: LocaleMap = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

export function loadLocaleFile(filePath: string): LocaleMap {
  const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return flattenObject(json); // ✅ 여기서 flatten
}

export function loadLocales(localeDir: string) {
  const files = fs.readdirSync(localeDir);
  const result: Record<string, LocaleMap> = {};

  files.forEach((file: string) => {
    if (!file.endsWith(".json")) return;

    const lang = path.basename(file, ".json");
    const fullPath = path.join(localeDir, file);

    result[lang] = loadLocaleFile(fullPath); // ✅ 이미 flat map
  });

  return result;
}
