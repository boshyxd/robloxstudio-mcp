-- Roblox Studio MCP Plugin
-- This plugin communicates with the MCP server to provide Studio data access

local HttpService = game:GetService("HttpService")
local StudioService = game:GetService("StudioService")
local Selection = game:GetService("Selection")
local RunService = game:GetService("RunService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")

-- Create plugin toolbar and button
local toolbar = plugin:CreateToolbar("MCP Integration")
local button = toolbar:CreateButton(
    "MCP Server",
    "Connect to MCP Server for AI Integration",
    "rbxasset://textures/ui/GuiImagePlaceholder.png"
)

-- Plugin state
local pluginState = {
    serverUrl = "http://localhost:3002",
    mcpServerUrl = "http://localhost:3001",
    isActive = false,
    pollInterval = 0.5, -- Poll every 500ms
    lastPoll = 0
}

-- Create plugin GUI
local screenGui = plugin:CreateDockWidgetPluginGui(
    "MCPServerStatus",
    DockWidgetPluginGuiInfo.new(
        Enum.InitialDockState.Float,
        false,  -- Widget will be initially disabled
        false,  -- Don't override the previous enabled state
        200,    -- Default width
        100,    -- Default height
        150,    -- Minimum width
        75      -- Minimum height
    )
)
screenGui.Title = "MCP Server Status"

-- Create status label
local statusFrame = Instance.new("Frame")
statusFrame.Size = UDim2.new(1, 0, 1, 0)
statusFrame.BackgroundColor3 = Color3.new(0.2, 0.2, 0.2)
statusFrame.Parent = screenGui

local statusLabel = Instance.new("TextLabel")
statusLabel.Size = UDim2.new(1, -10, 1, -10)
statusLabel.Position = UDim2.new(0, 5, 0, 5)
statusLabel.BackgroundTransparency = 1
statusLabel.Text = "MCP Server: Disconnected"
statusLabel.TextColor3 = Color3.new(1, 1, 1)
statusLabel.TextScaled = true
statusLabel.Parent = statusFrame

-- Utility function to safely call Studio APIs
local function safeCall(func, ...)
    local success, result = pcall(func, ...)
    if success then
        return result
    else
        warn("MCP Plugin Error: " .. tostring(result))
        return nil
    end
end

-- Instance path utility
local function getInstancePath(instance)
    if not instance or instance == game then
        return "game"
    end
    
    local path = {}
    local current = instance
    
    while current and current ~= game do
        table.insert(path, 1, current.Name)
        current = current.Parent
    end
    
    return "game." .. table.concat(path, ".")
end

-- Check for pending requests from MCP server
local function pollForRequests()
    if not pluginState.isActive then
        return
    end
    
    local success, result = pcall(function()
        return HttpService:RequestAsync({
            Url = pluginState.serverUrl .. "/poll",
            Method = "GET",
            Headers = {
                ["Content-Type"] = "application/json"
            }
        })
    end)
    
    if success and result.Success then
        local data = HttpService:JSONDecode(result.Body)
        if data.request then
            -- Process the request and send response
            local response = processRequest(data.request)
            sendResponse(data.requestId, response)
        end
    end
end

-- Send response back to MCP server
local function sendResponse(requestId, responseData)
    pcall(function()
        HttpService:RequestAsync({
            Url = pluginState.serverUrl .. "/response",
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json"
            },
            Body = HttpService:JSONEncode({
                requestId = requestId,
                response = responseData
            })
        })
    end)
end

-- Process incoming requests
local function processRequest(request)
    local endpoint = request.endpoint
    local data = request.data or {}
    
    -- Route to appropriate handler
    if endpoint == "/api/file-tree" then
        return handlers.getFileTree(data)
    elseif endpoint == "/api/file-content" then
        return handlers.getFileContent(data)
    elseif endpoint == "/api/search-files" then
        return handlers.searchFiles(data)
    elseif endpoint == "/api/file-properties" then
        return handlers.getFileProperties(data)
    elseif endpoint == "/api/place-info" then
        return handlers.getPlaceInfo(data)
    elseif endpoint == "/api/services" then
        return handlers.getServices(data)
    elseif endpoint == "/api/selection" then
        return handlers.getSelection(data)
    elseif endpoint == "/api/search-objects" then
        return handlers.searchObjects(data)
    else
        return {error = "Unknown endpoint: " .. tostring(endpoint)}
    end
