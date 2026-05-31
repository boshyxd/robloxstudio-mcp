import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import http from 'http';
import { createHttpServer, listenWithRetry, isPortInUseError, TOOL_HANDLERS } from './http-server.js';
import { RobloxStudioTools } from './tools/index.js';
import { BridgeService } from './bridge-service.js';
import { ProxyBridgeService } from './proxy-bridge-service.js';
import type { ToolDefinition } from './tools/definitions.js';

export interface ServerConfig {
  name: string;
  version: string;
  tools: ToolDefinition[];
}

export class RobloxStudioMCPServer {
  private server: Server;
  private tools: RobloxStudioTools;
  private bridge: BridgeService;
  private allowedToolNames: Set<string>;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    this.allowedToolNames = new Set(config.tools.map(t => t.name));

    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.bridge = new BridgeService();
    this.tools = new RobloxStudioTools(this.bridge);
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.config.tools.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!this.allowedToolNames.has(name)) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }

      const handler = TOOL_HANDLERS[name];
      if (!handler) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }

      try {
        return await handler(this.tools, args ?? {});
      } catch (error) {
        if (error instanceof McpError) throw error;
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  async run() {
    const basePort = process.env.ROBLOX_STUDIO_PORT ? parseInt(process.env.ROBLOX_STUDIO_PORT) : 58741;
    const host = process.env.ROBLOX_STUDIO_HOST || '0.0.0.0';
    let bridgeMode: 'primary' | 'proxy' = 'primary';
    let httpHandle: http.Server | undefined;
    let primaryApp: ReturnType<typeof createHttpServer> | undefined;
    let boundPort = 0;
    let promotionInterval: ReturnType<typeof setInterval> | undefined;

    // Try to bind as primary
    try {
      primaryApp = createHttpServer(this.tools, this.bridge, this.allowedToolNames, this.config);
      // Only the base port is a valid primary: the Studio plugin polls that one
      // port. If it is already taken (another agent owns the bridge) we must not
      // bind a second primary on 58742+ that no plugin will ever poll — fall
      // through to proxy mode instead so every agent shares the one bridge.
      const result = await listenWithRetry(primaryApp, host, basePort, 1);
      httpHandle = result.server;
      boundPort = result.port;
      console.error(`HTTP server listening on ${host}:${boundPort} for Studio plugin (primary mode)`);
      console.error(`Streamable HTTP MCP endpoint: http://localhost:${boundPort}/mcp`);
    } catch (err) {
      if (!isPortInUseError(err)) {
        // A real bind failure (permissions, bad host, ...) — surface it instead
        // of silently entering proxy mode and forwarding to a primary the base
        // port never actually accepted.
        console.error(`Fatal: could not bind primary HTTP server: ${(err as Error).message}`);
        throw err;
      }
      // Base port already owned by another agent — share its bridge via proxy
      // mode instead of binding a second primary the plugin would never poll.
      console.error(`Could not bind primary HTTP server: ${(err as Error).message}`);
      bridgeMode = 'proxy';
      primaryApp = undefined;
      const proxyBridge = new ProxyBridgeService(`http://localhost:${basePort}`);
      this.bridge = proxyBridge;
      this.tools = new RobloxStudioTools(this.bridge);
      console.error(`Port ${basePort} already in use — entering proxy mode (forwarding to the primary on localhost:${basePort})`);

      // Periodically try to promote to primary if the port frees up
      const promotionIntervalMs = parseInt(process.env.ROBLOX_STUDIO_PROXY_PROMOTION_INTERVAL_MS || '5000');
      promotionInterval = setInterval(async () => {
        try {
          this.bridge = new BridgeService();
          this.tools = new RobloxStudioTools(this.bridge);
          primaryApp = createHttpServer(this.tools, this.bridge, this.allowedToolNames, this.config);
          const result = await listenWithRetry(primaryApp, host, basePort, 1);
          httpHandle = result.server;
          boundPort = result.port;
          bridgeMode = 'primary';
          (primaryApp as any).setMCPServerActive(true);
          console.error(`Promoted from proxy to primary on port ${boundPort}`);
          if (promotionInterval) clearInterval(promotionInterval);
        } catch {
          // Still can't bind — stay in proxy mode, restore proxy bridge
          this.bridge = new ProxyBridgeService(`http://localhost:${basePort}`);
          this.tools = new RobloxStudioTools(this.bridge);
          primaryApp = undefined;
        }
      }, promotionIntervalMs);
    }

    // Legacy port 3002 for old plugins
    const LEGACY_PORT = 3002;
    let legacyHandle: http.Server | undefined;
    let legacyApp: ReturnType<typeof createHttpServer> | undefined;
    if (boundPort !== LEGACY_PORT && bridgeMode === 'primary') {
      legacyApp = createHttpServer(this.tools, this.bridge, this.allowedToolNames, this.config);
      try {
        const result = await listenWithRetry(legacyApp, host, LEGACY_PORT, 1);
        legacyHandle = result.server;
        console.error(`Legacy HTTP server also listening on ${host}:${LEGACY_PORT} for old plugins`);
        (legacyApp as any).setMCPServerActive(true);
      } catch {
        console.error(`Legacy port ${LEGACY_PORT} in use, skipping backward-compat listener`);
      }
    }

    // Start stdio MCP transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`${this.config.name} v${this.config.version} running on stdio`);

    if (primaryApp) {
      (primaryApp as any).setMCPServerActive(true);
    }

    console.error(bridgeMode === 'primary'
      ? 'MCP server marked as active (primary mode)'
      : 'MCP server active in proxy mode — forwarding requests to primary');

    console.error('Waiting for Studio plugin to connect...');

    const activityInterval = setInterval(() => {
      if (primaryApp) (primaryApp as any).trackMCPActivity();
      if (legacyApp) (legacyApp as any).trackMCPActivity();

      if (bridgeMode === 'primary' && primaryApp) {
        const pluginConnected = (primaryApp as any).isPluginConnected();
        const mcpActive = (primaryApp as any).isMCPServerActive();

        if (pluginConnected && mcpActive) {
          // All good
        } else if (pluginConnected && !mcpActive) {
          console.error('Studio plugin connected, but MCP server inactive');
        } else if (!pluginConnected && mcpActive) {
          console.error('MCP server active, waiting for Studio plugin...');
        } else {
          console.error('Waiting for connections...');
        }
      }
    }, 5000);

    const cleanupInterval = setInterval(() => {
      this.bridge.cleanupOldRequests();
      this.bridge.cleanupStaleInstances();
    }, 5000);

    const shutdown = async () => {
      console.error('Shutting down MCP server...');
      clearInterval(activityInterval);
      clearInterval(cleanupInterval);
      if (promotionInterval) clearInterval(promotionInterval);
      await this.server.close().catch(() => {});
      if (httpHandle) httpHandle.close();
      if (legacyHandle) legacyHandle.close();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGHUP', shutdown);

    process.stdin.on('end', shutdown);
    process.stdin.on('close', shutdown);
  }
}
