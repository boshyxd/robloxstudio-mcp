import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { RobloxStudioTools } from './tools/index.js';
import { BridgeService } from './bridge-service.js';
import type { ToolDefinition } from './tools/definitions.js';

interface StreamableHttpConfig {
  name: string;
  version: string;
  tools: ToolDefinition[];
}

export type ToolHandler = (tools: RobloxStudioTools, body: any) => Promise<any>;

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  get_file_tree: (tools, body) => tools.getFileTree(body.path),
  search_files: (tools, body) => tools.searchFiles(body.query, body.searchType),
  get_place_info: (tools) => tools.getPlaceInfo(),
  get_services: (tools, body) => tools.getServices(body.serviceName),
  search_objects: (tools, body) => tools.searchObjects(body.query, body.searchType, body.propertyName),
  get_instance_properties: (tools, body) => tools.getInstanceProperties(body.instancePath, body.excludeSource),
  get_instance_children: (tools, body) => tools.getInstanceChildren(body.instancePath),
  search_by_property: (tools, body) => tools.searchByProperty(body.propertyName, body.propertyValue),
  get_class_info: (tools, body) => tools.getClassInfo(body.className),
  get_project_structure: (tools, body) => tools.getProjectStructure(body.path, body.maxDepth, body.scriptsOnly),
  set_property: (tools, body) => tools.setProperty(body.instancePath, body.propertyName, body.propertyValue),
  set_properties: (tools, body) => tools.setProperties(body.instancePath, body.properties),
  mass_set_property: (tools, body) => tools.massSetProperty(body.paths, body.propertyName, body.propertyValue),
  mass_get_property: (tools, body) => tools.massGetProperty(body.paths, body.propertyName),
  create_object: (tools, body) => tools.createObject(body.className, body.parent, body.name, body.properties),
  mass_create_objects: (tools, body) => tools.massCreateObjects(body.objects),
  delete_object: (tools, body) => tools.deleteObject(body.instancePath),
  smart_duplicate: (tools, body) => tools.smartDuplicate(body.instancePath, body.count, body.options),
  mass_duplicate: (tools, body) => tools.massDuplicate(body.duplications),
  grep_scripts: (tools, body) => tools.grepScripts(body.pattern, {
    caseSensitive: body.caseSensitive,
    usePattern: body.usePattern,
    contextLines: body.contextLines,
    maxResults: body.maxResults,
    maxResultsPerScript: body.maxResultsPerScript,
    filesOnly: body.filesOnly,
    path: body.path,
    classFilter: body.classFilter,
  }),
  get_script_source: (tools, body) => tools.getScriptSource(body.instancePath, body.startLine, body.endLine),
  set_script_source: (tools, body) => tools.setScriptSource(body.instancePath, body.source),
  edit_script_lines: (tools, body) => tools.editScriptLines(body.instancePath, body.old_string, body.new_string, body.startLine),
  insert_script_lines: (tools, body) => tools.insertScriptLines(body.instancePath, body.afterLine, body.newContent),
  delete_script_lines: (tools, body) => tools.deleteScriptLines(body.instancePath, body.startLine, body.endLine),
  set_attribute: (tools, body) => tools.setAttribute(body.instancePath, body.attributeName, body.attributeValue, body.valueType),
  get_attributes: (tools, body) => tools.getAttributes(body.instancePath),
  delete_attribute: (tools, body) => tools.deleteAttribute(body.instancePath, body.attributeName),
  get_tags: (tools, body) => tools.getTags(body.instancePath),
  add_tag: (tools, body) => tools.addTag(body.instancePath, body.tagName),
  remove_tag: (tools, body) => tools.removeTag(body.instancePath, body.tagName),
  get_tagged: (tools, body) => tools.getTagged(body.tagName),
  get_selection: (tools) => tools.getSelection(),
  execute_luau: (tools, body) => tools.executeLuau(body.code, body.target),
  start_playtest: (tools, body) => tools.startPlaytest(body.mode, body.numPlayers),
  stop_playtest: (tools) => tools.stopPlaytest(),
  get_playtest_output: (tools, body) => tools.getPlaytestOutput(body.target),
  get_connected_instances: (tools) => tools.getConnectedInstances(),
  export_build: (tools, body) => tools.exportBuild(body.instancePath, body.outputId, body.style),
  create_build: (tools, body) => tools.createBuild(body.id, body.style, body.palette, body.parts, body.bounds),
  generate_build: (tools, body) => tools.generateBuild(body.id, body.style, body.palette, body.code, body.seed),
  import_build: (tools, body) => tools.importBuild(body.buildData, body.targetPath, body.position),
  list_library: (tools, body) => tools.listLibrary(body.style),
  search_materials: (tools, body) => tools.searchMaterials(body.query, body.maxResults),
  get_build: (tools, body) => tools.getBuild(body.id),
  import_scene: (tools, body) => tools.importScene(body.sceneData, body.targetPath),
  undo: (tools) => tools.undo(),
  redo: (tools) => tools.redo(),
  search_assets: (tools, body) => tools.searchAssets(body.assetType, body.query, body.maxResults, body.sortBy, body.verifiedCreatorsOnly),
  get_asset_details: (tools, body) => tools.getAssetDetails(body.assetId),
  get_asset_thumbnail: (tools, body) => tools.getAssetThumbnail(body.assetId, body.size),
  insert_asset: (tools, body) => tools.insertAsset(body.assetId, body.parentPath, body.position),
  preview_asset: (tools, body) => tools.previewAsset(body.assetId, body.includeProperties, body.maxDepth),
  upload_asset: (tools, body) => tools.uploadAsset(body.filePath, body.assetType, body.displayName, body.description, body.userId, body.groupId),
  clone_object: (tools, body) => tools.cloneObject(body.instancePath, body.targetParentPath),
  get_descendants: (tools, body) => tools.getDescendants(body.instancePath, body.maxDepth, body.classFilter),
  compare_instances: (tools, body) => tools.compareInstances(body.instancePathA, body.instancePathB),
  get_output_log: (tools, body) => tools.getOutputLog(body.maxEntries, body.messageType),
  bulk_set_attributes: (tools, body) => tools.bulkSetAttributes(body.instancePath, body.attributes),
  capture_screenshot: (tools) => tools.captureScreenshot(),
  simulate_mouse_input: (tools, body) => tools.simulateMouseInput(body.action, body.x, body.y, body.button, body.scrollDirection, body.target),
  simulate_keyboard_input: (tools, body) => tools.simulateKeyboardInput(body.keyCode, body.action, body.duration, body.target),
  character_navigation: (tools, body) => tools.characterNavigation(body.position, body.instancePath, body.waitForCompletion, body.timeout, body.target),
  find_and_replace_in_scripts: (tools, body) => tools.findAndReplaceInScripts(body.pattern, body.replacement, {
    caseSensitive: body.caseSensitive,
    usePattern: body.usePattern,
    path: body.path,
    classFilter: body.classFilter,
    dryRun: body.dryRun,
    maxReplacements: body.maxReplacements,
  }),
};

