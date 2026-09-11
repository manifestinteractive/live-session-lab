import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { parse } from "smol-toml";

const root = fileURLToPath(new URL("../../", import.meta.url));
const config = parse(await readFile(resolve(root, ".codex/config.toml"), "utf8"));
const { command, args } = config.mcp_servers.shadcn;
const client = new Client({ name: "live-session-lab-shadcn-smoke", version: "0.0.0" });

try {
  await client.connect(new StdioClientTransport({ command, args, cwd: root, stderr: "inherit" }), {
    timeout: 30_000,
  });
  const { tools } = await client.listTools({}, { timeout: 30_000 });
  assert(
    tools.some((tool) => tool.name === "search_items_in_registries"),
    "Registry search tool is missing",
  );
  const result = await client.callTool(
    {
      name: "search_items_in_registries",
      arguments: { registries: ["@shadcn"], query: "button", limit: 5 },
    },
    undefined,
    { timeout: 60_000 },
  );
  assert(!result.isError, `Registry search failed: ${JSON.stringify(result.content)}`);
  const content = result.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");
  assert.match(
    content,
    /^- button \(registry:ui\) \[@shadcn\]/m,
    "The official registry did not return the button component",
  );
  console.log(
    `shadcn MCP passed: connection, ${tools.length} tools discovered, and official button registry search.`,
  );
  console.log("Read-only registry check complete.");
} finally {
  await client.close();
}