end

-- Get instance by path
local function getInstanceByPath(path)
    if path == "game" or path == "" then
        return game
    end
    
    -- Remove "game." prefix if present
    path = path:gsub("^game%.", "")
    
    local parts = {}
    for part in path:gmatch("[^%.]+") do
        table.insert(parts, part)
    end
    
    local current = game
    for _, part in ipairs(parts) do
        current = current:FindFirstChild(part)
        if not current then
            return nil
        end
    end
    
    return current
end

-- Request handlers
local handlers = {}

-- File System Tools Implementation
handlers.getFileTree = function(requestData)
    local path = requestData.path or ""
    local startInstance = getInstanceByPath(path)
    
    if not startInstance then
        return {error = "Path not found: " .. path}
    end
    
    local function buildTree(instance, depth)
        if depth > 10 then -- Prevent infinite recursion
            return {name = instance.Name, className = instance.ClassName, children = {}}
        end
        
        local node = {
            name = instance.Name,
            className = instance.ClassName,
            path = getInstancePath(instance),
            children = {}
        }
        
        -- Add source if it's a script
        if instance:IsA("BaseScript") then
            node.hasSource = true
            node.scriptType = instance.ClassName
        end
        
        -- Add children
        for _, child in ipairs(instance:GetChildren()) do
            table.insert(node.children, buildTree(child, depth + 1))
        end
        
        return node
    end
    
    return {
        tree = buildTree(startInstance, 0),
        timestamp = tick()
    }
end

handlers.getFileContent = function(requestData)
    local path = requestData.path
    if not path then
        return {error = "Path is required"}
    end
    
    local instance = getInstanceByPath(path)
    if not instance then
        return {error = "Instance not found: " .. path}
    end
    
    if not instance:IsA("BaseScript") then
        return {error = "Instance is not a script: " .. path}
    end
    
    return {
        path = path,
        source = instance.Source,
        className = instance.ClassName,
        name = instance.Name
    }
end

handlers.searchFiles = function(requestData)
    local query = requestData.query
    local searchType = requestData.searchType or "name"
    
    if not query then
        return {error = "Query is required"}
    end
    
    local results = {}
    
    local function searchRecursive(instance)
        local match = false
        
        if searchType == "name" then
            match = instance.Name:lower():find(query:lower()) ~= nil
        elseif searchType == "type" then
            match = instance.ClassName:lower():find(query:lower()) ~= nil
        elseif searchType == "content" and instance:IsA("BaseScript") then
            match = instance.Source:lower():find(query:lower()) ~= nil
        end
        
        if match then
            table.insert(results, {
                name = instance.Name,
                className = instance.ClassName,
                path = getInstancePath(instance),
                hasSource = instance:IsA("BaseScript")
            })
        end
        
        for _, child in ipairs(instance:GetChildren()) do
            searchRecursive(child)
        end
    end
    
    searchRecursive(game)
    
    return {
        results = results,
        query = query,
        searchType = searchType,
        count = #results
    }
end

handlers.getFileProperties = function(requestData)
    local path = requestData.path
    if not path then
        return {error = "Path is required"}
    end
    
    local instance = getInstanceByPath(path)
    if not instance then
        return {error = "Instance not found: " .. path}
    end
    
    local properties = {}
    local success, result = pcall(function()
        -- Get basic properties
        properties.Name = instance.Name
        properties.ClassName = instance.ClassName
        properties.Parent = instance.Parent and getInstancePath(instance.Parent) or "nil"
        
        -- Get children count
        properties.ChildCount = #instance:GetChildren()
        
        -- Script-specific properties
        if instance:IsA("BaseScript") then
            properties.Source = instance.Source
            properties.Enabled = instance.Enabled
        end
        
        return properties
    end)
    
    if success then
        return {
            path = path,
            properties = properties
        }
    else
        return {error = "Failed to get properties: " .. tostring(result)}
    end
end

-- Studio Context Tools Implementation
handlers.getPlaceInfo = function(requestData)
    return {
        placeName = game.Name,
        placeId = game.PlaceId,
        gameId = game.GameId,
        jobId = game.JobId,
        workspace = {
            name = workspace.Name,
            className = workspace.ClassName
        }
    }
