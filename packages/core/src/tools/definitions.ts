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
    description: 'Get instance hierarchy tree from Studio',
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
    description: 'Get all properties of an instance',
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
    description: 'Get full game hierarchy tree. Increase maxDepth (default 3) for deeper traversal.',
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
    name: 'set_properties',
    category: 'write',
    description: 'Set multiple properties on a single instance in one call. Much faster than calling set_property multiple times.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        },
        properties: {
          type: 'object',
          description: 'Object of property name → value pairs to set'
        }
      },
      required: ['instancePath', 'properties']
    }
  },
  {
    name: 'create_ui_tree',
    category: 'write',
    description: 'Create an entire UI hierarchy from a nested JSON tree in one call. Each node has className, name, properties, and children array. Much faster than multiple create_object calls.',
    inputSchema: {
      type: 'object',
      properties: {
        parentPath: {
          type: 'string',
          description: 'Parent instance path where the tree root will be created'
        },
        tree: {
          type: 'object',
          description: 'Nested tree: { className, name?, properties?: {}, children?: [{...}] }'
        }
      },
      required: ['parentPath', 'tree']
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
  {
    name: 'set_calculated_property',
    category: 'write',
    description: 'Set properties via formula (e.g. "index * 50")',
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
        formula: {
          type: 'string',
          description: 'Formula expression'
        },
        variables: {
          type: 'object',
          description: 'Additional formula variables'
        }
      },
      required: ['paths', 'propertyName', 'formula']
    }
  },
  {
    name: 'set_relative_property',
    category: 'write',
    description: 'Modify properties relative to current values',
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
        operation: {
          type: 'string',
          enum: ['add', 'multiply', 'divide', 'subtract', 'power'],
          description: 'Operation'
        },
        value: {
          description: 'Operand value (number or object for Vector3/UDim2 components)'
        },
        component: {
          type: 'string',
          enum: ['X', 'Y', 'Z', 'XScale', 'XOffset', 'YScale', 'YOffset'],
          description: 'Vector3/UDim2 component'
        }
      },
      required: ['paths', 'propertyName', 'operation', 'value']
    }
  },

  // === Script Read/Write ===
  {
    name: 'get_script_source',
    category: 'read',
    description: 'Get script source. Returns "source" and "numberedSource" (line-numbered). Use startLine/endLine for large scripts.',
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
    description: 'Replace a range of lines. 1-indexed, inclusive. Use numberedSource for line numbers.',
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
        },
        newContent: {
          type: 'string',
          description: 'Replacement content'
        }
      },
      required: ['instancePath', 'startLine', 'endLine', 'newContent']
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
        }
      },
      required: ['code']
    }
  },

  // === Script Search ===
  {
    name: 'grep_scripts',
    category: 'read',
    description: 'Ripgrep-inspired search across all script sources. Supports literal and Lua pattern matching, context lines, early termination, and results grouped by script with line/column numbers.',
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
    description: 'Start playtest. Captures print/warn/error via LogService. Poll with get_playtest_output, end with stop_playtest.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['play', 'run'],
          description: 'Play mode'
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
          description: 'Array of part arrays. Each: [posX, posY, posZ, sizeX, sizeY, sizeZ, rotX, rotY, rotZ, paletteKey, shape?, transparency?]. Shapes: Block (default), Wedge, Cylinder, Ball, CornerWedge.',
          items: {
            type: 'array',
            items: {
              anyOf: [{ type: 'number' }, { type: 'string' }]
            }
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
    description: 'Search the Creator Store (Roblox marketplace) for assets by type and keywords. Requires ROBLOX_OPEN_CLOUD_API_KEY env var.',
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
    description: 'Get detailed marketplace metadata for a specific asset (creator info, votes, description, pricing). Requires ROBLOX_OPEN_CLOUD_API_KEY env var.',
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
    description: 'Get the thumbnail image for an asset as base64 PNG, suitable for vision LLMs. Requires ROBLOX_OPEN_CLOUD_API_KEY env var.',
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
    name: 'capture_screenshot',
    category: 'read',
    description: 'Capture a screenshot of the Roblox Studio viewport and return it as a PNG image. Requires EditableImage API to be enabled: Game Settings > Security > "Allow Mesh / Image APIs". Only works in Edit mode with the viewport visible.',
    inputSchema: {
      type: 'object',
      properties: {},
    }
  },
];

export const getReadOnlyTools = () => TOOL_DEFINITIONS.filter(t => t.category === 'read');
export const getAllTools = () => [...TOOL_DEFINITIONS];
