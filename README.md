# Roblox Studio MCP Server

An MCP (Model Context Protocol) server that provides AI tools access to Roblox Studio data through a plugin-based architecture.

## Architecture

- **MCP Server** (TypeScript/Node.js) - Handles AI tool calls
- **Studio Plugin** (Luau) - Extracts Studio data and communicates with MCP server
- **HTTP Bridge** - Communication layer between plugin and server

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Start the MCP server:**
   ```bash
   npm start
   ```

4. **Install the Studio plugin:**
   - Copy the `studio-plugin/` folder to your Roblox Studio plugins directory
   - Enable the plugin in Studio

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

The MCP server runs on port 3001 and communicates with the Studio plugin (port 3002) via HTTP requests. The plugin extracts data from Roblox Studio's API and forwards it to the MCP server for AI tool consumption.

## Configuration

The server can be configured through environment variables:
- `MCP_SERVER_PORT` - Server port (default: 3001)
- `STUDIO_PLUGIN_URL` - Studio plugin URL (default: http://localhost:3002)