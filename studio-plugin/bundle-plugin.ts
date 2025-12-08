#!/usr/bin/env npx ts-node

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// Configuration
const PLUGIN_NAME = 'RobloxStudioMCP';
const INPUT_FILE = 'plugin.luau';
const OUTPUT_FILE = 'MCPPlugin.rbxmx';

// Generate a GUID in the format {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}
const SCRIPT_GUID = `{${randomUUID().toUpperCase()}}`;

// XML Template
const TEMPLATE = `<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">
	<Item class="Script" referent="RBX8A31D824702048E19F5C5B17B809F408">
		<Properties>
			<BinaryString name="AttributesSerialize"></BinaryString>
			<bool name="Disabled">false</bool>
			<Content name="LinkedSource"><null></null></Content>
			<string name="Name">${PLUGIN_NAME}</string>
			<string name="ScriptGuid">{guid}</string>
			<ProtectedString name="Source"><![CDATA[{source}]]></ProtectedString>
			<int64 name="SourceAssetId">-1</int64>
			<BinaryString name="Tags"></BinaryString>
		</Properties>
	</Item>
</roblox>`;

function bundlePlugin(): void {
    // Get absolute paths - handle both ESM and CommonJS
    const currentDir = typeof __dirname !== 'undefined'
        ? __dirname
        : dirname(fileURLToPath(import.meta.url));

    const inputPath = join(currentDir, INPUT_FILE);
    const outputPath = join(currentDir, OUTPUT_FILE);

    console.log(`Reading from: ${inputPath}`);

    try {
        let luaSource = readFileSync(inputPath, 'utf-8');

        // Handle CDATA escaping (replace ]]> with ]]]]><![CDATA[>)
        luaSource = luaSource.replace(/\]\]>/g, ']]]]><![CDATA[>');

        // Fill template
        const rbxmxContent = TEMPLATE
            .replace('{guid}', SCRIPT_GUID)
            .replace('{source}', luaSource);

        writeFileSync(outputPath, rbxmxContent, 'utf-8');

        console.log(`Successfully created: ${outputPath}`);
    } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }
}

// Run if executed directly
bundlePlugin();
