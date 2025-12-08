import { StudioHttpClient } from './studio-client.js';
import { BridgeService } from '../bridge-service.js';

export class RobloxStudioTools {
  private client: StudioHttpClient;

  constructor(bridge: BridgeService) {
    this.client = new StudioHttpClient(bridge);
  }

  private formatResponse(response: any) {
    return {
      content: [{ type: 'text', text: JSON.stringify(response, null, 2) }]
    };
  }

  // ============================================
  // EXPLORATION TOOLS (7 tools)
  // ============================================

  async getFileTree(path: string = '') {
    const response = await this.client.request('/api/file-tree', { path });
    return this.formatResponse(response);
  }

  async getPlaceInfo() {
    const response = await this.client.request('/api/place-info', {});
    return this.formatResponse(response);
  }

  async getServices(serviceName?: string) {
    const response = await this.client.request('/api/services', { serviceName });
    return this.formatResponse(response);
  }

  async getProjectStructure(path?: string, maxDepth?: number, scriptsOnly?: boolean) {
    const response = await this.client.request('/api/project-structure', {
      path, maxDepth, scriptsOnly
    });
    return this.formatResponse(response);
  }

  async getInstanceProperties(instancePath: string) {
    if (!instancePath) throw new Error('Instance path is required');
    const response = await this.client.request('/api/instance-properties', { instancePath });
    return this.formatResponse(response);
  }

  async getInstanceChildren(instancePath: string) {
    if (!instancePath) throw new Error('Instance path is required');
    const response = await this.client.request('/api/instance-children', { instancePath });
    return this.formatResponse(response);
  }

  async getClassInfo(className: string) {
    if (!className) throw new Error('Class name is required');
    const response = await this.client.request('/api/class-info', { className });
    return this.formatResponse(response);
  }

  // ============================================
  // SEARCH (1 consolidated tool)
  // ============================================

  async search(
    query: string,
    searchType: 'name' | 'class' | 'property' | 'content' = 'name',
    options?: {
      propertyName?: string;
      propertyValue?: string;
    }
  ) {
    if (!query) throw new Error('Query is required');
    const response = await this.client.request('/api/search', {
      query,
      searchType,
      propertyName: options?.propertyName,
      propertyValue: options?.propertyValue
    });
    return this.formatResponse(response);
  }

  // ============================================
  // PROPERTY TOOLS (2 tools)
  // ============================================

  async getProperty(
    paths: string | string[],
    propertyName: string
  ) {
    const pathArray = Array.isArray(paths) ? paths : [paths];
    if (pathArray.length === 0 || !propertyName) {
      throw new Error('Paths and property name are required');
    }
    const response = await this.client.request('/api/get-property', {
      paths: pathArray,
      propertyName
    });
    return this.formatResponse(response);
  }

  async setProperty(
    paths: string | string[],
    propertyName: string,
    propertyValue: any,
    options?: {
      operation?: 'set' | 'add' | 'multiply' | 'divide' | 'subtract';
      component?: 'X' | 'Y' | 'Z';
      formula?: string;
      variables?: Record<string, any>;
    }
  ) {
    const pathArray = Array.isArray(paths) ? paths : [paths];
    if (pathArray.length === 0 || !propertyName) {
      throw new Error('Paths and property name are required');
    }
    const response = await this.client.request('/api/set-property', {
      paths: pathArray,
      propertyName,
      propertyValue,
      operation: options?.operation || 'set',
      component: options?.component,
      formula: options?.formula,
      variables: options?.variables
    });
    return this.formatResponse(response);
  }

  // ============================================
  // OBJECT MANAGEMENT (2 tools)
  // ============================================

  async create(
    objects: {
      className: string;
      parent: string;
      name?: string;
      properties?: Record<string, any>;
    } | Array<{
      className: string;
      parent: string;
      name?: string;
      properties?: Record<string, any>;
    }>
  ) {
    const objectArray = Array.isArray(objects) ? objects : [objects];
    if (objectArray.length === 0) throw new Error('At least one object definition is required');

    for (const obj of objectArray) {
      if (!obj.className || !obj.parent) {
        throw new Error('Each object requires className and parent');
      }
    }

    const response = await this.client.request('/api/create', { objects: objectArray });
    return this.formatResponse(response);
  }

  async delete(instancePaths: string | string[]) {
    const pathArray = Array.isArray(instancePaths) ? instancePaths : [instancePaths];
    if (pathArray.length === 0) throw new Error('At least one instance path is required');
    const response = await this.client.request('/api/delete', { paths: pathArray });
    return this.formatResponse(response);
  }

