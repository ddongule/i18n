import { Command } from "commander";
import { scanCommand } from "./commands/scan";
import { importCommand } from "./commands/import";

const program = new Command();

program.name("i18n-mcp").description("i18n automation tool").version("0.0.1");

scanCommand(program);

importCommand(program);

program.parse();
