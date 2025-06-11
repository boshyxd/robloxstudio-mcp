import express from 'express';
import cors from 'cors';
import { RobloxStudioTools } from './tools/index.js';
import { BridgeService } from './bridge-service.js';

export function createHttpServer(tools: RobloxStudioTools, bridge: BridgeService) {
  const app = express();
  let pluginConnected = false;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'robloxstudio-mcp' });
  });

  // Plugin readiness endpoint
  app.post('/ready', (req, res) => {
    pluginConnected = true;
    res.json({ success: true });
  });

  // Check if plugin is connected
  app.get('/status', (req, res) => {
    res.json({ pluginConnected });
  });

  // Polling endpoint for Studio plugin
  app.get('/poll', (req, res) => {
    const pendingRequest = bridge.getPendingRequest();
    if (pendingRequest) {
      res.json({ request: pendingRequest.request, requestId: pendingRequest.requestId });
    } else {
      res.json({ request: null });
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

  // MCP tool proxy endpoints - these will be called by AI tools
  app.post('/mcp/get_file_tree', async (req, res) => {
    try {
      const result = await tools.getFileTree(req.body.path);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });


  app.post('/mcp/search_files', async (req, res) => {
    try {
      const result = await tools.searchFiles(req.body.query, req.body.searchType);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });


  app.post('/mcp/get_place_info', async (req, res) => {
    try {
      const result = await tools.getPlaceInfo();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/mcp/get_services', async (req, res) => {
    try {
      const result = await tools.getServices(req.body.serviceName);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });


  app.post('/mcp/search_objects', async (req, res) => {
    try {
      const result = await tools.searchObjects(req.body.query, req.body.searchType, req.body.propertyName);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/mcp/get_instance_properties', async (req, res) => {
    try {
      const result = await tools.getInstanceProperties(req.body.instancePath);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/mcp/get_instance_children', async (req, res) => {
    try {
      const result = await tools.getInstanceChildren(req.body.instancePath);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/mcp/search_by_property', async (req, res) => {
    try {
      const result = await tools.searchByProperty(req.body.propertyName, req.body.propertyValue);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/mcp/get_class_info', async (req, res) => {
    try {
      const result = await tools.getClassInfo(req.body.className);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/mcp/mass_set_property', async (req, res) => {
    try {
      const result = await tools.massSetProperty(req.body.paths, req.body.propertyName, req.body.propertyValue);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/mcp/mass_get_property', async (req, res) => {
    try {
      const result = await tools.massGetProperty(req.body.paths, req.body.propertyName);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/mcp/create_object_with_properties', async (req, res) => {
    try {
      const result = await tools.createObjectWithProperties(req.body.className, req.body.parent, req.body.name, req.body.properties);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/mcp/mass_create_objects', async (req, res) => {
    try {
      const result = await tools.massCreateObjects(req.body.objects);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/mcp/mass_create_objects_with_properties', async (req, res) => {
    try {
      const result = await tools.massCreateObjectsWithProperties(req.body.objects);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/mcp/get_project_structure', async (req, res) => {
    try {
      const result = await tools.getProjectStructure(req.body.path, req.body.maxDepth, req.body.scriptsOnly);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });



  // Add method to check if plugin is connected
  (app as any).isPluginConnected = () => pluginConnected;

  return app;
}