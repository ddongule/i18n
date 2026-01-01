function flatten(obj: any, parent = "", result: any = {}) {
  for (const key in obj) {
    const value = obj[key];
    const fullKey = parent ? `${parent}.${key}` : key;

    if (typeof value === "object" && value !== null) {
      flatten(value, fullKey, result);
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

export function analyzeDiff(
  locales: Record<string, Record<string, any>>,
  codeKeys: string[],
  baseLang: string
) {
  const base = locales[baseLang];

  if (!base) {
    throw new Error(`Base locale "${baseLang}" not found`);
  }

  const flatBase = flatten(base);
  const baseKeys = Object.keys(flatBase);

  const missing = codeKeys.filter((k) => !baseKeys.includes(k));
  const unused = baseKeys.filter((k) => !codeKeys.includes(k));

  return {
    baseLang,
    totalLocaleKeys: baseKeys.length,
    totalCodeKeys: codeKeys.length,
    missing,
    unused,
  };
}
