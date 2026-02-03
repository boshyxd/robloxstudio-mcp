#!/usr/bin/env node
/**
 * Build MCPPlugin.rbxmx from plugin.server.luau without requiring Rojo.
 * Usage: node scripts/build-plugin.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const pluginDir = join(rootDir, 'studio-plugin');
const sourcePath = join(pluginDir, 'plugin.server.luau');
const outputPath = join(pluginDir, 'MCPPlugin.rbxmx');

const source = readFileSync(sourcePath, 'utf8');

// In XML CDATA, the only forbidden sequence is ]]>. Split so it becomes ]]]]><![CDATA[>
const cdataContent = source.replace(/\]\]>/g, ']]]]><![CDATA[>');

const rbxmx = `<?xml version="1.0" encoding="utf-8"?>
<roblox version="4">
  <Item class="Script" referent="0">
    <Properties>
      <string name="Name">MCPPlugin</string>
      <token name="RunContext">0</token>
      <string name="Source"><![CDATA[${cdataContent}]]></string>
    </Properties>
  </Item>
</roblox>
`;

writeFileSync(outputPath, rbxmx, 'utf8');
console.log('Built studio-plugin/MCPPlugin.rbxmx');
