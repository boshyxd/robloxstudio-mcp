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
          case 'get_project_map':
            return await this.tools.getProjectMap(args as any);
          case 'find_instances':
            return await this.tools.findInstances(args as any);
          case 'find_scripts':
            return await this.tools.findScripts(args as any);
          case 'find_references':
            return await this.tools.findReferences(args as any);
          case 'get_instance_summary':
            return await this.tools.getInstanceSummary(args as any);

          case 'set_property':
            return await this.tools.setProperty((args as any)?.instancePath as string, (args as any)?.propertyName as string, (args as any)?.propertyValue);
          case 'set_properties':
            return await this.tools.setProperties((args as any)?.instancePath as string, (args as any)?.properties);

          case 'mass_set_property':
            return await this.tools.massSetProperty((args as any)?.paths as string[], (args as any)?.propertyName as string, (args as any)?.propertyValue);
          case 'mass_get_property':
            return await this.tools.massGetProperty((args as any)?.paths as string[], (args as any)?.propertyName as string);

          case 'create_object':
            return await this.tools.createObject((args as any)?.className as string, (args as any)?.parent as string, (args as any)?.name, (args as any)?.properties);
          case 'create_ui_tree':
            return await this.tools.createUITree((args as any)?.parentPath as string, (args as any)?.tree);
          case 'mass_create_objects':
            return await this.tools.massCreateObjects((args as any)?.objects);
          case 'delete_object':
            return await this.tools.deleteObject((args as any)?.instancePath as string);

          case 'smart_duplicate':
            return await this.tools.smartDuplicate((args as any)?.instancePath as string, (args as any)?.count as number, (args as any)?.options);
          case 'mass_duplicate':
            return await this.tools.massDuplicate((args as any)?.duplications);

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
          case 'get_script_outline':
            return await this.tools.getScriptOutline((args as any)?.instancePath as string);
          case 'read_script_slice':
            return await this.tools.readScriptSlice((args as any)?.instancePath as string, {
              startLine: (args as any)?.startLine,
              endLine: (args as any)?.endLine,
              aroundPattern: (args as any)?.aroundPattern,
              contextLines: (args as any)?.contextLines,
              maxChars: (args as any)?.maxChars,
              numbered: (args as any)?.numbered,
            });
          case 'set_script_source':
            return await this.tools.setScriptSource((args as any)?.instancePath as string, (args as any)?.source as string);

          case 'edit_script_lines':
            return await this.tools.editScriptLines((args as any)?.instancePath as string, (args as any)?.old_string as string, (args as any)?.new_string as string);
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
            return await this.tools.executeLuau((args as any)?.code as string, (args as any)?.target);

          case 'start_playtest':
            return await this.tools.startPlaytest((args as any)?.mode as string, (args as any)?.numPlayers);
          case 'stop_playtest':
            return await this.tools.stopPlaytest();
          case 'get_playtest_output':
            return await this.tools.getPlaytestOutput((args as any)?.target);
          case 'get_connected_instances':
            return await this.tools.getConnectedInstances();

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
          case 'upload_decal':
            return await this.tools.uploadDecal((args as any)?.filePath as string, (args as any)?.displayName as string, (args as any)?.description, (args as any)?.userId, (args as any)?.groupId);
          case 'clone_object':
            return await this.tools.cloneObject((args as any)?.instancePath as string, (args as any)?.targetParentPath as string);
          case 'move_object':
            return await this.tools.moveObject((args as any)?.instancePath as string, (args as any)?.targetParentPath as string);
          case 'rename_object':
            return await this.tools.renameObject((args as any)?.instancePath as string, (args as any)?.newName as string);
          case 'get_descendants':
            return await this.tools.getDescendants((args as any)?.instancePath as string, (args as any)?.maxDepth, (args as any)?.classFilter);
          case 'compare_instances':
            return await this.tools.compareInstances((args as any)?.instancePathA as string, (args as any)?.instancePathB as string);
          case 'get_output_log':
            return await this.tools.getOutputLog((args as any)?.maxEntries, (args as any)?.messageType);
          case 'get_script_analysis':
            return await this.tools.getScriptAnalysis((args as any)?.instancePath as string);
          case 'bulk_set_attributes':
            return await this.tools.bulkSetAttributes((args as any)?.instancePath as string, (args as any)?.attributes);

          case 'capture_screenshot':
            return await this.tools.captureScreenshot();

          case 'simulate_mouse_input':
            return await this.tools.simulateMouseInput((args as any)?.action as string, (args as any)?.x as number, (args as any)?.y as number, (args as any)?.button, (args as any)?.scrollDirection, (args as any)?.target);
          case 'simulate_keyboard_input':
            return await this.tools.simulateKeyboardInput((args as any)?.keyCode as string, (args as any)?.action, (args as any)?.duration, (args as any)?.target);
          case 'character_navigation':
            return await this.tools.characterNavigation((args as any)?.position, (args as any)?.instancePath, (args as any)?.waitForCompletion, (args as any)?.timeout, (args as any)?.target);
          case 'find_and_replace_in_scripts':
            return await this.tools.findAndReplaceInScripts((args as any)?.pattern as string, (args as any)?.replacement as string, {
              caseSensitive: (args as any)?.caseSensitive,
              usePattern: (args as any)?.usePattern,
              path: (args as any)?.path,
              classFilter: (args as any)?.classFilter,
              dryRun: (args as any)?.dryRun,
              maxReplacements: (args as any)?.maxReplacements,
            });

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
      primaryApp = createHttpServer(this.tools, this.bridge, this.allowedToolNames, this.config);
      const result = await listenWithRetry(primaryApp, host, basePort, 5);
      httpHandle = result.server;
      boundPort = result.port;
      console.error(`HTTP server listening on ${host}:${boundPort} for Studio plugin (primary mode)`);
      console.error(`Streamable HTTP MCP endpoint: http://localhost:${boundPort}/mcp`);
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
          primaryApp = createHttpServer(this.tools, this.bridge, this.allowedToolNames, this.config);
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
