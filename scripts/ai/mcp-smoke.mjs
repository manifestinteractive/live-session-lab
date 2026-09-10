import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { parse } from 'smol-toml';

const root = fileURLToPath(new URL('../../', import.meta.url));
const config = parse(await readFile(resolve(root, '.codex/config.toml'), 'utf8'));
const createClient = () => new Client({ name: 'live-session-lab-smoke', version: '0.0.0' });

if (process.argv.includes('--docs')) {
  for (const name of ['livekit_docs', 'openaiDeveloperDocs']) {
    const client = createClient();
    try {
      await client.connect(new StreamableHTTPClientTransport(new URL(config.mcp_servers[name].url)), { timeout: 30_000 });
      const { tools } = await client.listTools({}, { timeout: 30_000 });
      assert(tools.length > 0, `${name}: no tools returned`);
      console.log(`${name}: connected, ${tools.length} tools discovered.`);
    } finally {
      await client.close();
    }
  }
} else {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
    response.end('<!doctype html><html lang="en"><meta charset="utf-8"><title>AI tooling check</title><main><h1>AI tooling check</h1><p>This is a browser tooling fixture. The application is not built.</p><button type="button" onclick="this.textContent=\'Interaction confirmed\'">Check interaction</button></main></html>');
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const client = createClient();
  const output = resolve(root, 'artifacts/playwright');
  await mkdir(output, { recursive: true });
  const call = async (name, args = {}) => {
    const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 60_000 });
    assert(!result.isError, `${name}: ${JSON.stringify(result.content)}`);
    return result;
  };
  try {
    const { command, args } = config.mcp_servers.playwright;
    await client.connect(new StdioClientTransport({ command, args, cwd: root, stderr: 'inherit' }), { timeout: 30_000 });
    const { tools } = await client.listTools();
    assert(tools.some((tool) => tool.name === 'browser_take_screenshot'));
    await call('browser_navigate', { url: `http://127.0.0.1:${server.address().port}` });
    const snapshot = await call('browser_snapshot');
    assert(JSON.stringify(snapshot).includes('AI tooling check'));
    const snapshotText = snapshot.content.filter((item) => item.type === 'text').map((item) => item.text).join('\n');
    const button = snapshotText.split('\n').find((line) => line.includes('button "Check interaction"'));
    const ref = button?.match(/\[ref=([^\]]+)\]/)?.[1];
    assert(ref, 'Snapshot did not expose a reference for the fixture button');
    await call('browser_click', { element: 'Check interaction button', target: ref });
    const after = await call('browser_snapshot');
    assert(JSON.stringify(after).includes('Interaction confirmed'));
    const screenshot = resolve(output, 'tooling-smoke.png');
    await call('browser_take_screenshot', { type: 'png', filename: screenshot, fullPage: true, scale: 'css' });
    const png = await readFile(screenshot);
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    console.log('Playwright MCP passed: connection, navigation, accessibility snapshot, interaction, and PNG capture.');
    console.log('Evidence: artifacts/playwright/tooling-smoke.png. This does not validate the application or real media.');
  } finally {
    await client.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
