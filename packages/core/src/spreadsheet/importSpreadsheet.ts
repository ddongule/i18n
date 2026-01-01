import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { unflatten } from "../utils/objectTree"; // 이미 있거나 flatten 함수와 같이 있으면 그거 쓰면 됨

export interface ImportSpreadsheetOptions {
  file: string;
  localesDir: string;
  override?: boolean;
  dryRun?: boolean;
}

export async function importSpreadsheet({
  file,
  localesDir,
  override = false,
  dryRun = false,
}: ImportSpreadsheetOptions) {
  const workbook = XLSX.readFile(file);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(sheet);

  const languages = Object.keys(rows[0]).filter((k) => k !== "key");

  const localeMaps: Record<string, Record<string, any>> = {};

  rows.forEach((r) => {
    const key = r.key;
    if (!key) return;

    languages.forEach((lang) => {
      if (!localeMaps[lang]) localeMaps[lang] = {};
      localeMaps[lang][key] = r[lang] ?? "";
    });
  });

  if (dryRun) {
    console.log("DRY RUN RESULT", localeMaps);
    return;
  }

  if (!fs.existsSync(localesDir)) fs.mkdirSync(localesDir, { recursive: true });

  languages.forEach((lang) => {
    const target = path.join(localesDir, `${lang}.json`);

    let existing = {};
    if (fs.existsSync(target) && !override) {
      existing = JSON.parse(fs.readFileSync(target, "utf-8"));
    }

    const merged = {
      ...existing,
      ...unflatten(localeMaps[lang]),
    };

    fs.writeFileSync(target, JSON.stringify(merged, null, 2));
  });
}
