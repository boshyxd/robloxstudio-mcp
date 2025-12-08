<div align="center">

[⭐ Star on GitHub for updates](https://github.com/boshyxd/robloxstudio-mcp)

</div>

<div align="center">

![replicate-prediction-ejzr9cgx5hrm80cqbpdsbxve1c|689x394, 75%](upload://pksmr092TG2MDid0jQCYqQcOO6M.png)

</div>

<div align="center">

[**Download**](https://github.com/boshyxd/robloxstudio-mcp/releases) | [**GitHub**](https://github.com/boshyxd/robloxstudio-mcp) | [**NPM Package**](https://www.npmjs.com/package/robloxstudio-mcp) | [**Documentation**](https://github.com/boshyxd/robloxstudio-mcp#readme)

</div>

<div align="center">

**Connect AI assistants like Claude to your Roblox Studio projects**

*23 tools for project analysis, script editing, asset management, and bulk operations*

</div>

---

## What is This?

An MCP server that connects AI assistants (like Claude) to Roblox Studio through a local bridge and plugin. It lets AI explore your game’s structure, read and edit scripts (including ModuleScripts), and perform safe, bulk changes—all locally.

---

## Quick Setup

**Step 1:** Install the Studio plugin (from Releases or your preferred method)

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

Updating from older versions or fixing cache issues:
```bash
npm i robloxstudio-mcp
```

The plugin shows "Connected" when ready.

## What Can You Do?

```text
Project understanding:  "What's the structure of this game?"
Debugging:            "Find possible memory leaks or deprecated APIs"
Mass operations:      "Create 50 test NPCs and position them in a grid"
Script work:          "Explain this weapon system" / "Optimize this movement code"
```

## Why Use This?

- Understand and navigate large projects quickly
- Apply consistent changes at scale (properties, duplication, creation)
- Read and edit script sources programmatically—safely via Studio

## Key Features

- Project analysis and search across services, objects, and scripts
- Script management (read/write) for Script, LocalScript, and ModuleScript
- Mass operations (property edits, smart/mass duplication, calculated/relative properties)

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

- 100% local: runs on your machine
- Localhost-only bridge (default: 3002)
- You approve changes in Studio

---

## Latest Updates

### v2.0.0
- Asset tools - Search, preview, and insert Creator Store assets
- 40 total tools for complete Studio control
- Vision LLM support - Thumbnails visible to AI
- Enhanced script editing with line-level operations

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
