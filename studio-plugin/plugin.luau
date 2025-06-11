local HttpService = game:GetService("HttpService")
local StudioService = game:GetService("StudioService")
local Selection = game:GetService("Selection")
local RunService = game:GetService("RunService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")

local toolbar = plugin:CreateToolbar("MCP Integration")
local button =
	toolbar:CreateButton("MCP Server", "Connect to MCP Server for AI Integration", "rbxassetid://10734944444")

local pluginState = {
	serverUrl = "http://localhost:3002",
	mcpServerUrl = "http://localhost:3001",
	isActive = false,
	pollInterval = 0.5,
	lastPoll = 0,
	consecutiveFailures = 0,
	maxFailuresBeforeError = 50,
	lastSuccessfulConnection = 0,
	currentRetryDelay = 0.5,
	maxRetryDelay = 5,
	retryBackoffMultiplier = 1.2,
}

local screenGui = plugin:CreateDockWidgetPluginGui(
	"MCPServerInterface",
	DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Float, false, false, 400, 500, 350, 450)
)
screenGui.Title = "MCP Server v1.4.0"

-- Main container with modern styling
local mainFrame = Instance.new("Frame")
mainFrame.Size = UDim2.new(1, 0, 1, 0)
mainFrame.BackgroundColor3 = Color3.fromRGB(25, 25, 28)
mainFrame.BorderSizePixel = 0
mainFrame.Parent = screenGui

local mainCorner = Instance.new("UICorner")
mainCorner.CornerRadius = UDim.new(0, 8)
mainCorner.Parent = mainFrame

-- Header with gradient and modern styling
local headerFrame = Instance.new("Frame")
headerFrame.Size = UDim2.new(1, 0, 0, 60)
headerFrame.Position = UDim2.new(0, 0, 0, 0)
headerFrame.BackgroundColor3 = Color3.fromRGB(37, 99, 235)
headerFrame.BorderSizePixel = 0
headerFrame.Parent = mainFrame

local headerCorner = Instance.new("UICorner")
headerCorner.CornerRadius = UDim.new(0, 8)
headerCorner.Parent = headerFrame

local headerGradient = Instance.new("UIGradient")
headerGradient.Color = ColorSequence.new{
	ColorSequenceKeypoint.new(0, Color3.fromRGB(37, 99, 235)),
	ColorSequenceKeypoint.new(1, Color3.fromRGB(29, 78, 216))
}
headerGradient.Rotation = 90
headerGradient.Parent = headerFrame

-- Title with icon
local titleContainer = Instance.new("Frame")
titleContainer.Size = UDim2.new(1, -70, 1, 0)
titleContainer.Position = UDim2.new(0, 15, 0, 0)
titleContainer.BackgroundTransparency = 1
titleContainer.Parent = headerFrame

local titleLabel = Instance.new("TextLabel")
titleLabel.Size = UDim2.new(1, 0, 0, 28)
titleLabel.Position = UDim2.new(0, 0, 0, 8)
titleLabel.BackgroundTransparency = 1
titleLabel.Text = "🤖 MCP Server"
titleLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
titleLabel.TextScaled = false
titleLabel.TextSize = 18
titleLabel.Font = Enum.Font.SourceSansBold
titleLabel.TextXAlignment = Enum.TextXAlignment.Left
titleLabel.Parent = titleContainer

local versionLabel = Instance.new("TextLabel")
versionLabel.Size = UDim2.new(1, 0, 0, 16)
versionLabel.Position = UDim2.new(0, 0, 0, 32)
versionLabel.BackgroundTransparency = 1
versionLabel.Text = "AI Integration • v1.4.0"
versionLabel.TextColor3 = Color3.fromRGB(191, 219, 254)
versionLabel.TextScaled = false
versionLabel.TextSize = 12
versionLabel.Font = Enum.Font.SourceSans
versionLabel.TextXAlignment = Enum.TextXAlignment.Left
versionLabel.Parent = titleContainer

-- Enhanced status indicator
local statusContainer = Instance.new("Frame")
statusContainer.Size = UDim2.new(0, 50, 0, 40)
statusContainer.Position = UDim2.new(1, -60, 0, 10)
statusContainer.BackgroundTransparency = 1
statusContainer.Parent = headerFrame

local statusIndicator = Instance.new("Frame")
statusIndicator.Size = UDim2.new(0, 16, 0, 16)
statusIndicator.Position = UDim2.new(0.5, -8, 0, 5)
statusIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
statusIndicator.BorderSizePixel = 0
statusIndicator.Parent = statusContainer

local statusCorner = Instance.new("UICorner")
statusCorner.CornerRadius = UDim.new(1, 0)
statusCorner.Parent = statusIndicator

local statusPulse = Instance.new("Frame")
statusPulse.Size = UDim2.new(0, 16, 0, 16)
statusPulse.Position = UDim2.new(0, 0, 0, 0)
statusPulse.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
statusPulse.BackgroundTransparency = 0.7
statusPulse.BorderSizePixel = 0
statusPulse.Parent = statusIndicator

local pulseCorner = Instance.new("UICorner")
pulseCorner.CornerRadius = UDim.new(1, 0)
pulseCorner.Parent = statusPulse

local statusText = Instance.new("TextLabel")
statusText.Size = UDim2.new(0, 50, 0, 12)
statusText.Position = UDim2.new(0, 0, 0, 24)
statusText.BackgroundTransparency = 1
statusText.Text = "OFFLINE"
statusText.TextColor3 = Color3.fromRGB(255, 255, 255)
statusText.TextScaled = false
statusText.TextSize = 8
statusText.Font = Enum.Font.SourceSansBold
statusText.TextXAlignment = Enum.TextXAlignment.Center
statusText.Parent = statusContainer

-- Content area with sections
local contentFrame = Instance.new("ScrollingFrame")
contentFrame.Size = UDim2.new(1, -20, 1, -80)
contentFrame.Position = UDim2.new(0, 10, 0, 70)
contentFrame.BackgroundTransparency = 1
contentFrame.BorderSizePixel = 0
contentFrame.ScrollBarThickness = 4
contentFrame.ScrollBarImageColor3 = Color3.fromRGB(100, 100, 100)
contentFrame.CanvasSize = UDim2.new(0, 0, 0, 0)
contentFrame.AutomaticCanvasSize = Enum.AutomaticSize.Y
contentFrame.Parent = mainFrame

local contentLayout = Instance.new("UIListLayout")
contentLayout.Padding = UDim.new(0, 15)
contentLayout.SortOrder = Enum.SortOrder.LayoutOrder
contentLayout.Parent = contentFrame

-- Connection Section
local connectionSection = Instance.new("Frame")
connectionSection.Size = UDim2.new(1, 0, 0, 120)
connectionSection.BackgroundColor3 = Color3.fromRGB(35, 35, 38)
connectionSection.BorderSizePixel = 0
connectionSection.LayoutOrder = 1
connectionSection.Parent = contentFrame

local connectionCorner = Instance.new("UICorner")
connectionCorner.CornerRadius = UDim.new(0, 8)
connectionCorner.Parent = connectionSection

