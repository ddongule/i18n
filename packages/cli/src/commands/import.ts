import chalk from "chalk";
import path from "path";
import { importSpreadsheet } from "i18n-mcp-core";

export function importCommand(program: any) {
  program
    .command("import")
    .description("import translations from spreadsheet")
    .option("--file <path>", "xlsx file to import")
    .option("--override", "replace existing translations", false)
    .option("--dry-run", "simulate only", false)
    .action(async (options: any) => {
      const { file, override, dryRun } = options;

      if (!file) {
        console.log(chalk.red("❌ --file is required"));
        return;
      }

      const fullPath = path.join(process.cwd(), file);

      console.log(chalk.blue("\n📥 Importing translations..."));
      console.log(chalk.gray(`File: ${fullPath}`));

      try {
        await importSpreadsheet({
          file: fullPath,
          override,
          dryRun,
          localesDir: path.join(process.cwd(), "locales"),
        });

        console.log(chalk.green("\n🎉 Import completed!\n"));
      } catch (e: any) {
        console.error(chalk.red("\n❌ Import failed"));
        console.error(e.message || e);
      }
    });
}