end

handlers.getServices = function(requestData)
    local serviceName = requestData.serviceName
    
    if serviceName then
        local service = safeCall(game.GetService, game, serviceName)
        if service then
            return {
                service = {
                    name = service.Name,
                    className = service.ClassName,
                    path = getInstancePath(service),
                    childCount = #service:GetChildren()
                }
            }
        else
            return {error = "Service not found: " .. serviceName}
        end
    else
        -- Return common services
        local services = {}
        local commonServices = {
            "Workspace", "Players", "StarterGui", "StarterPack", "StarterPlayer",
            "ReplicatedStorage", "ServerStorage", "ServerScriptService",
            "HttpService", "TeleportService", "DataStoreService"
        }
        
        for _, serviceName in ipairs(commonServices) do
            local service = safeCall(game.GetService, game, serviceName)
            if service then
                table.insert(services, {
                    name = service.Name,
                    className = service.ClassName,
                    path = getInstancePath(service),
                    childCount = #service:GetChildren()
                })
            end
        end
        
        return {services = services}
    end
end

handlers.getSelection = function(requestData)
    local selected = Selection:Get()
    local selection = {}
    
    for _, instance in ipairs(selected) do
        table.insert(selection, {
            name = instance.Name,
            className = instance.ClassName,
            path = getInstancePath(instance)
        })
    end
    
    return {
        selection = selection,
        count = #selection
    }
end

handlers.searchObjects = function(requestData)
    local query = requestData.query
    local searchType = requestData.searchType or "name"
    local propertyName = requestData.propertyName
    
    if not query then
        return {error = "Query is required"}
    end
    
    local results = {}
    
    local function searchRecursive(instance)
        local match = false
        
        if searchType == "name" then
            match = instance.Name:lower():find(query:lower()) ~= nil
        elseif searchType == "class" then
            match = instance.ClassName:lower():find(query:lower()) ~= nil
        elseif searchType == "property" and propertyName then
            local success, value = pcall(function()
                return tostring(instance[propertyName])
            end)
            if success then
                match = value:lower():find(query:lower()) ~= nil
            end
        end
        
        if match then
            table.insert(results, {
                name = instance.Name,
                className = instance.ClassName,
                path = getInstancePath(instance)
            })
        end
        
        for _, child in ipairs(instance:GetChildren()) do
            searchRecursive(child)
        end
    end
    
    searchRecursive(game)
    
    return {
        results = results,
        query = query,
        searchType = searchType,
        count = #results
    }
end

-- Plugin activation/deactivation
local function activatePlugin()
    pluginState.isActive = true
    screenGui.Enabled = true
    statusLabel.Text = "MCP Server: Active"
    statusLabel.TextColor3 = Color3.new(0, 1, 0)
    button.Icon = "rbxasset://textures/ui/GuiImagePlaceholder.png" -- Update with active icon
    print("MCP Plugin: Activated")
    
    -- Start polling for requests
    if not pluginState.connection then
        pluginState.connection = RunService.Heartbeat:Connect(function()
            local now = tick()
            if now - pluginState.lastPoll > pluginState.pollInterval then
                pluginState.lastPoll = now
                pollForRequests()
            end
        end)
    end
end

local function deactivatePlugin()
    pluginState.isActive = false
    screenGui.Enabled = false
    statusLabel.Text = "MCP Server: Disconnected"
    statusLabel.TextColor3 = Color3.new(1, 0, 0)
    button.Icon = "rbxasset://textures/ui/GuiImagePlaceholder.png" -- Update with inactive icon
    print("MCP Plugin: Deactivated")
    
    -- Stop polling
    if pluginState.connection then
        pluginState.connection:Disconnect()
        pluginState.connection = nil
    end
end

-- Button click handler
button.Click:Connect(function()
    if pluginState.isActive then
        deactivatePlugin()
    else
        activatePlugin()
    end
end)

-- Plugin unloading
plugin.Unloading:Connect(function()
    deactivatePlugin()
end)

print("Roblox Studio MCP Plugin loaded successfully!")
print("Click the MCP Server button in the toolbar to activate")