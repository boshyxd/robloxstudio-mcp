import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import http from 'http';
import { createHttpServer, listenWithRetry } from './http-server.js';
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
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
      }

      try {
        switch (name) {

          case 'get_file_tree':
            return await this.tools.getFileTree((args as any)?.path || '');
          case 'search_files':
            return await this.tools.searchFiles((args as any)?.query as string, (args as any)?.searchType || 'name');

          case 'get_place_info':
            return await this.tools.getPlaceInfo();
          case 'get_services':
            return await this.tools.getServices((args as any)?.serviceName);
          case 'search_objects':
            return await this.tools.searchObjects((args as any)?.query as string, (args as any)?.searchType || 'name', (args as any)?.propertyName);

          case 'get_instance_properties':
            return await this.tools.getInstanceProperties((args as any)?.instancePath as string, (args as any)?.excludeSource);
          case 'get_instance_children':
            return await this.tools.getInstanceChildren((args as any)?.instancePath as string);
          case 'search_by_property':
            return await this.tools.searchByProperty((args as any)?.propertyName as string, (args as any)?.propertyValue as string);
          case 'get_class_info':
            return await this.tools.getClassInfo((args as any)?.className as string);

          case 'get_project_structure':
            return await this.tools.getProjectStructure((args as any)?.path, (args as any)?.maxDepth, (args as any)?.scriptsOnly);

          case 'set_property':
            return await this.tools.setProperty((args as any)?.instancePath as string, (args as any)?.propertyName as string, (args as any)?.propertyValue);

          case 'set_properties':
            return await this.tools.setProperties((args as any)?.instancePath as string, (args as any)?.properties);

          case 'mass_set_property':
            return await this.tools.massSetProperty((args as any)?.paths as string[], (args as any)?.propertyName as string, (args as any)?.propertyValue);
          case 'mass_get_property':
            return await this.tools.massGetProperty((args as any)?.paths as string[], (args as any)?.propertyName as string);

          case 'create_object':
          case 'create_object_with_properties':
            return await this.tools.createObject((args as any)?.className as string, (args as any)?.parent as string, (args as any)?.name, (args as any)?.properties);
          case 'mass_create_objects':
          case 'mass_create_objects_with_properties':
            return await this.tools.massCreateObjects((args as any)?.objects);
          case 'delete_object':
            return await this.tools.deleteObject((args as any)?.instancePath as string);

          case 'create_ui_tree':
            return await this.tools.createUITree((args as any)?.parentPath as string, (args as any)?.tree);

          case 'smart_duplicate':
            return await this.tools.smartDuplicate((args as any)?.instancePath as string, (args as any)?.count as number, (args as any)?.options);
          case 'mass_duplicate':
            return await this.tools.massDuplicate((args as any)?.duplications);

          case 'set_calculated_property':
            return await this.tools.setCalculatedProperty((args as any)?.paths as string[], (args as any)?.propertyName as string, (args as any)?.formula as string, (args as any)?.variables);

          case 'set_relative_property':
            return await this.tools.setRelativeProperty((args as any)?.paths as string[], (args as any)?.propertyName as string, (args as any)?.operation, (args as any)?.value, (args as any)?.component);

          case 'grep_scripts':
            return await this.tools.grepScripts((args as any)?.pattern as string, {
              caseSensitive: (args as any)?.caseSensitive,
              usePattern: (args as any)?.usePattern,
              contextLines: (args as any)?.contextLines,
              maxResults: (args as any)?.maxResults,
              maxResultsPerScript: (args as any)?.maxResultsPerScript,
              filesOnly: (args as any)?.filesOnly,
              path: (args as any)?.path,
              classFilter: (args as any)?.classFilter,
            });

          case 'get_script_source':
            return await this.tools.getScriptSource((args as any)?.instancePath as string, (args as any)?.startLine, (args as any)?.endLine);
          case 'set_script_source':
            return await this.tools.setScriptSource((args as any)?.instancePath as string, (args as any)?.source as string);

          case 'edit_script_lines':
            return await this.tools.editScriptLines((args as any)?.instancePath as string, (args as any)?.startLine as number, (args as any)?.endLine as number, (args as any)?.newContent as string);
          case 'insert_script_lines':
            return await this.tools.insertScriptLines((args as any)?.instancePath as string, (args as any)?.afterLine as number, (args as any)?.newContent as string);
          case 'delete_script_lines':
            return await this.tools.deleteScriptLines((args as any)?.instancePath as string, (args as any)?.startLine as number, (args as any)?.endLine as number);

          case 'get_attribute':
            return await this.tools.getAttribute((args as any)?.instancePath as string, (args as any)?.attributeName as string);
          case 'set_attribute':
            return await this.tools.setAttribute((args as any)?.instancePath as string, (args as any)?.attributeName as string, (args as any)?.attributeValue, (args as any)?.valueType);
          case 'get_attributes':
            return await this.tools.getAttributes((args as any)?.instancePath as string);
          case 'delete_attribute':
            return await this.tools.deleteAttribute((args as any)?.instancePath as string, (args as any)?.attributeName as string);

          case 'get_tags':
            return await this.tools.getTags((args as any)?.instancePath as string);
          case 'add_tag':
            return await this.tools.addTag((args as any)?.instancePath as string, (args as any)?.tagName as string);
          case 'remove_tag':
            return await this.tools.removeTag((args as any)?.instancePath as string, (args as any)?.tagName as string);
          case 'get_tagged':
            return await this.tools.getTagged((args as any)?.tagName as string);

          case 'get_selection':
            return await this.tools.getSelection();

          case 'execute_luau':
            return await this.tools.executeLuau((args as any)?.code as string);

          case 'start_playtest':
            return await this.tools.startPlaytest((args as any)?.mode as string);
          case 'stop_playtest':
            return await this.tools.stopPlaytest();
          case 'get_playtest_output':
            return await this.tools.getPlaytestOutput();

          case 'export_build':
            return await this.tools.exportBuild((args as any)?.instancePath as string, (args as any)?.outputId, (args as any)?.style);
          case 'create_build':
            return await this.tools.createBuild((args as any)?.id as string, (args as any)?.style as string, (args as any)?.palette, (args as any)?.parts, (args as any)?.bounds);
          case 'generate_build':
            return await this.tools.generateBuild((args as any)?.id as string, (args as any)?.style as string, (args as any)?.palette, (args as any)?.code as string, (args as any)?.seed);
          case 'import_build':
            return await this.tools.importBuild((args as any)?.buildData, (args as any)?.targetPath as string, (args as any)?.position);
          case 'list_library':
            return await this.tools.listLibrary((args as any)?.style);
          case 'search_materials':
            return await this.tools.searchMaterials((args as any)?.query, (args as any)?.maxResults);
          case 'get_build':
            return await this.tools.getBuild((args as any)?.id as string);
          case 'import_scene':
            return await this.tools.importScene((args as any)?.sceneData, (args as any)?.targetPath);

          case 'undo':
            return await this.tools.undo();
          case 'redo':
            return await this.tools.redo();

          case 'search_assets':
            return await this.tools.searchAssets((args as any)?.assetType as string, (args as any)?.query, (args as any)?.maxResults, (args as any)?.sortBy, (args as any)?.verifiedCreatorsOnly);
          case 'get_asset_details':
            return await this.tools.getAssetDetails((args as any)?.assetId as number);
          case 'get_asset_thumbnail':
            return await this.tools.getAssetThumbnail((args as any)?.assetId as number, (args as any)?.size);
          case 'insert_asset':
            return await this.tools.insertAsset((args as any)?.assetId as number, (args as any)?.parentPath, (args as any)?.position);
          case 'preview_asset':
            return await this.tools.previewAsset((args as any)?.assetId as number, (args as any)?.includeProperties, (args as any)?.maxDepth);
          case 'capture_screenshot':
            return await this.tools.captureScreenshot();

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
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
      primaryApp = createHttpServer(this.tools, this.bridge, this.allowedToolNames);
      const result = await listenWithRetry(primaryApp, host, basePort, 5);
      httpHandle = result.server;
      boundPort = result.port;
      console.error(`HTTP server listening on ${host}:${boundPort} for Studio plugin (primary mode)`);
    } catch {
      // All ports in use — fall back to proxy mode
      bridgeMode = 'proxy';
      primaryApp = undefined;
      const proxyBridge = new ProxyBridgeService(`http://localhost:${basePort}`);
      this.bridge = proxyBridge;
      this.tools = new RobloxStudioTools(this.bridge);
      console.error(`All ports ${basePort}-${basePort + 4} in use — entering proxy mode (forwarding to localhost:${basePort})`);

      // Periodically try to promote to primary if the port frees up
      const promotionIntervalMs = parseInt(process.env.ROBLOX_STUDIO_PROXY_PROMOTION_INTERVAL_MS || '5000');
      promotionInterval = setInterval(async () => {
        try {
          this.bridge = new BridgeService();
          this.tools = new RobloxStudioTools(this.bridge);
          primaryApp = createHttpServer(this.tools, this.bridge, this.allowedToolNames);
          const result = await listenWithRetry(primaryApp, host, basePort, 5);
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
      legacyApp = createHttpServer(this.tools, this.bridge, this.allowedToolNames);
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
    }, 5000);

    const shutdown = () => {
      console.error('Shutting down MCP server...');
      clearInterval(activityInterval);
      clearInterval(cleanupInterval);
      if (promotionInterval) clearInterval(promotionInterval);
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