  // ============================================
  // DUPLICATION (1 tool)
  // ============================================

  async duplicate(
    duplications: {
      instancePath: string;
      count: number;
      options?: {
        namePattern?: string;
        positionOffset?: [number, number, number];
        rotationOffset?: [number, number, number];
        scaleOffset?: [number, number, number];
        propertyVariations?: Record<string, any[]>;
        targetParents?: string[];
      };
    } | Array<{
      instancePath: string;
      count: number;
      options?: {
        namePattern?: string;
        positionOffset?: [number, number, number];
        rotationOffset?: [number, number, number];
        scaleOffset?: [number, number, number];
        propertyVariations?: Record<string, any[]>;
        targetParents?: string[];
      };
    }>
  ) {
    const dupArray = Array.isArray(duplications) ? duplications : [duplications];
    if (dupArray.length === 0) throw new Error('At least one duplication is required');

    for (const dup of dupArray) {
      if (!dup.instancePath || dup.count < 1) {
        throw new Error('Each duplication requires instancePath and count > 0');
      }
    }

    const response = await this.client.request('/api/duplicate', { duplications: dupArray });
    return this.formatResponse(response);
  }

  // ============================================
  // SCRIPT TOOLS (3 tools)
  // ============================================

  async getScriptSource(instancePath: string, startLine?: number, endLine?: number) {
    if (!instancePath) throw new Error('Instance path is required');
    const response = await this.client.request('/api/get-script-source', {
      instancePath, startLine, endLine
    });
    return this.formatResponse(response);
  }

  async setScriptSource(instancePath: string, source: string) {
    if (!instancePath || typeof source !== 'string') {
      throw new Error('Instance path and source are required');
    }
    const response = await this.client.request('/api/set-script-source', { instancePath, source });
    return this.formatResponse(response);
  }

  async editScript(
    instancePath: string,
    action: 'replace' | 'insert' | 'delete',
    options: {
      startLine: number;
      endLine?: number;
      content?: string;
    }
  ) {
    if (!instancePath) throw new Error('Instance path is required');
    if (!options.startLine) throw new Error('startLine is required');

    const response = await this.client.request('/api/edit-script', {
      instancePath,
      action,
      startLine: options.startLine,
      endLine: options.endLine || options.startLine,
      content: options.content || ''
    });
    return this.formatResponse(response);
  }

  // ============================================
  // ATTRIBUTES & TAGS (2 tools)
  // ============================================

  async attribute(
    instancePath: string,
    action: 'get' | 'get_all' | 'set' | 'delete',
    options?: {
      name?: string;
      value?: any;
      valueType?: string;
    }
  ) {
    if (!instancePath) throw new Error('Instance path is required');
    if ((action === 'get' || action === 'set' || action === 'delete') && !options?.name) {
      throw new Error('Attribute name is required for this action');
    }

    const response = await this.client.request('/api/attribute', {
      instancePath,
      action,
      attributeName: options?.name,
      attributeValue: options?.value,
      valueType: options?.valueType
    });
    return this.formatResponse(response);
  }

  async tag(
    action: 'get' | 'add' | 'remove' | 'find',
    options: {
      instancePath?: string;
      tagName?: string;
    }
  ) {
    if (action === 'find' && !options.tagName) {
      throw new Error('tagName is required for find action');
    }
    if ((action === 'get' || action === 'add' || action === 'remove') && !options.instancePath) {
      throw new Error('instancePath is required for this action');
    }
    if ((action === 'add' || action === 'remove') && !options.tagName) {
      throw new Error('tagName is required for add/remove actions');
    }

    const response = await this.client.request('/api/tag', {
      action,
      instancePath: options.instancePath,
      tagName: options.tagName
    });
    return this.formatResponse(response);
  }

  // ============================================
  // ASSET TOOLS (5 tools)
  // ============================================

  async insertAsset(
    assetId: number,
    parentPath: string = 'game.Workspace',
    position?: { x: number; y: number; z: number }
  ) {
    if (!assetId) throw new Error('Asset ID is required');
    const response = await this.client.request('/api/insert-asset', {
      assetId, parentPath, position
    });
    return this.formatResponse(response);
  }

  async previewAsset(
    assetId: number,
    includeProperties: boolean = true,
    maxDepth: number = 10
  ) {
    if (!assetId) throw new Error('Asset ID is required');
    const response = await this.client.request('/api/preview-asset', {
      assetId, includeProperties, maxDepth
    });
    return this.formatResponse(response);
  }
}