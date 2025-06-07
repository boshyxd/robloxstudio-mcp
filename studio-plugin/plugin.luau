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
	"rbxassetid://10734944444"
)

-- Plugin state
local pluginState = {
	serverUrl = "http://localhost:3002",
	mcpServerUrl = "http://localhost:3001",
	isActive = false,
	pollInterval = 0.5, -- Poll every 500ms
	lastPoll = 0,
	consecutiveFailures = 0,
	maxFailuresBeforeError = 50, -- Show error after 50 consecutive failures (25 seconds)
	lastSuccessfulConnection = 0,
	currentRetryDelay = 0.5, -- Current retry delay in seconds
	maxRetryDelay = 5, -- Maximum retry delay in seconds
	retryBackoffMultiplier = 1.2, -- Exponential backoff multiplier
}

-- Create plugin GUI
local screenGui = plugin:CreateDockWidgetPluginGui(
	"MCPServerInterface",
	DockWidgetPluginGuiInfo.new(
		Enum.InitialDockState.Float,
		false, -- Widget will be initially disabled
		false, -- Don't override the previous enabled state
		300, -- Default width
		200, -- Default height
		280, -- Minimum width
		180 -- Minimum height
	)
)
screenGui.Title = "MCP Server Interface"

-- Main container frame
local mainFrame = Instance.new("Frame")
mainFrame.Size = UDim2.new(1, 0, 1, 0)
mainFrame.BackgroundColor3 = Color3.fromRGB(46, 46, 46)
mainFrame.BorderSizePixel = 0
mainFrame.Parent = screenGui

-- Header frame
local headerFrame = Instance.new("Frame")
headerFrame.Size = UDim2.new(1, 0, 0, 40)
headerFrame.Position = UDim2.new(0, 0, 0, 0)
headerFrame.BackgroundColor3 = Color3.fromRGB(37, 37, 37)
headerFrame.BorderSizePixel = 0
headerFrame.Parent = mainFrame

-- Title label
local titleLabel = Instance.new("TextLabel")
titleLabel.Size = UDim2.new(1, -10, 1, 0)
titleLabel.Position = UDim2.new(0, 10, 0, 0)
titleLabel.BackgroundTransparency = 1
titleLabel.Text = "MCP Server"
titleLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
titleLabel.TextScaled = false
titleLabel.TextSize = 16
titleLabel.Font = Enum.Font.SourceSansBold
titleLabel.TextXAlignment = Enum.TextXAlignment.Left
titleLabel.Parent = headerFrame

-- Status indicator
local statusIndicator = Instance.new("Frame")
statusIndicator.Size = UDim2.new(0, 12, 0, 12)
statusIndicator.Position = UDim2.new(1, -20, 0.5, -6)
statusIndicator.BackgroundColor3 = Color3.fromRGB(255, 85, 85) -- Red for disconnected
statusIndicator.BorderSizePixel = 0
statusIndicator.Parent = headerFrame

-- Round the status indicator
local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(1, 0)
corner.Parent = statusIndicator

-- Content frame
local contentFrame = Instance.new("Frame")
contentFrame.Size = UDim2.new(1, -20, 1, -60)
contentFrame.Position = UDim2.new(0, 10, 0, 50)
contentFrame.BackgroundTransparency = 1
contentFrame.Parent = mainFrame

-- Server URL input
local urlLabel = Instance.new("TextLabel")
urlLabel.Size = UDim2.new(1, 0, 0, 20)
urlLabel.Position = UDim2.new(0, 0, 0, 0)
urlLabel.BackgroundTransparency = 1
urlLabel.Text = "Server URL:"
urlLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
urlLabel.TextScaled = false
urlLabel.TextSize = 14
urlLabel.Font = Enum.Font.SourceSans
urlLabel.TextXAlignment = Enum.TextXAlignment.Left
urlLabel.Parent = contentFrame

