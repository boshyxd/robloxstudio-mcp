import { BridgeService } from '../bridge-service.js';
import { RobloxStudioTools } from '../tools/index.js';
import { TOOL_DEFINITIONS } from '../tools/definitions.js';

class MockBridgeService extends BridgeService {
  readonly calls: Array<{ endpoint: string; data: any; target: string }> = [];

  constructor(private readonly responses: Record<string, any>) {
    super();
  }

  override async sendRequest(endpoint: string, data: any, target = 'edit'): Promise<any> {
    this.calls.push({ endpoint, data, target });
    return this.responses[endpoint] ?? { success: true };
  }
}

describe('token-efficient navigation tools', () => {
  const navigationToolNames = [
    'get_project_map',
    'find_instances',
    'find_scripts',
    'find_references',
    'get_script_outline',
    'read_script_slice',
    'get_instance_summary',
  ];

  test('new navigation tools are read-only and briefly described', () => {
    for (const toolName of navigationToolNames) {
      const tool = TOOL_DEFINITIONS.find(t => t.name === toolName);
      expect(tool).toBeDefined();
      expect(tool?.category).toBe('read');
      expect(tool?.description.length).toBeLessThanOrEqual(140);
    }
  });

  test('legacy high-volume tools remain available with targeted guidance', () => {
    const expectedGuidance: Record<string, string> = {
      get_file_tree: 'get_project_map',
      get_instance_properties: 'get_instance_summary',
      get_project_structure: 'get_project_map',
      get_script_source: 'read_script_slice',
      grep_scripts: 'find_scripts',
    };

    for (const [toolName, preferredTool] of Object.entries(expectedGuidance)) {
      const tool = TOOL_DEFINITIONS.find(t => t.name === toolName);
      expect(tool).toBeDefined();
      expect(tool?.description).toContain(preferredTool);
    }
  });

  test('compact plugin responses are returned as compact MCP text', async () => {
    const bridge = new MockBridgeService({
      '/api/project-map': {
        format: 'compact',
        text: 'project_map root=game count=1\npath | class\ngame | DataModel',
      },
    });
    const tools = new RobloxStudioTools(bridge);

    const result = await tools.getProjectMap({ rootPath: 'game', maxDepth: 2 });

    expect((result.content[0] as any).text).toBe('project_map root=game count=1\npath | class\ngame | DataModel');
    expect(bridge.calls).toEqual([
      { endpoint: '/api/project-map', data: { rootPath: 'game', maxDepth: 2 }, target: 'edit' },
    ]);
  });

  test('find_references forwards scoped reference search options', async () => {
    const bridge = new MockBridgeService({
      '/api/find-references': {
        format: 'compact',
        text: 'find_references root=game type=module target=Inventory count=1',
      },
    });
    const tools = new RobloxStudioTools(bridge);

    const result = await tools.findReferences({
      targetPath: 'game.ReplicatedStorage.Shared.Inventory',
      referenceType: 'module',
      includeSnippet: true,
    });

    expect((result.content[0] as any).text).toBe('find_references root=game type=module target=Inventory count=1');
    expect(bridge.calls).toEqual([
      {
        endpoint: '/api/find-references',
        data: {
          targetPath: 'game.ReplicatedStorage.Shared.Inventory',
          referenceType: 'module',
          includeSnippet: true,
        },
        target: 'edit',
      },
    ]);
  });

  test('read_script_slice forwards targeted read options and preserves compact text', async () => {
    const bridge = new MockBridgeService({
      '/api/read-script-slice': {
        format: 'compact',
        text: 'script_slice path=game.ServerScriptService.Main lines=10-14/200\n10: local x = 1',
      },
    });
    const tools = new RobloxStudioTools(bridge);

    const result = await tools.readScriptSlice('game.ServerScriptService.Main', {
      aroundPattern: 'require(',
      contextLines: 4,
      maxChars: 4000,
    });

    expect((result.content[0] as any).text).toContain('script_slice path=game.ServerScriptService.Main');
    expect(bridge.calls[0]).toEqual({
      endpoint: '/api/read-script-slice',
      data: {
        instancePath: 'game.ServerScriptService.Main',
        aroundPattern: 'require(',
        contextLines: 4,
        maxChars: 4000,
      },
      target: 'edit',
    });
  });

  test('outline and summary compact responses are returned without expanding JSON', async () => {
    const bridge = new MockBridgeService({
      '/api/get-script-outline': {
        format: 'compact',
        text: 'script_outline path=game.ServerScriptService.Main lines=40 len=1200 hash=123',
        requires: ['ReplicatedStorage.Shared'],
      },
      '/api/instance-summary': {
        format: 'compact',
        text: 'instance_summary path=game.Workspace.Part class=Part name=Part children=0 hasSource=false',
        properties: { Name: 'Part' },
      },
    });
    const tools = new RobloxStudioTools(bridge);

    const outline = await tools.getScriptOutline('game.ServerScriptService.Main');
    const summary = await tools.getInstanceSummary({
      instancePath: 'game.Workspace.Part',
      propertyNames: ['Name'],
    });

    expect((outline.content[0] as any).text).toBe('script_outline path=game.ServerScriptService.Main lines=40 len=1200 hash=123');
    expect((summary.content[0] as any).text).toBe('instance_summary path=game.Workspace.Part class=Part name=Part children=0 hasSource=false');
  });
});
