import chalk from "chalk";
import path from "path";
import { importGoogleSheet } from "../../core/src/google/importGoogleSheet";
import { importSpreadsheet } from "../../core/src/spreadsheet/importSpreadsheet";

export function importCommand(program: any) {
  program
    .command("import")
    .description("import translations from spreadsheet")
    .option("--file <path>", "xlsx file to import")
    .option("--override", "replace existing translations", false)
    .option("--dry-run", "simulate only", false)

    .option("--sheet <id>", "google sheet id")
    .option("--sheet-name <name>", "Google Sheet tab name", "Sheet1")

    .option(
      "--cred <path>",
      "google credentials path",
      "./credentials/google-service-account.json"
    )

    .action(async (options: any) => {
      const { file, sheet } = options;

      //
      // GOOGLE SHEET MODE
      //
      if (sheet) {
        const range = options.range || `${options.sheetName}!A1:Z9999`;

        console.log(
          chalk.blue(
            `\n📥 Importing from Google Sheet (${options.sheetName})...\n`
          )
        );

        try {
          await importGoogleSheet({
            sheetId: options.sheet,
            range,
            credentialsPath: options.cred, // 🔥 FIX
            dryRun: options.dryRun,
          });

          console.log(chalk.green("\n🎉 Google Sheet Import Completed!\n"));
        } catch (e: any) {
          console.error(chalk.red("\n❌ Google Sheet Import Failed\n"));
          console.error(e?.message || e);
        }

        return;
      }

      //
      // XLSX MODE
      //
      if (!file) {
        console.log(chalk.red("❌ --file is required"));
        return;
      }

      const fullPath = path.join(process.cwd(), file);

      console.log(chalk.blue("\n📥 Importing translations..."));
      console.log(chalk.gray(`File: ${fullPath}`));

      try {
        await importSpreadsheet({
          file: options.file,
          override: options.override,
          dryRun: options.dryRun,
        });

        console.log(chalk.green("\n🎉 Import completed!\n"));
      } catch (e: any) {
        console.error(chalk.red("\n❌ Import failed"));
        console.error(e.message || e);
      }
    });
}
