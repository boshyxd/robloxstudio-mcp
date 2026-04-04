import { BridgeService } from '../bridge-service.js';
import { createHttpServer } from '../http-server.js';
import { RobloxStudioTools } from '../tools/index.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';

describe('Smoke Tests - Connection Fixes', () => {
  test('build library override should take precedence over the project-root path', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'robloxstudio-mcp-'));
    const projectRoot = path.join(tempRoot, 'my-game');
    const nestedWorkingDir = path.join(projectRoot, 'packages', 'server');
    const overrideRoot = path.join(tempRoot, 'override-library');
    const originalOverride = process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY;
    const originalLegacyOverride = process.env.BUILD_LIBRARY_PATH;

    fs.mkdirSync(nestedWorkingDir, { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}');

    const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(nestedWorkingDir);
    process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY = overrideRoot;
    delete process.env.BUILD_LIBRARY_PATH;

    try {
      const bridge = new BridgeService();
      const tools = new RobloxStudioTools(bridge);
      const result = await tools.createBuild(
        'misc/override_build',
        'misc',
        { a: ['Bright red', 'Plastic'] },
        [[0, 0, 0, 1, 1, 1, 0, 0, 0, 'a']]
      );

      const payload = JSON.parse(result.content[0].text);
      const expectedPath = path.join(overrideRoot, 'misc', 'override_build.json');
      const projectPath = path.join(projectRoot, 'build-library', 'misc', 'override_build.json');

      expect(payload.savedTo).toBe(expectedPath);
      expect(fs.existsSync(expectedPath)).toBe(true);
      expect(fs.existsSync(projectPath)).toBe(false);
    } finally {
      cwdSpy.mockRestore();
      if (originalOverride === undefined) {
        delete process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY;
      } else {
        process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY = originalOverride;
      }
      if (originalLegacyOverride === undefined) {
        delete process.env.BUILD_LIBRARY_PATH;
      } else {
        process.env.BUILD_LIBRARY_PATH = originalLegacyOverride;
      }
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('build library override should fail instead of silently falling back', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'robloxstudio-mcp-'));
    const projectRoot = path.join(tempRoot, 'my-game');
    const nestedWorkingDir = path.join(projectRoot, 'packages', 'server');
    const overrideFile = path.join(tempRoot, 'override-file');
    const originalOverride = process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY;
    const originalLegacyOverride = process.env.BUILD_LIBRARY_PATH;

    fs.mkdirSync(nestedWorkingDir, { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}');
    fs.writeFileSync(overrideFile, 'not a directory');

    const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(nestedWorkingDir);
    process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY = overrideFile;
    delete process.env.BUILD_LIBRARY_PATH;

    try {
      const bridge = new BridgeService();
      const tools = new RobloxStudioTools(bridge);

      await expect(
        tools.createBuild(
          'misc/override_failure',
          'misc',
          { a: ['Bright red', 'Plastic'] },
          [[0, 0, 0, 1, 1, 1, 0, 0, 0, 'a']]
        )
      ).rejects.toThrow(`override build-library`);

      expect(fs.existsSync(path.join(projectRoot, 'build-library'))).toBe(false);
    } finally {
      cwdSpy.mockRestore();
      if (originalOverride === undefined) {
        delete process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY;
      } else {
        process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY = originalOverride;
      }
      if (originalLegacyOverride === undefined) {
        delete process.env.BUILD_LIBRARY_PATH;
      } else {
        process.env.BUILD_LIBRARY_PATH = originalLegacyOverride;
      }
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('build library should resolve inside the current project on macOS-style paths', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'robloxstudio-mcp-'));
    const projectRoot = path.join(tempRoot, 'my-game');
    const nestedWorkingDir = path.join(projectRoot, 'packages', 'server');
    const originalOverride = process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY;
    const originalLegacyOverride = process.env.BUILD_LIBRARY_PATH;

    fs.mkdirSync(nestedWorkingDir, { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}');

    const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(nestedWorkingDir);
    delete process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY;
    delete process.env.BUILD_LIBRARY_PATH;

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
      if (originalOverride === undefined) {
        delete process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY;
      } else {
        process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY = originalOverride;
      }
      if (originalLegacyOverride === undefined) {
        delete process.env.BUILD_LIBRARY_PATH;
      } else {
        process.env.BUILD_LIBRARY_PATH = originalLegacyOverride;
      }
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('build library should prefer an existing cwd library over creating a new project-root library', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'robloxstudio-mcp-'));
    const projectRoot = path.join(tempRoot, 'my-game');
    const nestedWorkingDir = path.join(projectRoot, 'packages', 'server');
    const cwdLibraryPath = path.join(nestedWorkingDir, 'build-library');
    const originalOverride = process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY;
    const originalLegacyOverride = process.env.BUILD_LIBRARY_PATH;

    fs.mkdirSync(cwdLibraryPath, { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}');

    const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(nestedWorkingDir);
    delete process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY;
    delete process.env.BUILD_LIBRARY_PATH;

    try {
      const bridge = new BridgeService();
      const tools = new RobloxStudioTools(bridge);
      const result = await tools.createBuild(
        'misc/cwd_build',
        'misc',
        { a: ['Bright red', 'Plastic'] },
        [[0, 0, 0, 1, 1, 1, 0, 0, 0, 'a']]
      );

      const payload = JSON.parse(result.content[0].text);
      const expectedPath = path.join(cwdLibraryPath, 'misc', 'cwd_build.json');
      const projectRootPath = path.join(projectRoot, 'build-library', 'misc', 'cwd_build.json');

      expect(payload.savedTo).toBe(expectedPath);
      expect(fs.existsSync(expectedPath)).toBe(true);
      expect(fs.existsSync(projectRootPath)).toBe(false);
    } finally {
      cwdSpy.mockRestore();
      if (originalOverride === undefined) {
        delete process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY;
      } else {
        process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY = originalOverride;
      }
      if (originalLegacyOverride === undefined) {
        delete process.env.BUILD_LIBRARY_PATH;
      } else {
        process.env.BUILD_LIBRARY_PATH = originalLegacyOverride;
      }
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('build library should fall back to the home directory when project-root is unusable', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'robloxstudio-mcp-'));
    const projectRoot = path.join(tempRoot, 'my-game');
    const nestedWorkingDir = path.join(projectRoot, 'packages', 'server');
    const originalCwd = process.cwd();
    const originalOverride = process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY;
    const originalLegacyOverride = process.env.BUILD_LIBRARY_PATH;
    const buildId = `misc/home_fallback_${Date.now()}`;
    const expectedPath = path.join(os.homedir(), '.robloxstudio-mcp', 'build-library', `${buildId}.json`);

    fs.mkdirSync(nestedWorkingDir, { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}');
    fs.writeFileSync(path.join(projectRoot, 'build-library'), 'not a directory');
    delete process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY;
    delete process.env.BUILD_LIBRARY_PATH;
    process.chdir(nestedWorkingDir);

    try {
      const bridge = new BridgeService();
      const tools = new RobloxStudioTools(bridge);
      const result = await tools.createBuild(
        buildId,
        'misc',
        { a: ['Bright red', 'Plastic'] },
        [[0, 0, 0, 1, 1, 1, 0, 0, 0, 'a']]
      );

      const payload = JSON.parse(result.content[0].text);

      expect(payload.savedTo).toBe(expectedPath);
      expect(fs.existsSync(expectedPath)).toBe(true);
      expect(fs.existsSync(path.join(nestedWorkingDir, 'build-library'))).toBe(false);
    } finally {
      process.chdir(originalCwd);
      if (originalOverride === undefined) {
        delete process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY;
      } else {
        process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY = originalOverride;
      }
      if (originalLegacyOverride === undefined) {
        delete process.env.BUILD_LIBRARY_PATH;
      } else {
        process.env.BUILD_LIBRARY_PATH = originalLegacyOverride;
      }
      fs.rmSync(expectedPath, { force: true });
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