local connectionPadding = Instance.new("UIPadding")
connectionPadding.PaddingLeft = UDim.new(0, 15)
connectionPadding.PaddingRight = UDim.new(0, 15)
connectionPadding.PaddingTop = UDim.new(0, 15)
connectionPadding.PaddingBottom = UDim.new(0, 15)
connectionPadding.Parent = connectionSection

local connectionTitle = Instance.new("TextLabel")
connectionTitle.Size = UDim2.new(1, 0, 0, 20)
connectionTitle.Position = UDim2.new(0, 0, 0, 0)
connectionTitle.BackgroundTransparency = 1
connectionTitle.Text = "🔗 Connection Settings"
connectionTitle.TextColor3 = Color3.fromRGB(255, 255, 255)
connectionTitle.TextScaled = false
connectionTitle.TextSize = 14
connectionTitle.Font = Enum.Font.SourceSansBold
connectionTitle.TextXAlignment = Enum.TextXAlignment.Left
connectionTitle.Parent = connectionSection

local urlLabel = Instance.new("TextLabel")
urlLabel.Size = UDim2.new(1, 0, 0, 16)
urlLabel.Position = UDim2.new(0, 0, 0, 30)
urlLabel.BackgroundTransparency = 1
urlLabel.Text = "Server URL"
urlLabel.TextColor3 = Color3.fromRGB(156, 163, 175)
urlLabel.TextScaled = false
urlLabel.TextSize = 12
urlLabel.Font = Enum.Font.SourceSans
urlLabel.TextXAlignment = Enum.TextXAlignment.Left
urlLabel.Parent = connectionSection

local urlInput = Instance.new("TextBox")
urlInput.Size = UDim2.new(1, 0, 0, 32)
urlInput.Position = UDim2.new(0, 0, 0, 50)
urlInput.BackgroundColor3 = Color3.fromRGB(45, 45, 48)
urlInput.BorderSizePixel = 1
urlInput.BorderColor3 = Color3.fromRGB(75, 85, 99)
urlInput.Text = "http://localhost:3002"
urlInput.TextColor3 = Color3.fromRGB(255, 255, 255)
urlInput.TextScaled = false
urlInput.TextSize = 12
urlInput.Font = Enum.Font.SourceSans
urlInput.ClearTextOnFocus = false
urlInput.PlaceholderText = "Enter server URL..."
urlInput.PlaceholderColor3 = Color3.fromRGB(107, 114, 128)
urlInput.Parent = connectionSection

local urlCorner = Instance.new("UICorner")
urlCorner.CornerRadius = UDim.new(0, 6)
urlCorner.Parent = urlInput

local urlPadding = Instance.new("UIPadding")
urlPadding.PaddingLeft = UDim.new(0, 12)
urlPadding.PaddingRight = UDim.new(0, 12)
urlPadding.Parent = urlInput

-- Status Section
local statusSection = Instance.new("Frame")
statusSection.Size = UDim2.new(1, 0, 0, 80)
statusSection.BackgroundColor3 = Color3.fromRGB(35, 35, 38)
statusSection.BorderSizePixel = 0
statusSection.LayoutOrder = 2
statusSection.Parent = contentFrame

local statusSectionCorner = Instance.new("UICorner")
statusSectionCorner.CornerRadius = UDim.new(0, 8)
statusSectionCorner.Parent = statusSection

local statusSectionPadding = Instance.new("UIPadding")
statusSectionPadding.PaddingLeft = UDim.new(0, 15)
statusSectionPadding.PaddingRight = UDim.new(0, 15)
statusSectionPadding.PaddingTop = UDim.new(0, 15)
statusSectionPadding.PaddingBottom = UDim.new(0, 15)
statusSectionPadding.Parent = statusSection

local statusTitle = Instance.new("TextLabel")
statusTitle.Size = UDim2.new(1, 0, 0, 20)
statusTitle.Position = UDim2.new(0, 0, 0, 0)
statusTitle.BackgroundTransparency = 1
statusTitle.Text = "📊 Connection Status"
statusTitle.TextColor3 = Color3.fromRGB(255, 255, 255)
statusTitle.TextScaled = false
statusTitle.TextSize = 14
statusTitle.Font = Enum.Font.SourceSansBold
statusTitle.TextXAlignment = Enum.TextXAlignment.Left
statusTitle.Parent = statusSection

local statusLabel = Instance.new("TextLabel")
statusLabel.Size = UDim2.new(1, 0, 0, 32)
statusLabel.Position = UDim2.new(0, 0, 0, 30)
statusLabel.BackgroundTransparency = 1
statusLabel.Text = "🔴 Disconnected - Ready to connect"
statusLabel.TextColor3 = Color3.fromRGB(239, 68, 68)
statusLabel.TextScaled = false
statusLabel.TextSize = 13
statusLabel.Font = Enum.Font.SourceSans
statusLabel.TextXAlignment = Enum.TextXAlignment.Left
statusLabel.TextWrapped = true
statusLabel.Parent = statusSection

-- Connect Button
local connectButton = Instance.new("TextButton")
connectButton.Size = UDim2.new(1, 0, 0, 40)
connectButton.BackgroundColor3 = Color3.fromRGB(37, 99, 235)
connectButton.BorderSizePixel = 0
connectButton.Text = "🚀 Connect to Server"
connectButton.TextColor3 = Color3.fromRGB(255, 255, 255)
connectButton.TextScaled = false
connectButton.TextSize = 14
connectButton.Font = Enum.Font.SourceSansBold
connectButton.LayoutOrder = 3
connectButton.Parent = contentFrame

local connectCorner = Instance.new("UICorner")
connectCorner.CornerRadius = UDim.new(0, 8)
connectCorner.Parent = connectButton

local connectGradient = Instance.new("UIGradient")
connectGradient.Color = ColorSequence.new{
	ColorSequenceKeypoint.new(0, Color3.fromRGB(37, 99, 235)),
	ColorSequenceKeypoint.new(1, Color3.fromRGB(29, 78, 216))
}
connectGradient.Rotation = 90
connectGradient.Parent = connectButton

-- Features Section
local featuresSection = Instance.new("Frame")
featuresSection.Size = UDim2.new(1, 0, 0, 200)
featuresSection.BackgroundColor3 = Color3.fromRGB(35, 35, 38)
featuresSection.BorderSizePixel = 0
featuresSection.LayoutOrder = 4
featuresSection.Parent = contentFrame

local featuresCorner = Instance.new("UICorner")
featuresCorner.CornerRadius = UDim.new(0, 8)
featuresCorner.Parent = featuresSection

local featuresPadding = Instance.new("UIPadding")
featuresPadding.PaddingLeft = UDim.new(0, 15)
featuresPadding.PaddingRight = UDim.new(0, 15)
featuresPadding.PaddingTop = UDim.new(0, 15)
featuresPadding.PaddingBottom = UDim.new(0, 15)
featuresPadding.Parent = featuresSection

