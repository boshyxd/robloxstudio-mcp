<div align="center">

![replicate-prediction-ejzr9cgx5hrm80cqbpdsbxve1c|689x394, 75%](upload://pksmr092TG2MDid0jQCYqQcOO6M.png)

</div>

<div align="center">

[**Studio Plugin**](https://create.roblox.com/store/asset/75577477776988) | [**Download**](https://github.com/boshyxd/robloxstudio-mcp/releases) | [**GitHub**](https://github.com/boshyxd/robloxstudio-mcp) | [**NPM Package**](https://www.npmjs.com/package/robloxstudio-mcp) | [**Documentation**](https://github.com/boshyxd/robloxstudio-mcp#readme)

</div>

<div align="center">

**Connect AI assistants like Claude to your Roblox Studio projects**

*23 tools for project analysis, script editing, asset management, and bulk operations*

</div>

---

## What is This?

An MCP server that lets AI assistants read and modify your Roblox Studio projects. Claude can now explore your game structure, read scripts, and make changes directly through Studio.

**What it does:**
- Project analysis - Browse your entire game structure
- Script editing - Read and modify script source code  
- Mass operations - Change hundreds of objects at once
- Search tools - Find anything in your project quickly
- Local processing - Everything runs on your machine

---

## Quick Setup

**Step 1:** Install the Studio plugin from the [Creator Store](https://create.roblox.com/store/asset/75577477776988)

**Step 2:** Enable "Allow HTTP Requests" in Game Settings → Security

**Step 3:** Connect your AI assistant:

```bash
# Claude Code
claude mcp add robloxstudio -- npx -y robloxstudio-mcp

# Claude Desktop - add to config
{
  "mcpServers": {
    "robloxstudio-mcp": {
      "command": "npx",
      "args": ["-y", "robloxstudio-mcp"]
    }
  }
}
```

That's it! The plugin shows "Connected" when ready.

## What Can You Do?

**Project Understanding**
```
"What's the structure of this game?"
"Find all scripts that handle player data"
"Show me every RemoteEvent in the project"
```

**Debugging**
```
"Find potential memory leaks in my scripts"
"Which parts might be causing performance issues?"
"Are there any deprecated API calls?"
```

**Mass Operations**
```
"Make all checkpoint parts non-collidable and transparent"
"Create 50 test NPCs positioned in a grid"
"Update all GUI themes to use the new color scheme"
```

**Script Work**
```
"Explain how this weapon system works"
"Add error handling to this script"
"Optimize this movement code"
```

## Why Use This?

**Instead of Manual Studio Work:**
- Search your entire project instantly
- Change hundreds of objects at once
- Get AI analysis of your code and structure
- Read and edit scripts programmatically

**What Makes It Different:**
- 23 consolidated tools for Roblox development
- Script source reading and editing
- Built specifically for AI assistant integration
- Pure TypeScript - easy to understand and modify

## Key Features

**Project Analysis**
- Complete project hierarchy and structure
- Search across all objects and scripts
- Property-based filtering and exploration

**Script Management**  
- Read and edit script source code
- Search script content across your project
- Safe script modification through Studio

**Mass Operations**
- Bulk property changes on hundreds of objects
- Object duplication with automatic positioning
- Calculated properties using formulas

**Object Management**
- Create, modify, and delete instances
- Advanced search by class, name, or properties
- Complete object information

<details>
<summary><strong>Complete Tool List (23 tools)</strong></summary>

**Analysis & Search:** `get_project_structure`, `search_objects`, `search_files`, `search_by_property`

**Properties:** `get_instance_properties`, `set_property`, `mass_set_property`, `mass_get_property`

**Creation:** `create_object`, `mass_create_objects`, `smart_duplicate`, `mass_duplicate`

**Scripts:** `get_script_source`, `set_script_source`, `edit_script_lines`, `insert_script_lines`, `delete_script_lines`

**Assets:** `search_assets`, `get_asset_details`, `get_asset_thumbnail`, `preview_asset`, `insert_asset`

**Attributes/Tags:** `get_attribute`, `set_attribute`, `get_attributes`, `delete_attribute`, `get_tags`, `add_tag`, `remove_tag`, `get_tagged`

**Advanced:** `set_calculated_property`, `set_relative_property`, `get_class_info`

</details>

## Security

**100% Local** - Everything runs on your machine, no external servers

**Open Source** - Every line of code is available on GitHub

**Localhost Only** - Communication restricted to your local machine (port 3002)

**You Control Changes** - AI suggests, you approve all modifications

---

## Latest Updates

**Version 1.7.0**
- Asset tools - Search, preview, and insert Creator Store assets
- 40 total tools for complete Studio control
- Vision LLM support - Thumbnails visible to AI
- Enhanced script editing with line-level control

---

## Get Started

1. **[Install Studio Plugin](https://create.roblox.com/store/asset/75577477776988)**
2. **Enable HTTP Requests** (Game Settings → Security)  
3. **Connect AI:** `claude mcp add robloxstudio -- npx -y robloxstudio-mcp`

Ready in under 2 minutes.

Try asking: "What's the structure of this game?" or "Find all scripts with potential issues"

## Links & Resources

[**Documentation**](https://github.com/boshyxd/robloxstudio-mcp#readme) • [**Report Issues**](https://github.com/boshyxd/robloxstudio-mcp/issues) • [**Request Features**](https://github.com/boshyxd/robloxstudio-mcp/issues/new) • [**NPM Package**](https://www.npmjs.com/package/robloxstudio-mcp)

---

*MIT Licensed • Free for any use • Built for the Roblox developer community*