import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { QUOTES, SEATS, quoteSummary, type QuotePickerData } from "./src/quotes.ts";

export const TOOL_NAME = "show_quote_picker";
export const RESOURCE_URI = "ui://quote-picker/app.html";
export function createServer(loadHtml: () => Promise<string>): McpServer {
  const server = new McpServer({ name: "Quote Picker", version: "1.0.0" });

  registerAppTool(
    server,
    TOOL_NAME,
    {
      title: "Show quote picker",
      description:
        "Shows three fictional support desk vendor quotes for 25 seats. The user filters them by EU data residency and SOC 2, picks one, and asks for a decision draft.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
      _meta: { ui: { resourceUri: RESOURCE_URI } },
    },
    async () => {
      const data: QuotePickerData = { seats: SEATS, quotes: QUOTES };
      return {
        content: [{ type: "text", text: quoteSummary(data) }],
        structuredContent: { ...data },
      };
    },
  );

  registerAppResource(
    server,
    "Quote picker",
    RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [
        { uri: RESOURCE_URI, mimeType: RESOURCE_MIME_TYPE, text: await loadHtml() },
      ],
    }),
  );

  return server;
}