local featuresTitle = Instance.new("TextLabel")
featuresTitle.Size = UDim2.new(1, 0, 0, 20)
featuresTitle.Position = UDim2.new(0, 0, 0, 0)
featuresTitle.BackgroundTransparency = 1
featuresTitle.Text = "✨ Available Features"
featuresTitle.TextColor3 = Color3.fromRGB(255, 255, 255)
featuresTitle.TextScaled = false
featuresTitle.TextSize = 14
featuresTitle.Font = Enum.Font.SourceSansBold
featuresTitle.TextXAlignment = Enum.TextXAlignment.Left
featuresTitle.Parent = featuresSection

local featuresText = Instance.new("TextLabel")
featuresText.Size = UDim2.new(1, 0, 1, -30)
featuresText.Position = UDim2.new(0, 0, 0, 25)
featuresText.BackgroundTransparency = 1
featuresText.Text = [[🔄 Smart Duplication - Intelligent cloning with patterns
🧮 Calculated Properties - Formula-based property setting  
⚡ Relative Operations - Modify properties incrementally
📦 Mass Operations - Bulk create, modify, and delete
🔍 Advanced Search - Find objects by properties and patterns
🎯 Property Management - Get, set, and modify any property]]
featuresText.TextColor3 = Color3.fromRGB(156, 163, 175)
featuresText.TextScaled = false
featuresText.TextSize = 11
featuresText.Font = Enum.Font.SourceSans
featuresText.TextXAlignment = Enum.TextXAlignment.Left
featuresText.TextYAlignment = Enum.TextYAlignment.Top
featuresText.TextWrapped = true
featuresText.Parent = featuresSection

-- Animation and interaction handlers
local TweenService = game:GetService("TweenService")
local buttonHover = false

-- Button hover effects (simplified without tweening)
connectButton.MouseEnter:Connect(function()
	buttonHover = true
	connectButton.BackgroundColor3 = not pluginState.isActive and Color3.fromRGB(29, 78, 216) or Color3.fromRGB(220, 38, 38)
end)

connectButton.MouseLeave:Connect(function()
	buttonHover = false
	connectButton.BackgroundColor3 = not pluginState.isActive and Color3.fromRGB(37, 99, 235) or Color3.fromRGB(239, 68, 68)
end)

-- Status indicator pulse animation
local pulseAnimation = nil

local function createPulseAnimation()
	if pulseAnimation then
		pcall(function()
			pulseAnimation:Cancel()
		end)
		pulseAnimation = nil
	end
	
	pcall(function()
		pulseAnimation = TweenService:Create(statusPulse, TweenInfo.new(1, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), {
			Size = UDim2.new(0, 24, 0, 24),
			Position = UDim2.new(0, -4, 0, -4),
			BackgroundTransparency = 1
		})
	end)
	
	return pulseAnimation
end

local function stopPulseAnimation()
	-- Simply reset pulse to original state (no animation)
	statusPulse.Size = UDim2.new(0, 16, 0, 16)
	statusPulse.Position = UDim2.new(0, 0, 0, 0)
	statusPulse.BackgroundTransparency = 0.7
end

local function startPulseAnimation()
	-- For now, just keep the pulse visible (no animation to avoid errors)
	statusPulse.Size = UDim2.new(0, 16, 0, 16)
	statusPulse.Position = UDim2.new(0, 0, 0, 0)
	statusPulse.BackgroundTransparency = 0.7
end

local function safeCall(func, ...)
	local success, result = pcall(func, ...)
	if success then
		return result
	else
		warn("MCP Plugin Error: " .. tostring(result))
		return nil
	end
end

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

local processRequest
local sendResponse
local handlers = {}

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
		pluginState.consecutiveFailures = 0
		pluginState.currentRetryDelay = 0.5
		pluginState.lastSuccessfulConnection = tick()

		if not statusLabel.Text:find("Connected") then
			statusLabel.Text = "🟢 Connected - AI tools ready"
			statusLabel.TextColor3 = Color3.fromRGB(34, 197, 94)
			statusIndicator.BackgroundColor3 = Color3.fromRGB(34, 197, 94)
			statusPulse.BackgroundColor3 = Color3.fromRGB(34, 197, 94)
			statusText.Text = "ONLINE"
			stopPulseAnimation()
		end

		local data = HttpService:JSONDecode(result.Body)
		if data.request then
			local response = processRequest(data.request)
			sendResponse(data.requestId, response)
		end
	elseif pluginState.isActive then
		pluginState.consecutiveFailures = pluginState.consecutiveFailures + 1

		if pluginState.consecutiveFailures > 1 then
			pluginState.currentRetryDelay =
				math.min(pluginState.currentRetryDelay * pluginState.retryBackoffMultiplier, pluginState.maxRetryDelay)
		end

		if pluginState.consecutiveFailures >= pluginState.maxFailuresBeforeError then
			statusLabel.Text = "🔴 Server unavailable - Check connection"
			statusLabel.TextColor3 = Color3.fromRGB(239, 68, 68)
			statusIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
			statusPulse.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
			statusText.Text = "ERROR"
			stopPulseAnimation()
		elseif pluginState.consecutiveFailures > 5 then
			local waitTime = math.ceil(pluginState.currentRetryDelay)
			statusLabel.Text = "🟡 Retrying connection... (" .. waitTime .. "s)"
			statusLabel.TextColor3 = Color3.fromRGB(245, 158, 11)
			statusIndicator.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			statusPulse.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			statusText.Text = "RETRY"
			startPulseAnimation()
		elseif pluginState.consecutiveFailures > 1 then
			statusLabel.Text = "🟡 Connecting to server... (attempt " .. pluginState.consecutiveFailures .. ")"
			statusLabel.TextColor3 = Color3.fromRGB(245, 158, 11)
			statusIndicator.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			statusPulse.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			statusText.Text = "CONNECTING"
			startPulseAnimation()
		end
	end
end

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

processRequest = function(request)
	local endpoint = request.endpoint
	local data = request.data or {}

	if endpoint == "/api/file-tree" then
		return handlers.getFileTree(data)
	elseif endpoint == "/api/search-files" then
		return handlers.searchFiles(data)
	elseif endpoint == "/api/place-info" then
		return handlers.getPlaceInfo(data)
	elseif endpoint == "/api/services" then
		return handlers.getServices(data)
	elseif endpoint == "/api/search-objects" then
		return handlers.searchObjects(data)
	elseif endpoint == "/api/instance-properties" then
		return handlers.getInstanceProperties(data)
	elseif endpoint == "/api/instance-children" then
		return handlers.getInstanceChildren(data)
	elseif endpoint == "/api/search-by-property" then
		return handlers.searchByProperty(data)
	elseif endpoint == "/api/class-info" then
		return handlers.getClassInfo(data)
	elseif endpoint == "/api/project-structure" then
		return handlers.getProjectStructure(data)
	elseif endpoint == "/api/set-property" then
		return handlers.setProperty(data)
	elseif endpoint == "/api/mass-set-property" then
		return handlers.massSetProperty(data)
	elseif endpoint == "/api/mass-get-property" then
		return handlers.massGetProperty(data)
	elseif endpoint == "/api/create-object" then
		return handlers.createObject(data)
	elseif endpoint == "/api/mass-create-objects" then
		return handlers.massCreateObjects(data)
	elseif endpoint == "/api/mass-create-objects-with-properties" then
		return handlers.massCreateObjectsWithProperties(data)
	elseif endpoint == "/api/delete-object" then
		return handlers.deleteObject(data)
	elseif endpoint == "/api/smart-duplicate" then
		return handlers.smartDuplicate(data)
	elseif endpoint == "/api/mass-duplicate" then
		return handlers.massDuplicate(data)
	elseif endpoint == "/api/set-calculated-property" then
		return handlers.setCalculatedProperty(data)
	elseif endpoint == "/api/set-relative-property" then
		return handlers.setRelativeProperty(data)
	else
		return { error = "Unknown endpoint: " .. tostring(endpoint) }
	end
