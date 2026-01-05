import fs from "fs";
import path from "path";
import { google } from "googleapis";

interface ImportOptions {
  sheetId: string;
  range?: string;
  credentialsPath?: string;
  sheetName?: string;
  dryRun?: boolean;
}

function flattenToNested(obj: Record<string, string>) {
  const result: Record<string, any> = {};

  Object.entries(obj).forEach(([key, value]) => {
    const parts = key.split(".");
    let cur = result;

    parts.forEach((p, idx) => {
      if (!cur[p]) cur[p] = {};
      if (idx === parts.length - 1) cur[p] = value;
      else cur = cur[p];
    });
  });

  return result;
}

export async function importGoogleSheet(options: ImportOptions) {
  const {
    sheetId,
    sheetName = "Sheet1",
    credentialsPath = path.join(process.cwd(), "google-credentials.json"),
    dryRun = false,
  } = options;

  const range = options.range || `${sheetName}!A1:Z9999`;

  if (!fs.existsSync(credentialsPath)) {
    throw new Error(
      `Google credentials file not found: ${credentialsPath}\n` +
        "Download from Google Cloud → Service Accounts → Keys"
    );
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const rows = res.data.values;

  if (!rows || rows.length === 0) {
    throw new Error(`Sheet is empty or range returned no data: ${range}`);
  }

  // ------------------------------
  //  🔥 Header 자동 감지
  // ------------------------------
  let headerRowIndex = -1;
  let header: string[] = [];

  rows.forEach((row, idx) => {
    if (!row) return;
    const upper = row.map((c: string) => (c || "").toUpperCase());
    if (upper.includes("KEY")) {
      headerRowIndex = idx;
      header = row;
    }
  });

  if (headerRowIndex === -1) {
    throw new Error(
      `No header row found.\nExpected something like:\nKEY | en | ko`
    );
  }

  console.log("\n📌 Detected Header Row:", headerRowIndex + 1);

  // KEY column 위치 찾기
  const keyIndex = header.map((c) => (c || "").toUpperCase()).indexOf("KEY");

  if (keyIndex === -1) {
    throw new Error("KEY column not found next to header row.");
  }

  // 언어 컬럼 인덱스 + 이름 수집
  const languageColumns: { lang: string; index: number }[] = [];

  header.forEach((col, idx) => {
    if (!col) return;
    if (idx === keyIndex) return;

    const lang = col.trim();
    if (lang) {
      languageColumns.push({ lang, index: idx });
    }
  });

  if (languageColumns.length === 0) {
    throw new Error(
      "No language columns found. Need something like: KEY | en | ko"
    );
  }

  console.log("🌍 Languages:", languageColumns.map((l) => l.lang).join(", "));

  // ------------------------------
  //  🔥 데이터 파싱
  // ------------------------------
  const dataRows = rows.slice(headerRowIndex + 1);
  const flatLocales: Record<string, any> = {};

  languageColumns.forEach((l) => (flatLocales[l.lang] = {}));

  dataRows.forEach((row) => {
    if (!row) return;

    const key = row[keyIndex];
    if (!key) return;

    languageColumns.forEach(({ lang, index }) => {
      const value = row[index] ?? "";
      flatLocales[lang][key] = value;
    });
  });

  const nestedLocales: Record<string, any> = {};
  languageColumns.forEach(({ lang }) => {
    nestedLocales[lang] = flattenToNested(flatLocales[lang]);
  });

  // ------------------------------
  //  🔥 Dry Run
  // ------------------------------
  if (dryRun) {
    console.log("\n🧪 Dry Run Mode — No files written.\n");
    console.log(JSON.stringify(nestedLocales, null, 2));
    return nestedLocales;
  }

  // ------------------------------
  //  🔥 Write JSON
  // ------------------------------
  const localesDir = path.join(process.cwd(), "locales");
  if (!fs.existsSync(localesDir)) fs.mkdirSync(localesDir);

  console.log("\n✍️ Writing locale files...\n");

  languageColumns.forEach(({ lang }) => {
    const fp = path.join(localesDir, `${lang}.json`);
    console.log("WRITE →", fp);
    fs.writeFileSync(fp, JSON.stringify(nestedLocales[lang], null, 2));
  });

  console.log("\n🎉 Import Completed Successfully!\n");

  return nestedLocales;
}
