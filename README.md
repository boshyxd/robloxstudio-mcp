# Roblox Studio MCP Server

An MCP (Model Context Protocol) server that provides AI tools access to Roblox Studio data through a plugin-based architecture.

## Quick Installation

### For End Users (Easy Setup)

Add to your MCP configuration (like in Claude Desktop or other MCP clients):

```json
{
  "mcpServers": {
    "robloxstudio": {
      "command": "npx",
      "args": ["-y", "robloxstudio-mcp"],
      "description": "Roblox Studio integration for AI assistants"
    }
  }
}
```

Or use with Claude Code MCP add command:
```bash
claude mcp add robloxstudio -- npx -y robloxstudio-mcp
```

### For Developers

1. **Clone and install:**
   ```bash
   git clone <repo-url>
   cd robloxstudio-mcp
   npm install
   ```

2. **Build and test:**
   ```bash
   npm run build
   npm start
   ```

## Studio Plugin Setup

**Required for both installation methods:**

1. **Install the Studio plugin:**
   - See [studio-plugin/INSTALLATION.md](studio-plugin/INSTALLATION.md) for detailed instructions
   - Enable HTTP Requests in Game Settings
   - Activate the plugin using the toolbar button

## Architecture

- **MCP Server** (TypeScript/Node.js) - Handles AI tool calls via stdio
- **Studio Plugin** (Luau) - Extracts Studio data and communicates with MCP server
- **HTTP Bridge** - Communication layer between plugin and server (localhost:3002)

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Available Tools

### File System Tools
- `get_file_tree` - Complete hierarchy with script types, models, folders
- `get_file_content` - Retrieve script source code
- `search_files` - Find files by name, type, or content patterns
- `get_file_properties` - Script properties, parent/child relationships

### Studio Context Tools
- `get_place_info` - Place ID, name, game settings
- `get_services` - Available Roblox services and their children
- `get_selection` - Currently selected objects in Studio
- `search_objects` - Find instances by name, class, properties

### Property & Instance Tools
- `get_instance_properties` - All properties of a specific instance
- `get_instance_children` - Child objects and their types
- `search_by_property` - Find objects with specific property values
- `get_class_info` - Available properties/methods for Roblox classes

### Project Tools
- `get_project_structure` - Complete game hierarchy
- `get_dependencies` - Module dependencies and relationships
- `validate_references` - Check for broken script references

## Communication Protocol

The MCP server exposes tools via stdio for AI integration. The Studio plugin polls the server on port 3002 using HTTP requests. When an AI tool is called:

1. MCP server queues the request
2. Studio plugin polls and receives the request
3. Plugin extracts data using Studio APIs
4. Plugin sends response back to server
5. Server returns result to AI tool

## Configuration

The server can be configured through environment variables:
- `MCP_SERVER_PORT` - Server port (default: 3001)
- `STUDIO_PLUGIN_URL` - Studio plugin URL (default: http://localhost:3002)