export function unflatten(flat: Record<string, any>) {
  const result: any = {};

  Object.entries(flat).forEach(([key, value]) => {
    const parts = key.split(".");
    let cur = result;

    parts.forEach((p, idx) => {
      if (idx === parts.length - 1) {
        cur[p] = value;
      } else {
        if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
        cur = cur[p];
      }
    });
  });

  return result;
}

export function flattenObject(
  obj: Record<string, any>,
  prefix = "",
  res: Record<string, string> = {}
) {
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null) {
      flattenObject(value, newKey, res);
    } else {
      res[newKey] = String(value ?? "");
    }
  }
  return res;
}

export function flattenLocales(locales: Record<string, Record<string, any>>) {
  const result: Record<string, Record<string, string>> = {};

  Object.entries(locales).forEach(([lang, json]) => {
    const flat = flattenObject(json);
    Object.entries(flat).forEach(([key, value]) => {
      if (!result[key]) result[key] = {};
      result[key][lang] = value;
    });
  });

  return result;
}

export function buildSheetRows(
  flatLocales: Record<string, Record<string, string>>
) {
  const languages = Array.from(
    new Set(Object.values(flatLocales).flatMap((v) => Object.keys(v)))
  );

  const rows: string[][] = [];
  rows.push(["key", ...languages]);

  Object.entries(flatLocales).forEach(([key, values]) => {
    rows.push([key, ...languages.map((lang) => values[lang] ?? "")]);
  });

  return rows;
}
