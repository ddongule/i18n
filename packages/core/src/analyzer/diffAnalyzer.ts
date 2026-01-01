export interface DiffResult {
  baseLang: string;
  missing: string[];
  unused: string[];
  totalLocaleKeys: number;
  totalCodeKeys: number;
}

export function analyzeDiff(
  locales: Record<string, Record<string, any>>,
  codeKeys: string[],
  baseLang: string
): DiffResult {
  const base = locales[baseLang];

  if (!base) {
    throw new Error(`Base locale "${baseLang}" not found in locales folder`);
  }

  // 🟢 base는 이미 flat map이라고 가정
  const baseKeys = Object.keys(base);

  // ❗ Missing: 코드에서는 쓰는데, 기준 locale에 없는 키
  const missing = codeKeys.filter((k) => !baseKeys.includes(k));

  // 🧹 Unused: 기준 locale에는 있는데, 코드에서는 안 쓰는 키
  const unused = baseKeys.filter((k) => !codeKeys.includes(k));

  return {
    baseLang,
    missing,
    unused,
    totalLocaleKeys: baseKeys.length,
    totalCodeKeys: codeKeys.length,
  };
}
