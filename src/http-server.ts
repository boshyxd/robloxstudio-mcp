import express from 'express';
import cors from 'cors';
import { RobloxStudioTools } from './tools/index.js';
import { BridgeService } from './bridge-service.js';

export function createHttpServer(tools: RobloxStudioTools, bridge: BridgeService) {
  const app = express();
  let pluginConnected = false;
  let mcpServerActive = false;
  let lastMCPActivity = 0;
  let mcpServerStartTime = 0;
  let lastPluginActivity = 0;

  // Track MCP server lifecycle
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
    return mcpServerActive && (Date.now() - lastMCPActivity < 15000); // 15 second timeout
  };

  const isPluginConnected = () => {
    // Consider plugin disconnected if no activity for 10 seconds
    return pluginConnected && (Date.now() - lastPluginActivity < 10000);
  };

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'robloxstudio-mcp',
      pluginConnected,
      mcpServerActive: isMCPServerActive(),
      uptime: mcpServerActive ? Date.now() - mcpServerStartTime : 0
    });
  });

  // Plugin readiness endpoint
  app.post('/ready', (req, res) => {
    pluginConnected = true;
    lastPluginActivity = Date.now();
    res.json({ success: true });
  });

  // Plugin disconnect endpoint
  app.post('/disconnect', (req, res) => {
    pluginConnected = false;
    // Clear any pending requests when plugin disconnects
    bridge.clearAllPendingRequests();
    res.json({ success: true });
  });

  // Enhanced status endpoint
  app.get('/status', (req, res) => {
    res.json({
      pluginConnected,
      mcpServerActive: isMCPServerActive(),
      lastMCPActivity,
      uptime: mcpServerActive ? Date.now() - mcpServerStartTime : 0
    });
  });

  // Enhanced polling endpoint for Studio plugin
  app.get('/poll', (req, res) => {
    // Always track that plugin is polling (shows it's trying to connect)
    if (!pluginConnected) {
      pluginConnected = true;
    }
    lastPluginActivity = Date.now();

    if (!isMCPServerActive()) {
      res.status(503).json({
        error: 'MCP server not connected',
        pluginConnected: true,
        mcpConnected: false,
        request: null
      });
      return;
    }

    trackMCPActivity();

    const pendingRequest = bridge.getPendingRequest();
    if (pendingRequest) {
      res.json({
        request: pendingRequest.request,
        requestId: pendingRequest.requestId,
        mcpConnected: true,
        pluginConnected: true
      });
    } else {
      res.json({
        request: null,
        mcpConnected: true,
        pluginConnected: true
      });
    }
  });

  // Response endpoint for Studio plugin
  app.post('/response', (req, res) => {
    const { requestId, response, error } = req.body;

    if (error) {
      bridge.rejectRequest(requestId, error);
    } else {
      bridge.resolveRequest(requestId, response);
    }

    res.json({ success: true });
  });

  // Middleware to track MCP activity for all MCP endpoints
  app.use('/mcp/*', (req, res, next) => {
    trackMCPActivity();
    next();
  });

  // MCP tool proxy endpoints - these mirror the consolidated tool API

  // Exploration
  app.post('/mcp/get_file_tree', async (req, res) => {
    try { res.json(await tools.getFileTree(req.body.path)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  app.post('/mcp/get_place_info', async (req, res) => {
    try { res.json(await tools.getPlaceInfo()); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  app.post('/mcp/get_services', async (req, res) => {
    try { res.json(await tools.getServices(req.body.serviceName)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  app.post('/mcp/get_project_structure', async (req, res) => {
    try { res.json(await tools.getProjectStructure(req.body.path, req.body.maxDepth, req.body.scriptsOnly)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  app.post('/mcp/get_instance_properties', async (req, res) => {
    try { res.json(await tools.getInstanceProperties(req.body.instancePath)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  app.post('/mcp/get_instance_children', async (req, res) => {
    try { res.json(await tools.getInstanceChildren(req.body.instancePath)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  app.post('/mcp/get_class_info', async (req, res) => {
    try { res.json(await tools.getClassInfo(req.body.className)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  // Search
  app.post('/mcp/search', async (req, res) => {
    try { res.json(await tools.search(req.body.query, req.body.searchType, { propertyName: req.body.propertyName, propertyValue: req.body.propertyValue })); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  // Properties
  app.post('/mcp/get_property', async (req, res) => {
    try { res.json(await tools.getProperty(req.body.paths, req.body.propertyName)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  app.post('/mcp/set_property', async (req, res) => {
    try { res.json(await tools.setProperty(req.body.paths, req.body.propertyName, req.body.propertyValue, req.body.options)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  // Objects
  app.post('/mcp/create', async (req, res) => {
    try { res.json(await tools.create(req.body.objects)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  app.post('/mcp/delete', async (req, res) => {
    try { res.json(await tools.delete(req.body.paths)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  // Duplication
  app.post('/mcp/duplicate', async (req, res) => {
    try { res.json(await tools.duplicate(req.body.duplications)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  // Scripts
  app.post('/mcp/get_script_source', async (req, res) => {
    try { res.json(await tools.getScriptSource(req.body.instancePath, req.body.startLine, req.body.endLine)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  app.post('/mcp/set_script_source', async (req, res) => {
    try { res.json(await tools.setScriptSource(req.body.instancePath, req.body.source)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  app.post('/mcp/edit_script', async (req, res) => {
    try { res.json(await tools.editScript(req.body.instancePath, req.body.action, req.body)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  // Attributes & Tags
  app.post('/mcp/attribute', async (req, res) => {
    try { res.json(await tools.attribute(req.body.instancePath, req.body.action, req.body)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  app.post('/mcp/tag', async (req, res) => {
    try { res.json(await tools.tag(req.body.action, req.body)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  // Assets
  app.post('/mcp/insert_asset', async (req, res) => {
    try { res.json(await tools.insertAsset(req.body.assetId, req.body.parentPath, req.body.position)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  app.post('/mcp/preview_asset', async (req, res) => {
    try { res.json(await tools.previewAsset(req.body.assetId, req.body.includeProperties, req.body.maxDepth)); }
    catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' }); }
  });

  app.post('/mcp/get_selection', async (req, res) => {
    try {
      const result = await tools.getSelection();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });


  // Add methods to control and check server status
  (app as any).isPluginConnected = isPluginConnected;
  (app as any).setMCPServerActive = setMCPServerActive;
  (app as any).isMCPServerActive = isMCPServerActive;
  (app as any).trackMCPActivity = trackMCPActivity;

  return app;
}