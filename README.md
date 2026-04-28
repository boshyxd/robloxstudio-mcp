[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/boshyxd-robloxstudio-mcp-badge.png)](https://mseep.ai/app/boshyxd-robloxstudio-mcp)

# Roblox Studio MCP Server

**Connect AI assistants like Claude and Gemini to Roblox Studio**

[![NPM Version](https://img.shields.io/npm/v/robloxstudio-mcp)](https://www.npmjs.com/package/robloxstudio-mcp)

---

## What is This?

An MCP server that lets AI explore your game structure, read/edit scripts, and perform bulk changes all locally and safely.

## Setup

1. Install the [Studio plugin](https://github.com/boshyxd/robloxstudio-mcp/releases) to your Plugins folder
2. Enable **Allow HTTP Requests** in Experience Settings > Security
3. Connect your AI:

**Claude Code:**
```bash
claude mcp add robloxstudio -- npx -y robloxstudio-mcp@latest
```

**Codex CLI:**
```bash
codex mcp add robloxstudio -- npx -y robloxstudio-mcp@latest
```

**Gemini CLI:**
```bash
gemini mcp add robloxstudio npx --trust -- -y robloxstudio-mcp@latest
```

Plugin shows "Connected" when ready.

<details>
<summary>Other MCP clients (Claude Desktop, Cursor, etc.)</summary>

```json
{
  "mcpServers": {
    "robloxstudio-mcp": {
      "command": "npx",
      "args": ["-y", "robloxstudio-mcp@latest"]
    }
  }
}
```

**Windows users:** If you encounter issues, use `cmd`:
```json
{
  "mcpServers": {
    "robloxstudio-mcp": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "robloxstudio-mcp@latest"]
    }
  }
}
```
</details>

## What Can You Do?

Ask things like: *"What's the structure of this game?"*, *"Find scripts with deprecated APIs"*, *"Create 50 test NPCs in a grid"*, *"Optimize this movement code"*

<details>
<summary><strong>Inspector Edition (Read-Only)</strong></summary>

### robloxstudio-mcp-inspector

[![NPM Version](https://img.shields.io/npm/v/robloxstudio-mcp-inspector)](https://www.npmjs.com/package/robloxstudio-mcp-inspector)

A lighter, **read-only** version that only exposes inspection tools. No writes, no script edits, no object creation/deletion. Ideal for safely browsing game structure, reviewing scripts, and debugging without risk of accidental changes.

**21 read-only tools:** `get_file_tree`, `search_files`, `get_place_info`, `get_services`, `search_objects`, `get_instance_properties`, `get_instance_children`, `search_by_property`, `get_class_info`, `get_project_structure`, `mass_get_property`, `get_script_source`, `grep_scripts`, `get_attribute`, `get_attributes`, `get_tags`, `get_tagged`, `get_selection`, `start_playtest`, `stop_playtest`, `get_playtest_output`

**Setup** - same plugin, just swap the package name:

**Claude:**
```bash
claude mcp add robloxstudio-inspector -- npx -y robloxstudio-mcp-inspector@latest
```

**Codex:**
```bash
codex mcp add robloxstudio-inspector -- npx -y robloxstudio-mcp-inspector@latest
```

**Gemini:**
```bash
gemini mcp add robloxstudio-inspector npx --trust -- -y robloxstudio-mcp-inspector@latest
```

<details>
<summary>Other MCP clients (Claude Desktop, Cursor, etc.)</summary>

```json
{
  "mcpServers": {
    "robloxstudio-mcp-inspector": {
      "command": "npx",
      "args": ["-y", "robloxstudio-mcp-inspector@latest"]
    }
  }
}
```

**Windows users:** If you encounter issues, use `cmd`:
```json
{
  "mcpServers": {
    "robloxstudio-mcp-inspector": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "robloxstudio-mcp-inspector@latest"]
    }
  }
}
```
</details>

</details>

---

<!-- VERSION_LINE -->**v2.6.0-next.1** - 43 tools, inspector edition, monorepo architecture

[Report Issues](https://github.com/boshyxd/robloxstudio-mcp/issues) | [DevForum](https://devforum.roblox.com/t/v180-roblox-studio-mcp-speed-up-your-workflow-by-letting-ai-read-paths-and-properties/3707071) | MIT Licensed
