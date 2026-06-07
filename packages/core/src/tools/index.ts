import { StudioHttpClient } from './studio-client.js';
import { BridgeService } from '../bridge-service.js';
import { runBuildExecutor, computeBoundsFromParts } from './build-executor.js';
import { OpenCloudClient } from '../opencloud-client.js';
import { RobloxCookieClient } from '../roblox-cookie-client.js';
import { rgbaToPng } from '../png-encoder.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

type RawImageCaptureResponse = {
  success?: boolean;
  error?: string;
  width?: number;
  height?: number;
  data?: string;
  instancePath?: string;
  instanceName?: string;
  cameraPreset?: string;
};

function encodePngFromRgbaResponse(response: RawImageCaptureResponse): Buffer {
  if (!response.data || response.width === undefined || response.height === undefined) {
    throw new Error('Render response missing data, width, or height');
  }

  const rgbaBuffer = Buffer.from(response.data, 'base64');
  return rgbaToPng(rgbaBuffer, response.width, response.height);
}

export class RobloxStudioTools {
  private client: StudioHttpClient;
  private bridge: BridgeService;
  private openCloudClient: OpenCloudClient;
  private cookieClient: RobloxCookieClient;

  constructor(bridge: BridgeService) {
    this.client = new StudioHttpClient(bridge);
    this.bridge = bridge;
    this.openCloudClient = new OpenCloudClient();
    this.cookieClient = new RobloxCookieClient();
  }


