export type ToolCategory = 'read' | 'write';

export interface ToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: object;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // === File & Instance Browsing ===
  {
    name: 'get_file_tree',
    category: 'read',
    description: 'Legacy hierarchy tree. Prefer get_project_map for token-efficient navigation.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Root path (default: game root)'
        }
      }
    }
  },
  {
    name: 'search_files',
    category: 'read',
    description: 'Search instances by name, class, or script content',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Name, class, or code pattern'
        },
        searchType: {
          type: 'string',
          enum: ['name', 'type', 'content'],
          description: 'Search mode (default: name)'
        }
      },
      required: ['query']
    }
  },

  // === Place & Service Info ===
  {
    name: 'get_place_info',
    category: 'read',
    description: 'Get place ID, name, and game settings',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_services',
    category: 'read',
    description: 'Get available services and their children',
    inputSchema: {
      type: 'object',
      properties: {
        serviceName: {
          type: 'string',
          description: 'Specific service name'
        }
      }
    }
  },
  {
    name: 'search_objects',
    category: 'read',
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
          description: 'Search mode (default: name)'
        },
        propertyName: {
          type: 'string',
          description: 'Property name when searchType is "property"'
        }
      },
      required: ['query']
    }
  },

  // === Instance Inspection ===
  {
    name: 'get_instance_properties',
    category: 'read',
    description: 'Legacy property dump. Prefer get_instance_summary and read_script_slice for targeted reads.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        },
        excludeSource: {
          type: 'boolean',
          description: 'For scripts, return SourceLength/LineCount instead of full source (default: false)'
        }
      },
      required: ['instancePath']
    }
  },
  {
    name: 'get_instance_children',
    category: 'read',
    description: 'Get children and their class types',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        }
      },
      required: ['instancePath']
    }
  },
  {
    name: 'search_by_property',
    category: 'read',
    description: 'Find objects with specific property values',
    inputSchema: {
      type: 'object',
      properties: {
        propertyName: {
          type: 'string',
          description: 'Property name'
        },
        propertyValue: {
          type: 'string',
          description: 'Value to match'
        }
      },
      required: ['propertyName', 'propertyValue']
    }
  },
  {
    name: 'get_class_info',
    category: 'read',
    description: 'Get properties/methods for a class',
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

  // === Project Structure ===
  {
    name: 'get_project_structure',
    category: 'read',
    description: 'Legacy structured hierarchy. Prefer get_project_map/find_instances for compact navigation.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Root path (default: workspace root)'
        },
        maxDepth: {
          type: 'number',
          description: 'Max traversal depth (default: 3)'
        },
        scriptsOnly: {
          type: 'boolean',
          description: 'Show only scripts (default: false)'
        }
      }
    }
  },
  {
    name: 'get_project_map',
    category: 'read',
    description: 'Compact project map for navigation. No source; use before reading specific scripts.',
    inputSchema: {
      type: 'object',
      properties: {
        rootPath: { type: 'string', description: 'Root path (default: game)' },
        maxDepth: { type: 'number', description: 'Max depth (default: 4)' },
        include: {
          anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
          description: 'all, scripts, or class names'
        },
        maxNodes: { type: 'number', description: 'Max emitted nodes (default: 200)' },
        offset: { type: 'number', description: 'Pagination offset for emitted nodes' },
        format: { type: 'string', enum: ['compact', 'json'], description: 'Output format (default: compact)' }
      }
    }
  },
  {
    name: 'find_instances',
    category: 'read',
    description: 'Find instances with combinable filters and paginated compact output.',
    inputSchema: {
      type: 'object',
      properties: {
        rootPath: { type: 'string', description: 'Root path (default: game)' },
        name: { type: 'string', description: 'Name substring' },
        className: { type: 'string', description: 'ClassName substring' },
        isA: { type: 'string', description: 'Roblox IsA class filter (e.g. BasePart)' },
        tag: { type: 'string', description: 'CollectionService tag' },
        propertyName: { type: 'string', description: 'Property name to test' },
        propertyValue: { type: 'string', description: 'Optional property value substring' },
        hasSource: { type: 'boolean', description: 'Only script-like or non-script instances' },
        maxResults: { type: 'number', description: 'Max results (default: 50)' },
        offset: { type: 'number', description: 'Pagination offset' }
      }
    }
  },
  {
    name: 'find_scripts',
    category: 'read',
    description: 'Token-efficient script search. Default returns matching script paths only.',
    inputSchema: {
      type: 'object',
      properties: {
        rootPath: { type: 'string', description: 'Root path (default: game)' },
        query: { type: 'string', description: 'Literal source substring' },
        dependency: { type: 'string', description: 'Dependency/module substring to find' },
        service: { type: 'string', description: 'Service name substring to find' },
        classFilter: { type: 'string', enum: ['Script', 'LocalScript', 'ModuleScript'], description: 'Script class filter' },
        maxResults: { type: 'number', description: 'Max results (default: 50)' },
        offset: { type: 'number', description: 'Pagination offset' },
        filesOnly: { type: 'boolean', description: 'Return paths/metadata only (default: true)' },
        includeSnippet: { type: 'boolean', description: 'Include one short matching line' }
      }
    }
  },
  {
    name: 'find_references',
    category: 'read',
    description: 'Find scripts referencing a module, remote, service, symbol, or literal.',
    inputSchema: {
      type: 'object',
      properties: {
        rootPath: { type: 'string', description: 'Root path (default: game)' },
        targetPath: { type: 'string', description: 'Instance path for module/remote reference search' },
        name: { type: 'string', description: 'Target name when no path is available' },
        referenceType: {
          type: 'string',
          enum: ['auto', 'module', 'remote', 'service', 'symbol', 'literal'],
          description: 'Reference kind (default: auto)'
        },
        classFilter: { type: 'string', enum: ['Script', 'LocalScript', 'ModuleScript'], description: 'Script class filter' },
        maxResults: { type: 'number', description: 'Max matching scripts (default: 50)' },
        offset: { type: 'number', description: 'Pagination offset' },
        includeSnippet: { type: 'boolean', description: 'Include one short matching line' }
      }
    }
  },
  {
    name: 'get_script_outline',
    category: 'read',
    description: 'Script metadata only: lines, hash, requires, services, functions, remotes. No source.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: { type: 'string', description: 'Script instance path' }
      },
      required: ['instancePath']
    }
  },
  {
    name: 'read_script_slice',
    category: 'read',
    description: 'Read a targeted script window by line range or around a literal pattern.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: { type: 'string', description: 'Script instance path' },
        startLine: { type: 'number', description: 'Start line' },
        endLine: { type: 'number', description: 'End line' },
        aroundPattern: { type: 'string', description: 'Find first literal match and return context' },
        contextLines: { type: 'number', description: 'Context lines around pattern (default: 6)' },
        maxChars: { type: 'number', description: 'Max returned characters (default: 12000)' },
        numbered: { type: 'boolean', description: 'Include line numbers (default: true)' }
      },
      required: ['instancePath']
    }
  },
  {
    name: 'get_instance_summary',
    category: 'read',
    description: 'Lightweight instance summary with optional children and named properties; never returns Source.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: { type: 'string', description: 'Instance path' },
        includeChildren: { type: 'boolean', description: 'Include immediate child summaries' },
        propertyNames: { type: 'array', items: { type: 'string' }, description: 'Specific properties to read' },
        maxChildren: { type: 'number', description: 'Max children when includeChildren is true (default: 50)' }
      },
      required: ['instancePath']
    }
  },

  // === Property Write ===
  {
    name: 'set_property',
    category: 'write',
    description: 'Set a property on an instance',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        },
        propertyName: {
          type: 'string',
          description: 'Property name'
        },
        propertyValue: {
          description: 'Value to set (string, number, boolean, or object for Vector3/Color3/UDim2)'
        }
      },
      required: ['instancePath', 'propertyName', 'propertyValue']
    }
  },
  {
    name: 'mass_set_property',
    category: 'write',
    description: 'Set a property on multiple instances',
    inputSchema: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Instance paths'
        },
        propertyName: {
          type: 'string',
          description: 'Property name'
        },
        propertyValue: {
          description: 'Value to set (string, number, boolean, or object for Vector3/Color3/UDim2)'
        }
      },
      required: ['paths', 'propertyName', 'propertyValue']
    }
  },
  {
    name: 'mass_get_property',
    category: 'read',
    description: 'Get a property from multiple instances',
    inputSchema: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Instance paths'
        },
        propertyName: {
          type: 'string',
          description: 'Property name'
        }
      },
      required: ['paths', 'propertyName']
    }
  },
  {
    name: 'set_properties',
    category: 'write',
    description: 'Set multiple properties on a single instance in one call.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path'
        },
        properties: {
          type: 'object',
          description: 'Map of property name to value'
        }
      },
      required: ['instancePath', 'properties']
    }
  },

  // === Object Creation/Deletion ===
  {
    name: 'create_object',
    category: 'write',
    description: 'Create a new instance. Optionally set properties on creation.',
    inputSchema: {
      type: 'object',
      properties: {
        className: {
          type: 'string',
          description: 'Roblox class name'
        },
        parent: {
          type: 'string',
          description: 'Parent instance path'
        },
        name: {
          type: 'string',
          description: 'Optional name'
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
    name: 'create_ui_tree',
    category: 'write',
    description: 'Create an entire instance hierarchy from a nested JSON tree in one call.',
    inputSchema: {
      type: 'object',
      properties: {
        parentPath: {
          type: 'string',
          description: 'Parent instance path'
        },
        tree: {
          type: 'object',
          description: 'Root node: { className: string, name?: string, properties?: { prop: value }, children?: [node, ...] }',
          properties: {
            className: { type: 'string', description: 'Roblox class name' },
            name: { type: 'string', description: 'Instance name' },
            properties: { type: 'object', description: 'Property name to value map' },
            children: {
              type: 'array',
              description: 'Child nodes with same structure',
              items: { type: 'object' }
            }
          },
          required: ['className']
        }
      },
      required: ['parentPath', 'tree']
    }
  },
  {
    name: 'mass_create_objects',
    category: 'write',
    description: 'Create multiple instances. Each can have optional properties.',
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
                description: 'Parent instance path'
              },
              name: {
                type: 'string',
                description: 'Optional name'
              },
              properties: {
                type: 'object',
                description: 'Properties to set on creation'
              }
            },
            required: ['className', 'parent']
          },
          description: 'Objects to create'
        }
      },
      required: ['objects']
    }
  },
  {
    name: 'delete_object',
    category: 'write',
    description: 'Delete an instance',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        }
      },
      required: ['instancePath']
    }
  },

  // === Duplication ===
  {
    name: 'smart_duplicate',
    category: 'write',
    description: 'Duplicate with naming, positioning, and property variations',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        },
        count: {
          type: 'number',
          description: 'Number of duplicates'
        },
        options: {
          type: 'object',
          properties: {
            namePattern: {
              type: 'string',
              description: 'Name pattern ({n} placeholder)'
            },
            positionOffset: {
              type: 'array',
              items: { type: 'number' },
              description: 'X, Y, Z offset per duplicate'
            },
            rotationOffset: {
              type: 'array',
              items: { type: 'number' },
              description: 'X, Y, Z rotation offset'
            },
            scaleOffset: {
              type: 'array',
              items: { type: 'number' },
              description: 'X, Y, Z scale multiplier'
            },
            propertyVariations: {
              type: 'object',
              description: 'Property name to array of values'
            },
            targetParents: {
              type: 'array',
              items: { type: 'string' },
              description: 'Different parent per duplicate'
            }
          }
        }
      },
      required: ['instancePath', 'count']
    }
  },
  {
    name: 'mass_duplicate',
    category: 'write',
    description: 'Batch smart_duplicate operations',
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
                description: 'Instance path (dot notation)'
              },
              count: {
                type: 'number',
                description: 'Number of duplicates'
              },
              options: {
                type: 'object',
                properties: {
                  namePattern: {
                    type: 'string',
                    description: 'Name pattern ({n} placeholder)'
                  },
                  positionOffset: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'X, Y, Z offset per duplicate'
                  },
                  rotationOffset: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'X, Y, Z rotation offset'
                  },
                  scaleOffset: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'X, Y, Z scale multiplier'
                  },
                  propertyVariations: {
                    type: 'object',
                    description: 'Property name to array of values'
                  },
                  targetParents: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Different parent per duplicate'
                  }
                }
              }
            },
            required: ['instancePath', 'count']
          },
          description: 'Duplication operations'
        }
      },
      required: ['duplications']
    }
  },

  // === Calculated/Relative Properties ===
  // === Script Read/Write ===
  {
    name: 'get_script_source',
    category: 'read',
    description: 'Legacy script read. Prefer get_script_outline then read_script_slice for token-efficient reads.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Script instance path'
        },
        startLine: {
          type: 'number',
          description: 'Start line (1-indexed)'
        },
        endLine: {
          type: 'number',
          description: 'End line (inclusive)'
        }
      },
      required: ['instancePath']
    }
  },
  {
    name: 'set_script_source',
    category: 'write',
    description: 'Replace entire script source. For partial edits use edit/insert/delete_script_lines.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Script instance path'
        },
        source: {
          type: 'string',
          description: 'New source code'
        }
      },
      required: ['instancePath', 'source']
    }
  },
  {
    name: 'edit_script_lines',
    category: 'write',
    description: 'Replace exact text in a script. old_string must match exactly once in the script (whitespace-sensitive). Use get_script_source first to see current content.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Script instance path'
        },
        old_string: {
          type: 'string',
          description: 'Exact text to find and replace (must be unique in the script)'
        },
        new_string: {
          type: 'string',
          description: 'Replacement text'
        }
      },
      required: ['instancePath', 'old_string', 'new_string']
    }
  },
  {
    name: 'insert_script_lines',
    category: 'write',
    description: 'Insert lines after a given line number (0 = beginning).',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Script instance path'
        },
        afterLine: {
          type: 'number',
          description: 'Insert after this line (0 = beginning)'
        },
        newContent: {
          type: 'string',
          description: 'Content to insert'
        }
      },
      required: ['instancePath', 'newContent']
    }
  },
  {
    name: 'delete_script_lines',
    category: 'write',
    description: 'Delete a range of lines. 1-indexed, inclusive.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Script instance path'
        },
        startLine: {
          type: 'number',
          description: 'Start line (1-indexed)'
        },
        endLine: {
          type: 'number',
          description: 'End line (inclusive)'
        }
      },
      required: ['instancePath', 'startLine', 'endLine']
    }
  },

  // === Attributes ===
  {
    name: 'get_attribute',
    category: 'read',
    description: 'Get an attribute value',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        },
        attributeName: {
          type: 'string',
          description: 'Attribute name'
        }
      },
      required: ['instancePath', 'attributeName']
    }
  },
  {
    name: 'set_attribute',
    category: 'write',
    description: 'Set an attribute. Supports primitives, Vector3, Color3, UDim2, BrickColor.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        },
        attributeName: {
          type: 'string',
          description: 'Attribute name'
        },
        attributeValue: {
          description: 'Value (string, number, boolean, or object for Vector3/Color3/UDim2)'
        },
        valueType: {
          type: 'string',
          description: 'Type hint if needed'
        }
      },
      required: ['instancePath', 'attributeName', 'attributeValue']
    }
  },
  {
    name: 'get_attributes',
    category: 'read',
    description: 'Get all attributes on an instance',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        }
      },
      required: ['instancePath']
    }
  },
  {
    name: 'delete_attribute',
    category: 'write',
    description: 'Delete an attribute',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        },
        attributeName: {
          type: 'string',
          description: 'Attribute name'
        }
      },
      required: ['instancePath', 'attributeName']
    }
  },

  // === Tags ===
  {
    name: 'get_tags',
    category: 'read',
    description: 'Get all tags on an instance',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        }
      },
      required: ['instancePath']
    }
  },
  {
    name: 'add_tag',
    category: 'write',
    description: 'Add a tag',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        },
        tagName: {
          type: 'string',
          description: 'Tag name'
        }
      },
      required: ['instancePath', 'tagName']
    }
  },
  {
    name: 'remove_tag',
    category: 'write',
    description: 'Remove a tag',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        },
        tagName: {
          type: 'string',
          description: 'Tag name'
        }
      },
      required: ['instancePath', 'tagName']
    }
  },
  {
    name: 'get_tagged',
    category: 'read',
    description: 'Get all instances with a specific tag',
    inputSchema: {
      type: 'object',
      properties: {
        tagName: {
          type: 'string',
          description: 'Tag name'
        }
      },
      required: ['tagName']
    }
  },

  // === Selection ===
  {
    name: 'get_selection',
    category: 'read',
    description: 'Get all currently selected objects',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // === Luau Execution ===
  {
    name: 'execute_luau',
    category: 'write',
    description: 'Execute Luau code in plugin context. Use print()/warn() for output. Return value is captured.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Luau code to execute'
        },
        target: {
          type: 'string',
          description: 'Instance target: "edit" (default), "server", "client-1", "client-2", etc.'
        }
      },
      required: ['code']
    }
  },

  // === Script Search ===
  {
    name: 'grep_scripts',
    category: 'read',
    description: 'Detailed script grep. Prefer find_scripts for cheap path-first script search.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Search pattern (literal string or Lua pattern)'
        },
        caseSensitive: {
          type: 'boolean',
          description: 'Case-sensitive search (default: false)'
        },
        usePattern: {
          type: 'boolean',
          description: 'Use Lua pattern matching instead of literal (default: false)'
        },
        contextLines: {
          type: 'number',
          description: 'Number of context lines before/after each match (default: 0)'
        },
        maxResults: {
          type: 'number',
          description: 'Max total matches before stopping (default: 100)'
        },
        maxResultsPerScript: {
          type: 'number',
          description: 'Max matches per script (like rg -m)'
        },
        filesOnly: {
          type: 'boolean',
          description: 'Only return matching script paths, not line details (default: false)'
        },
        path: {
          type: 'string',
          description: 'Subtree to search (e.g. "game.ServerScriptService")'
        },
        classFilter: {
          type: 'string',
          enum: ['Script', 'LocalScript', 'ModuleScript'],
          description: 'Only search scripts of this class type'
        }
      },
      required: ['pattern']
    }
  },

  // === Playtest ===
  {
    name: 'start_playtest',
    category: 'read',
    description: 'Start playtest. Captures print/warn/error via LogService. Poll with get_playtest_output, end with stop_playtest. Use numPlayers for multi-client testing (server + N clients).',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['play', 'run'],
          description: 'Play mode'
        },
        numPlayers: {
          type: 'number',
          description: 'Number of client players (1-8). Triggers server + clients mode via TestService.'
        }
      },
      required: ['mode']
    }
  },
  {
    name: 'stop_playtest',
    category: 'read',
    description: 'Stop playtest and return all captured output.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_playtest_output',
    category: 'read',
    description: 'Poll output buffer without stopping. Returns isRunning and captured messages.',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Instance target: "edit" (default), "server", "client-1", "client-2", etc.'
        }
      }
    }
  },

  // === Multi-Instance ===
  {
    name: 'get_connected_instances',
    category: 'read',
    description: 'List all connected plugin instances with their roles. Use during multi-client playtest to discover server and client instances for targeted commands.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // === Undo/Redo ===
  {
    name: 'undo',
    category: 'write',
    description: 'Undo the last change in Roblox Studio. Uses ChangeHistoryService to reverse the most recent operation.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'redo',
    category: 'write',
    description: 'Redo the last undone change in Roblox Studio. Uses ChangeHistoryService to reapply the most recently undone operation.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // === Build Library ===
  {
    name: 'export_build',
    category: 'read',
    description: 'Export a Model/Folder into a compact, token-efficient build JSON format and auto-save it to the local build library. The output contains a palette (unique BrickColor+Material combos mapped to short keys) and compact part arrays with positions normalized relative to the bounding box center. The file is saved to build-library/{style}/{id}.json automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Path to the Model or Folder to export (dot notation)'
        },
        outputId: {
          type: 'string',
          description: 'Build ID for the output (e.g. "medieval/cottage_01"). Defaults to style/instance_name.'
        },
        style: {
          type: 'string',
          enum: ['medieval', 'modern', 'nature', 'scifi', 'misc'],
          description: 'Style category for the build (default: misc)'
        }
      },
      required: ['instancePath']
    }
  },
  {
    name: 'create_build',
    category: 'write',
    description: 'Create a new build model from scratch and save it to the library. Define parts using compact arrays [posX, posY, posZ, sizeX, sizeY, sizeZ, rotX, rotY, rotZ, paletteKey, shape?, transparency?]. Palette maps short keys to [BrickColor, Material] pairs. The build is saved and can be referenced by import_build or import_scene.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Build ID including style prefix (e.g. "medieval/torch_01", "nature/bush_small")'
        },
        style: {
          type: 'string',
          enum: ['medieval', 'modern', 'nature', 'scifi', 'misc'],
          description: 'Style category'
        },
        palette: {
          type: 'object',
          description: 'Map of short keys to [BrickColor, Material] or [BrickColor, Material, MaterialVariant] tuples. E.g. {"a": ["Dark stone grey", "Concrete"], "b": ["Brown", "Wood", "MyCustomWood"]}'
        },
        parts: {
          type: 'array',
          description: 'Array of parts. Object format: {position:[x,y,z], size:[x,y,z], rotation:[x,y,z], paletteKey, shape?, transparency?}. Tuple format [posX,posY,posZ,sizeX,sizeY,sizeZ,rotX,rotY,rotZ,paletteKey,shape?,transparency?] also accepted.',
          items: {
            anyOf: [
              {
                type: 'object',
                additionalProperties: false,
                required: ['position', 'size', 'rotation', 'paletteKey'],
                properties: {
                  position: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
                  size: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
                  rotation: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
                  paletteKey: { type: 'string', minLength: 1 },
                  shape: { type: 'string', enum: ['Block', 'Wedge', 'Cylinder', 'Ball', 'CornerWedge'] },
                  transparency: { type: 'number', minimum: 0, maximum: 1 }
                }
              },
              {
                type: 'array',
                minItems: 10,
                items: { anyOf: [{ type: 'number' }, { type: 'string' }] }
              }
            ]
          }
        },
        bounds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Optional bounding box [X, Y, Z]. Auto-computed if omitted.'
        }
      },
      required: ['id', 'style', 'palette', 'parts']
    }
  },
  {
    name: 'generate_build',
    category: 'write',
    description: `Procedurally generate a build via JS code. ALWAYS generate the entire scene in ONE call — never split into multiple small builds. PREFER high-level primitives over manual loops. No comments. No unnecessary variables. Maximize build detail per line.

EDITING: When modifying an existing build, call get_build first to retrieve the original code. Then make ONLY the targeted changes the user requested — do not rewrite unchanged code. Pass the modified code to generate_build.

HIGH-LEVEL (use these first — each replaces 5-20 lines):
  room(x,y,z, w,h,d, wallKey, floorKey?, ceilKey?, wallThickness?) - Complete enclosed room (floor+ceiling+4 walls)
  roof(x,y,z, w,d, style, key, overhang?) - style: "flat"|"gable"|"hip"
  stairs(x1,y1,z1, x2,y2,z2, width, key) - Auto-generates steps between two points
  column(x,y,z, height, radius, key, capKey?) - Cylinder with base+capital
  pew(x,y,z, w,d, seatKey, legKey?) - Bench with seat+backrest+legs
  arch(x,y,z, w,h, thickness, key, segments?) - Curved archway
  fence(x1,z1, x2,z2, y, key, postSpacing?) - Fence with posts+rails

BASIC:
  part(x,y,z, sx,sy,sz, key, shape?, transparency?)
  rpart(x,y,z, sx,sy,sz, rx,ry,rz, key, shape?, transparency?)
  wall(x1,z1, x2,z2, height, thickness, key) — vertical plane from (x1,z1) to (x2,z2)
  floor(x1,z1, x2,z2, y, thickness, key) — horizontal plane at height y, corners (x1,z1)-(x2,z2). NOT fill — only takes 2D corners+y, not 3D points
  fill(x1,y1,z1, x2,y2,z2, key, [ux,uy,uz]?) — 3D volume between two 3D points
  beam(x1,y1,z1, x2,y2,z2, thickness, key)

IMPORTANT: Palette keys must match exactly. Use only keys defined in your palette object, not color names.
CUSTOM MATERIALS: Use search_materials to find MaterialVariant names, then reference them as the 3rd palette element: {"a": ["Color", "BaseMaterial", "VariantName"]}.

REPETITION:
  row(x,y,z, count, spacingX, spacingZ, fn(i,cx,cy,cz))
  grid(x,y,z, countX, countZ, spacingX, spacingZ, fn(ix,iz,cx,cy,cz))

Shapes: Block(default), Wedge, Cylinder, Ball, CornerWedge. Max 10000 parts. Math and rng() available.
CYLINDER AXIS: Roblox cylinders extend along the X axis. For upright cylinders, use size (height, diameter, diameter) with rz=90. The column() primitive handles this automatically.

EXAMPLE — compact cabin (17 lines):
room(0,0,0,8,4,6,"a","b","a")
roof(0,4,0,8,6,"gable","c")
wall(-4,0,-2,4,0,-2,4,1,"a")
part(0,2,3,3,3,0.3,"a","Block",0.4)
row(-2,0,-1,3,0,2,(i,cx,cy,cz)=>{pew(cx,0,cz,3,2,"d")})
column(-3,0,-2,4,0.5,"a","b")
column(3,0,-2,4,0.5,"a","b")
part(0,2,0,2,1,1,"b")`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Build ID including style prefix (e.g. "medieval/church_01")'
        },
        style: {
          type: 'string',
          enum: ['medieval', 'modern', 'nature', 'scifi', 'misc'],
          description: 'Style category'
        },
        palette: {
          type: 'object',
          description: 'Map of short keys to [BrickColor, Material] or [BrickColor, Material, MaterialVariant] tuples. E.g. {"a": ["Dark stone grey", "Cobblestone"], "b": ["Brown", "WoodPlanks", "MyCustomWood"]}. MaterialVariant is optional — use it to reference custom materials from MaterialService.'
        },
        code: {
          type: 'string',
          description: 'JavaScript code using the primitives above to generate parts procedurally'
        },
        seed: {
          type: 'number',
          description: 'Optional seed for deterministic rng() output (default: 42)'
        }
      },
      required: ['id', 'style', 'palette', 'code']
    }
  },
  {
    name: 'import_build',
    category: 'write',
    description: 'Import a build into Roblox Studio. Accepts either a full build data object OR a library ID string (e.g. "medieval/church_01") to load from the build library. When using generate_build or create_build, pass the build ID string instead of the full data.',
    inputSchema: {
      type: 'object',
      properties: {
        buildData: {
          description: 'Either a build data object (with palette, parts, etc.) OR a library ID string (e.g. "medieval/church_01") to load from the build library'
        },
        targetPath: {
          type: 'string',
          description: 'Parent instance path where the model will be created'
        },
        position: {
          type: 'array',
          items: { type: 'number' },
          description: 'World position offset [X, Y, Z]'
        }
      },
      required: ['buildData', 'targetPath']
    }
  },
  {
    name: 'list_library',
    category: 'read',
    description: 'List available builds in the local build library. Returns build IDs, styles, bounds, and part counts. Optionally filter by style.',
    inputSchema: {
      type: 'object',
      properties: {
        style: {
          type: 'string',
          enum: ['medieval', 'modern', 'nature', 'scifi', 'misc'],
          description: 'Filter by style category'
        }
      }
    }
  },
  {
    name: 'search_materials',
    category: 'read',
    description: 'Search for MaterialVariant instances in MaterialService by name. Use this to find custom materials before using them in generate_build or create_build palettes. Returns material names and their base material types.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to match against material names (case-insensitive). Leave empty to list all.'
        },
        maxResults: {
          type: 'number',
          description: 'Max results to return (default: 50)'
        }
      }
    }
  },
  {
    name: 'get_build',
    category: 'read',
    description: 'Get a build from the library by ID. Returns metadata, palette, and generator code (if the build was created with generate_build). IMPORTANT: When the user asks to modify an existing build, ALWAYS call get_build first to retrieve the original code, then make targeted edits to only the relevant lines, and call generate_build with the modified code. Never rewrite the entire code from scratch — only change what the user asked to change.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Build ID (e.g. "medieval/church_01")'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'import_scene',
    category: 'write',
    description: 'Import a full scene layout. Provide a scene with model references (resolved from library) and placement data. Each model is placed at the specified position/rotation. Can also include inline custom builds.',
    inputSchema: {
      type: 'object',
      properties: {
        sceneData: {
          type: 'object',
          description: 'Scene layout object with: models (map of key to library build ID), place (array of [key, position, rotation?]), and optional custom (array of inline build objects with name, position, palette, parts)',
          properties: {
            models: {
              type: 'object',
              description: 'Map of short keys to library build IDs (e.g. {"A": "medieval/cottage_01"})'
            },
            place: {
              type: 'array',
              description: 'Array of placements. Preferred format: {modelKey, position:[x,y,z], rotation?:[x,y,z]}. Legacy tuple format [modelKey, [x,y,z], [rotX?,rotY?,rotZ?]] is also accepted.',
              items: {
                anyOf: [
                  {
                    type: 'object',
                    additionalProperties: false,
                    required: ['modelKey', 'position'],
                    properties: {
                      modelKey: {
                        type: 'string'
                      },
                      position: {
                        type: 'array',
                        items: { type: 'number' }
                      },
                      rotation: {
                        type: 'array',
                        items: { type: 'number' }
                      }
                    }
                  },
                  {
                    type: 'array',
                    items: {
                      anyOf: [
                        {
                          type: 'string'
                        },
                        {
                          type: 'array',
                          items: { type: 'number' }
                        }
                      ]
                    }
                  }
                ]
              }
            },
            custom: {
              type: 'array',
              description: 'Array of inline custom builds with {n: name, o: [x,y,z], palette: {...}, parts: [...]}',
              items: { type: 'object' }
            }
          }
        },
        targetPath: {
          type: 'string',
          description: 'Parent instance path for the scene (default: game.Workspace)'
        }
      },
      required: ['sceneData']
    }
  },

  // === Asset Tools ===
  {
    name: 'search_assets',
    category: 'read',
    description: 'Search the Creator Store (Roblox marketplace) for assets by type and keywords. Requires ROBLOX_OPEN_CLOUD_API_KEY env var (no cookie auth for this endpoint).',
    inputSchema: {
      type: 'object',
      properties: {
        assetType: {
          type: 'string',
          enum: ['Audio', 'Model', 'Decal', 'Plugin', 'MeshPart', 'Video', 'FontFamily'],
          description: 'Type of asset to search for'
        },
        query: {
          type: 'string',
          description: 'Search keywords'
        },
        maxResults: {
          type: 'number',
          description: 'Max results to return (default: 25)'
        },
        sortBy: {
          type: 'string',
          enum: ['Relevance', 'Trending', 'Top', 'AudioDuration', 'CreateTime', 'UpdatedTime', 'Ratings'],
          description: 'Sort order (default: Relevance)'
        },
        verifiedCreatorsOnly: {
          type: 'boolean',
          description: 'Only show assets from verified creators (default: false)'
        }
      },
      required: ['assetType']
    }
  },
  {
    name: 'get_asset_details',
    category: 'read',
    description: 'Get detailed marketplace metadata for a specific asset. Uses ROBLOX_OPEN_CLOUD_API_KEY or falls back to ROBLOSECURITY cookie (own assets only).',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: {
          type: 'number',
          description: 'The Roblox asset ID'
        }
      },
      required: ['assetId']
    }
  },
  {
    name: 'get_asset_thumbnail',
    category: 'read',
    description: 'Get the thumbnail image for an asset as base64 PNG, suitable for vision LLMs. Thumbnails API is public but asset validation uses ROBLOX_OPEN_CLOUD_API_KEY.',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: {
          type: 'number',
          description: 'The Roblox asset ID'
        },
        size: {
          type: 'string',
          enum: ['150x150', '420x420', '768x432'],
          description: 'Thumbnail size (default: 420x420)'
        }
      },
      required: ['assetId']
    }
  },
  {
    name: 'insert_asset',
    category: 'write',
    description: 'Insert a Roblox asset into Studio by loading it via AssetService and parenting it to a target location. Optionally set position.',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: {
          type: 'number',
          description: 'The Roblox asset ID to insert'
        },
        parentPath: {
          type: 'string',
          description: 'Parent instance path (default: game.Workspace)'
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          description: 'Optional world position to place the asset'
        }
      },
      required: ['assetId']
    }
  },
  {
    name: 'preview_asset',
    category: 'read',
    description: 'Preview a Roblox asset without permanently inserting it. Loads the asset, builds a hierarchy tree with properties and summary stats, then destroys it. Useful for inspecting asset contents before insertion.',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: {
          type: 'number',
          description: 'The Roblox asset ID to preview'
        },
        includeProperties: {
          type: 'boolean',
          description: 'Include detailed properties for each instance (default: true)'
        },
        maxDepth: {
          type: 'number',
          description: 'Max hierarchy traversal depth (default: 10)'
        }
      },
      required: ['assetId']
    }
  },
  {
    name: 'upload_decal',
    category: 'write',
    description: 'Upload an image file as a Decal asset to Roblox. Supports ROBLOSECURITY cookie auth (recommended, simpler) or ROBLOX_OPEN_CLOUD_API_KEY (needs asset:write scope + creator ID). Cookie auth is used automatically when ROBLOSECURITY is set.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path to the image file on disk (PNG, JPG, BMP, or TGA)'
        },
        displayName: {
          type: 'string',
          description: 'Display name for the decal asset (max 50 characters)'
        },
        description: {
          type: 'string',
          description: 'Description for the decal asset (default: empty string)'
        },
        userId: {
          type: 'string',
          description: 'Roblox user ID for the asset creator. Overrides ROBLOX_CREATOR_USER_ID env var.'
        },
        groupId: {
          type: 'string',
          description: 'Roblox group ID for the asset creator. Overrides ROBLOX_CREATOR_GROUP_ID env var. Takes precedence over userId if both provided.'
        }
      },
      required: ['filePath', 'displayName']
    }
  },
  {
    name: 'capture_screenshot',
    category: 'read',
    description: 'Capture a screenshot of the Roblox Studio viewport and return it as a PNG image. Requires EditableImage API to be enabled: Game Settings > Security > "Allow Mesh / Image APIs". Only works in Edit mode with the viewport visible.',
    inputSchema: {
      type: 'object',
      properties: {},
    }
  },

  // === Input Simulation ===
  {
    name: 'simulate_mouse_input',
    category: 'write',
    description: 'Simulate mouse input in the Roblox Studio viewport via VirtualInputManager. Use during playtest to click UI buttons, interact with objects, or navigate menus. Coordinates are viewport pixels (top-left is 0,0). Use capture_screenshot to identify UI element positions before clicking.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['click', 'mouseDown', 'mouseUp', 'move', 'scroll'],
          description: 'Mouse action to perform. "click" does mouseDown + short delay + mouseUp.'
        },
        x: {
          type: 'number',
          description: 'Viewport pixel X coordinate'
        },
        y: {
          type: 'number',
          description: 'Viewport pixel Y coordinate'
        },
        button: {
          type: 'string',
          enum: ['Left', 'Right', 'Middle'],
          description: 'Mouse button (default: Left)'
        },
        scrollDirection: {
          type: 'string',
          enum: ['up', 'down'],
          description: 'Scroll direction (only for "scroll" action)'
        },
        target: {
          type: 'string',
          description: 'Instance target: "edit" (default), "server", "client-1", "client-2", etc.'
        }
      },
      required: ['action', 'x', 'y']
    }
  },
  {
    name: 'simulate_keyboard_input',
    category: 'write',
    description: 'Simulate keyboard input via VirtualInputManager. Use during playtest for character movement (W/A/S/D), jumping (Space), interactions (E), or any key-driven action. For sustained movement, use "press" to hold and "release" to let go.',
    inputSchema: {
      type: 'object',
      properties: {
        keyCode: {
          type: 'string',
          description: 'Enum.KeyCode name: "W", "A", "S", "D", "Space", "E", "F", "LeftShift", "LeftControl", "Return", "Tab", "Escape", "One", "Two", etc.'
        },
        action: {
          type: 'string',
          enum: ['press', 'release', 'tap'],
          description: '"tap" (default) = press + wait + release. "press" = key down only. "release" = key up only.'
        },
        duration: {
          type: 'number',
          description: 'Hold duration in seconds for "tap" action (default: 0.1). Use longer values for sustained input like walking.'
        },
        target: {
          type: 'string',
          description: 'Instance target: "edit" (default), "server", "client-1", "client-2", etc.'
        }
      },
      required: ['keyCode']
    }
  },

  // === Character Navigation ===
  {
    name: 'character_navigation',
    category: 'write',
    description: 'Move the player character to a target position or instance during playtest. Uses PathfindingService for automatic navigation around obstacles, falling back to direct movement. Requires an active playtest in "play" mode. Does NOT simulate player input — moves the character directly.',
    inputSchema: {
      type: 'object',
      properties: {
        position: {
          type: 'array',
          items: { type: 'number' },
          description: 'Target world position [x, y, z]. Either this or instancePath is required.'
        },
        instancePath: {
          type: 'string',
          description: 'Instance to navigate to (dot notation). The character walks to its Position. Either this or position is required.'
        },
        waitForCompletion: {
          type: 'boolean',
          description: 'Wait for the character to arrive before returning (default: true)'
        },
        timeout: {
          type: 'number',
          description: 'Max seconds to wait for navigation to complete (default: 25)'
        },
        target: {
          type: 'string',
          description: 'Instance target: "edit" (default), "server", "client-1", "client-2", etc.'
        }
      }
    }
  },

  // === Instance Operations ===
  {
    name: 'clone_object',
    category: 'write',
    description: 'Clone an instance to a new parent location. Creates a deep copy of the instance and all its descendants.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Path of the instance to clone'
        },
        targetParentPath: {
          type: 'string',
          description: 'Path of the parent to place the clone under'
        }
      },
      required: ['instancePath', 'targetParentPath']
    }
  },
  {
    name: 'move_object',
    category: 'write',
    description: 'Move (reparent) an instance to a new parent location. Preserves all children and properties.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Path of the instance to move'
        },
        targetParentPath: {
          type: 'string',
          description: 'Path of the new parent'
        }
      },
      required: ['instancePath', 'targetParentPath']
    }
  },
  {
    name: 'rename_object',
    category: 'write',
    description: 'Rename an instance.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Path of the instance to rename'
        },
        newName: {
          type: 'string',
          description: 'New name for the instance'
        }
      },
      required: ['instancePath', 'newName']
    }
  },

  // === Descendants & Comparison ===
  {
    name: 'get_descendants',
    category: 'read',
    description: 'Get all descendants of an instance recursively with depth info. More efficient than repeated get_instance_children calls.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Root instance path'
        },
        maxDepth: {
          type: 'number',
          description: 'Maximum recursion depth (default: 10)'
        },
        classFilter: {
          type: 'string',
          description: 'Only include instances of this class (uses IsA, so "BasePart" matches Part, MeshPart, etc.)'
        }
      },
      required: ['instancePath']
    }
  },
  {
    name: 'compare_instances',
    category: 'read',
    description: 'Diff two instances by comparing their properties. Useful for debugging why a duplicate behaves differently.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePathA: {
          type: 'string',
          description: 'First instance path'
        },
        instancePathB: {
          type: 'string',
          description: 'Second instance path'
        }
      },
      required: ['instancePathA', 'instancePathB']
    }
  },

  // === Output & Diagnostics ===
  {
    name: 'get_output_log',
    category: 'read',
    description: 'Get the Studio output log history. Works in both edit and play mode.',
    inputSchema: {
      type: 'object',
      properties: {
        maxEntries: {
          type: 'number',
          description: 'Maximum number of log entries to return (default: 100)'
        },
        messageType: {
          type: 'string',
          description: 'Filter by message type (e.g. "Enum.MessageType.MessageOutput", "Enum.MessageType.MessageWarning", "Enum.MessageType.MessageError")'
        }
      }
    }
  },
  {
    name: 'get_script_analysis',
    category: 'read',
    description: 'Run syntax analysis on Luau scripts using loadstring. Detects compile errors with line numbers. Pass a script path to analyze one script, or a container path to analyze all scripts under it.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path - either a script or a container whose descendant scripts will be analyzed'
        }
      },
      required: ['instancePath']
    }
  },

  // === Bulk Attributes ===
  {
    name: 'bulk_set_attributes',
    category: 'write',
    description: 'Set multiple attributes on an instance in a single call. More efficient than repeated set_attribute calls.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path'
        },
        attributes: {
          type: 'object',
          description: 'Map of attribute names to values. Supports Vector3, Color3, UDim2 via _type convention.'
        }
      },
      required: ['instancePath', 'attributes']
    }
  },

  // === Find and Replace ===
  {
    name: 'find_and_replace_in_scripts',
    category: 'write',
    description: 'Find and replace text across all scripts in the game. Supports literal and Lua pattern matching. Use dryRun to preview changes before applying. Pairs with grep_scripts for search-only operations.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Text or Lua pattern to find'
        },
        replacement: {
          type: 'string',
          description: 'Replacement text. When usePattern is true, supports Lua captures (%1, %2, etc.).'
        },
        caseSensitive: {
          type: 'boolean',
          description: 'Case-sensitive matching (default: false). Must be true when usePattern is true.'
        },
        usePattern: {
          type: 'boolean',
          description: 'Use Lua pattern matching instead of literal (default: false). Requires caseSensitive: true.'
        },
        path: {
          type: 'string',
          description: 'Limit scope to a subtree (e.g. "game.ServerScriptService")'
        },
        classFilter: {
          type: 'string',
          enum: ['Script', 'LocalScript', 'ModuleScript'],
          description: 'Only search scripts of this class type'
        },
        dryRun: {
          type: 'boolean',
          description: 'Preview changes without applying them (default: false)'
        },
        maxReplacements: {
          type: 'number',
          description: 'Safety limit on total replacements (default: 1000)'
        }
      },
      required: ['pattern', 'replacement']
    }
  },
];

export const getReadOnlyTools = () => TOOL_DEFINITIONS.filter(t => t.category === 'read');
export const getAllTools = () => [...TOOL_DEFINITIONS];
