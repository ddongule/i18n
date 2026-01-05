import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { importI18nFromSheetTool } from "../tools/importFromSheet";
import { exportI18nToSheetTool } from "../tools/exportToSheet";

import { scanI18nTool } from "../tools/scan";
import { fixI18nTool } from "../tools/fixI18nTool";
import { createPrTool } from "../tools/createPrTool";

const server = new Server(
  {
    name: "i18n-mcp",
    version: "0.1.0",
  },

  {
    tools: [
      scanI18nTool,
      fixI18nTool,
      createPrTool,
      importI18nFromSheetTool,
      exportI18nToSheetTool,
    ],
  }
);

const transport = new StdioTransport();
await server.connect(transport);