local urlInput = Instance.new("TextBox")
urlInput.Size = UDim2.new(1, 0, 0, 25)
urlInput.Position = UDim2.new(0, 0, 0, 25)
urlInput.BackgroundColor3 = Color3.fromRGB(60, 60, 60)
urlInput.BorderSizePixel = 0
urlInput.Text = "http://localhost:3002"
urlInput.TextColor3 = Color3.fromRGB(255, 255, 255)
urlInput.TextScaled = false
urlInput.TextSize = 12
urlInput.Font = Enum.Font.SourceSans
urlInput.ClearTextOnFocus = false
urlInput.Parent = contentFrame

-- Round the input
local inputCorner = Instance.new("UICorner")
inputCorner.CornerRadius = UDim.new(0, 4)
inputCorner.Parent = urlInput

-- Padding for input
local inputPadding = Instance.new("UIPadding")
inputPadding.PaddingLeft = UDim.new(0, 8)
inputPadding.PaddingRight = UDim.new(0, 8)
inputPadding.Parent = urlInput

-- Status label
local statusLabel = Instance.new("TextLabel")
statusLabel.Size = UDim2.new(1, 0, 0, 20)
statusLabel.Position = UDim2.new(0, 0, 0, 60)
statusLabel.BackgroundTransparency = 1
statusLabel.Text = "Status: Disconnected"
statusLabel.TextColor3 = Color3.fromRGB(255, 85, 85)
statusLabel.TextScaled = false
statusLabel.TextSize = 14
statusLabel.Font = Enum.Font.SourceSans
statusLabel.TextXAlignment = Enum.TextXAlignment.Left
statusLabel.Parent = contentFrame

-- Connect/Disconnect button
local connectButton = Instance.new("TextButton")
connectButton.Size = UDim2.new(1, 0, 0, 35)
connectButton.Position = UDim2.new(0, 0, 0, 90)
connectButton.BackgroundColor3 = Color3.fromRGB(0, 162, 255)
connectButton.BorderSizePixel = 0
connectButton.Text = "Connect"
connectButton.TextColor3 = Color3.fromRGB(255, 255, 255)
connectButton.TextScaled = false
connectButton.TextSize = 16
connectButton.Font = Enum.Font.SourceSansBold
connectButton.Parent = contentFrame

-- Round the button
local buttonCorner = Instance.new("UICorner")
buttonCorner.CornerRadius = UDim.new(0, 6)
buttonCorner.Parent = connectButton

-- Button hover effect
local buttonHover = false
connectButton.MouseEnter:Connect(function()
	buttonHover = true
	if not pluginState.isActive then
		connectButton.BackgroundColor3 = Color3.fromRGB(30, 180, 255)
	else
		connectButton.BackgroundColor3 = Color3.fromRGB(255, 100, 100)
	end
end)

connectButton.MouseLeave:Connect(function()
	buttonHover = false
	if not pluginState.isActive then
		connectButton.BackgroundColor3 = Color3.fromRGB(0, 162, 255)
	else
		connectButton.BackgroundColor3 = Color3.fromRGB(255, 85, 85)
	end
end)

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