  async getFileTree(path: string = '') {
    const response = await this.client.request('/api/file-tree', { path });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async searchFiles(query: string, searchType: string = 'name') {
    const response = await this.client.request('/api/search-files', { query, searchType });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  async getPlaceInfo() {
    const response = await this.client.request('/api/place-info', {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getServices(serviceName?: string) {
    const response = await this.client.request('/api/services', { serviceName });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async searchObjects(query: string, searchType: string = 'name', propertyName?: string) {
    const response = await this.client.request('/api/search-objects', {
      query,
      searchType,
      propertyName
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  async getInstanceProperties(instancePath: string, excludeSource?: boolean) {
    if (!instancePath) {
      throw new Error('Instance path is required for get_instance_properties');
    }
    const response = await this.client.request('/api/instance-properties', { instancePath, excludeSource });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getInstanceChildren(instancePath: string) {
    if (!instancePath) {
      throw new Error('Instance path is required for get_instance_children');
    }
    const response = await this.client.request('/api/instance-children', { instancePath });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async searchByProperty(propertyName: string, propertyValue: string) {
    if (!propertyName || !propertyValue) {
      throw new Error('Property name and value are required for search_by_property');
    }
    const response = await this.client.request('/api/search-by-property', {
      propertyName,
      propertyValue
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getClassInfo(className: string) {
    if (!className) {
      throw new Error('Class name is required for get_class_info');
    }
    const response = await this.client.request('/api/class-info', { className });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  async getProjectStructure(path?: string, maxDepth?: number, scriptsOnly?: boolean) {
    const response = await this.client.request('/api/project-structure', {
      path,
      maxDepth,
      scriptsOnly
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }



  async setProperty(instancePath: string, propertyName: string, propertyValue: any) {
    if (!instancePath || !propertyName) {
      throw new Error('Instance path and property name are required for set_property');
    }
    const response = await this.client.request('/api/set-property', {
      instancePath,
      propertyName,
      propertyValue
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async setProperties(instancePath: string, properties: Record<string, any>) {
    if (!instancePath || !properties) {
      throw new Error('instancePath and properties are required for set_properties');
    }
    const response = await this.client.request('/api/set-properties', { instancePath, properties });
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async massSetProperty(paths: string[], propertyName: string, propertyValue: any) {
    if (!paths || paths.length === 0 || !propertyName) {
      throw new Error('Paths array and property name are required for mass_set_property');
    }
    const response = await this.client.request('/api/mass-set-property', {
      paths,
      propertyName,
      propertyValue
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async massGetProperty(paths: string[], propertyName: string) {
    if (!paths || paths.length === 0 || !propertyName) {
      throw new Error('Paths array and property name are required for mass_get_property');
    }
    const response = await this.client.request('/api/mass-get-property', {
      paths,
      propertyName
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  async createObject(className: string, parent: string, name?: string, properties?: Record<string, any>) {
    if (!className || !parent) {
      throw new Error('Class name and parent are required for create_object');
    }
    const response = await this.client.request('/api/create-object', {
      className,
      parent,
      name,
      properties
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async massCreateObjects(objects: Array<{className: string, parent: string, name?: string, properties?: Record<string, any>}>) {
    if (!objects || objects.length === 0) {
      throw new Error('Objects array is required for mass_create_objects');
    }
    const response = await this.client.request('/api/mass-create-objects', { objects });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async deleteObject(instancePath: string) {
    if (!instancePath) {
      throw new Error('Instance path is required for delete_object');
    }
    const response = await this.client.request('/api/delete-object', { instancePath });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  async smartDuplicate(
    instancePath: string,
    count: number,
    options?: {
      namePattern?: string;
      positionOffset?: [number, number, number];
      rotationOffset?: [number, number, number];
      scaleOffset?: [number, number, number];
      propertyVariations?: Record<string, any[]>;
      targetParents?: string[];
    }
  ) {
    if (!instancePath || count < 1) {
      throw new Error('Instance path and count > 0 are required for smart_duplicate');
    }
    const response = await this.client.request('/api/smart-duplicate', {
      instancePath,
      count,
      options
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async massDuplicate(
    duplications: Array<{
      instancePath: string;
      count: number;
      options?: {
        namePattern?: string;
        positionOffset?: [number, number, number];
        rotationOffset?: [number, number, number];
        scaleOffset?: [number, number, number];
        propertyVariations?: Record<string, any[]>;
        targetParents?: string[];
      }
    }>
  ) {
    if (!duplications || duplications.length === 0) {
      throw new Error('Duplications array is required for mass_duplicate');
    }
    const response = await this.client.request('/api/mass-duplicate', { duplications });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }




  async getScriptSource(instancePath: string, startLine?: number, endLine?: number) {
    if (!instancePath) {
      throw new Error('Instance path is required for get_script_source');
    }
    const response = await this.client.request('/api/get-script-source', { instancePath, startLine, endLine });

    if (response.error) {
      return { content: [{ type: 'text', text: `Error: ${response.error}` }] };
    }

    const scriptTypeInfo: Record<string, string> = {
      'Script': 'Server Script, runs on the server only',
      'LocalScript': 'Local Script, runs on the client',
      'ModuleScript': 'Module Script, shared library loaded via require()',
    };

    const serviceInfo: Record<string, string> = {
      'Workspace': 'Workspace, 3D world replicated to all clients',
      'ServerScriptService': 'ServerScriptService, server only',
      'ServerStorage': 'ServerStorage, server only storage',
      'StarterGui': 'StarterGui, UI templates copied to each player',
      'StarterPlayerScripts': 'StarterPlayerScripts, client scripts',
      'StarterCharacterScripts': 'StarterCharacterScripts, character scripts',
      'ReplicatedStorage': 'ReplicatedStorage, shared server and client',
      'ReplicatedFirst': 'ReplicatedFirst, first to load on client',
    };

    const pathStr = (response.instancePath as string) || instancePath;
    const pathSegments = pathStr.split('.');
    const topService =
      typeof response.topService === 'string' && response.topService.length > 0
        ? response.topService
        : pathSegments[0] === 'game' ? (pathSegments[1] ?? 'game') : pathSegments[0];
    const typeNote = scriptTypeInfo[response.className as string] || (response.className as string);
    const serviceNote = serviceInfo[topService] || topService;

    const headerLines: string[] = [
      `Path:     ${pathStr}`,
      `Type:     ${typeNote}`,
      `Location: ${serviceNote}`,
      `Lines:    ${response.lineCount} total${
        response.isPartial ? ` (showing ${response.startLine}-${response.endLine})` : ''
      }`,
    ];

    if (response.enabled === false) {
      headerLines.push(`Status:   DISABLED`);
    }

    if (response.truncated) {
      headerLines.push(`Note:     Truncated to first 1000 lines, use startLine/endLine to read more`);
    }

    const header = headerLines.join('\n');
    const code = (response.numberedSource || response.source) as string;

    return {
      content: [{
        type: 'text',
        text: `${header}\n\n${code}`,
      }]
    };
  }

  async setScriptSource(instancePath: string, source: string) {
    if (!instancePath || typeof source !== 'string') {
      throw new Error('Instance path and source code string are required for set_script_source');
    }
    const response = await this.client.request('/api/set-script-source', { instancePath, source });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  async editScriptLines(instancePath: string, oldString: string, newString: string, startLine?: number) {
    if (!instancePath || typeof oldString !== 'string' || typeof newString !== 'string') {
      throw new Error('Instance path, old_string, and new_string are required for edit_script_lines');
    }
    const payload: Record<string, unknown> = { instancePath, old_string: oldString, new_string: newString };
    if (startLine !== undefined) payload.startLine = startLine;
    const response = await this.client.request('/api/edit-script-lines', payload);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async insertScriptLines(instancePath: string, afterLine: number, newContent: string) {
    if (!instancePath || typeof newContent !== 'string') {
      throw new Error('Instance path and newContent are required for insert_script_lines');
    }
    const response = await this.client.request('/api/insert-script-lines', { instancePath, afterLine: afterLine || 0, newContent });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async deleteScriptLines(instancePath: string, startLine: number, endLine: number) {
    if (!instancePath || !startLine || !endLine) {
      throw new Error('Instance path, startLine, and endLine are required for delete_script_lines');
    }
    const response = await this.client.request('/api/delete-script-lines', { instancePath, startLine, endLine });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  async grepScripts(
    pattern: string,
    options?: {
      caseSensitive?: boolean;
      usePattern?: boolean;
      contextLines?: number;
      maxResults?: number;
      maxResultsPerScript?: number;
      filesOnly?: boolean;
      path?: string;
      classFilter?: string;
    }
  ) {
    if (!pattern) {
      throw new Error('Pattern is required for grep_scripts');
    }
    const response = await this.client.request('/api/grep-scripts', {
      pattern,
      ...options
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async setAttribute(instancePath: string, attributeName: string, attributeValue: any, valueType?: string) {
    if (!instancePath || !attributeName) {
      throw new Error('Instance path and attribute name are required for set_attribute');
    }
    const response = await this.client.request('/api/set-attribute', { instancePath, attributeName, attributeValue, valueType });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getAttributes(instancePath: string) {
    if (!instancePath) {
      throw new Error('Instance path is required for get_attributes');
    }
    const response = await this.client.request('/api/get-attributes', { instancePath });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async deleteAttribute(instancePath: string, attributeName: string) {
    if (!instancePath || !attributeName) {
      throw new Error('Instance path and attribute name are required for delete_attribute');
    }
    const response = await this.client.request('/api/delete-attribute', { instancePath, attributeName });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  async getTags(instancePath: string) {
    if (!instancePath) {
      throw new Error('Instance path is required for get_tags');
    }
    const response = await this.client.request('/api/get-tags', { instancePath });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async addTag(instancePath: string, tagName: string) {
    if (!instancePath || !tagName) {
      throw new Error('Instance path and tag name are required for add_tag');
    }
    const response = await this.client.request('/api/add-tag', { instancePath, tagName });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async removeTag(instancePath: string, tagName: string) {
    if (!instancePath || !tagName) {
      throw new Error('Instance path and tag name are required for remove_tag');
    }
    const response = await this.client.request('/api/remove-tag', { instancePath, tagName });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getTagged(tagName: string) {
    if (!tagName) {
      throw new Error('Tag name is required for get_tagged');
    }
    const response = await this.client.request('/api/get-tagged', { tagName });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getSelection() {
    const response = await this.client.request('/api/get-selection', {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async executeLuau(code: string, target?: string) {
    if (!code) {
      throw new Error('Code is required for execute_luau');
    }
    const response = await this.client.request('/api/execute-luau', { code }, target || 'edit');
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async startPlaytest(mode: string, numPlayers?: number) {
    if (mode !== 'play' && mode !== 'run') {
      throw new Error('mode must be "play" or "run"');
    }
    const data: Record<string, unknown> = { mode };
    if (numPlayers !== undefined) {
      data.numPlayers = numPlayers;
    }
    const response = await this.client.request('/api/start-playtest', data);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async stopPlaytest() {
    const response = await this.client.request('/api/stop-playtest', {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getPlaytestOutput(target?: string) {
    const response = await this.client.request('/api/get-playtest-output', {}, target || 'edit');
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getConnectedInstances() {
    const instances = this.bridge.getInstances();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ instances, count: instances.length })
        }
      ]
    };
  }

  async undo() {
    const response = await this.client.request('/api/undo', {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async redo() {
    const response = await this.client.request('/api/redo', {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  private static findProjectRoot(startDir: string): string | null {
    let dir = path.resolve(startDir);
    for (;;) {
      if (fs.existsSync(path.join(dir, '.git')) || fs.existsSync(path.join(dir, 'package.json'))) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  }

  private static isDirectory(candidate: string | null | undefined): candidate is string {
    if (!candidate) return false;
    try {
      return fs.statSync(candidate).isDirectory();
    } catch {
      return false;
    }
  }

  private static ensureWritableDirectory(candidate: string, label: string): string {
    const resolved = path.resolve(candidate);
    try {
      fs.mkdirSync(resolved, { recursive: true });
    } catch (error) {
      throw new Error(`Unable to create ${label} build-library directory at ${resolved}: ${(error as Error).message}`);
    }
    if (!RobloxStudioTools.isDirectory(resolved)) {
      throw new Error(`${label} build-library path is not a directory: ${resolved}`);
    }
    try {
      fs.accessSync(resolved, fs.constants.W_OK);
    } catch (error) {
      throw new Error(`${label} build-library directory is not writable: ${resolved}. ${(error as Error).message}`);
    }
    return resolved;
  }

  private static _cachedLibraryPath: string | undefined;

  private static findLibraryPath(): string {
    if (RobloxStudioTools._cachedLibraryPath) return RobloxStudioTools._cachedLibraryPath;

    const overridePath = process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY || process.env.BUILD_LIBRARY_PATH;
    const cwd = path.resolve(process.cwd());
    const projectRoot = RobloxStudioTools.findProjectRoot(cwd);
    const homeLibraryPath = path.join(os.homedir(), '.robloxstudio-mcp', 'build-library');
    const projectLibraryPath = projectRoot ? path.join(projectRoot, 'build-library') : null;
    const cwdLibraryPath = path.join(cwd, 'build-library');

    let result: string;

    if (overridePath) {
      result = RobloxStudioTools.ensureWritableDirectory(overridePath, 'override');
    } else {
      const existing = [projectLibraryPath, cwdLibraryPath].find(
        c => c && RobloxStudioTools.isDirectory(c) && (() => { try { fs.accessSync(c, fs.constants.W_OK); return true; } catch { return false; } })()
      );
      if (existing) {
        result = path.resolve(existing);
      } else if (projectLibraryPath) {
        try {
          result = RobloxStudioTools.ensureWritableDirectory(projectLibraryPath, 'project-root');
        } catch (err) {
          console.error(`Warning: could not create build-library at project root (${projectLibraryPath}): ${(err as Error).message}. Falling back to home directory.`);
          result = RobloxStudioTools.ensureWritableDirectory(homeLibraryPath, 'home');
        }
      } else {
        result = RobloxStudioTools.ensureWritableDirectory(homeLibraryPath, 'home');
      }
    }

    RobloxStudioTools._cachedLibraryPath = result;
    return result;
  }

  async exportBuild(instancePath: string, outputId?: string, style: string = 'misc') {
    if (!instancePath) {
      throw new Error('Instance path is required for export_build');
    }
    const response = await this.client.request('/api/export-build', {
      instancePath,
      outputId,
      style
    }) as any;

    // Auto-save to library
    if (response && response.success && response.buildData) {
      const buildData = response.buildData;
      const buildId = buildData.id || `${style}/exported`;
      const filePath = path.join(RobloxStudioTools.findLibraryPath(), `${buildId}.json`);
      const dirPath = path.dirname(filePath);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(buildData, null, 2));
      response.savedTo = filePath;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  private normalizePalette(palette: Record<string, unknown>): Record<string, [string, string]> {
    if (!palette || typeof palette !== 'object' || Array.isArray(palette)) {
      throw new Error('palette must be an object mapping keys to [BrickColor, Material] tuples');
    }
    const normalized: Record<string, [string, string]> = {};
    for (const [key, value] of Object.entries(palette)) {
      if (!Array.isArray(value) || value.length < 2) {
        throw new Error(`Palette key "${key}" must map to [BrickColor, Material]`);
      }
      normalized[key] = [String(value[0]), String(value[1])];
    }
    if (Object.keys(normalized).length === 0) {
      throw new Error('palette must contain at least one key');
    }
    return normalized;
  }

  private normalizeBuildParts(parts: unknown, paletteKeys: Set<string>): any[][] {
    if (!Array.isArray(parts) || parts.length === 0) {
      throw new Error('parts must be a non-empty array');
    }

    const ALLOWED_SHAPES = new Set(['Block', 'Wedge', 'Cylinder', 'Ball', 'CornerWedge']);
    const normalized: any[][] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (Array.isArray(part)) {
        if (part.length < 10) {
          throw new Error(`Part ${i} must have at least 10 elements`);
        }
        const [px, py, pz, sx, sy, sz, rx, ry, rz, paletteKey, ...rest] = part;
        if (typeof paletteKey !== 'string' || !paletteKeys.has(paletteKey)) {
          throw new Error(`Part ${i} references unknown palette key "${paletteKey}"`);
        }
        const tuple: any[] = [px, py, pz, sx, sy, sz, rx, ry, rz, paletteKey];
        if (rest[0] !== undefined) {
          if (!ALLOWED_SHAPES.has(rest[0])) throw new Error(`Part ${i} has invalid shape "${rest[0]}"`);
          tuple.push(rest[0]);
        }
        if (rest[1] !== undefined) {
          if (!rest[0]) tuple.push('Block');
          tuple.push(rest[1]);
        }
        normalized.push(tuple);
        continue;
      }

      if (!part || typeof part !== 'object') {
        throw new Error(`Part ${i} must be an array or object`);
      }

      const r = part as Record<string, unknown>;
      const position = r.position as number[];
      const size = r.size as number[];
      const rotation = r.rotation as number[];
      const pk = r.paletteKey as string;

      if (!Array.isArray(position) || position.length !== 3) throw new Error(`Part ${i}: position must be [x,y,z]`);
      if (!Array.isArray(size) || size.length !== 3) throw new Error(`Part ${i}: size must be [x,y,z]`);
      if (!Array.isArray(rotation) || rotation.length !== 3) throw new Error(`Part ${i}: rotation must be [x,y,z]`);
      if (typeof pk !== 'string' || !paletteKeys.has(pk)) throw new Error(`Part ${i} references unknown palette key "${pk}"`);

      const tuple: any[] = [...position, ...size, ...rotation, pk];
      if (r.shape !== undefined) {
        if (!ALLOWED_SHAPES.has(r.shape as string)) throw new Error(`Part ${i} has invalid shape "${r.shape}"`);
        tuple.push(r.shape);
      }
      if (r.transparency !== undefined) {
        if (!r.shape) tuple.push('Block');
        tuple.push(r.transparency);
      }
      normalized.push(tuple);
    }

    return normalized;
  }

  async createBuild(
    id: string,
    style: string,
    palette: Record<string, any>,
    parts: unknown,
    bounds?: [number, number, number]
  ) {
    if (!id) {
      throw new Error('id is required for create_build');
    }

    const normalizedPalette = this.normalizePalette(palette);
    const normalizedParts = this.normalizeBuildParts(parts, new Set(Object.keys(normalizedPalette)));

    // Auto-compute bounds if not provided
    const computedBounds = bounds || computeBoundsFromParts(normalizedParts);

    const buildData = { id, style, bounds: computedBounds, palette: normalizedPalette, parts: normalizedParts };

    const filePath = path.join(RobloxStudioTools.findLibraryPath(), `${id}.json`);
    const dirPath = path.dirname(filePath);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(buildData, null, 2));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            id,
            style,
            bounds: computedBounds,
            partCount: normalizedParts.length,
            paletteKeys: Object.keys(normalizedPalette),
            savedTo: filePath
          })
        }
      ]
    };
  }

  async generateBuild(
    id: string,
    style: string,
    palette: Record<string, [string, string]>,
    code: string,
    seed?: number
  ) {
    if (!id || !palette || !code) {
      throw new Error('id, palette, and code are required for generate_build');
    }

    // Validate palette
    for (const [key, value] of Object.entries(palette)) {
      if (!Array.isArray(value) || value.length < 2 || value.length > 3) {
        throw new Error(`Palette key "${key}" must map to [BrickColor, Material] or [BrickColor, Material, MaterialVariant]`);
      }
    }

    // Run the build executor
    const result = runBuildExecutor(code, palette, seed);

    const buildData: Record<string, any> = {
      id,
      style,
      bounds: result.bounds,
      palette,
      parts: result.parts,
      generatorCode: code,
    };
    if (seed !== undefined) buildData.generatorSeed = seed;

    const filePath = path.join(RobloxStudioTools.findLibraryPath(), `${id}.json`);
    const dirPath = path.dirname(filePath);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(buildData, null, 2));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            id,
            style,
            bounds: result.bounds,
            partCount: result.partCount,
            paletteKeys: Object.keys(palette),
            savedTo: filePath
          })
        }
      ]
    };
  }

  async importBuild(buildData: Record<string, any> | string, targetPath: string, position?: [number, number, number]) {
    if (!buildData || !targetPath) {
      throw new Error('buildData (or library ID string) and targetPath are required for import_build');
    }

    // If buildData is a string, treat it as a library ID and load the file
    let resolved: Record<string, any>;
    if (typeof buildData === 'string') {
      const filePath = path.join(RobloxStudioTools.findLibraryPath(), `${buildData}.json`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Build not found in library: ${buildData}`);
      }
      resolved = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } else if (buildData.id && !buildData.parts) {
      // Object with just an id — try loading from library
      const filePath = path.join(RobloxStudioTools.findLibraryPath(), `${buildData.id}.json`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Build not found in library: ${buildData.id}`);
      }
      resolved = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } else {
      resolved = buildData;
    }

    const response = await this.client.request('/api/import-build', {
      buildData: resolved,
      targetPath,
      position
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async listLibrary(style?: string) {
    const libraryPath = RobloxStudioTools.findLibraryPath();
    const styles = style ? [style] : ['medieval', 'modern', 'nature', 'scifi', 'misc'];
    const builds: Array<{ id: string; style: string; bounds: number[]; partCount: number }> = [];

    for (const s of styles) {
      const dirPath = path.join(libraryPath, s);
      if (!fs.existsSync(dirPath)) continue;

      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
          const data = JSON.parse(content);
          builds.push({
            id: data.id || `${s}/${file.replace('.json', '')}`,
            style: data.style || s,
            bounds: data.bounds || [0, 0, 0],
            partCount: Array.isArray(data.parts) ? data.parts.length : 0
          });
        } catch (err) {
          console.error(`Warning: skipping invalid library file ${file}: ${(err as Error).message}`);
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ builds, total: builds.length })
        }
      ]
    };
  }

  async searchMaterials(query?: string, maxResults?: number) {
    const response = await this.client.request('/api/search-materials', {
      query: query ?? '',
      maxResults: maxResults ?? 50
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getBuild(id: string) {
    if (!id) {
      throw new Error('Build ID is required for get_build');
    }

    const filePath = path.join(RobloxStudioTools.findLibraryPath(), `${id}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Build not found in library: ${id}`);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Return metadata + code (but not the full parts array to save tokens)
    const result: Record<string, any> = {
      id: data.id,
      style: data.style,
      bounds: data.bounds,
      partCount: Array.isArray(data.parts) ? data.parts.length : 0,
      paletteKeys: data.palette ? Object.keys(data.palette) : [],
      palette: data.palette,
    };

    if (data.generatorCode) {
      result.generatorCode = data.generatorCode;
      result.generatorSeed = data.generatorSeed;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result)
        }
      ]
    };
  }

  async importScene(
    sceneData: {
      models?: Record<string, string>;
      place?: Array<
        [string, number[], number[]?]
        | { modelKey: string; position: number[]; rotation?: number[] }
      >;
      custom?: Array<{ n: string; o: number[]; palette: Record<string, [string, string]>; parts: any[][] }>;
    },
    targetPath: string = 'game.Workspace'
  ) {
    if (!sceneData) {
      throw new Error('sceneData is required for import_scene');
    }

    const libraryPath = RobloxStudioTools.findLibraryPath();
    const expandedBuilds: Array<{ buildData: Record<string, any>; position: number[]; rotation: number[]; name: string }> = [];

    // Resolve model references from library
    const modelMap = sceneData.models || {};
    const placements = sceneData.place || [];

    const isVec3Tuple = (value: unknown): value is [number, number, number] => {
      return Array.isArray(value)
        && value.length === 3
        && value.every(component => typeof component === 'number' && Number.isFinite(component));
    };

    for (const [placementIndex, placement] of placements.entries()) {
      let modelKey: string;
      let position: [number, number, number];
      let rotation: [number, number, number] | undefined;
      let validatedKeyPath: string;

      if (Array.isArray(placement)) {
        if (placement.length < 2 || placement.length > 3) {
          throw new Error(
            `Invalid sceneData.place[${placementIndex}]: expected [modelKey, [x,y,z], [rotX?,rotY?,rotZ?]]`
          );
        }
        const [tupleModelKey, tuplePosition, tupleRotation] = placement;
        if (typeof tupleModelKey !== 'string' || tupleModelKey.trim() === '') {
          throw new Error(`Invalid sceneData.place[${placementIndex}][0]: model key must be a non-empty string`);
        }
        modelKey = tupleModelKey.trim();
        validatedKeyPath = `sceneData.place[${placementIndex}][0]`;
        if (!isVec3Tuple(tuplePosition)) {
          throw new Error(`Invalid sceneData.place[${placementIndex}][1]: position must be a numeric [x,y,z] tuple`);
        }
        position = tuplePosition;
        if (tupleRotation !== undefined) {
          if (!isVec3Tuple(tupleRotation)) {
            throw new Error(
              `Invalid sceneData.place[${placementIndex}][2]: rotation must be a numeric [x,y,z] tuple when provided`
            );
          }
          rotation = tupleRotation;
        }
      } else if (placement && typeof placement === 'object') {
        const placementRecord = placement as Record<string, unknown>;
        const objectModelKey = placementRecord.modelKey;
        const objectPosition = placementRecord.position;
        const objectRotation = placementRecord.rotation;
        if (typeof objectModelKey !== 'string' || objectModelKey.trim() === '') {
          throw new Error(`Invalid sceneData.place[${placementIndex}].modelKey: model key must be a non-empty string`);
        }
        if (!isVec3Tuple(objectPosition)) {
          throw new Error(`Invalid sceneData.place[${placementIndex}].position: must be a numeric [x,y,z] tuple`);
        }
        if (objectRotation !== undefined && !isVec3Tuple(objectRotation)) {
          throw new Error(
            `Invalid sceneData.place[${placementIndex}].rotation: must be a numeric [x,y,z] tuple when provided`
          );
        }
        modelKey = objectModelKey.trim();
        validatedKeyPath = `sceneData.place[${placementIndex}].modelKey`;
        position = objectPosition;
        rotation = objectRotation as [number, number, number] | undefined;
      } else {
        throw new Error(
          `Invalid sceneData.place[${placementIndex}]: expected an object placement or [modelKey, [x,y,z], [rotX?,rotY?,rotZ?]] tuple`
        );
      }

      const buildId = modelMap[modelKey];
      if (!buildId) {
        throw new Error(
          `Invalid ${validatedKeyPath}: model key "${modelKey}" is not defined in sceneData.models`
        );
      }

      // Load build data from library
      const filePath = path.join(libraryPath, `${buildId}.json`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Build not found in library: ${buildId}`);
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const buildData = JSON.parse(content);
      const buildName = buildId.split('/').pop() || buildId;

      expandedBuilds.push({
        buildData,
        position,
        rotation: rotation || [0, 0, 0],
        name: buildName
      });
    }

    // Add custom inline builds
    const customs = sceneData.custom || [];
    for (const custom of customs) {
      expandedBuilds.push({
        buildData: {
          palette: custom.palette,
          parts: custom.parts
        },
        position: custom.o || [0, 0, 0],
        rotation: [0, 0, 0],
        name: custom.n || 'Custom'
      });
    }

    if (expandedBuilds.length === 0) {
      throw new Error('No builds to import — check model references and library');
    }

    // Send expanded builds to plugin
    const response = await this.client.request('/api/import-scene', {
      expandedBuilds,
      targetPath
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  // === Asset Tools ===

  async searchAssets(
    assetType: string,
    query?: string,
    maxResults?: number,
    sortBy?: string,
    verifiedCreatorsOnly?: boolean
  ) {
    if (!this.openCloudClient.hasApiKey()) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'ROBLOX_OPEN_CLOUD_API_KEY environment variable is not set. Set it to use Creator Store asset tools.' })
        }]
      };
    }

    const response = await this.openCloudClient.searchAssets({
      searchCategoryType: assetType as any,
      query,
      maxPageSize: maxResults,
      sortCategory: sortBy as any,
      includeOnlyVerifiedCreators: verifiedCreatorsOnly,
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response)
      }]
    };
  }

  async getAssetDetails(assetId: number) {
    if (!assetId) {
      throw new Error('Asset ID is required for get_asset_details');
    }

    if (this.cookieClient.hasCookie() && !this.openCloudClient.hasApiKey()) {
      const results = await this.cookieClient.getAssetDetails([assetId]);
      const asset = results[0];
      if (!asset) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Asset not found or not owned by authenticated user' }) }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(asset) }] };
    }

    if (!this.openCloudClient.hasApiKey()) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'No auth configured. Set ROBLOSECURITY or ROBLOX_OPEN_CLOUD_API_KEY env var.' })
        }]
      };
    }

    const response = await this.openCloudClient.getAssetDetails(assetId);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response)
      }]
    };
  }

  async getAssetThumbnail(assetId: number, size?: string) {
    if (!assetId) {
      throw new Error('Asset ID is required for get_asset_thumbnail');
    }
    if (!this.openCloudClient.hasApiKey()) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'ROBLOX_OPEN_CLOUD_API_KEY environment variable is not set. Set it to use Creator Store asset tools.' })
        }]
      };
    }

    const result = await this.openCloudClient.getAssetThumbnail(assetId, size as any);
    if (!result) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Thumbnail not available for this asset' })
        }]
      };
    }

    return {
      content: [{
        type: 'image',
        data: result.base64,
        mimeType: result.mimeType,
      }]
    };
  }

  async insertAsset(assetId: number, parentPath?: string, position?: { x: number; y: number; z: number }) {
    if (!assetId) {
      throw new Error('Asset ID is required for insert_asset');
    }
    const response = await this.client.request('/api/insert-asset', {
      assetId,
      parentPath: parentPath || 'game.Workspace',
      position
    });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response)
      }]
    };
  }

  async previewAsset(assetId: number, includeProperties?: boolean, maxDepth?: number) {
    if (!assetId) {
      throw new Error('Asset ID is required for preview_asset');
    }
    const response = await this.client.request('/api/preview-asset', {
      assetId,
      includeProperties: includeProperties ?? true,
      maxDepth: maxDepth ?? 10
    });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response)
      }]
    };
  }

  // Decal asset IDs are the wrapper asset; ImageLabel.Image needs the underlying image
  // content ID. The only reliable cross-auth way to resolve this is InsertService:LoadAsset
  // via the connected Studio plugin — the unauthenticated economy endpoint returns 401.
  private async resolveImageId(decalAssetId: string): Promise<string | null> {
    const code = `
      local InsertService = game:GetService("InsertService")
      local ok, result = pcall(function() return InsertService:LoadAsset(${decalAssetId}) end)
      if not ok then return nil end
      local decal = result:FindFirstChildWhichIsA("Decal", true)
      local id = decal and decal.Texture:match("(%d+)") or nil
      result:Destroy()
      return id
    `;
    try {
      const response = await this.client.request('/api/execute-luau', { code }, 'edit') as { returnValue?: unknown };
      const returnValue = response?.returnValue;
      if (returnValue !== undefined && returnValue !== null && /^\d+$/.test(String(returnValue))) {
        return String(returnValue);
      }
    } catch (err) {
      console.error(`Warning: could not resolve decal image ID (plugin may be disconnected): ${(err as Error).message}`);
    }
    return null;
  }

  async uploadAsset(
    filePath: string,
    assetType: string,
    displayName: string,
    description?: string,
    userId?: string,
    groupId?: string
  ) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    if (assetType === 'Decal' && this.cookieClient.hasCookie()) {
      const result = await this.cookieClient.uploadDecal(fileContent, displayName, description || '');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            done: true,
            response: {
              assetId: String(result.assetId),
              displayName,
              assetType,
              decalId: String(result.assetId),
              imageId: String(result.backingAssetId),
            },
          })
        }]
      };
    }

    if (!this.openCloudClient.hasApiKey()) {
      const cookieHint = assetType === 'Decal'
        ? ' Alternatively, set ROBLOSECURITY to use cookie auth.'
        : '';
      throw new Error(
        `No auth configured for ${assetType} upload. Set ROBLOX_OPEN_CLOUD_API_KEY (needs asset:write scope).${cookieHint}`
      );
    }

    const resolvedGroupId = groupId || process.env.ROBLOX_CREATOR_GROUP_ID;
    const resolvedUserId = userId || process.env.ROBLOX_CREATOR_USER_ID;

    if (!resolvedUserId && !resolvedGroupId) {
      throw new Error(
        'Creator identity required for Open Cloud upload. Set ROBLOX_CREATOR_USER_ID or ROBLOX_CREATOR_GROUP_ID, or pass userId/groupId as parameters.'
      );
    }

    const creator: { userId?: string; groupId?: string } = {};
    if (resolvedGroupId) {
      creator.groupId = resolvedGroupId;
    } else {
      creator.userId = resolvedUserId;
    }

    const result = await this.openCloudClient.createAsset(
      {
        assetType: assetType as 'Audio' | 'Decal' | 'Model' | 'Animation' | 'Video',
        displayName,
        description: description || '',
        creationContext: { creator },
      },
      fileContent,
      fileName
    );

    // Decals: also resolve the underlying image content ID for ImageLabel.Image usage.
    if (assetType === 'Decal') {
      const decalId = result.response?.assetId;
      const imageId = decalId ? await this.resolveImageId(decalId) : null;
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            ...result,
            decalId: decalId ?? null,
            imageId,
          })
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result)
      }]
    };
  }

  async simulateMouseInput(action: string, x: number, y: number, button?: string, scrollDirection?: string, target?: string) {
    if (!action) {
      throw new Error('action is required for simulate_mouse_input');
    }
    const response = await this.client.request('/api/simulate-mouse-input', {
      action, x, y, button, scrollDirection
    }, target || 'edit');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response)
      }]
    };
  }

  async simulateKeyboardInput(keyCode: string, action?: string, duration?: number, target?: string) {
    if (!keyCode) {
      throw new Error('keyCode is required for simulate_keyboard_input');
    }
    const response = await this.client.request('/api/simulate-keyboard-input', {
      keyCode, action, duration
    }, target || 'edit');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response)
      }]
    };
  }

  async characterNavigation(position?: number[], instancePath?: string, waitForCompletion?: boolean, timeout?: number, target?: string) {
    if (!position && !instancePath) {
      throw new Error('Either position or instancePath is required for character_navigation');
    }
    const response = await this.client.request('/api/character-navigation', {
      position, instancePath, waitForCompletion, timeout
    }, target || 'edit');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response)
      }]
    };
  }

  async cloneObject(instancePath: string, targetParentPath: string) {
    if (!instancePath || !targetParentPath) {
      throw new Error('instancePath and targetParentPath are required for clone_object');
    }
    const response = await this.client.request('/api/clone-object', { instancePath, targetParentPath });
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async getDescendants(instancePath: string, maxDepth?: number, classFilter?: string) {
    if (!instancePath) {
      throw new Error('instancePath is required for get_descendants');
    }
    const response = await this.client.request('/api/get-descendants', { instancePath, maxDepth, classFilter });
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async compareInstances(instancePathA: string, instancePathB: string) {
    if (!instancePathA || !instancePathB) {
      throw new Error('instancePathA and instancePathB are required for compare_instances');
    }
    const response = await this.client.request('/api/compare-instances', { instancePathA, instancePathB });
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async getOutputLog(maxEntries?: number, messageType?: string) {
    const response = await this.client.request('/api/get-output-log', { maxEntries, messageType });
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async bulkSetAttributes(instancePath: string, attributes: Record<string, unknown>) {
    if (!instancePath || !attributes) {
      throw new Error('instancePath and attributes are required for bulk_set_attributes');
    }
    const response = await this.client.request('/api/bulk-set-attributes', { instancePath, attributes });
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async findAndReplaceInScripts(
    pattern: string,
    replacement: string,
    options?: {
      caseSensitive?: boolean;
      usePattern?: boolean;
      path?: string;
      classFilter?: string;
      dryRun?: boolean;
      maxReplacements?: number;
    }
  ) {
    if (!pattern) {
      throw new Error('pattern is required for find_and_replace_in_scripts');
    }
    if (replacement === undefined || replacement === null) {
      throw new Error('replacement is required for find_and_replace_in_scripts');
    }
    const response = await this.client.request('/api/find-and-replace-in-scripts', {
      pattern,
      replacement,
      ...options
    });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response)
      }]
    };
  }

  async captureScreenshot() {
    const response = await this.client.request('/api/capture-screenshot', {}) as RawImageCaptureResponse;

    if (response.error) {
      return {
        content: [{
          type: 'text',
          text: response.error,
        }]
      };
    }

    const pngBuffer = encodePngFromRgbaResponse(response);

    return {
      content: [{
        type: 'image',
        data: pngBuffer.toString('base64'),
        mimeType: 'image/png',
      }]
    };
  }
}
