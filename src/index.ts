#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createTasksMCP } from "./server.js";

async function main() {
  const { server } = createTasksMCP();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[tasks-mcp] Server running on stdio");
}

main().catch((error) => {
  console.error("[tasks-mcp] Fatal error:", error);
  process.exit(1);
});
