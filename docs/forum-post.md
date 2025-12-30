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

An MCP server that connects AI assistants (like Claude) to Roblox Studio through a local bridge and plugin. It lets AI explore your game’s structure, read and edit scripts (including ModuleScripts), and perform safe, bulk changes, all locally.

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
Debugging:             "Find possible memory leaks or deprecated APIs"
Mass operations:       "Create 50 test NPCs and position them in a grid"
Script work:           "Explain this weapon system" / "Optimize this movement code"
Attributes & Tags:     "Tag all enemies for CollectionService" / "Set custom attributes"
```

## Why Use This?

- Understand and navigate large projects quickly
- Apply consistent changes at scale (properties, duplication, creation)
- Read and edit script sources programmatically and safely via Studio

## Key Features

- Project analysis and search across services, objects, and scripts
- Script management (read/write/partial edit) for Script, LocalScript, and ModuleScript
- Attributes and Tags (CollectionService) support
- Mass operations (property edits, smart/mass duplication, calculated/relative properties)

<details>
<summary><strong>Complete Tool List (23 tools)</strong></summary>

**Analysis & Search:** `get_project_structure`, `get_selection`, `search_objects`, `search_files`, `search_by_property`

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
- **Asset Tools** - Search, preview, and insert Creator Store assets directly from AI
- **Vision LLM Support** - Thumbnails visible to AI for asset selection
- **Consolidated Tools** - Streamlined from 40 to 23 focused, powerful tools
- **Enhanced Script Editing** - Line-level operations for precise changes

### v1.8.0
- **New Tool: `get_selection`** - Get currently selected objects in Studio for context-aware AI assistance
- **Fixed Property Setting:** `mass_create_objects_with_properties` and `set_property` now correctly handle Vector3, Color3, Enums, and instance references (like PrimaryPart)
- **Fixed Newline Corruption:** Script source with escaped characters now properly converts when pushing code to Studio
- **Improved Tool Descriptions:** Clearer documentation distinguishing Roblox instances from local files

### v1.7.x
- **Partial Script Editing:** `edit_script_lines`, `insert_script_lines`, `delete_script_lines` for targeted edits without rewriting entire scripts
- **Attributes Support:** `get_attribute`, `set_attribute`, `get_attributes`, `delete_attribute` with Vector3, Color3, UDim2, BrickColor support
- **Tags (CollectionService):** `get_tags`, `add_tag`, `remove_tag`, `get_tagged` for tag-based workflows
- **Improved Script Handling:** `get_script_source` now returns `numberedSource` field with line numbers for accurate editing
- Uses ScriptEditorService:UpdateSourceAsync for editing scripts open in tabs

---

## Get Started

1. **[Install Studio Plugin](https://github.com/boshyxd/robloxstudio-mcp/releases)**
2. **Enable HTTP Requests** (Game Settings → Security)  
3. **Connect AI:** `claude mcp add robloxstudio -- npx -y robloxstudio-mcp`

Ready in under 2 minutes.

Try asking: "What's the structure of this game?" or "Find all scripts with potential issues"

## Links & Resources

[**Documentation**](https://github.com/boshyxd/robloxstudio-mcp#readme) • [**Report Issues**](https://github.com/boshyxd/robloxstudio-mcp/issues) • [**Request Features**](https://github.com/boshyxd/robloxstudio-mcp/issues/new) • [**NPM Package**](https://www.npmjs.com/package/robloxstudio-mcp)

---

*MIT Licensed • Free for any use • Built for the Roblox developer community*