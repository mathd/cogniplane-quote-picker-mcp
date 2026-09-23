# Quote picker MCP App

A demo MCP App. It shows three fictional support desk quotes for 25 seats. The user turns on "EU data residency" and "SOC 2" requirements, and the cards show at once which vendors qualify. The filter runs in the iframe. It does not call the model or the server. The user then picks a qualifying vendor and clicks **Draft decision**. The app sends a visible user message to the chat with `app.sendMessage`. The message names the vendor, the active requirements, and the monthly cost, and asks for a short decision draft.

| Vendor     | Per seat | Monthly (25 seats) | EU data | SOC 2 | 24/7 phone | Term      |
| ---------- | -------- | ------------------ | ------- | ----- | ---------- | --------- |
| HelpHarbor | $38      | $950               | yes     | yes   | no         | 12 months |
| TicketTide | $32      | $800               | no      | yes   | yes        | 24 months |
| DeskNimbus | $44      | $1,100             | yes     | no    | yes        | 12 months |

The data lives in `src/quotes.ts`. The server and the UI both import that file, so the numbers are the same everywhere. The app makes no purchases and connects to no vendor.

## Run

Needs Node 24. Node runs the `.ts` files directly (type stripping), so there is no server build step.

```sh
npm install
npm run build          # typecheck, then bundle the UI into dist/index.html
npm start              # HTTP on http://localhost:3108/mcp (set PORT to change it)
npm run start:stdio    # stdio transport
```

Run `npm run build` again after you change the UI. The server reads `dist/index.html` on each `resources/read`.

The HTTP server listens on 127.0.0.1 only. The SDK rejects requests with a non-localhost `Origin` header (HTTP 403).

To see the UI in a host, use the `basic-host` example from [ext-apps](https://github.com/modelcontextprotocol/ext-apps) (`examples/basic-host`, `npm start`, then open http://localhost:8080). Or add the stdio command to a desktop MCP client:

```json
{ "command": "node", "args": ["/absolute/path/to/main.ts", "--stdio"] }
```

## MCP shape

- Tool `show_quote_picker`: no input, `annotations.readOnlyHint: true`, `_meta.ui.resourceUri: "ui://quote-picker/app.html"`. The result has a text summary of all three quotes for the model and `structuredContent: { seats, quotes }` for the app.
- Resource `ui://quote-picker/app.html`: MIME type `text/html;profile=mcp-app` (`RESOURCE_MIME_TYPE`). It is one HTML file with inline JS and CSS, with no remote fonts or assets.

## Test

```sh
npm run typecheck
npm test               # builds the UI, then runs node --test
```

`test/quotes.test.ts` checks the fixture, the filter, the summary text and the decision message. `test/server.test.ts` starts the HTTP app on a random port and sends `initialize`, `tools/list`, `tools/call` and `resources/read`.

### Manual protocol check

With `npm start` running:

```sh
mcp() { curl -s http://localhost:3108/mcp -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' -d "$1"; echo; }

mcp '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
mcp '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
mcp '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"show_quote_picker","arguments":{}}}'
mcp '{"jsonrpc":"2.0","id":4,"method":"resources/read","params":{"uri":"ui://quote-picker/app.html"}}' | cut -c1-300
```

The server is stateless: each HTTP request gets a new server instance, so the later calls do not need a session ID. Each reply is one SSE `message` event.

## Files

- `main.ts`: HTTP (`createMcpExpressApp` + `NodeStreamableHTTPServerTransport`) and stdio entry point
- `server.ts`: `registerAppTool` and `registerAppResource`
- `src/quotes.ts`: fixture, filter, summary text and decision message
- `index.html`, `src/mcp-app.ts`, `src/mcp-app.css`: the UI (`App` from `@modelcontextprotocol/ext-apps`)
- `vite.config.ts`: single-file bundle with `vite-plugin-singlefile`
- `test/`: `node:test` tests
