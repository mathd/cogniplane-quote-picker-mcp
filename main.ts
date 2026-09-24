import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import cors from "cors";
import { networkInterfaces } from "node:os";
import type { Request, Response } from "express";
import { createServer } from "./server.ts";

function allowedHosts(): string[] {
  const hosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4") hosts.add(address.address);
    }
  }
  for (const host of (process.env.MCP_ALLOWED_HOSTS ?? "").split(",")) {
    if (host.trim()) hosts.add(host.trim());
  }
  return [...hosts];
}

// Stateless Streamable HTTP: one server and one transport per request.
export function createHttpApp() {
  const hosts = allowedHosts();
  const app = createMcpExpressApp({ host: "0.0.0.0", allowedHosts: hosts, allowedOrigins: hosts });
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
    createHttpApp().listen(port, "0.0.0.0", (err) => {
      if (err) throw err;
      console.log(`MCP server listening on port ${port} (all IPv4 interfaces)`);
    });
  }
}
