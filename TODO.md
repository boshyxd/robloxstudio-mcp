# Roblox Studio MCP - Tool Consolidation & Future Enhancements

**Status: Complete**
- v2.0.0 consolidated 40 tools → 23 tools (42% reduction)
- All batch operations now use unified tools with array support

---

## Current Tool List (23 tools)

### Exploration (7)
- `get_file_tree`, `get_place_info`, `get_services`, `get_project_structure`
- `get_instance_properties`, `get_instance_children`, `get_class_info`

### Search (1)
- `search` - unified (name/class/property/content)

### Properties (2)
- `get_property`, `set_property` (batch + formulas + relative ops)

### Objects (3)
- `create`, `delete`, `duplicate` (all batch-capable)

### Scripts (3)
- `get_script_source`, `set_script_source`, `edit_script`

### Metadata (2)
- `attribute`, `tag` (unified action-based)

### Assets (5)
- `search_assets`, `get_asset_details`, `get_asset_thumbnail`
- `preview_asset`, `insert_asset`

---

## Future Enhancements (Tier 1-2)

### Terrain (1 tool)
- [ ] `terrain(action: 'fill' | 'paint' | 'smooth' | 'read', region, material?, ...)` 

### Lighting (1 tool)
- [ ] `lighting(action: 'set' | 'atmosphere' | 'effect', properties)` 

### UI Creation (1 tool)
- [ ] `gui(action: 'create_screen' | 'create_element' | 'set_layout', ...)` 

### Physics (1 tool)
- [ ] `physics(action: 'constraint' | 'attachment' | 'force', ...)` 

### Effects (1 tool)
- [ ] `effect(action: 'particle' | 'beam' | 'trail' | 'sound', parent, properties)` 

### Vision (1 tool)
- [ ] `capture_viewport(size?)` - Screenshot for LLM vision

### Animation (1 tool)
- [ ] `animation(action: 'load' | 'play' | 'stop', rigPath, animationId?)` 

### Tweens (1 tool)
- [ ] `tween(instancePath, duration, properties, easingStyle?, easingDirection?)` 

---

## Design Principles

1. **Single tool per domain** - Use `action` parameter for variants
2. **Batch by default** - All tools accept single item OR array
3. **Formula support** - Property tools support `formula` for computed values
4. **Relative operations** - Property tools support `operation` (add/subtract/multiply)
5. **Minimal context** - Short descriptions, clear when-to-use guidance
