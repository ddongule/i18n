#!/usr/bin/env node

import { Command } from "commander";
import { loadLocales } from "i18n-mcp-core";
import path from "path";

const program = new Command();

program.name("i18n-mcp").description("i18n automation tool").version("0.0.1");

program
  .command("scan")
  .description("scan project & generate report")
  .action(() => {
    console.log("Running i18n scan...");

    const locales = loadLocales(path.join(process.cwd(), "locales"));

    console.log(locales);
  });

program.parse();
