import { BridgeService } from '../bridge-service.js';
import { createHttpServer } from '../http-server.js';
import { RobloxStudioTools } from '../tools/index.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';

describe('Smoke Tests - Connection Fixes', () => {
  test('build library should resolve inside the current project on macOS-style paths', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'robloxstudio-mcp-'));
    const projectRoot = path.join(tempRoot, 'my-game');
    const nestedWorkingDir = path.join(projectRoot, 'packages', 'server');

    fs.mkdirSync(nestedWorkingDir, { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}');

    const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(nestedWorkingDir);

    try {
      const bridge = new BridgeService();
      const tools = new RobloxStudioTools(bridge);
      const result = await tools.createBuild(
        'misc/test_build',
        'misc',
        { a: ['Bright red', 'Plastic'] },
        [[0, 0, 0, 1, 1, 1, 0, 0, 0, 'a']]
      );

      const payload = JSON.parse(result.content[0].text);
      const expectedPath = path.join(projectRoot, 'build-library', 'misc', 'test_build.json');

      expect(payload.savedTo).toBe(expectedPath);
      expect(fs.existsSync(expectedPath)).toBe(true);
    } finally {
      cwdSpy.mockRestore();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('BridgeService should be instantiable', () => {
    const bridge = new BridgeService();
    expect(bridge).toBeDefined();
    expect(bridge.getPendingRequest()).toBeNull();
  });

  test('HTTP server should start and respond to health check', async () => {
    const bridge = new BridgeService();
    const tools = new RobloxStudioTools(bridge);
    const app = createHttpServer(tools, bridge);

    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('robloxstudio-mcp');
  });

  test('clearAllPendingRequests should clear all requests', async () => {
    const bridge = new BridgeService();

    const promise1 = bridge.sendRequest('/test1', {});
    const promise2 = bridge.sendRequest('/test2', {});

    expect(bridge.getPendingRequest()).toBeTruthy();

    bridge.clearAllPendingRequests();

    expect(bridge.getPendingRequest()).toBeNull();

    await expect(promise1).rejects.toThrow('Connection closed');
    await expect(promise2).rejects.toThrow('Connection closed');
  });

  test('Disconnect endpoint should clear pending requests', async () => {
    const bridge = new BridgeService();
    const tools = new RobloxStudioTools(bridge);
    const app = createHttpServer(tools, bridge);

    const pendingPromise = bridge.sendRequest('/test', { data: 'test' });
    pendingPromise.catch(() => {});

    await request(app)
      .post('/disconnect')
      .expect(200);

    await expect(pendingPromise).rejects.toThrow('Connection closed');
  });

  test('Connection states should update correctly', async () => {
    const bridge = new BridgeService();
    const tools = new RobloxStudioTools(bridge);
    const app = createHttpServer(tools, bridge) as any;

    expect(app.isPluginConnected()).toBe(false);

    await request(app).post('/ready').expect(200);
    expect(app.isPluginConnected()).toBe(true);

    await request(app).post('/disconnect').expect(200);
    expect(app.isPluginConnected()).toBe(false);
  });
});