export function createHttpServer(tools: RobloxStudioTools, bridge: BridgeService, allowedTools?: Set<string>, serverConfig?: StreamableHttpConfig) {
  const app = express();
  let mcpServerActive = false;
  let lastMCPActivity = 0;
  let mcpServerStartTime = 0;
  const proxyInstances = new Set<string>();

  const setMCPServerActive = (active: boolean) => {
    mcpServerActive = active;
    if (active) {
      mcpServerStartTime = Date.now();
      lastMCPActivity = Date.now();
    } else {
      mcpServerStartTime = 0;
      lastMCPActivity = 0;
    }
  };

  const trackMCPActivity = () => {
    if (mcpServerActive) {
      lastMCPActivity = Date.now();
    }
  };

  const isMCPServerActive = () => {
    if (!mcpServerActive) return false;
    return (Date.now() - lastMCPActivity) < 30000;
  };

  const isPluginConnected = () => {
    return bridge.getInstances().length > 0;
  };

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));


  app.get('/health', (req, res) => {
    const instances = bridge.getInstances();
    res.json({
      status: 'ok',
      service: 'robloxstudio-mcp',
      version: serverConfig?.version,
      pluginConnected: instances.length > 0,
      instanceCount: instances.length,
      instances: instances.map(i => ({
        instanceId: i.instanceId,
        role: i.role,
        lastActivity: i.lastActivity,
        connectedAt: i.connectedAt,
      })),
      mcpServerActive: isMCPServerActive(),
      uptime: mcpServerActive ? Date.now() - mcpServerStartTime : 0,
      pendingRequests: bridge.getPendingRequestCount(),
      proxyInstanceCount: proxyInstances.size,
      streamableHttp: !!serverConfig,
    });
  });


  app.post('/ready', (req, res) => {
    const { instanceId, role } = req.body;

    if (instanceId && role) {
      const assignedRole = bridge.registerInstance(instanceId, role);
      res.json({ success: true, assignedRole });
    } else {
      bridge.registerInstance('legacy', 'edit');
      res.json({ success: true, assignedRole: 'edit' });
    }
  });


  app.post('/disconnect', (req, res) => {
    const { instanceId } = req.body;

    if (instanceId) {
      bridge.unregisterInstance(instanceId);
    } else {
      bridge.unregisterInstance('legacy');
      bridge.clearAllPendingRequests();
    }
    res.json({ success: true });
  });


  app.get('/status', (req, res) => {
    const instances = bridge.getInstances();
    res.json({
      pluginConnected: instances.length > 0,
      instanceCount: instances.length,
      instances: instances.map(i => ({ instanceId: i.instanceId, role: i.role })),
      mcpServerActive: isMCPServerActive(),
      lastMCPActivity,
      uptime: mcpServerActive ? Date.now() - mcpServerStartTime : 0
    });
  });


  app.get('/instances', (req, res) => {
    res.json({ instances: bridge.getInstances() });
  });


  app.get('/poll', (req, res) => {
    const instanceId = req.query.instanceId as string | undefined;

    if (instanceId) {
      bridge.updateInstanceActivity(instanceId);
    }

    let callerRole = 'edit';
    if (instanceId) {
      const inst = bridge.getInstances().find(i => i.instanceId === instanceId);
      if (inst) {
        callerRole = inst.role;
      }
    }

    if (!isMCPServerActive()) {
      res.status(503).json({
        error: 'MCP server not connected',
        pluginConnected: true,
        mcpConnected: false,
        request: null
      });
      return;
    }

    const pendingRequest = bridge.getPendingRequest(callerRole);
    if (pendingRequest) {
      res.json({
        request: pendingRequest.request,
        requestId: pendingRequest.requestId,
        mcpConnected: true,
        pluginConnected: true,
        proxyInstanceCount: proxyInstances.size
      });
    } else {
      res.json({
        request: null,
        mcpConnected: true,
        pluginConnected: true,
        proxyInstanceCount: proxyInstances.size
      });
    }
  });


  app.post('/response', (req, res) => {
    const { requestId, response, error } = req.body;

    if (error) {
      bridge.rejectRequest(requestId, error);
    } else {
      bridge.resolveRequest(requestId, response);
    }

    res.json({ success: true });
  });


  app.post('/proxy', async (req, res) => {
    const { endpoint, data, target, proxyInstanceId } = req.body;

    if (!endpoint) {
      res.status(400).json({ error: 'endpoint is required' });
      return;
    }

    if (proxyInstanceId) {
      proxyInstances.add(proxyInstanceId);
    }

    try {
      const response = await bridge.sendRequest(endpoint, data, target || 'edit');
      res.json({ response });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Proxy request failed' });
    }
  });


  // Streamable HTTP MCP transport
  if (serverConfig) {
    const filteredTools = serverConfig.tools.filter(t => !allowedTools || allowedTools.has(t.name));

    app.post('/mcp', async (req, res) => {
      try {
        trackMCPActivity();

        const server = new Server(
          { name: serverConfig.name, version: serverConfig.version },
          { capabilities: { tools: {} } }
        );

        server.setRequestHandler(ListToolsRequestSchema, async () => ({
          tools: filteredTools.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        }));

        server.setRequestHandler(CallToolRequestSchema, async (request) => {
          const { name, arguments: args } = request.params;

          if (allowedTools && !allowedTools.has(name)) {
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
          }
          const handler = TOOL_HANDLERS[name];
          if (!handler) {
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
          }

          try {
            return await handler(tools, args || {});
          } catch (error) {
            if (error instanceof McpError) throw error;
            throw new McpError(
              ErrorCode.InternalError,
              `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        });

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        res.on('close', () => {
          transport.close();
          server.close();
        });
      } catch (error) {
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null,
          });
        }
      }
    });

    app.get('/mcp', (req, res) => {
      res.writeHead(405).end(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed.' },
        id: null,
      }));
    });

    app.delete('/mcp', (req, res) => {
      res.writeHead(405).end(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed.' },
        id: null,
      }));
    });
  }

  app.use('/mcp/*', (req, res, next) => {
    trackMCPActivity();
    next();
  });

  // Register /mcp/* routes dynamically based on allowedTools
  for (const [toolName, handler] of Object.entries(TOOL_HANDLERS)) {
    if (allowedTools && !allowedTools.has(toolName)) continue;

    app.post(`/mcp/${toolName}`, async (req, res) => {
      try {
        const result = await handler(tools, req.body);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });
  }


  (app as any).isPluginConnected = isPluginConnected;
  (app as any).setMCPServerActive = setMCPServerActive;
  (app as any).isMCPServerActive = isMCPServerActive;
  (app as any).trackMCPActivity = trackMCPActivity;

  return app;
}

/**
 * Classify a primary-bind failure. Returns true only when the base port is
 * genuinely occupied, so falling back to proxy mode is the correct response.
 * Other bind errors (EACCES, bad host, ...) must NOT be masked by proxy mode —
 * they should surface instead of silently forwarding to a primary that isn't there.
 */
export function isPortInUseError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { code?: string; message?: string };
  // Prefer the explicit code (raw EADDRINUSE and listenWithRetry's aggregate
  // both carry it). The message check is a narrow fallback anchored to the
  // aggregate phrasing only — a broad /in use/ would re-mask unrelated errors.
  return e.code === 'EADDRINUSE' || /all ports .* are in use/i.test(e.message ?? '');
}

/**
 * Attempt to bind an Express app to a port, using an explicit http.Server
 * so that EADDRINUSE errors are properly caught.
 */
export function listenWithRetry(
  app: express.Express,
  host: string,
  startPort: number,
  maxAttempts: number = 5
): Promise<{ server: http.Server; port: number }> {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i < maxAttempts; i++) {
      const port = startPort + i;
      try {
        const server = await bindPort(app, host, port);
        resolve({ server, port });
        return;
      } catch (err: any) {
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${port} in use, trying next...`);
          continue;
        }
        reject(err);
        return;
      }
    }
    const exhausted = new Error(`All ports ${startPort}-${startPort + maxAttempts - 1} are in use. Stop some MCP server instances and retry.`) as NodeJS.ErrnoException;
    exhausted.code = 'EADDRINUSE';
    reject(exhausted);
  });
}

function bindPort(app: express.Express, host: string, port: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    const onError = (err: NodeJS.ErrnoException) => {
      server.removeListener('error', onError);
      reject(err);
    };
    server.once('error', onError);
    server.listen(port, host, () => {
      server.removeListener('error', onError);
      resolve(server);
    });
  });
}