-- Forward declarations
local processRequest
local sendResponse
local handlers = {}

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
				["Content-Type"] = "application/json",
			},
		})
	end)

	if success and result.Success then
		-- Reset failure count and retry delay on successful connection
		pluginState.consecutiveFailures = 0
		pluginState.currentRetryDelay = 0.5
		pluginState.lastSuccessfulConnection = tick()

		-- Update status to show successful connection
		if statusLabel.Text ~= "Status: Connected" then
			statusLabel.Text = "Status: Connected"
			statusLabel.TextColor3 = Color3.fromRGB(85, 255, 85)
			statusIndicator.BackgroundColor3 = Color3.fromRGB(85, 255, 85)
		end

		local data = HttpService:JSONDecode(result.Body)
		if data.request then
			-- Process the request and send response
			local response = processRequest(data.request)
			sendResponse(data.requestId, response)
		end
	elseif pluginState.isActive then
		-- Connection failed, increment failure count
		pluginState.consecutiveFailures = pluginState.consecutiveFailures + 1

		-- Update retry delay with exponential backoff
		if pluginState.consecutiveFailures > 1 then
			pluginState.currentRetryDelay = math.min(
				pluginState.currentRetryDelay * pluginState.retryBackoffMultiplier,
				pluginState.maxRetryDelay
			)
		end

		if pluginState.consecutiveFailures >= pluginState.maxFailuresBeforeError then
			-- Show error only after many consecutive failures
			statusLabel.Text = "Status: Server Unavailable"
			statusLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
			statusIndicator.BackgroundColor3 = Color3.fromRGB(255, 100, 100)
		elseif pluginState.consecutiveFailures > 5 then
			-- Show waiting status for longer retries
			local waitTime = math.ceil(pluginState.currentRetryDelay)
			statusLabel.Text = "Status: Waiting for server... (" .. waitTime .. "s)"
			statusLabel.TextColor3 = Color3.fromRGB(255, 200, 85)
			statusIndicator.BackgroundColor3 = Color3.fromRGB(255, 200, 85)
		elseif pluginState.consecutiveFailures > 1 then
			-- Show retrying status
			statusLabel.Text = "Status: Connecting... (" .. pluginState.consecutiveFailures .. ")"
			statusLabel.TextColor3 = Color3.fromRGB(255, 255, 85)
			statusIndicator.BackgroundColor3 = Color3.fromRGB(255, 255, 85)
		end
	end
end

-- Send response back to MCP server
sendResponse = function(requestId, responseData)
	pcall(function()
		HttpService:RequestAsync({
			Url = pluginState.serverUrl .. "/response",
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json",
			},
			Body = HttpService:JSONEncode({
				requestId = requestId,
				response = responseData,
			}),
		})
	end)
end

-- Process incoming requests
processRequest = function(request)
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
		return { error = "Unknown endpoint: " .. tostring(endpoint) }
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

-- File System Tools Implementation
handlers.getFileTree = function(requestData)
	local path = requestData.path or ""
	local startInstance = getInstanceByPath(path)

	if not startInstance then
		return { error = "Path not found: " .. path }
	end

	local function buildTree(instance, depth)
		if depth > 10 then -- Prevent infinite recursion
			return { name = instance.Name, className = instance.ClassName, children = {} }
		end

		local node = {
			name = instance.Name,
			className = instance.ClassName,
			path = getInstancePath(instance),
			children = {},
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
		timestamp = tick(),
	}
end

handlers.getFileContent = function(requestData)
	local path = requestData.path
	if not path then
		return { error = "Path is required" }
	end

	local instance = getInstanceByPath(path)
	if not instance then
		return { error = "Instance not found: " .. path }
	end

	if not instance:IsA("BaseScript") then
		return { error = "Instance is not a script: " .. path }
	end

	return {
		path = path,
		source = instance.Source,
		className = instance.ClassName,
		name = instance.Name,
	}
end

handlers.searchFiles = function(requestData)
	local query = requestData.query
	local searchType = requestData.searchType or "name"

	if not query then
		return { error = "Query is required" }
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
				hasSource = instance:IsA("BaseScript"),
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
		count = #results,
	}
end

handlers.getFileProperties = function(requestData)
	local path = requestData.path
	if not path then
		return { error = "Path is required" }
	end

	local instance = getInstanceByPath(path)
	if not instance then
		return { error = "Instance not found: " .. path }
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
			properties = properties,
		}
	else
		return { error = "Failed to get properties: " .. tostring(result) }
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
			className = workspace.ClassName,
		},
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
					childCount = #service:GetChildren(),
				},
			}
		else
			return { error = "Service not found: " .. serviceName }
		end
	else
		-- Return common services
		local services = {}
		local commonServices = {
			"Workspace",
			"Players",
			"StarterGui",
			"StarterPack",
			"StarterPlayer",
			"ReplicatedStorage",
			"ServerStorage",
			"ServerScriptService",
			"HttpService",
			"TeleportService",
			"DataStoreService",
		}

		for _, serviceName in ipairs(commonServices) do
			local service = safeCall(game.GetService, game, serviceName)
			if service then
				table.insert(services, {
					name = service.Name,
					className = service.ClassName,
					path = getInstancePath(service),
					childCount = #service:GetChildren(),
				})
			end
		end

		return { services = services }
	end
