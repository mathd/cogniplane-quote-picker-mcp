// Protocol round trip over Streamable HTTP. Needs dist/index.html (npm test builds it).
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { createHttpApp } from "../main.ts";
import { RESOURCE_URI, TOOL_NAME } from "../server.ts";

let server: ReturnType<ReturnType<typeof createHttpApp>["listen"]>;
let url: string;
let nextId = 1;

before(async () => {
  server = createHttpApp().listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`;
});
after(() => server.close());

async function rpc(method: string, params: object = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
  });
  assert.equal(res.status, 200);
  const body = await res.text();
  // The transport answers with one SSE event; take its data line.
  const data = body.split("\n").find((l) => l.startsWith("data: "));
  const msg = JSON.parse(data ? data.slice(6) : body);
  assert.equal(msg.error, undefined, JSON.stringify(msg.error));
  return msg.result;
}

test("initialize", async () => {
  const r = await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "0" },
  });
  assert.equal(r.serverInfo.name, "Quote Picker");
  assert.ok(r.capabilities.tools && r.capabilities.resources);
});

test("tools/list links the tool to the UI resource", async () => {
  const { tools } = await rpc("tools/list");
  assert.equal(tools.length, 1);
  assert.equal(tools[0].name, TOOL_NAME);
  assert.equal(tools[0]._meta.ui.resourceUri, RESOURCE_URI);
  assert.equal(tools[0].annotations.readOnlyHint, true);
});

test("tools/call returns text for the model and structuredContent for the app", async () => {
  const r = await rpc("tools/call", { name: TOOL_NAME, arguments: {} });
  assert.match(r.content[0].text, /HelpHarbor.*\$950\/month/);
  assert.equal(r.structuredContent.seats, 25);
  assert.deepEqual(r.structuredContent.quotes.map((q: { monthlyTotal: number }) => q.monthlyTotal), [950, 800, 1100]);
});

test("resources/read returns the bundled single-file HTML", async () => {
  const { contents } = await rpc("resources/read", { uri: RESOURCE_URI });
  assert.equal(contents[0].mimeType, RESOURCE_MIME_TYPE);
  assert.equal(RESOURCE_MIME_TYPE, "text/html;profile=mcp-app");
  assert.match(contents[0].text, /Draft decision/);
  assert.doesNotMatch(contents[0].text, /<script[^>]+src=|<link[^>]+href=/, "no external assets");
});
