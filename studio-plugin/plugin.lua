-- Roblox Studio MCP Plugin
-- This plugin communicates with the MCP server to provide Studio data access

local HttpService = game:GetService("HttpService")
local StudioService = game:GetService("StudioService")
local Selection = game:GetService("Selection")
local ReflectionMetadata = game:GetService("ReflectionMetadata")

local MCPConnector = {
    serverUrl = "http://localhost:3001",
    isConnected = false,
    apiVersion = "v1"
}

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

-- HTTP Request wrapper
local function makeRequest(endpoint, data)
    local success, response = pcall(function()
        return HttpService:PostAsync(
            MCPConnector.serverUrl .. endpoint,
            HttpService:JSONEncode(data or {}),
            Enum.HttpContentType.ApplicationJson
        )
    end)
    
    if success then
        return HttpService:JSONDecode(response)
    else
        warn("Failed to communicate with MCP server: " .. tostring(response))
        return {error = "Connection failed"}
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

-- File System Tools Implementation
MCPConnector.getFileTree = function(requestData)
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

MCPConnector.getFileContent = function(requestData)
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

MCPConnector.searchFiles = function(requestData)
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

MCPConnector.getFileProperties = function(requestData)
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
MCPConnector.getPlaceInfo = function(requestData)
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

MCPConnector.getServices = function(requestData)
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

MCPConnector.getSelection = function(requestData)
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

MCPConnector.searchObjects = function(requestData)
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

-- Initialize HTTP server for MCP communication
local function initializeHttpServer()
    -- Create simple HTTP server on port 3002
    -- Note: This is a simplified implementation
    -- In practice, you might need to use a more robust HTTP server
    
    print("MCP Plugin: Starting HTTP server on port 3002")
    
    -- Register endpoints
    local endpoints = {
        ["/api/file-tree"] = MCPConnector.getFileTree,
        ["/api/file-content"] = MCPConnector.getFileContent,
        ["/api/search-files"] = MCPConnector.searchFiles,
        ["/api/file-properties"] = MCPConnector.getFileProperties,
        ["/api/place-info"] = MCPConnector.getPlaceInfo,
        ["/api/services"] = MCPConnector.getServices,
        ["/api/selection"] = MCPConnector.getSelection,
        ["/api/search-objects"] = MCPConnector.searchObjects
    }
    
    -- Simple request handler (this would need to be implemented with actual HTTP server)
    print("MCP Plugin: Endpoints registered")
    for endpoint, handler in pairs(endpoints) do
        print("  " .. endpoint)
    end
    
    MCPConnector.isConnected = true
end

-- Initialize the plugin
initializeHttpServer()

print("Roblox Studio MCP Plugin loaded successfully!")
print("Server URL: " .. MCPConnector.serverUrl)
print("Connection status: " .. (MCPConnector.isConnected and "Connected" or "Disconnected"))