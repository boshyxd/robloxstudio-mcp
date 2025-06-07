# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with hot reload using tsx
- `npm run build` - Build TypeScript to JavaScript in dist/
- `npm start` - Run the built MCP server (requires build first)
- `npm run lint` - Run ESLint on TypeScript source files
- `npm run typecheck` - Run TypeScript compiler without emitting files

## Architecture Overview

This is a dual-component system that bridges Roblox Studio with MCP (Model Context Protocol) for AI tool integration:

### Core Components

1. **MCP Server** (`src/index.ts`): Stdio-based MCP server that exposes 15 tools for Studio data access
2. **Bridge Service** (`src/bridge-service.ts`): Request/response queue manager using Promise-based async handling with UUID tracking
3. **Studio Plugin** (`studio-plugin/plugin.lua`): Luau plugin that polls the HTTP server and executes Studio API calls
4. **HTTP Server** (`src/http-server.ts`): Express server on port 3002 providing polling endpoints for the Studio plugin

### Communication Flow

The system uses a polling architecture because Roblox plugins cannot run HTTP servers:

1. AI tools call MCP server via stdio
2. MCP server queues requests in BridgeService 
3. Studio plugin polls `/poll` endpoint every 500ms
4. Plugin processes requests using Studio APIs
5. Plugin sends responses via `/response` endpoint
6. BridgeService resolves promises and returns data to MCP tools

### Key Design Patterns

- **Async Bridge Pattern**: BridgeService uses Map<string, PendingRequest> to track requests with Promise resolve/reject
- **Polling Architecture**: Studio plugin maintains connection state and polls for work rather than receiving pushes
- **Tool Proxy Pattern**: Each MCP tool proxies through HTTP to Studio plugin endpoints
- **Timeout Management**: 30-second request timeouts with periodic cleanup

### Tool Categories

All 15 tools follow the same request/response pattern but are organized into:
- File System Tools (file tree, content, search, properties)
- Studio Context Tools (place info, services, selection, object search)  
- Property & Instance Tools (instance data, children, property search, class info)
- Project Tools (structure, dependencies, reference validation)

### Studio Plugin Integration

The plugin uses proper Roblox Studio APIs:
- `plugin:CreateToolbar()` and `plugin:CreateDockWidgetPluginGui()` for UI
- `HttpService:RequestAsync()` for HTTP communication
- `RunService.Heartbeat` for polling timer
- Studio services (Selection, StudioService, etc.) for data extraction

### Build System

- TypeScript with ES modules (`"type": "module"`)
- ESLint with TypeScript parser
- Builds to `dist/` directory
- Uses tsx for development hot reload