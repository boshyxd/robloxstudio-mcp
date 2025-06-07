# Roblox Studio MCP Plugin Installation Guide

## Prerequisites

1. Roblox Studio installed and running
2. MCP server running on your local machine
3. HTTP Requests enabled in Studio (Game Settings > Security > Allow HTTP Requests)

## Installation Steps

### Method 1: Local Plugin Installation (Recommended for Development)

1. **Save the plugin file:**
   - Copy the `plugin.lua` file content
   - In Roblox Studio, create a new Script in any location
   - Paste the plugin code into the script
   - Save the script locally (File > Save to File) as `MCPPlugin.lua`

2. **Install as local plugin:**
   - In Studio, go to the "Plugins" tab
   - Click "Plugins Folder" to open your local plugins directory
   - Copy your saved `MCPPlugin.lua` file into this folder
   - Restart Roblox Studio

3. **Verify installation:**
   - After restart, you should see "MCP Integration" in your plugins toolbar
   - Click the "MCP Server" button to activate the plugin

### Method 2: Plugin Script Installation

1. **Create plugin script:**
   - In Roblox Studio, open any place
   - In the Explorer, navigate to `ServerScriptService`
   - Right-click and select "Insert Object" > "Script"
   - Name it "MCPPlugin"
   - Paste the plugin code

2. **Convert to plugin:**
   - Right-click the script
   - Select "Save as Local Plugin..."
   - Give it a name like "MCP Integration"
   - Click Save

3. **The plugin will be immediately available in your toolbar**

## Configuration

1. **Enable HTTP Requests:**
   - Open Game Settings (Home tab > Game Settings)
   - Navigate to Security
   - Enable "Allow HTTP Requests"
   - Save settings

2. **Start MCP Server:**
   - In your terminal, navigate to the MCP server directory
   - Run: `npm start`
   - The server should start on port 3002

3. **Activate Plugin:**
   - Click the "MCP Server" button in the toolbar
   - The status window should show "MCP Server: Active" in green
   - The plugin will now poll for requests from the MCP server

## Usage

Once activated, the plugin will:
- Poll the MCP server every 500ms for incoming requests
- Process requests for Studio data (scripts, instances, properties, etc.)
- Send responses back to the MCP server
- Display connection status in the dock widget

## Troubleshooting

### Plugin doesn't appear in toolbar
- Ensure the plugin file was saved in the correct plugins folder
- Try restarting Roblox Studio
- Check Output window for any error messages

### "HTTP 403 Forbidden" errors
- Make sure "Allow HTTP Requests" is enabled in Game Settings
- Verify the MCP server is running on the correct port (3002)

### Connection timeout errors
- Check that the MCP server is running (`npm start`)
- Ensure no firewall is blocking localhost connections
- Verify the server URLs in the plugin match your setup

### Plugin shows "Disconnected"
- Click the MCP Server button to activate
- Check the Output window for error messages
- Ensure the MCP server is accessible at http://localhost:3002

## Security Notes

- The plugin only works with local servers (localhost)
- No external connections are made
- All data stays on your local machine
- The plugin only reads data, it doesn't modify your place

## Development Tips

- Use the Output window to see debug messages
- The status widget shows real-time connection status
- You can modify polling interval in the plugin code if needed
- For debugging, add print statements to track request/response flow