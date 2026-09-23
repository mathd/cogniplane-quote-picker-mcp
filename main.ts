import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import cors from "cors";
import type { Request, Response } from "express";
import { createServer } from "./server.ts";

// Stateless Streamable HTTP: one server and one transport per request.
export function createHttpApp() {
  const app = createMcpExpressApp();
  app.use(cors());

  app.all("/mcp", async (req: Request, res: Response) => {
    const server = createServer();
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP error:", error);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
      }
    }
  });

  return app;
}

if (import.meta.main) {
  if (process.argv.includes("--stdio")) {
    await createServer().connect(new StdioServerTransport());
  } else {
    const port = Number(process.env.PORT ?? 3108);
    createHttpApp().listen(port, "127.0.0.1", (err) => {
      if (err) throw err;
      console.log(`MCP server listening on http://localhost:${port}/mcp`);
    });
  }
}
