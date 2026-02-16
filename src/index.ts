#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { createRequire } from 'module';
import http from 'node:http';
import { createHttpServer } from './http-server.js';
import { RobloxStudioTools } from './tools/index.js';
import { BridgeService } from './bridge-service.js';

const require = createRequire(import.meta.url);
const { version: VERSION } = require('../package.json');

class RobloxStudioMCPServer {
  private server: Server;
  private tools: RobloxStudioTools;
  private bridge: BridgeService;

  constructor() {
    this.server = new Server(
      {
        name: 'robloxstudio-mcp',
        version: VERSION,
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
        tools: [

          {
            name: 'get_file_tree',
            description: 'Get the Roblox instance hierarchy tree from Roblox Studio. Returns game instances (Parts, Scripts, Models, Folders, etc.) as a tree structure. NOTE: This operates on Roblox Studio instances, NOT local filesystem files.',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Roblox instance path to start from using dot notation (e.g., "game.Workspace", "game.ServerScriptService"). Defaults to game root if empty.',
                  default: ''
                }
              }
            }
          },
          {
            name: 'search_files',
            description: 'Search for Roblox instances by name, class type, or script content. NOTE: This searches Roblox Studio instances, NOT local filesystem files.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query - instance name, class type (e.g., "Script", "Part"), or Lua code pattern'
                },
                searchType: {
                  type: 'string',
                  enum: ['name', 'type', 'content'],
                  description: 'Type of search: "name" for instance names, "type" for class names, "content" for script source code',
                  default: 'name'
                }
              },
              required: ['query']
            }
          },

          {
            name: 'get_place_info',
            description: 'Get place ID, name, and game settings',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_services',
            description: 'Get available Roblox services and their children',
            inputSchema: {
              type: 'object',
              properties: {
                serviceName: {
                  type: 'string',
                  description: 'Optional specific service name to query'
                }
              }
            }
          },
          {
            name: 'search_objects',
            description: 'Find instances by name, class, or properties',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query'
                },
                searchType: {
                  type: 'string',
                  enum: ['name', 'class', 'property'],
                  description: 'Type of search to perform',
                  default: 'name'
                },
                propertyName: {
                  type: 'string',
                  description: 'Property name when searchType is "property"'
                }
              },
              required: ['query']
            }
          },

          {
            name: 'get_instance_properties',
            description: 'Get all properties of a specific Roblox instance in Studio',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: {
                  type: 'string',
                  description: 'Roblox instance path using dot notation (e.g., "game.Workspace.Part", "game.ServerScriptService.MainScript", "game.ReplicatedStorage.ModuleScript")'
                }
              },
              required: ['instancePath']
            }
          },
          {
            name: 'get_instance_children',
            description: 'Get child instances and their class types from a Roblox parent instance',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: {
                  type: 'string',
                  description: 'Roblox instance path using dot notation (e.g., "game.Workspace", "game.ServerScriptService")'
                }
              },
              required: ['instancePath']
            }
          },
          {
            name: 'search_by_property',
            description: 'Find objects with specific property values',
            inputSchema: {
              type: 'object',
              properties: {
                propertyName: {
                  type: 'string',
                  description: 'Name of the property to search'
                },
                propertyValue: {
                  type: 'string',
                  description: 'Value to search for'
                }
              },
              required: ['propertyName', 'propertyValue']
            }
          },
          {
            name: 'get_class_info',
            description: 'Get available properties/methods for Roblox classes',
            inputSchema: {
              type: 'object',
              properties: {
                className: {
                  type: 'string',
                  description: 'Roblox class name'
                }
              },
              required: ['className']
            }
          },

          {
            name: 'get_project_structure',
            description: 'Get complete game hierarchy. IMPORTANT: Use maxDepth parameter (default: 3) to explore deeper levels of the hierarchy. Set higher values like 5-10 for comprehensive exploration',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Optional path to start from (defaults to workspace root)',
                  default: ''
                },
                maxDepth: {
                  type: 'number',
                  description: 'Maximum depth to traverse (default: 3). RECOMMENDED: Use 5-10 for thorough exploration. Higher values provide more complete structure',
                  default: 3
                },
                scriptsOnly: {
                  type: 'boolean',
                  description: 'Show only scripts and script containers',
                  default: false
                }
              }
            }
          },

          {
            name: 'set_property',
            description: 'Set a property on any Roblox instance',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: {
                  type: 'string',
                  description: 'Path to the instance (e.g., "game.Workspace.Part")'
                },
                propertyName: {
                  type: 'string',
                  description: 'Name of the property to set'
                },
                propertyValue: {
                  description: 'Value to set the property to (any type)'
                }
              },
              required: ['instancePath', 'propertyName', 'propertyValue']
            }
          },
          {
            name: 'mass_set_property',
            description: 'Set the same property on multiple instances at once',
            inputSchema: {
              type: 'object',
              properties: {
                paths: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of instance paths to modify'
                },
                propertyName: {
                  type: 'string',
                  description: 'Name of the property to set'
                },
                propertyValue: {
                  description: 'Value to set the property to (any type)'
                }
              },
              required: ['paths', 'propertyName', 'propertyValue']
            }
          },
          {
            name: 'mass_get_property',
            description: 'Get the same property from multiple instances at once',
            inputSchema: {
              type: 'object',
              properties: {
                paths: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of instance paths to read from'
                },
                propertyName: {
                  type: 'string',
                  description: 'Name of the property to get'
                }
              },
              required: ['paths', 'propertyName']
            }
          },

          {
            name: 'create_object',
            description: 'Create a new Roblox object instance (basic, without properties)',
            inputSchema: {
              type: 'object',
              properties: {
                className: {
                  type: 'string',
                  description: 'Roblox class name (e.g., "Part", "Script", "Folder")'
                },
                parent: {
                  type: 'string',
                  description: 'Path to the parent instance (e.g., "game.Workspace")'
                },
                name: {
                  type: 'string',
                  description: 'Optional name for the new object'
                }
              },
              required: ['className', 'parent']
            }
          },
          {
            name: 'create_object_with_properties',
            description: 'Create a new Roblox object instance with initial properties',
            inputSchema: {
              type: 'object',
              properties: {
                className: {
                  type: 'string',
                  description: 'Roblox class name (e.g., "Part", "Script", "Folder")'
                },
                parent: {
                  type: 'string',
                  description: 'Path to the parent instance (e.g., "game.Workspace")'
                },
                name: {
                  type: 'string',
                  description: 'Optional name for the new object'
                },
                properties: {
                  type: 'object',
                  description: 'Properties to set on creation'
                }
              },
              required: ['className', 'parent']
            }
          },
          {
            name: 'mass_create_objects',
            description: 'Create multiple objects at once (basic, without properties)',
            inputSchema: {
              type: 'object',
              properties: {
                objects: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      className: {
                        type: 'string',
                        description: 'Roblox class name'
                      },
                      parent: {
                        type: 'string',
                        description: 'Path to the parent instance'
                      },
                      name: {
                        type: 'string',
                        description: 'Optional name for the object'
                      }
                    },
                    required: ['className', 'parent']
                  },
                  description: 'Array of objects to create'
                }
              },
              required: ['objects']
            }
          },
          {
            name: 'mass_create_objects_with_properties',
            description: 'Create multiple objects at once with initial properties',
            inputSchema: {
              type: 'object',
              properties: {
                objects: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      className: {
                        type: 'string',
                        description: 'Roblox class name'
                      },
                      parent: {
                        type: 'string',
                        description: 'Path to the parent instance'
                      },
                      name: {
                        type: 'string',
                        description: 'Optional name for the object'
                      },
                      properties: {
                        type: 'object',
                        description: 'Properties to set on creation'
                      }
                    },
                    required: ['className', 'parent']
                  },
                  description: 'Array of objects to create with properties'
                }
              },
              required: ['objects']
            }
          },
          {
            name: 'delete_object',
            description: 'Delete a Roblox object instance',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: {
                  type: 'string',
                  description: 'Path to the instance to delete'
                }
              },
              required: ['instancePath']
            }
          },

          {
            name: 'smart_duplicate',
            description: 'Smart duplication with automatic naming, positioning, and property variations',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: {
                  type: 'string',
                  description: 'Path to the instance to duplicate'
                },
                count: {
                  type: 'number',
                  description: 'Number of duplicates to create'
                },
                options: {
                  type: 'object',
                  properties: {
                    namePattern: {
                      type: 'string',
                      description: 'Name pattern with {n} placeholder (e.g., "Button{n}")'
                    },
                    positionOffset: {
                      type: 'array',
                      items: { type: 'number' },
                      minItems: 3,
                      maxItems: 3,
                      description: 'X, Y, Z offset per duplicate'
                    },
                    rotationOffset: {
                      type: 'array',
                      items: { type: 'number' },
                      minItems: 3,
                      maxItems: 3,
                      description: 'X, Y, Z rotation offset per duplicate'
                    },
                    scaleOffset: {
                      type: 'array',
                      items: { type: 'number' },
                      minItems: 3,
                      maxItems: 3,
                      description: 'X, Y, Z scale multiplier per duplicate'
                    },
                    propertyVariations: {
                      type: 'object',
                      description: 'Property name to array of values'
                    },
                    targetParents: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Different parent for each duplicate'
                    }
                  }
                }
              },
              required: ['instancePath', 'count']
            }
          },
          {
            name: 'mass_duplicate',
            description: 'Perform multiple smart duplications at once',
            inputSchema: {
              type: 'object',
              properties: {
                duplications: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      instancePath: {
                        type: 'string',
                        description: 'Path to the instance to duplicate'
                      },
                      count: {
                        type: 'number',
                        description: 'Number of duplicates to create'
                      },
                      options: {
                        type: 'object',
                        properties: {
                          namePattern: {
                            type: 'string',
                            description: 'Name pattern with {n} placeholder'
                          },
                          positionOffset: {
                            type: 'array',
                            items: { type: 'number' },
                            minItems: 3,
                            maxItems: 3,
                            description: 'X, Y, Z offset per duplicate'
                          },
                          rotationOffset: {
                            type: 'array',
                            items: { type: 'number' },
                            minItems: 3,
                            maxItems: 3,
                            description: 'X, Y, Z rotation offset per duplicate'
                          },
                          scaleOffset: {
                            type: 'array',
                            items: { type: 'number' },
                            minItems: 3,
                            maxItems: 3,
                            description: 'X, Y, Z scale multiplier per duplicate'
                          },
                          propertyVariations: {
                            type: 'object',
                            description: 'Property name to array of values'
                          },
                          targetParents: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Different parent for each duplicate'
                          }
                        }
                      }
                    },
                    required: ['instancePath', 'count']
                  },
                  description: 'Array of duplication operations'
                }
              },
              required: ['duplications']
            }
          },

          {
            name: 'set_calculated_property',
            description: 'Set properties using mathematical formulas and variables',
            inputSchema: {
              type: 'object',
              properties: {
                paths: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of instance paths to modify'
                },
                propertyName: {
                  type: 'string',
                  description: 'Name of the property to set'
                },
                formula: {
                  type: 'string',
                  description: 'Mathematical formula (e.g., "Position.magnitude * 2", "index * 50")'
                },
                variables: {
                  type: 'object',
                  description: 'Additional variables for the formula'
                }
              },
              required: ['paths', 'propertyName', 'formula']
            }
          },

          {
            name: 'set_relative_property',
            description: 'Modify properties relative to their current values',
            inputSchema: {
              type: 'object',
              properties: {
                paths: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of instance paths to modify'
                },
                propertyName: {
                  type: 'string',
                  description: 'Name of the property to modify'
                },
                operation: {
                  type: 'string',
                  enum: ['add', 'multiply', 'divide', 'subtract', 'power'],
                  description: 'Mathematical operation to perform'
                },
                value: {
                  description: 'Value to use in the operation'
                },
                component: {
                  type: 'string',
                  enum: ['X', 'Y', 'Z', 'XScale', 'XOffset', 'YScale', 'YOffset'],
                  description: 'For Vector3: X, Y, Z. For UDim2: XScale, XOffset, YScale, YOffset (value must be a number)'
                }
              },
              required: ['paths', 'propertyName', 'operation', 'value']
            }
          },

          {
            name: 'get_script_source',
            description: 'Get the source code of a Roblox script (LocalScript, Script, or ModuleScript). Returns both "source" (raw code) and "numberedSource" (with line numbers prefixed like "1: code"). Use numberedSource to accurately identify line numbers for editing. For large scripts (>1500 lines), use startLine/endLine to read specific sections.',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: {
                  type: 'string',
                  description: 'Roblox instance path to the script using dot notation (e.g., "game.ServerScriptService.MainScript", "game.StarterPlayer.StarterPlayerScripts.LocalScript")'
                },
                startLine: {
                  type: 'number',
                  description: 'Optional: Start line number (1-indexed). Use for reading specific sections of large scripts.'
                },
                endLine: {
                  type: 'number',
                  description: 'Optional: End line number (inclusive). Use for reading specific sections of large scripts.'
                }
              },
              required: ['instancePath']
            }
          },
          {
            name: 'set_script_source',
            description: 'Replace the entire source code of a Roblox script. Uses ScriptEditorService:UpdateSourceAsync (works with open editors). For partial edits, prefer edit_script_lines, insert_script_lines, or delete_script_lines.',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: {
                  type: 'string',
                  description: 'Roblox instance path to the script (e.g., "game.ServerScriptService.MainScript")'
                },
                source: {
                  type: 'string',
                  description: 'New source code for the script'
                }
              },
              required: ['instancePath', 'source']
            }
          },

          {
            name: 'edit_script_lines',
            description: 'Replace specific lines in a Roblox script without rewriting the entire source. IMPORTANT: Use the "numberedSource" field from get_script_source to identify the correct line numbers. Lines are 1-indexed and ranges are inclusive.',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: {
                  type: 'string',
                  description: 'Roblox instance path to the script (e.g., "game.ServerScriptService.MainScript")'
                },
                startLine: {
                  type: 'number',
                  description: 'First line to replace (1-indexed). Get this from the "numberedSource" field.'
                },
                endLine: {
                  type: 'number',
                  description: 'Last line to replace (inclusive). Get this from the "numberedSource" field.'
                },
                newContent: {
                  type: 'string',
                  description: 'New content to replace the specified lines (can be multiple lines separated by newlines)'
                }
              },
              required: ['instancePath', 'startLine', 'endLine', 'newContent']
            }
          },
          {
            name: 'insert_script_lines',
            description: 'Insert new lines into a Roblox script at a specific position. IMPORTANT: Use the "numberedSource" field from get_script_source to identify the correct line numbers.',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: {
                  type: 'string',
                  description: 'Roblox instance path to the script (e.g., "game.ServerScriptService.MainScript")'
                },
                afterLine: {
                  type: 'number',
                  description: 'Insert after this line number (0 = insert at very beginning, 1 = after first line). Get line numbers from "numberedSource".',
                  default: 0
                },
                newContent: {
                  type: 'string',
                  description: 'Content to insert (can be multiple lines separated by newlines)'
                }
              },
              required: ['instancePath', 'newContent']
            }
          },
          {
            name: 'delete_script_lines',
            description: 'Delete specific lines from a Roblox script. IMPORTANT: Use the "numberedSource" field from get_script_source to identify the correct line numbers.',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: {
                  type: 'string',
                  description: 'Roblox instance path to the script (e.g., "game.ServerScriptService.MainScript")'
                },
                startLine: {
                  type: 'number',
                  description: 'First line to delete (1-indexed). Get this from the "numberedSource" field.'
                },
                endLine: {
                  type: 'number',
                  description: 'Last line to delete (inclusive). Get this from the "numberedSource" field.'
                }
              },
              required: ['instancePath', 'startLine', 'endLine']
            }
          },

          {
            name: 'get_attribute',
            description: 'Get a single attribute value from a Roblox instance',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: {
                  type: 'string',
                  description: 'Roblox instance path using dot notation (e.g., "game.Workspace.Part", "game.ServerStorage.DataStore")'
                },
                attributeName: {
                  type: 'string',
                  description: 'Name of the attribute to get'
                }
              },
              required: ['instancePath', 'attributeName']
            }
          },
          {
            name: 'set_attribute',
            description: 'Set an attribute value on a Roblox instance. Supports string, number, boolean, Vector3, Color3, UDim2, and BrickColor.',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: {
                  type: 'string',
                  description: 'Roblox instance path using dot notation (e.g., "game.Workspace.Part")'
                },
                attributeName: {
                  type: 'string',
                  description: 'Name of the attribute to set'
                },
                attributeValue: {
                  description: 'Value to set. For Vector3: {X, Y, Z}, Color3: {R, G, B}, UDim2: {X: {Scale, Offset}, Y: {Scale, Offset}}'
                },
                valueType: {
                  type: 'string',
                  description: 'Optional type hint: "Vector3", "Color3", "UDim2", "BrickColor"'
                }
              },
              required: ['instancePath', 'attributeName', 'attributeValue']
            }
          },
          {
            name: 'get_attributes',
            description: 'Get all attributes on a Roblox instance',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: {
                  type: 'string',
                  description: 'Roblox instance path using dot notation (e.g., "game.Workspace.Part")'
                }
              },
              required: ['instancePath']
            }
          },
          {
            name: 'delete_attribute',
            description: 'Delete an attribute from a Roblox instance',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: {
                  type: 'string',
                  description: 'Roblox instance path using dot notation (e.g., "game.Workspace.Part")'
                },
                attributeName: {
                  type: 'string',
                  description: 'Name of the attribute to delete'
                }
              },
              required: ['instancePath', 'attributeName']
            }
          },

          {
            name: 'get_tags',
            description: 'Get all CollectionService tags on a Roblox instance',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: {
                  type: 'string',
                  description: 'Roblox instance path using dot notation (e.g., "game.Workspace.Part")'
                }
              },
              required: ['instancePath']
            }
          },
          {
            name: 'add_tag',
            description: 'Add a CollectionService tag to a Roblox instance',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: {
                  type: 'string',
                  description: 'Roblox instance path using dot notation (e.g., "game.Workspace.Part")'
                },
                tagName: {
                  type: 'string',
                  description: 'Name of the tag to add'
                }
              },
              required: ['instancePath', 'tagName']
            }
          },
          {
            name: 'remove_tag',
            description: 'Remove a CollectionService tag from a Roblox instance',
            inputSchema: {
              type: 'object',
              properties: {
                instancePath: {
                  type: 'string',
                  description: 'Roblox instance path using dot notation (e.g., "game.Workspace.Part")'
                },
                tagName: {
                  type: 'string',
                  description: 'Name of the tag to remove'
                }
              },
              required: ['instancePath', 'tagName']
            }
          },
          {
            name: 'get_tagged',
            description: 'Get all instances with a specific tag',
            inputSchema: {
              type: 'object',
              properties: {
                tagName: {
                  type: 'string',
                  description: 'Name of the tag to search for'
                }
              },
              required: ['tagName']
            }
          },
          {
            name: 'get_selection',
            description: 'Get all currently selected objects',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'execute_luau',
            description: 'Execute arbitrary Luau code in Roblox Studio and return the result. The code runs in the plugin context with access to game, workspace, and all services. Use print() or warn() to produce output. The return value of the code (if any) is captured. Useful for querying game state, running one-off operations, or testing logic.',
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Luau code to execute. Can use print() for output. The return value is captured.'
                }
              },
              required: ['code']
            }
          },

          {
            name: 'start_playtest',
            description: 'Start a play test session in Roblox Studio. Captures all output (print/warn/error) from LogService. Use get_playtest_output to poll for logs while running, then stop_playtest to end. Typical workflow: add print/warn statements to code, start playtest, poll output to observe behavior, stop, analyze logs, fix issues with set_script_source, and repeat until correct.',
            inputSchema: {
              type: 'object',
              properties: {
                mode: {
                  type: 'string',
                  enum: ['play', 'run'],
                  description: '"play" for Play Solo mode, "run" for Run mode'
                }
              },
              required: ['mode']
            }
          },
          {
            name: 'stop_playtest',
            description: 'Stop the running play test session and return all captured output. Call this after observing enough output via get_playtest_output, or when you need to make code changes before the next run.',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_playtest_output',
            description: 'Poll the output buffer without stopping the test. Returns isRunning, captured print/warn/error messages, and any test result. Call repeatedly to monitor a running session — useful for waiting on specific log output or checking if errors have occurred.',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

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
            return await this.tools.getInstanceProperties((args as any)?.instancePath as string);
          case 'get_instance_children':
            return await this.tools.getInstanceChildren((args as any)?.instancePath as string);
          case 'search_by_property':
            return await this.tools.searchByProperty((args as any)?.propertyName as string, (args as any)?.propertyValue as string);
          case 'get_class_info':
            return await this.tools.getClassInfo((args as any)?.className as string);

          case 'get_project_structure':
            return await this.tools.getProjectStructure((args as any)?.path, (args as any)?.maxDepth, (args as any)?.scriptsOnly);

          case 'set_property':
            return await this.tools.setProperty((args as any)?.instancePath as string, (args as any)?.propertyName as string, (args as any)?.propertyValue);

          case 'mass_set_property':
            return await this.tools.massSetProperty((args as any)?.paths as string[], (args as any)?.propertyName as string, (args as any)?.propertyValue);
          case 'mass_get_property':
            return await this.tools.massGetProperty((args as any)?.paths as string[], (args as any)?.propertyName as string);

          case 'create_object':
            return await this.tools.createObject((args as any)?.className as string, (args as any)?.parent as string, (args as any)?.name);
          case 'create_object_with_properties':
            return await this.tools.createObjectWithProperties((args as any)?.className as string, (args as any)?.parent as string, (args as any)?.name, (args as any)?.properties);
          case 'mass_create_objects':
            return await this.tools.massCreateObjects((args as any)?.objects);
          case 'mass_create_objects_with_properties':
            return await this.tools.massCreateObjectsWithProperties((args as any)?.objects);
          case 'delete_object':
            return await this.tools.deleteObject((args as any)?.instancePath as string);

          case 'smart_duplicate':
            return await this.tools.smartDuplicate((args as any)?.instancePath as string, (args as any)?.count as number, (args as any)?.options);
          case 'mass_duplicate':
            return await this.tools.massDuplicate((args as any)?.duplications);

          case 'set_calculated_property':
            return await this.tools.setCalculatedProperty((args as any)?.paths as string[], (args as any)?.propertyName as string, (args as any)?.formula as string, (args as any)?.variables);

          case 'set_relative_property':
            return await this.tools.setRelativeProperty((args as any)?.paths as string[], (args as any)?.propertyName as string, (args as any)?.operation, (args as any)?.value, (args as any)?.component);

          case 'get_script_source':
            return await this.tools.getScriptSource((args as any)?.instancePath as string, (args as any)?.startLine, (args as any)?.endLine);
          case 'set_script_source':
            return await this.tools.setScriptSource((args as any)?.instancePath as string, (args as any)?.source as string);

          case 'edit_script_lines':
            return await this.tools.editScriptLines((args as any)?.instancePath as string, (args as any)?.startLine as number, (args as any)?.endLine as number, (args as any)?.newContent as string);
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
            return await this.tools.executeLuau((args as any)?.code as string);

          case 'start_playtest':
            return await this.tools.startPlaytest((args as any)?.mode as string);
          case 'stop_playtest':
            return await this.tools.stopPlaytest();
          case 'get_playtest_output':
            return await this.tools.getPlaytestOutput();

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  async run() {
    const basePort = process.env.ROBLOX_STUDIO_PORT ? parseInt(process.env.ROBLOX_STUDIO_PORT) : 58741;
    const maxPort = basePort + 4;
    const host = process.env.ROBLOX_STUDIO_HOST || '0.0.0.0';
    const httpApp = createHttpServer(this.tools, this.bridge);

    let boundPort = 0;
    for (let port = basePort; port <= maxPort; port++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const server = http.createServer(httpApp);
          const onError = (err: NodeJS.ErrnoException) => {
            reject(err);
          };
          server.once('error', onError);
          server.listen(port, host, () => {
            server.removeListener('error', onError);
            boundPort = port;
            console.error(`HTTP server listening on ${host}:${port} for Studio plugin`);
            resolve();
          });
        });
        break;
      } catch (err: any) {
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${port} in use, trying next...`);
          if (port === maxPort) {
            throw new Error(`All ports ${basePort}-${maxPort} are in use. Stop some MCP server instances and retry.`);
          }
          continue;
        }
        throw err;
      }
    }

    const LEGACY_PORT = 3002;
    let legacyApp: ReturnType<typeof createHttpServer> | undefined;
    if (boundPort !== LEGACY_PORT) {
      const legacy = createHttpServer(this.tools, this.bridge);
      legacyApp = legacy;
      try {
        await new Promise<void>((resolve, reject) => {
          const server = http.createServer(legacy);
          const onError = (err: NodeJS.ErrnoException) => {
            reject(err);
          };
          server.once('error', onError);
          server.listen(LEGACY_PORT, host, () => {
            server.removeListener('error', onError);
            console.error(`Legacy HTTP server also listening on ${host}:${LEGACY_PORT} for old plugins`);
            resolve();
          });
        });

        (legacy as any).setMCPServerActive(true);
      } catch {

        console.error(`Legacy port ${LEGACY_PORT} in use, skipping backward-compat listener`);
      }
    }


    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Roblox Studio MCP server running on stdio');

    (httpApp as any).setMCPServerActive(true);
    console.error('MCP server marked as active');

    console.error('Waiting for Studio plugin to connect...');

    setInterval(() => {
      (httpApp as any).trackMCPActivity();
      if (legacyApp) (legacyApp as any).trackMCPActivity();
      const pluginConnected = (httpApp as any).isPluginConnected();
      const mcpActive = (httpApp as any).isMCPServerActive();

      if (pluginConnected && mcpActive) {
      } else if (pluginConnected && !mcpActive) {
        console.error('Studio plugin connected, but MCP server inactive');
      } else if (!pluginConnected && mcpActive) {
        console.error('MCP server active, waiting for Studio plugin...');
      } else {
        console.error('Waiting for connections...');
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
