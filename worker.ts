import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/server";
import appHtml from "./dist/index.html";
import { createServer } from "./server.ts";

export default {
  async fetch(request: Request): Promise<Response> {
    if (!["/mcp", "/mcp/"].includes(new URL(request.url).pathname)) {
      return new Response("Not found", { status: 404 });
    }

    const server = createServer(async () => appHtml);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    try {
      await server.connect(transport);
      return await transport.handleRequest(request);
    } catch (error) {
      console.error("MCP error:", error);
      return Response.json(
        { jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null },
        { status: 500 },
      );
    } finally {
      await transport.close();
      await server.close();
    }
  },
};
