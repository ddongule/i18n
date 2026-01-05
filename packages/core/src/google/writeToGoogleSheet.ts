import { google } from "googleapis";
import fs from "fs";
import path from "path";

interface WriteOptions {
  sheetId: string;
  sheetName: string;
  rows: string[][];
  credentialsPath?: string;
}

export async function writeToGoogleSheet({
  sheetId,
  sheetName,
  rows,
  credentialsPath = path.join(process.cwd(), "google-credentials.json"),
}: WriteOptions) {
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Google credentials not found: ${credentialsPath}`);
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // clear
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `${sheetName}!A:Z`,
  });

  // write
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}