end

handlers.getSelection = function(requestData)
	local selected = Selection:Get()
	local selection = {}

	for _, instance in ipairs(selected) do
		table.insert(selection, {
			name = instance.Name,
			className = instance.ClassName,
			path = getInstancePath(instance),
		})
	end

	return {
		selection = selection,
		count = #selection,
	}
end

handlers.searchObjects = function(requestData)
	local query = requestData.query
	local searchType = requestData.searchType or "name"
	local propertyName = requestData.propertyName

	if not query then
		return { error = "Query is required" }
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
				path = getInstancePath(instance),
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
		count = #results,
	}
end

-- Update UI state
local function updateUIState()
	if pluginState.isActive then
		-- Connecting/Connected state
		statusLabel.Text = "Status: Connecting..."
		statusLabel.TextColor3 = Color3.fromRGB(255, 200, 85)
		statusIndicator.BackgroundColor3 = Color3.fromRGB(255, 200, 85)
		connectButton.Text = "Disconnect"
		if not buttonHover then
			connectButton.BackgroundColor3 = Color3.fromRGB(255, 85, 85)
		end
		urlInput.TextEditable = false
		urlInput.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
	else
		-- Disconnected state
		statusLabel.Text = "Status: Disconnected"
		statusLabel.TextColor3 = Color3.fromRGB(255, 85, 85)
		statusIndicator.BackgroundColor3 = Color3.fromRGB(255, 85, 85)
		connectButton.Text = "Connect"
		if not buttonHover then
			connectButton.BackgroundColor3 = Color3.fromRGB(0, 162, 255)
		end
		urlInput.TextEditable = true
		urlInput.BackgroundColor3 = Color3.fromRGB(60, 60, 60)
	end
end

-- Plugin activation/deactivation
local function activatePlugin()
	-- Update server URL from input
	pluginState.serverUrl = urlInput.Text

	pluginState.isActive = true
	pluginState.consecutiveFailures = 0 -- Reset failure count on activation
	pluginState.currentRetryDelay = 0.5 -- Reset retry delay
	screenGui.Enabled = true
	updateUIState()
	print("MCP Plugin: Activated - Server URL: " .. pluginState.serverUrl)

	-- Signal to MCP server that plugin is ready
	pcall(function()
		HttpService:RequestAsync({
			Url = pluginState.serverUrl .. "/ready",
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json",
			},
			Body = HttpService:JSONEncode({
				pluginReady = true,
				timestamp = tick()
			}),
		})
	end)

	-- Start polling for requests
	if not pluginState.connection then
		pluginState.connection = RunService.Heartbeat:Connect(function()
			local now = tick()
			-- Use dynamic polling interval based on connection state
			local currentInterval = pluginState.consecutiveFailures > 5 and pluginState.currentRetryDelay or pluginState.pollInterval
			if now - pluginState.lastPoll > currentInterval then
				pluginState.lastPoll = now
				pollForRequests()
			end
		end)
	end
end

local function deactivatePlugin()
	pluginState.isActive = false
	updateUIState()
	print("MCP Plugin: Deactivated")

	-- Stop polling
	if pluginState.connection then
		pluginState.connection:Disconnect()
		pluginState.connection = nil
	end
end

-- Connect button click handler
connectButton.Activated:Connect(function()
	if pluginState.isActive then
		deactivatePlugin()
	else
		activatePlugin()
	end
end)

-- Toolbar button click handler (shows/hides UI)
button.Click:Connect(function()
	screenGui.Enabled = not screenGui.Enabled
end)

-- Plugin unloading
plugin.Unloading:Connect(function()
	deactivatePlugin()
end)

-- Initialize UI state
updateUIState()

print("Roblox Studio MCP Plugin loaded successfully!")
print("Click the MCP Server button in the toolbar to open the interface")