end

local function getInstanceByPath(path)
	if path == "game" or path == "" then
		return game
	end

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

handlers.getFileTree = function(requestData)
	local path = requestData.path or ""
	local startInstance = getInstanceByPath(path)

	if not startInstance then
		return { error = "Path not found: " .. path }
	end

	local function buildTree(instance, depth)
		if depth > 10 then
			return { name = instance.Name, className = instance.ClassName, children = {} }
		end

		local node = {
			name = instance.Name,
			className = instance.ClassName,
			path = getInstancePath(instance),
			children = {},
		}

		if instance:IsA("BaseScript") then
			node.hasSource = true
			node.scriptType = instance.ClassName
		end

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

handlers.getInstanceProperties = function(requestData)
	local instancePath = requestData.instancePath
	if not instancePath then
		return { error = "Instance path is required" }
	end

	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end

	local properties = {}
	local success, result = pcall(function()
		local classInfo = {}

		local basicProps = { "Name", "ClassName", "Parent" }
		for _, prop in ipairs(basicProps) do
			local propSuccess, propValue = pcall(function()
				local val = instance[prop]
				if prop == "Parent" and val then
					return getInstancePath(val)
				elseif val == nil then
					return "nil"
				else
					return tostring(val)
				end
			end)
			if propSuccess then
				properties[prop] = propValue
			end
		end

		local commonProps = {
			"Size",
			"Position",
			"Rotation",
			"CFrame",
			"Anchored",
			"CanCollide",
			"Transparency",
			"BrickColor",
			"Material",
			"Color",
			"Text",
			"TextColor3",
			"BackgroundColor3",
			"Image",
			"ImageColor3",
			"Visible",
			"Active",
			"ZIndex",
			"BorderSizePixel",
			"BackgroundTransparency",
			"ImageTransparency",
			"TextTransparency",
			"Value",
			"Enabled",
			"Brightness",
			"Range",
			"Shadows",
			"Face",
			"SurfaceType",
		}

		for _, prop in ipairs(commonProps) do
			local propSuccess, propValue = pcall(function()
				return tostring(instance[prop])
			end)
			if propSuccess then
				properties[prop] = propValue
			end
		end

		if instance:IsA("BaseScript") then
			properties.Source = instance.Source
			properties.Enabled = tostring(instance.Enabled)
		end

		if instance:IsA("BasePart") then
			properties.Shape = tostring(instance.Shape)
			properties.TopSurface = tostring(instance.TopSurface)
			properties.BottomSurface = tostring(instance.BottomSurface)
		end

		properties.ChildCount = tostring(#instance:GetChildren())

		return properties
	end)

	if success then
		return {
			instancePath = instancePath,
			className = instance.ClassName,
			properties = properties,
		}
	else
		return { error = "Failed to get properties: " .. tostring(result) }
	end
end

handlers.getInstanceChildren = function(requestData)
	local instancePath = requestData.instancePath
	if not instancePath then
		return { error = "Instance path is required" }
	end

	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end

	local children = {}
	for _, child in ipairs(instance:GetChildren()) do
		table.insert(children, {
			name = child.Name,
			className = child.ClassName,
			path = getInstancePath(child),
			hasChildren = #child:GetChildren() > 0,
			hasSource = child:IsA("BaseScript"),
		})
	end

	return {
		instancePath = instancePath,
		children = children,
		count = #children,
	}
end

handlers.searchByProperty = function(requestData)
	local propertyName = requestData.propertyName
	local propertyValue = requestData.propertyValue

	if not propertyName or not propertyValue then
		return { error = "Property name and value are required" }
	end

	local results = {}

	local function searchRecursive(instance)
		local success, value = pcall(function()
			return tostring(instance[propertyName])
		end)

		if success and value:lower():find(propertyValue:lower()) then
			table.insert(results, {
				name = instance.Name,
				className = instance.ClassName,
				path = getInstancePath(instance),
				propertyValue = value,
			})
		end

		for _, child in ipairs(instance:GetChildren()) do
			searchRecursive(child)
		end
	end

	searchRecursive(game)

	return {
		propertyName = propertyName,
		propertyValue = propertyValue,
		results = results,
		count = #results,
	}
end

handlers.getClassInfo = function(requestData)
	local className = requestData.className
	if not className then
		return { error = "Class name is required" }
	end

	local success, tempInstance = pcall(function()
		return Instance.new(className)
	end)

	if not success then
		return { error = "Invalid class name: " .. className }
	end

	local classInfo = {
		className = className,
		properties = {},
		methods = {},
		events = {},
	}

	local commonProps = {
		"Name",
		"ClassName",
		"Parent",
		"Size",
		"Position",
		"Rotation",
		"CFrame",
		"Anchored",
		"CanCollide",
		"Transparency",
		"BrickColor",
		"Material",
		"Color",
		"Text",
		"TextColor3",
		"BackgroundColor3",
		"Image",
		"ImageColor3",
		"Visible",
		"Active",
		"ZIndex",
		"BorderSizePixel",
		"BackgroundTransparency",
		"ImageTransparency",
		"TextTransparency",
		"Value",
		"Enabled",
		"Brightness",
		"Range",
		"Shadows",
	}

	for _, prop in ipairs(commonProps) do
		local propSuccess, _ = pcall(function()
			return tempInstance[prop]
		end)
		if propSuccess then
			table.insert(classInfo.properties, prop)
		end
	end

	local commonMethods = {
		"Destroy",
		"Clone",
		"FindFirstChild",
		"FindFirstChildOfClass",
		"GetChildren",
		"IsA",
		"IsAncestorOf",
		"IsDescendantOf",
		"WaitForChild",
	}

	for _, method in ipairs(commonMethods) do
		local methodSuccess, _ = pcall(function()
			return tempInstance[method]
		end)
		if methodSuccess then
			table.insert(classInfo.methods, method)
		end
	end

	tempInstance:Destroy()

	return classInfo
end

handlers.getProjectStructure = function(requestData)
	local startPath = requestData.path or ""
	local maxDepth = requestData.maxDepth or 3
	local showScriptsOnly = requestData.scriptsOnly or false

	local startInstance
	if startPath == "" or startPath == "game" then
		local services = {}
		local mainServices = {
			"Workspace",
			"ServerScriptService",
			"ServerStorage",
			"ReplicatedStorage",
			"StarterGui",
			"StarterPack",
			"StarterPlayer",
			"Players",
		}

		for _, serviceName in ipairs(mainServices) do
			local service = safeCall(game.GetService, game, serviceName)
			if service then
				local serviceInfo = {
					name = service.Name,
					className = service.ClassName,
					path = getInstancePath(service),
					childCount = #service:GetChildren(),
					hasChildren = #service:GetChildren() > 0,
				}
				table.insert(services, serviceInfo)
			end
		end

		return {
			type = "service_overview",
			services = services,
			timestamp = tick(),
			note = "Use path parameter to explore specific locations (e.g., 'game.ServerScriptService')",
		}
	else
		startInstance = getInstanceByPath(startPath)
		if not startInstance then
			return { error = "Path not found: " .. startPath }
		end
	end

	local function getStructure(instance, depth, currentPath)
		if depth > maxDepth then
			return {
				name = instance.Name,
				className = instance.ClassName,
				path = getInstancePath(instance),
				childCount = #instance:GetChildren(),
				hasMore = true,
				note = "Max depth reached - use this path to explore further",
			}
		end

		local node = {
			name = instance.Name,
			className = instance.ClassName,
			path = getInstancePath(instance),
			children = {},
		}

		if instance:IsA("BaseScript") then
			node.hasSource = true
			node.scriptType = instance.ClassName
			node.enabled = instance.Enabled
		end

		if instance:IsA("GuiObject") then
			node.visible = instance.Visible
			if instance:IsA("Frame") or instance:IsA("ScreenGui") then
				node.guiType = "container"
			elseif instance:IsA("TextLabel") or instance:IsA("TextButton") then
				node.guiType = "text"
				if instance.Text and instance.Text ~= "" then
					node.text = instance.Text
				end
			elseif instance:IsA("ImageLabel") or instance:IsA("ImageButton") then
				node.guiType = "image"
			end
		end

		local children = instance:GetChildren()
		if showScriptsOnly then
			local scriptChildren = {}
			for _, child in ipairs(children) do
				if child:IsA("BaseScript") or child:IsA("Folder") or child:IsA("ModuleScript") then
					table.insert(scriptChildren, child)
				end
			end
			children = scriptChildren
		end

		local childCount = #children
		if childCount > 20 and depth < maxDepth then
			local classGroups = {}
			for _, child in ipairs(children) do
				local className = child.ClassName
				if not classGroups[className] then
					classGroups[className] = {}
				end
				table.insert(classGroups[className], child)
			end

			node.childSummary = {}
			for className, classChildren in pairs(classGroups) do
				table.insert(node.childSummary, {
					className = className,
					count = #classChildren,
					examples = {
						classChildren[1] and classChildren[1].Name,
						classChildren[2] and classChildren[2].Name,
					},
				})
			end

			for className, classChildren in pairs(classGroups) do
				for i = 1, math.min(3, #classChildren) do
					table.insert(node.children, getStructure(classChildren[i], depth + 1, currentPath))
				end
				if #classChildren > 3 then
					table.insert(node.children, {
						name = "... " .. (#classChildren - 3) .. " more " .. className .. " objects",
						className = "MoreIndicator",
						path = getInstancePath(instance) .. " [" .. className .. " children]",
						note = "Use specific path to explore these objects",
					})
				end
			end
		else
			for _, child in ipairs(children) do
				table.insert(node.children, getStructure(child, depth + 1, currentPath))
			end
		end

		return node
	end

	local result = getStructure(startInstance, 0, startPath)
	result.requestedPath = startPath
	result.maxDepth = maxDepth
	result.scriptsOnly = showScriptsOnly
	result.timestamp = tick()

	return result
end

handlers.setProperty = function(requestData)
	local instancePath = requestData.instancePath
	local propertyName = requestData.propertyName
	local propertyValue = requestData.propertyValue

	if not instancePath or not propertyName then
		return { error = "Instance path and property name are required" }
	end

	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end

	local success, result = pcall(function()
		if propertyName == "Parent" then
			local parentInstance = getInstanceByPath(propertyValue)
			if parentInstance then
				instance.Parent = parentInstance
			else
				return { error = "Parent instance not found: " .. propertyValue }
			end
		elseif propertyName == "Name" then
			instance.Name = tostring(propertyValue)
		elseif propertyName == "Source" and instance:IsA("BaseScript") then
			instance.Source = tostring(propertyValue)
		elseif propertyName == "Enabled" and instance:IsA("BaseScript") then
			instance.Enabled = propertyValue == true or propertyValue == "true"
		elseif propertyName == "Text" and (instance:IsA("TextLabel") or instance:IsA("TextButton") or instance:IsA("TextBox")) then
			instance.Text = tostring(propertyValue)
		elseif propertyName == "Visible" and instance:IsA("GuiObject") then
			instance.Visible = propertyValue == true or propertyValue == "true"
		elseif propertyName == "Anchored" and instance:IsA("BasePart") then
			instance.Anchored = propertyValue == true or propertyValue == "true"
		elseif propertyName == "CanCollide" and instance:IsA("BasePart") then
			instance.CanCollide = propertyValue == true or propertyValue == "true"
		elseif propertyName == "Transparency" and instance:IsA("BasePart") then
			instance.Transparency = tonumber(propertyValue) or 0
		elseif propertyName == "BrickColor" and instance:IsA("BasePart") then
			instance.BrickColor = BrickColor.new(tostring(propertyValue))
		elseif propertyName == "Material" and instance:IsA("BasePart") then
			instance.Material = Enum.Material[tostring(propertyValue)] or instance.Material
		elseif propertyName == "Size" and instance:IsA("BasePart") then
			local parts = string.split(tostring(propertyValue), ",")
			if #parts == 3 then
				instance.Size = Vector3.new(tonumber(parts[1]) or 1, tonumber(parts[2]) or 1, tonumber(parts[3]) or 1)
			end
		elseif propertyName == "Position" and instance:IsA("BasePart") then
			local parts = string.split(tostring(propertyValue), ",")
			if #parts == 3 then
				instance.Position = Vector3.new(tonumber(parts[1]) or 0, tonumber(parts[2]) or 0, tonumber(parts[3]) or 0)
			end
		else
			instance[propertyName] = propertyValue
		end

		ChangeHistoryService:SetWaypoint("Set " .. propertyName .. " property")
		return true
	end)

	if success and result ~= false then
		return {
			success = true,
			instancePath = instancePath,
			propertyName = propertyName,
			propertyValue = propertyValue,
			message = "Property set successfully",
		}
	else
		return { 
			error = "Failed to set property: " .. tostring(result),
			instancePath = instancePath,
			propertyName = propertyName,
		}
	end
end

handlers.createObject = function(requestData)
	local className = requestData.className
	local parentPath = requestData.parent
	local name = requestData.name
	local properties = requestData.properties or {}

	if not className or not parentPath then
		return { error = "Class name and parent are required" }
	end

	local parentInstance = getInstanceByPath(parentPath)
	if not parentInstance then
		return { error = "Parent instance not found: " .. parentPath }
	end

	local success, newInstance = pcall(function()
		local instance = Instance.new(className)
		
		if name then
			instance.Name = name
		end

		for propertyName, propertyValue in pairs(properties) do
			pcall(function()
				instance[propertyName] = propertyValue
			end)
		end

		instance.Parent = parentInstance
		ChangeHistoryService:SetWaypoint("Create " .. className)
		return instance
	end)

	if success and newInstance then
		return {
			success = true,
			className = className,
			parent = parentPath,
			instancePath = getInstancePath(newInstance),
			name = newInstance.Name,
			message = "Object created successfully",
		}
	else
		return { 
			error = "Failed to create object: " .. tostring(newInstance),
			className = className,
			parent = parentPath,
		}
	end
end

handlers.deleteObject = function(requestData)
	local instancePath = requestData.instancePath

	if not instancePath then
		return { error = "Instance path is required" }
	end

	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end

	if instance == game then
		return { error = "Cannot delete the game instance" }
	end

	local success, result = pcall(function()
		local name = instance.Name
		local className = instance.ClassName
		instance:Destroy()
		ChangeHistoryService:SetWaypoint("Delete " .. className .. " (" .. name .. ")")
		return true
	end)

	if success then
		return {
			success = true,
			instancePath = instancePath,
			message = "Object deleted successfully",
		}
	else
		return { 
			error = "Failed to delete object: " .. tostring(result),
			instancePath = instancePath,
		}
	end
end

handlers.massSetProperty = function(requestData)
	local paths = requestData.paths
	local propertyName = requestData.propertyName
	local propertyValue = requestData.propertyValue

	if not paths or type(paths) ~= "table" or #paths == 0 or not propertyName then
		return { error = "Paths array and property name are required" }
	end

	local results = {}
	local successCount = 0
	local failureCount = 0

	for _, path in ipairs(paths) do
		local instance = getInstanceByPath(path)
		if instance then
			local success, err = pcall(function()
				instance[propertyName] = propertyValue
			end)
			
			if success then
				successCount = successCount + 1
				table.insert(results, {
					path = path,
					success = true,
					propertyName = propertyName,
					propertyValue = propertyValue
				})
			else
				failureCount = failureCount + 1
				table.insert(results, {
					path = path,
					success = false,
					error = tostring(err)
				})
			end
		else
			failureCount = failureCount + 1
			table.insert(results, {
				path = path,
				success = false,
				error = "Instance not found"
			})
		end
	end

	if successCount > 0 then
		ChangeHistoryService:SetWaypoint("Mass set " .. propertyName .. " property")
	end

	return {
		results = results,
		summary = {
			total = #paths,
			succeeded = successCount,
			failed = failureCount
		}
	}
end

handlers.massGetProperty = function(requestData)
	local paths = requestData.paths
	local propertyName = requestData.propertyName

	if not paths or type(paths) ~= "table" or #paths == 0 or not propertyName then
		return { error = "Paths array and property name are required" }
	end

	local results = {}

	for _, path in ipairs(paths) do
		local instance = getInstanceByPath(path)
		if instance then
			local success, value = pcall(function()
				return instance[propertyName]
			end)
			
			if success then
				table.insert(results, {
					path = path,
					success = true,
					propertyName = propertyName,
					propertyValue = value
				})
			else
				table.insert(results, {
					path = path,
					success = false,
					error = tostring(value)
				})
			end
		else
			table.insert(results, {
				path = path,
				success = false,
				error = "Instance not found"
			})
		end
	end

	return {
		results = results,
		propertyName = propertyName
	}
end

handlers.massCreateObjects = function(requestData)
	local objects = requestData.objects

	if not objects or type(objects) ~= "table" or #objects == 0 then
		return { error = "Objects array is required" }
	end

	local results = {}
	local successCount = 0
	local failureCount = 0

	for _, objData in ipairs(objects) do
		local className = objData.className
		local parentPath = objData.parent
		local name = objData.name

		if className and parentPath then
			local parentInstance = getInstanceByPath(parentPath)
			if parentInstance then
				local success, newInstance = pcall(function()
					local instance = Instance.new(className)
					if name then
						instance.Name = name
					end
					instance.Parent = parentInstance
					return instance
				end)

				if success and newInstance then
					successCount = successCount + 1
					table.insert(results, {
						success = true,
						className = className,
						parent = parentPath,
						instancePath = getInstancePath(newInstance),
						name = newInstance.Name
					})
				else
					failureCount = failureCount + 1
					table.insert(results, {
						success = false,
						className = className,
						parent = parentPath,
						error = tostring(newInstance)
					})
				end
			else
				failureCount = failureCount + 1
				table.insert(results, {
					success = false,
					className = className,
					parent = parentPath,
					error = "Parent instance not found"
				})
			end
		else
			failureCount = failureCount + 1
			table.insert(results, {
				success = false,
				error = "Class name and parent are required"
			})
		end
	end

	if successCount > 0 then
		ChangeHistoryService:SetWaypoint("Mass create objects")
	end

	return {
		results = results,
		summary = {
			total = #objects,
			succeeded = successCount,
			failed = failureCount
		}
	}
end

handlers.massCreateObjectsWithProperties = function(requestData)
	local objects = requestData.objects

	if not objects or type(objects) ~= "table" or #objects == 0 then
		return { error = "Objects array is required" }
	end

	local results = {}
	local successCount = 0
	local failureCount = 0

	for _, objData in ipairs(objects) do
		local className = objData.className
		local parentPath = objData.parent
		local name = objData.name
		local properties = objData.properties or {}

		if className and parentPath then
			local parentInstance = getInstanceByPath(parentPath)
			if parentInstance then
				local success, newInstance = pcall(function()
					local instance = Instance.new(className)
					
					if name then
						instance.Name = name
					end

					for propertyName, propertyValue in pairs(properties) do
						pcall(function()
							instance[propertyName] = propertyValue
						end)
					end

					instance.Parent = parentInstance
					return instance
				end)

				if success and newInstance then
					successCount = successCount + 1
					table.insert(results, {
						success = true,
						className = className,
						parent = parentPath,
						instancePath = getInstancePath(newInstance),
						name = newInstance.Name
					})
				else
					failureCount = failureCount + 1
					table.insert(results, {
						success = false,
						className = className,
						parent = parentPath,
						error = tostring(newInstance)
					})
				end
			else
				failureCount = failureCount + 1
				table.insert(results, {
					success = false,
					className = className,
					parent = parentPath,
					error = "Parent instance not found"
				})
			end
		else
			failureCount = failureCount + 1
			table.insert(results, {
				success = false,
				error = "Class name and parent are required"
			})
		end
	end

	if successCount > 0 then
		ChangeHistoryService:SetWaypoint("Mass create objects with properties")
	end

	return {
		results = results,
		summary = {
			total = #objects,
			succeeded = successCount,
			failed = failureCount
		}
	}
end

-- Smart Duplication Handler
handlers.smartDuplicate = function(requestData)
	local instancePath = requestData.instancePath
	local count = requestData.count
	local options = requestData.options or {}

	if not instancePath or not count or count < 1 then
		return { error = "Instance path and count > 0 are required" }
	end

	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end

	local results = {}
	local successCount = 0
	local failureCount = 0

	for i = 1, count do
		local success, newInstance = pcall(function()
			local clone = instance:Clone()
			
			-- Apply name pattern
			if options.namePattern then
				clone.Name = options.namePattern:gsub("{n}", tostring(i))
			else
				clone.Name = instance.Name .. i
			end

			-- Apply position offset
			if options.positionOffset and clone:IsA("BasePart") then
				local offset = options.positionOffset
				local currentPos = clone.Position
				clone.Position = Vector3.new(
					currentPos.X + (offset[1] or 0) * i,
					currentPos.Y + (offset[2] or 0) * i,
					currentPos.Z + (offset[3] or 0) * i
				)
			end

			-- Apply rotation offset
			if options.rotationOffset and clone:IsA("BasePart") then
				local offset = options.rotationOffset
				local currentCFrame = clone.CFrame
				clone.CFrame = currentCFrame * CFrame.Angles(
					math.rad((offset[1] or 0) * i),
					math.rad((offset[2] or 0) * i),
					math.rad((offset[3] or 0) * i)
				)
			end

			-- Apply scale offset
			if options.scaleOffset and clone:IsA("BasePart") then
				local offset = options.scaleOffset
				local currentSize = clone.Size
				clone.Size = Vector3.new(
					currentSize.X * ((offset[1] or 1) ^ i),
					currentSize.Y * ((offset[2] or 1) ^ i),
					currentSize.Z * ((offset[3] or 1) ^ i)
				)
			end

			-- Apply property variations
			if options.propertyVariations then
				for propName, values in pairs(options.propertyVariations) do
					if values and #values > 0 then
						local valueIndex = ((i - 1) % #values) + 1
						pcall(function()
							clone[propName] = values[valueIndex]
						end)
					end
				end
			end

			-- Set parent (different parent for each or default to original parent)
			if options.targetParents and options.targetParents[i] then
				local targetParent = getInstanceByPath(options.targetParents[i])
				if targetParent then
					clone.Parent = targetParent
				else
					clone.Parent = instance.Parent
				end
			else
				clone.Parent = instance.Parent
			end

			return clone
		end)

		if success and newInstance then
			successCount = successCount + 1
			table.insert(results, {
				success = true,
				instancePath = getInstancePath(newInstance),
				name = newInstance.Name,
				index = i
			})
		else
			failureCount = failureCount + 1
			table.insert(results, {
				success = false,
				index = i,
				error = tostring(newInstance)
			})
		end
	end

	if successCount > 0 then
		ChangeHistoryService:SetWaypoint("Smart duplicate " .. instance.Name .. " (" .. successCount .. " copies)")
	end

	return {
		results = results,
		summary = {
			total = count,
			succeeded = successCount,
			failed = failureCount
		},
		sourceInstance = instancePath
	}
end

-- Mass Duplication Handler
handlers.massDuplicate = function(requestData)
	local duplications = requestData.duplications

	if not duplications or type(duplications) ~= "table" or #duplications == 0 then
		return { error = "Duplications array is required" }
	end

	local allResults = {}
	local totalSuccess = 0
	local totalFailures = 0

	for _, duplication in ipairs(duplications) do
		local result = handlers.smartDuplicate(duplication)
		table.insert(allResults, result)
		
		if result.summary then
			totalSuccess = totalSuccess + result.summary.succeeded
			totalFailures = totalFailures + result.summary.failed
		end
	end

	if totalSuccess > 0 then
		ChangeHistoryService:SetWaypoint("Mass duplicate operations (" .. totalSuccess .. " objects)")
	end

	return {
		results = allResults,
		summary = {
			total = totalSuccess + totalFailures,
			succeeded = totalSuccess,
			failed = totalFailures
		}
	}
end

-- Formula evaluation helper
local function evaluateFormula(formula, variables, instance, index)
	local env = {
		-- Math functions
		math = math,
		abs = math.abs,
		min = math.min,
		max = math.max,
		floor = math.floor,
		ceil = math.ceil,
		sqrt = math.sqrt,
		sin = math.sin,
		cos = math.cos,
		tan = math.tan,
		rad = math.rad,
		deg = math.deg,
		
		-- Variables
		index = index,
		
		-- Instance properties (if available)
		Position = instance and instance:IsA("BasePart") and instance.Position or Vector3.new(0, 0, 0),
		Size = instance and instance:IsA("BasePart") and instance.Size or Vector3.new(1, 1, 1),
		Name = instance and instance.Name or "",
	}
	
	-- Add custom variables
	if variables then
		for k, v in pairs(variables) do
			env[k] = v
		end
	end
	
	-- Add magnitude calculation for Position
	if env.Position then
		env.magnitude = env.Position.magnitude
	end
	
	-- Create safe formula evaluation
	local func, err = loadstring("return " .. formula)
	if not func then
		return nil, "Formula error: " .. tostring(err)
	end
	
	setfenv(func, env)
	local success, result = pcall(func)
	if success then
		return result, nil
	else
		return nil, "Evaluation error: " .. tostring(result)
	end
end

-- Calculated Property Handler
handlers.setCalculatedProperty = function(requestData)
	local paths = requestData.paths
	local propertyName = requestData.propertyName
	local formula = requestData.formula
	local variables = requestData.variables

	if not paths or type(paths) ~= "table" or #paths == 0 or not propertyName or not formula then
		return { error = "Paths, property name, and formula are required" }
	end

	local results = {}
	local successCount = 0
	local failureCount = 0

	for index, path in ipairs(paths) do
		local instance = getInstanceByPath(path)
		if instance then
			local value, evalError = evaluateFormula(formula, variables, instance, index)
			
			if value ~= nil and not evalError then
				local success, err = pcall(function()
					instance[propertyName] = value
				end)
				
				if success then
					successCount = successCount + 1
					table.insert(results, {
						path = path,
						success = true,
						propertyName = propertyName,
						calculatedValue = value,
						formula = formula
					})
				else
					failureCount = failureCount + 1
					table.insert(results, {
						path = path,
						success = false,
						error = "Property set failed: " .. tostring(err)
					})
				end
			else
				failureCount = failureCount + 1
				table.insert(results, {
					path = path,
					success = false,
					error = evalError or "Formula evaluation failed"
				})
			end
		else
			failureCount = failureCount + 1
			table.insert(results, {
				path = path,
				success = false,
				error = "Instance not found"
			})
		end
	end

	if successCount > 0 then
		ChangeHistoryService:SetWaypoint("Set calculated " .. propertyName .. " property")
	end

	return {
		results = results,
		summary = {
			total = #paths,
			succeeded = successCount,
			failed = failureCount
		},
		formula = formula
	}
end

-- Relative Property Handler
handlers.setRelativeProperty = function(requestData)
	local paths = requestData.paths
	local propertyName = requestData.propertyName
	local operation = requestData.operation
	local value = requestData.value
	local component = requestData.component

	if not paths or type(paths) ~= "table" or #paths == 0 or not propertyName or not operation or value == nil then
		return { error = "Paths, property name, operation, and value are required" }
	end

	local results = {}
	local successCount = 0
	local failureCount = 0

	for _, path in ipairs(paths) do
		local instance = getInstanceByPath(path)
		if instance then
			local success, err = pcall(function()
				local currentValue = instance[propertyName]
				local newValue

				-- Handle Vector3 properties with component selection
				if component and typeof(currentValue) == "Vector3" then
					local x, y, z = currentValue.X, currentValue.Y, currentValue.Z
					local targetValue = value
					
					if component == "X" then
						if operation == "add" then x = x + targetValue
						elseif operation == "subtract" then x = x - targetValue
						elseif operation == "multiply" then x = x * targetValue
						elseif operation == "divide" then x = x / targetValue
						elseif operation == "power" then x = x ^ targetValue
						end
					elseif component == "Y" then
						if operation == "add" then y = y + targetValue
						elseif operation == "subtract" then y = y - targetValue
						elseif operation == "multiply" then y = y * targetValue
						elseif operation == "divide" then y = y / targetValue
						elseif operation == "power" then y = y ^ targetValue
						end
					elseif component == "Z" then
						if operation == "add" then z = z + targetValue
						elseif operation == "subtract" then z = z - targetValue
						elseif operation == "multiply" then z = z * targetValue
						elseif operation == "divide" then z = z / targetValue
						elseif operation == "power" then z = z ^ targetValue
						end
					end
					
					newValue = Vector3.new(x, y, z)
				-- Handle Color3 properties
				elseif typeof(currentValue) == "Color3" and typeof(value) == "Color3" then
					local r, g, b = currentValue.R, currentValue.G, currentValue.B
					
					if operation == "add" then
						newValue = Color3.new(
							math.min(1, r + value.R),
							math.min(1, g + value.G),
							math.min(1, b + value.B)
						)
					elseif operation == "subtract" then
						newValue = Color3.new(
							math.max(0, r - value.R),
							math.max(0, g - value.G),
							math.max(0, b - value.B)
						)
					elseif operation == "multiply" then
						newValue = Color3.new(r * value.R, g * value.G, b * value.B)
					end
				-- Handle numeric properties
				elseif type(currentValue) == "number" and type(value) == "number" then
					if operation == "add" then
						newValue = currentValue + value
					elseif operation == "subtract" then
						newValue = currentValue - value
					elseif operation == "multiply" then
						newValue = currentValue * value
					elseif operation == "divide" then
						newValue = currentValue / value
					elseif operation == "power" then
						newValue = currentValue ^ value
					end
				-- Handle Vector3 properties (all components)
				elseif typeof(currentValue) == "Vector3" and type(value) == "number" then
					local x, y, z = currentValue.X, currentValue.Y, currentValue.Z
					
					if operation == "add" then
						newValue = Vector3.new(x + value, y + value, z + value)
					elseif operation == "subtract" then
						newValue = Vector3.new(x - value, y - value, z - value)
					elseif operation == "multiply" then
						newValue = Vector3.new(x * value, y * value, z * value)
					elseif operation == "divide" then
						newValue = Vector3.new(x / value, y / value, z / value)
					elseif operation == "power" then
						newValue = Vector3.new(x ^ value, y ^ value, z ^ value)
					end
				else
					error("Unsupported property type or operation")
				end

				instance[propertyName] = newValue
				return newValue
			end)
			
			if success then
				successCount = successCount + 1
				table.insert(results, {
					path = path,
					success = true,
					propertyName = propertyName,
					operation = operation,
					value = value,
					component = component,
					newValue = err
				})
			else
				failureCount = failureCount + 1
				table.insert(results, {
					path = path,
					success = false,
					error = tostring(err)
				})
			end
		else
			failureCount = failureCount + 1
			table.insert(results, {
				path = path,
				success = false,
				error = "Instance not found"
			})
		end
	end

	if successCount > 0 then
		ChangeHistoryService:SetWaypoint("Set relative " .. propertyName .. " property")
	end

	return {
		results = results,
		summary = {
			total = #paths,
			succeeded = successCount,
			failed = failureCount
		},
		operation = operation,
		value = value
	}
end

local function updateUIState()
	if pluginState.isActive then
		statusLabel.Text = "🟡 Connecting to server..."
		statusLabel.TextColor3 = Color3.fromRGB(245, 158, 11)
		statusIndicator.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
		statusPulse.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
		statusText.Text = "CONNECTING"
		connectButton.Text = "🔌 Disconnect"
		startPulseAnimation()
		
		-- Update button color directly instead of tweening
		if not buttonHover then
			connectButton.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
		end
		
		connectGradient.Color = ColorSequence.new{
			ColorSequenceKeypoint.new(0, Color3.fromRGB(239, 68, 68)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(220, 38, 38))
		}
		
		urlInput.TextEditable = false
		urlInput.BackgroundColor3 = Color3.fromRGB(35, 35, 38)
		urlInput.BorderColor3 = Color3.fromRGB(55, 65, 81)
	else
		statusLabel.Text = "🔴 Disconnected - Ready to connect"
		statusLabel.TextColor3 = Color3.fromRGB(239, 68, 68)
		statusIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
		statusPulse.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
		statusText.Text = "OFFLINE"
		connectButton.Text = "🚀 Connect to Server"
		stopPulseAnimation()
		
		-- Update button color directly instead of tweening
		if not buttonHover then
			connectButton.BackgroundColor3 = Color3.fromRGB(37, 99, 235)
		end
		
		connectGradient.Color = ColorSequence.new{
			ColorSequenceKeypoint.new(0, Color3.fromRGB(37, 99, 235)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(29, 78, 216))
		}
		
		urlInput.TextEditable = true
		urlInput.BackgroundColor3 = Color3.fromRGB(45, 45, 48)
		urlInput.BorderColor3 = Color3.fromRGB(75, 85, 99)
	end
end

local function activatePlugin()
	pluginState.serverUrl = urlInput.Text

	pluginState.isActive = true
	pluginState.consecutiveFailures = 0
	pluginState.currentRetryDelay = 0.5
	screenGui.Enabled = true
	updateUIState()

	pcall(function()
		HttpService:RequestAsync({
			Url = pluginState.serverUrl .. "/ready",
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json",
			},
			Body = HttpService:JSONEncode({
				pluginReady = true,
				timestamp = tick(),
			}),
		})
	end)

	if not pluginState.connection then
		pluginState.connection = RunService.Heartbeat:Connect(function()
			local now = tick()
			local currentInterval = pluginState.consecutiveFailures > 5 and pluginState.currentRetryDelay
				or pluginState.pollInterval
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

	if pluginState.connection then
		pluginState.connection:Disconnect()
		pluginState.connection = nil
	end
end

connectButton.Activated:Connect(function()
	if pluginState.isActive then
		deactivatePlugin()
	else
		activatePlugin()
	end
end)

button.Click:Connect(function()
	screenGui.Enabled = not screenGui.Enabled
end)

plugin.Unloading:Connect(function()
	deactivatePlugin()
end)

updateUIState()
