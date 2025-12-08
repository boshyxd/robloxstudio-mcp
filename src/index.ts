#!/usr/bin/env node

/**
 * Roblox Studio MCP Server
 * 
 * This server provides Model Context Protocol (MCP) tools for interacting with Roblox Studio.
 * It allows AI assistants to access Studio data, scripts, and objects through a bridge plugin.
 * 
 * Usage:
 *   npx robloxstudio-mcp
 * 
 * Or add to your MCP configuration:
 *   "robloxstudio": {
 *     "command": "npx",
 *     "args": ["-y", "robloxstudio-mcp"]
 *   }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { createHttpServer } from './http-server.js';
import { RobloxStudioTools } from './tools/index.js';
import { BridgeService } from './bridge-service.js';
import { OpenCloudClient } from './opencloud-client.js';

class RobloxStudioMCPServer {
  private server: Server;
  private tools: RobloxStudioTools;
  private bridge: BridgeService;
  private openCloud: OpenCloudClient;

  constructor() {
    this.server = new Server(
      {
        name: 'robloxstudio-mcp',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.bridge = new BridgeService();
    this.tools = new RobloxStudioTools(this.bridge);
    this.openCloud = new OpenCloudClient();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // ============================================
          // EXPLORATION TOOLS (7 tools)
          // ============================================
          {
            name: 'get_file_tree',
            description: 'Get the complete hierarchy of the Roblox project including scripts, models, and folders.',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Optional path to start from (defaults to game root)',
                  default: ''
                }
              }
            }
          },
          {
            name: 'get_place_info',
            description: 'Get place ID, name, and game settings.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'get_services',
            description: 'Get available Roblox services and their children.',
            inputSchema: {
              type: 'object',
              properties: {
                serviceName: { type: 'string', description: 'Optional specific service name' }
              }
            }
          },
          {
            name: 'get_project_structure',
            description: 'Get smart game hierarchy with depth control. Use maxDepth 5-10 for thorough exploration.',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to start from', default: '' },
                maxDepth: { type: 'number', description: 'Max depth (default 3, recommend 5-10)', default: 3 },
                scriptsOnly: { type: 'boolean', description: 'Show only scripts', default: false }
              }
            }
          },
          {
            name: 'get_instance_properties',
            description: 'Get all properties of a specific instance.',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: { type: 'string', description: 'Path to the instance' }
              },
              required: ['instancePath']
            }
          },
          {
            name: 'get_instance_children',
            description: 'Get child objects and their types.',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: { type: 'string', description: 'Path to the parent instance' }
              },
              required: ['instancePath']
            }
          },
          {
            name: 'get_class_info',
            description: 'Get available properties/methods for a Roblox class.',
            inputSchema: {
              type: 'object',
              properties: {
                className: { type: 'string', description: 'Roblox class name' }
              },
              required: ['className']
            }
          },

          // ============================================
          // SEARCH (1 consolidated tool)
          // ============================================
          {
            name: 'search',
            description: 'Unified search for instances by name, class, property value, or script content.',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                searchType: {
                  type: 'string',
                  enum: ['name', 'class', 'property', 'content'],
                  description: 'Type of search',
                  default: 'name'
                },
                propertyName: { type: 'string', description: 'Property name (for property search)' },
                propertyValue: { type: 'string', description: 'Property value (for property search)' }
              },
              required: ['query']
            }
          },

          // ============================================
          // PROPERTY TOOLS (2 tools)
          // ============================================
          {
            name: 'get_property',
            description: 'Get a property value from one or more instances.',
            inputSchema: {
              type: 'object',
              properties: {
                paths: {
                  oneOf: [
                    { type: 'string' },
                    { type: 'array', items: { type: 'string' } }
                  ],
                  description: 'Instance path(s)'
                },
                propertyName: { type: 'string', description: 'Property name to get' }
              },
              required: ['paths', 'propertyName']
            }
          },
          {
            name: 'set_property',
            description: 'Set property on one or more instances. Supports absolute values, relative operations (add/multiply/etc), and formulas.',
            inputSchema: {
              type: 'object',
              properties: {
                paths: {
                  oneOf: [
                    { type: 'string' },
                    { type: 'array', items: { type: 'string' } }
                  ],
                  description: 'Instance path(s)'
                },
                propertyName: { type: 'string', description: 'Property name to set' },
                propertyValue: { description: 'Value to set (ignored if formula provided)' },
                operation: {
                  type: 'string',
                  enum: ['set', 'add', 'subtract', 'multiply', 'divide'],
                  description: 'Operation mode (default: set)',
                  default: 'set'
                },
                component: {
                  type: 'string',
                  enum: ['X', 'Y', 'Z'],
                  description: 'Vector component for Vector3/UDim2'
                },
                formula: { type: 'string', description: 'Math formula (e.g., "index * 50")' },
                variables: { type: 'object', description: 'Variables for formula' }
              },
              required: ['paths', 'propertyName']
            }
          },

          // ============================================
          // OBJECT MANAGEMENT (2 tools)
          // ============================================
          {
            name: 'create',
            description: 'Create one or more Roblox objects. Supports batch creation with properties.',
            inputSchema: {
              type: 'object',
              properties: {
                objects: {
                  oneOf: [
                    {
                      type: 'object',
                      properties: {
                        className: { type: 'string' },
                        parent: { type: 'string' },
                        name: { type: 'string' },
                        properties: { type: 'object' }
                      },
                      required: ['className', 'parent']
                    },
                    {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          className: { type: 'string' },
                          parent: { type: 'string' },
                          name: { type: 'string' },
                          properties: { type: 'object' }
                        },
                        required: ['className', 'parent']
                      }
                    }
                  ],
                  description: 'Object(s) to create'
                }
              },
              required: ['objects']
            }
          },
          {
            name: 'delete',
            description: 'Delete one or more Roblox objects.',
            inputSchema: {
              type: 'object',
              properties: {
                paths: {
                  oneOf: [
                    { type: 'string' },
                    { type: 'array', items: { type: 'string' } }
                  ],
                  description: 'Instance path(s) to delete'
                }
              },
              required: ['paths']
            }
          },

          // ============================================
          // DUPLICATION (1 tool)
          // ============================================
          {
            name: 'duplicate',
            description: 'Smart duplicate with naming patterns, position/rotation offsets, and property variations. Supports batch operations.',
            inputSchema: {
              type: 'object',
              properties: {
                duplications: {
                  oneOf: [
                    {
                      type: 'object',
                      properties: {
                        instancePath: { type: 'string' },
                        count: { type: 'number' },
                        options: {
                          type: 'object',
                          properties: {
                            namePattern: { type: 'string', description: 'Pattern with {n} placeholder' },
                            positionOffset: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
                            rotationOffset: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
                            scaleOffset: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
                            propertyVariations: { type: 'object' },
                            targetParents: { type: 'array', items: { type: 'string' } }
                          }
                        }
                      },
                      required: ['instancePath', 'count']
                    },
                    {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          instancePath: { type: 'string' },
                          count: { type: 'number' },
                          options: { type: 'object' }
                        },
                        required: ['instancePath', 'count']
                      }
                    }
                  ],
                  description: 'Duplication specification(s)'
                }
              },
              required: ['duplications']
            }
          },

          // ============================================
          // SCRIPT TOOLS (3 tools)
          // ============================================
          {
            name: 'get_script_source',
            description: 'Read script source code. Use startLine/endLine for large scripts.',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: { type: 'string', description: 'Path to the script' },
                startLine: { type: 'number', description: 'Start line (1-indexed)' },
                endLine: { type: 'number', description: 'End line (inclusive)' }
              },
              required: ['instancePath']
            }
          },
          {
            name: 'set_script_source',
            description: 'Replace entire script source code.',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: { type: 'string', description: 'Path to the script' },
                source: { type: 'string', description: 'New source code' }
              },
              required: ['instancePath', 'source']
            }
          },
          {
            name: 'edit_script',
            description: 'Partial script editing: replace, insert, or delete lines.',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: { type: 'string', description: 'Path to the script' },
                action: {
                  type: 'string',
                  enum: ['replace', 'insert', 'delete'],
                  description: 'Edit action'
                },
                startLine: { type: 'number', description: 'Start line (1-indexed)' },
                endLine: { type: 'number', description: 'End line (for replace/delete)' },
                content: { type: 'string', description: 'New content (for replace/insert)' }
              },
              required: ['instancePath', 'action', 'startLine']
            }
          },

          // ============================================
          // ATTRIBUTES & TAGS (2 tools)
          // ============================================
          {
            name: 'attribute',
            description: 'Manage instance attributes: get, get_all, set, or delete.',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: { type: 'string', description: 'Path to the instance' },
                action: {
                  type: 'string',
                  enum: ['get', 'get_all', 'set', 'delete'],
                  description: 'Action to perform'
                },
                name: { type: 'string', description: 'Attribute name (for get/set/delete)' },
                value: { description: 'Attribute value (for set)' },
                valueType: { type: 'string', description: 'Type hint: Vector3, Color3, UDim2, BrickColor' }
              },
              required: ['instancePath', 'action']
            }
          },
          {
            name: 'tag',
            description: 'Manage CollectionService tags: get, add, remove, or find instances by tag.',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['get', 'add', 'remove', 'find'],
                  description: 'Action to perform'
                },
                instancePath: { type: 'string', description: 'Instance path (for get/add/remove)' },
                tagName: { type: 'string', description: 'Tag name (for add/remove/find)' }
              },
              required: ['action']
            }
          },

          // ============================================
          // ASSET TOOLS (5 tools - conditionally added)
          // ============================================
          {
            name: 'insert_asset',
            description: 'Insert a Creator Store asset into the scene by ID. Supports positioning.',
            inputSchema: {
              type: 'object',
              properties: {
                assetId: { type: 'number', description: 'Asset ID to insert' },
                parentPath: { type: 'string', description: 'Parent path (default: game.Workspace)', default: 'game.Workspace' },
                position: {
                  type: 'object',
                  properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
                  description: 'Optional position'
                }
              },
              required: ['assetId']
            }
          },
          {
            name: 'preview_asset',
            description: 'Inspect asset hierarchy/properties without inserting. Loads temporarily then cleans up.',
            inputSchema: {
              type: 'object',
              properties: {
                assetId: { type: 'number', description: 'Asset ID to preview' },
                includeProperties: { type: 'boolean', description: 'Include detailed properties', default: true },
                maxDepth: { type: 'number', description: 'Max hierarchy depth', default: 10 }
              },
              required: ['assetId']
            }
          },
          // Open Cloud tools added conditionally below
          ...(this.openCloud.hasApiKey() ? this.getOpenCloudTools() : [])
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Exploration
          case 'get_file_tree':
            return await this.tools.getFileTree((args as any)?.path || '');
          case 'get_place_info':
            return await this.tools.getPlaceInfo();
          case 'get_services':
            return await this.tools.getServices((args as any)?.serviceName);
          case 'get_project_structure':
            return await this.tools.getProjectStructure((args as any)?.path, (args as any)?.maxDepth, (args as any)?.scriptsOnly);
          case 'get_instance_properties':
            return await this.tools.getInstanceProperties((args as any)?.instancePath);
          case 'get_instance_children':
            return await this.tools.getInstanceChildren((args as any)?.instancePath);
          case 'get_class_info':
            return await this.tools.getClassInfo((args as any)?.className);

          // Search
          case 'search':
            return await this.tools.search(
              (args as any)?.query,
              (args as any)?.searchType || 'name',
              { propertyName: (args as any)?.propertyName, propertyValue: (args as any)?.propertyValue }
            );

          // Properties
          case 'get_property':
            return await this.tools.getProperty((args as any)?.paths, (args as any)?.propertyName);
          case 'set_property':
            return await this.tools.setProperty(
              (args as any)?.paths,
              (args as any)?.propertyName,
              (args as any)?.propertyValue,
              {
                operation: (args as any)?.operation,
                component: (args as any)?.component,
                formula: (args as any)?.formula,
                variables: (args as any)?.variables
              }
            );

          // Object Management
          case 'create':
            return await this.tools.create((args as any)?.objects);
          case 'delete':
            return await this.tools.delete((args as any)?.paths);

          // Duplication
          case 'duplicate':
            return await this.tools.duplicate((args as any)?.duplications);

          // Scripts
          case 'get_script_source':
            return await this.tools.getScriptSource((args as any)?.instancePath, (args as any)?.startLine, (args as any)?.endLine);
          case 'set_script_source':
            return await this.tools.setScriptSource((args as any)?.instancePath, (args as any)?.source);
          case 'edit_script':
            return await this.tools.editScript(
              (args as any)?.instancePath,
              (args as any)?.action,
              {
                startLine: (args as any)?.startLine,
                endLine: (args as any)?.endLine,
                content: (args as any)?.content
              }
            );

          // Attributes & Tags
          case 'attribute':
            return await this.tools.attribute(
              (args as any)?.instancePath,
              (args as any)?.action,
              { name: (args as any)?.name, value: (args as any)?.value, valueType: (args as any)?.valueType }
            );
          case 'tag':
            return await this.tools.tag(
              (args as any)?.action,
              { instancePath: (args as any)?.instancePath, tagName: (args as any)?.tagName }
            );

          // Assets
          case 'insert_asset':
            return await this.tools.insertAsset((args as any)?.assetId, (args as any)?.parentPath, (args as any)?.position);
          case 'preview_asset':
            return await this.tools.previewAsset((args as any)?.assetId, (args as any)?.includeProperties, (args as any)?.maxDepth);

          // Open Cloud
          case 'search_assets':
            return await this.searchAssets(args as any);
          case 'get_asset_details':
            return await this.getAssetDetails((args as any)?.assetId);
          case 'get_asset_thumbnail':
            return await this.getAssetThumbnail((args as any)?.assetId, (args as any)?.size);

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private getOpenCloudTools() {
    return [
      {
        name: 'search_assets',
        description: 'Search Creator Store by type and keywords. Returns asset IDs for use with other asset tools.',
        inputSchema: {
          type: 'object',
          properties: {
            assetType: {
              type: 'string',
              enum: ['Model', 'Decal', 'Audio', 'MeshPart', 'Plugin', 'Video', 'FontFamily'],
              description: 'Type of asset'
            },
            query: { type: 'string', description: 'Search keywords' },
            maxResults: { type: 'number', description: 'Max results (default 25)', default: 25 },
            sortBy: {
              type: 'string',
              enum: ['Relevance', 'Trending', 'Top', 'CreateTime', 'UpdatedTime', 'Ratings'],
              default: 'Relevance'
            },
            verifiedCreatorsOnly: { type: 'boolean', default: true }
          },
          required: ['assetType']
        }
      },
      {
        name: 'get_asset_details',
        description: 'Get marketplace metadata (creator, votes, triangle count). Use preview_asset for internal structure.',
        inputSchema: {
          type: 'object',
          properties: {
            assetId: { type: 'number', description: 'Asset ID' }
          },
          required: ['assetId']
        }
      },
      {
        name: 'get_asset_thumbnail',
        description: 'Get visual preview image. Returns base64 PNG visible to vision LLMs.',
        inputSchema: {
          type: 'object',
          properties: {
            assetId: { type: 'number', description: 'Asset ID' },
            size: { type: 'string', enum: ['150x150', '420x420', '768x432'], default: '420x420' }
          },
          required: ['assetId']
        }
      }
    ];
  }

  private async searchAssets(args: {
    assetType: 'Model' | 'Decal' | 'Audio' | 'MeshPart' | 'Plugin' | 'Video' | 'FontFamily';
    query?: string;
    maxResults?: number;
    sortBy?: 'Relevance' | 'Trending' | 'Top' | 'CreateTime' | 'UpdatedTime' | 'Ratings';
    verifiedCreatorsOnly?: boolean;
  }) {
    if (!this.openCloud.hasApiKey()) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Open Cloud API key not configured', hint: 'Set ROBLOX_OPEN_CLOUD_API_KEY' }, null, 2)
        }]
      };
    }

    try {
      const result = await this.openCloud.searchAssets({
        searchCategoryType: args.assetType,
        query: args.query,
        maxPageSize: args.maxResults || 25,
        sortCategory: args.sortBy,
        includeOnlyVerifiedCreators: args.verifiedCreatorsOnly ?? true
      });

      const assetIds = result.creatorStoreAssets.map(a => a.asset?.id).filter((id): id is number => id !== undefined);
      const thumbnails = await this.openCloud.getAssetThumbnails(assetIds);

      const enrichedAssets = result.creatorStoreAssets.map(asset => ({
        ...asset,
        thumbnailUrl: asset.asset?.id ? thumbnails.get(asset.asset.id) : undefined
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ totalResults: result.totalResults, assets: enrichedAssets, nextPageToken: result.nextPageToken }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2) }]
      };
    }
  }

  private async getAssetDetails(assetId: number) {
    if (!this.openCloud.hasApiKey()) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Open Cloud API key not configured', hint: 'Set ROBLOX_OPEN_CLOUD_API_KEY' }, null, 2)
        }]
      };
    }

    try {
      const asset = await this.openCloud.getAssetDetails(assetId);
      const thumbnailUrl = await this.openCloud.getAssetThumbnail(assetId);
      return {
        content: [{ type: 'text', text: JSON.stringify({ ...asset, thumbnailUrl }, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2) }]
      };
    }
  }

  private async getAssetThumbnail(assetId: number, size: '150x150' | '420x420' | '768x432' = '420x420') {
    try {
      const thumbnailUrl = await this.openCloud.getAssetThumbnail(assetId, size);

      if (thumbnailUrl) {
        const imageResponse = await fetch(thumbnailUrl);
        if (!imageResponse.ok) throw new Error('Failed to fetch thumbnail');

        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');

        return {
          content: [
            { type: 'text', text: JSON.stringify({ assetId, size, note: 'Image preview attached' }, null, 2) },
            { type: 'image', mimeType: 'image/png', data: base64Image }
          ]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({ assetId, error: 'Thumbnail not available' }, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2) }]
      };
    }
  }

  async run() {
    const port = process.env.ROBLOX_STUDIO_PORT ? parseInt(process.env.ROBLOX_STUDIO_PORT) : 3002;
    const host = process.env.ROBLOX_STUDIO_HOST || '0.0.0.0';
    const httpServer = createHttpServer(this.tools, this.bridge);

    await new Promise<void>((resolve) => {
      httpServer.listen(port, host, () => {
        console.error(`HTTP server listening on ${host}:${port}`);
        resolve();
      });
    });

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Roblox Studio MCP server running on stdio');

    (httpServer as any).setMCPServerActive(true);

    setInterval(() => {
      const pluginConnected = (httpServer as any).isPluginConnected();
      if (!pluginConnected) {
        console.error('Waiting for Studio plugin...');
      }
    }, 5000);

    setInterval(() => {
      this.bridge.cleanupOldRequests();
    }, 5000);
  }
}

const server = new RobloxStudioMCPServer();
server.run().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});