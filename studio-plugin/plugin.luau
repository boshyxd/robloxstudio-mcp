local HttpService = game:GetService("HttpService")
local StudioService = game:GetService("StudioService")
local Selection = game:GetService("Selection")
local RunService = game:GetService("RunService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local ScriptEditorService = game:GetService("ScriptEditorService")
local CollectionService = game:GetService("CollectionService")

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
	-- UI step tracking
	lastHttpOk = false,
	mcpWaitStartTime = nil,
}

local screenGui = plugin:CreateDockWidgetPluginGui(
	"MCPServerInterface",
	DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Float, false, false, 400, 500, 350, 450)
)
screenGui.Title = "MCP Server v1.7.0"

local mainFrame = Instance.new("Frame")
mainFrame.Size = UDim2.new(1, 0, 1, 0)
mainFrame.BackgroundColor3 = Color3.fromRGB(17, 24, 39)
mainFrame.BorderSizePixel = 0
mainFrame.Parent = screenGui

local mainCorner = Instance.new("UICorner")
mainCorner.CornerRadius = UDim.new(0, 8)
mainCorner.Parent = mainFrame

local headerFrame = Instance.new("Frame")
headerFrame.Size = UDim2.new(1, 0, 0, 60)
headerFrame.Position = UDim2.new(0, 0, 0, 0)
headerFrame.BackgroundColor3 = Color3.fromRGB(59, 130, 246)
headerFrame.BorderSizePixel = 0
headerFrame.Parent = mainFrame

local headerCorner = Instance.new("UICorner")
headerCorner.CornerRadius = UDim.new(0, 8)
headerCorner.Parent = headerFrame

local headerGradient = Instance.new("UIGradient")
headerGradient.Color = ColorSequence.new{
	ColorSequenceKeypoint.new(0, Color3.fromRGB(59, 130, 246)),
	ColorSequenceKeypoint.new(1, Color3.fromRGB(147, 51, 234))
}
headerGradient.Rotation = 45
headerGradient.Parent = headerFrame

local titleContainer = Instance.new("Frame")
titleContainer.Size = UDim2.new(1, -70, 1, 0)
titleContainer.Position = UDim2.new(0, 15, 0, 0)
titleContainer.BackgroundTransparency = 1
titleContainer.Parent = headerFrame

local titleLabel = Instance.new("TextLabel")
titleLabel.Size = UDim2.new(1, 0, 0, 28)
titleLabel.Position = UDim2.new(0, 0, 0, 8)
titleLabel.BackgroundTransparency = 1
titleLabel.Text = "MCP Server"
titleLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
titleLabel.TextScaled = false
titleLabel.TextSize = 18
titleLabel.Font = Enum.Font.Jura
titleLabel.TextXAlignment = Enum.TextXAlignment.Left
titleLabel.Parent = titleContainer

local versionLabel = Instance.new("TextLabel")
versionLabel.Size = UDim2.new(1, 0, 0, 16)
versionLabel.Position = UDim2.new(0, 0, 0, 32)
versionLabel.BackgroundTransparency = 1
versionLabel.Text = "AI Integration • v1.7.0"
versionLabel.TextColor3 = Color3.fromRGB(191, 219, 254)
versionLabel.TextScaled = false
versionLabel.TextSize = 12
versionLabel.Font = Enum.Font.Jura
versionLabel.TextXAlignment = Enum.TextXAlignment.Left
versionLabel.Parent = titleContainer

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
statusText.Font = Enum.Font.Jura
statusText.TextXAlignment = Enum.TextXAlignment.Center
statusText.Parent = statusContainer

local contentFrame = Instance.new("ScrollingFrame")
contentFrame.Size = UDim2.new(1, -20, 1, -80)
contentFrame.Position = UDim2.new(0, 10, 0, 70)
contentFrame.BackgroundTransparency = 1
contentFrame.BorderSizePixel = 0
contentFrame.ScrollBarThickness = 6
contentFrame.ScrollBarImageColor3 = Color3.fromRGB(99, 102, 241)
contentFrame.CanvasSize = UDim2.new(0, 0, 0, 243)
contentFrame.AutomaticCanvasSize = Enum.AutomaticSize.None
contentFrame.Parent = mainFrame

local contentLayout = Instance.new("UIListLayout")
contentLayout.Padding = UDim.new(0, 12)
contentLayout.SortOrder = Enum.SortOrder.LayoutOrder
contentLayout.Parent = contentFrame

local connectionSection = Instance.new("Frame")
connectionSection.Size = UDim2.new(1, 0, 0, 110)
connectionSection.BackgroundColor3 = Color3.fromRGB(31, 41, 55)
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
connectionTitle.Text = "Connection Settings"
connectionTitle.TextColor3 = Color3.fromRGB(255, 255, 255)
connectionTitle.TextScaled = false
connectionTitle.TextSize = 14
connectionTitle.Font = Enum.Font.Jura
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
urlLabel.Font = Enum.Font.Jura
urlLabel.TextXAlignment = Enum.TextXAlignment.Left
urlLabel.Parent = connectionSection

local urlInput = Instance.new("TextBox")
urlInput.Size = UDim2.new(1, 0, 0, 32)
urlInput.Position = UDim2.new(0, 0, 0, 50)
urlInput.BackgroundColor3 = Color3.fromRGB(55, 65, 81)
urlInput.BorderSizePixel = 1
urlInput.BorderColor3 = Color3.fromRGB(99, 102, 241)
urlInput.Text = "http://localhost:3002"
urlInput.TextColor3 = Color3.fromRGB(255, 255, 255)
urlInput.TextScaled = false
urlInput.TextSize = 12
urlInput.Font = Enum.Font.Jura
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

local statusSection = Instance.new("Frame")
statusSection.Size = UDim2.new(1, 0, 0, 170)
statusSection.BackgroundColor3 = Color3.fromRGB(31, 41, 55)
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
statusTitle.Text = "Connection Status"
statusTitle.TextColor3 = Color3.fromRGB(255, 255, 255)
statusTitle.TextScaled = false
statusTitle.TextSize = 14
statusTitle.Font = Enum.Font.Jura
statusTitle.TextXAlignment = Enum.TextXAlignment.Left
statusTitle.Parent = statusSection

local statusLabel = Instance.new("TextLabel")
statusLabel.Size = UDim2.new(1, 0, 0, 20)
statusLabel.Position = UDim2.new(0, 0, 0, 30)
statusLabel.BackgroundTransparency = 1
statusLabel.Text = "Disconnected"
statusLabel.TextColor3 = Color3.fromRGB(239, 68, 68)
statusLabel.TextScaled = false
statusLabel.TextSize = 13
statusLabel.Font = Enum.Font.Jura
statusLabel.TextXAlignment = Enum.TextXAlignment.Left
statusLabel.TextWrapped = true
statusLabel.Parent = statusSection

local detailStatusLabel = Instance.new("TextLabel")
detailStatusLabel.Size = UDim2.new(1, 0, 0, 12)
detailStatusLabel.Position = UDim2.new(0, 0, 0, 50)
detailStatusLabel.BackgroundTransparency = 1
detailStatusLabel.Text = "HTTP: X  MCP: X"
detailStatusLabel.TextColor3 = Color3.fromRGB(156, 163, 175)
detailStatusLabel.TextScaled = false
detailStatusLabel.TextSize = 10
detailStatusLabel.Font = Enum.Font.Jura
detailStatusLabel.TextXAlignment = Enum.TextXAlignment.Left
detailStatusLabel.TextWrapped = true
detailStatusLabel.Parent = statusSection

-- Step-by-step status rows
local stepsFrame = Instance.new("Frame")
stepsFrame.Size = UDim2.new(1, 0, 0, 60)
stepsFrame.Position = UDim2.new(0, 0, 0, 68)
stepsFrame.BackgroundTransparency = 1
stepsFrame.Parent = statusSection

local stepsLayout = Instance.new("UIListLayout")
stepsLayout.Padding = UDim.new(0, 6)
stepsLayout.FillDirection = Enum.FillDirection.Vertical
stepsLayout.SortOrder = Enum.SortOrder.LayoutOrder
stepsLayout.Parent = stepsFrame

local function createStepRow(text)
    local row = Instance.new("Frame")
    row.Size = UDim2.new(1, 0, 0, 16)
    row.BackgroundTransparency = 1

    local dot = Instance.new("Frame")
    dot.Size = UDim2.new(0, 10, 0, 10)
    dot.Position = UDim2.new(0, 0, 0, 3)
    dot.BackgroundColor3 = Color3.fromRGB(156, 163, 175)
    dot.BorderSizePixel = 0
    dot.Parent = row

    local dotCorner = Instance.new("UICorner")
    dotCorner.CornerRadius = UDim.new(1, 0)
    dotCorner.Parent = dot

    local label = Instance.new("TextLabel")
    label.Size = UDim2.new(1, -18, 1, 0)
    label.Position = UDim2.new(0, 18, 0, 0)
    label.BackgroundTransparency = 1
    label.Text = text
    label.TextColor3 = Color3.fromRGB(209, 213, 219)
    label.TextScaled = false
    label.TextSize = 11
    label.Font = Enum.Font.Jura
    label.TextXAlignment = Enum.TextXAlignment.Left
    label.Parent = row

    row.Parent = stepsFrame
    return row, dot, label
end

local step1Row, step1Dot, step1Label = createStepRow("1. HTTP server reachable")
local step2Row, step2Dot, step2Label = createStepRow("2. MCP bridge connected")
local step3Row, step3Dot, step3Label = createStepRow("3. Ready for commands")

-- Troubleshooting tip for common stuck state
local troubleshootLabel = Instance.new("TextLabel")
troubleshootLabel.Size = UDim2.new(1, 0, 0, 40)
troubleshootLabel.Position = UDim2.new(0, 0, 0, 130)
troubleshootLabel.BackgroundTransparency = 1
troubleshootLabel.TextWrapped = true
troubleshootLabel.Visible = false
troubleshootLabel.Text = "HTTP is OK but MCP isn't responding. Close all node.exe in Task Manager and restart the server."
troubleshootLabel.TextColor3 = Color3.fromRGB(245, 158, 11)
troubleshootLabel.TextScaled = false
troubleshootLabel.TextSize = 11
troubleshootLabel.Font = Enum.Font.Jura
troubleshootLabel.TextXAlignment = Enum.TextXAlignment.Left
troubleshootLabel.Parent = statusSection

local connectButton = Instance.new("TextButton")
connectButton.Size = UDim2.new(1, 0, 0, 48)
connectButton.BackgroundColor3 = Color3.fromRGB(16, 185, 129)
connectButton.BorderSizePixel = 0
connectButton.Text = "Connect"
connectButton.TextColor3 = Color3.fromRGB(255, 255, 255)
connectButton.TextScaled = false
connectButton.TextSize = 16
connectButton.Font = Enum.Font.Jura
connectButton.LayoutOrder = 3
connectButton.Parent = contentFrame

local connectCorner = Instance.new("UICorner")
connectCorner.CornerRadius = UDim.new(0, 12)
connectCorner.Parent = connectButton



local TweenService = game:GetService("TweenService")
local buttonHover = false

connectButton.MouseEnter:Connect(function()
	buttonHover = true
	connectButton.BackgroundColor3 = not pluginState.isActive and Color3.fromRGB(5, 150, 105) or Color3.fromRGB(220, 38, 38)
end)

connectButton.MouseLeave:Connect(function()
	buttonHover = false
	connectButton.BackgroundColor3 = not pluginState.isActive and Color3.fromRGB(16, 185, 129) or Color3.fromRGB(239, 68, 68)
end)

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
	statusPulse.Size = UDim2.new(0, 16, 0, 16)
	statusPulse.Position = UDim2.new(0, 0, 0, 0)
	statusPulse.BackgroundTransparency = 0.7
end

local function startPulseAnimation()
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

	if success and (result.Success or result.StatusCode == 503) then
		pluginState.consecutiveFailures = 0
		pluginState.currentRetryDelay = 0.5
		pluginState.lastSuccessfulConnection = tick()

		local data = HttpService:JSONDecode(result.Body)
		local mcpConnected = data.mcpConnected == true
		-- Step indicators: HTTP request succeeded
		pluginState.lastHttpOk = true
		step1Dot.BackgroundColor3 = Color3.fromRGB(34, 197, 94)
		step1Label.Text = "1. HTTP server reachable (OK)"
		
		if mcpConnected and not statusLabel.Text:find("Connected") then
			statusLabel.Text = "Connected"
			statusLabel.TextColor3 = Color3.fromRGB(34, 197, 94)
			statusIndicator.BackgroundColor3 = Color3.fromRGB(34, 197, 94)
			statusPulse.BackgroundColor3 = Color3.fromRGB(34, 197, 94)
			statusText.Text = "ONLINE"
			detailStatusLabel.Text = "HTTP: OK  MCP: OK"
			detailStatusLabel.TextColor3 = Color3.fromRGB(34, 197, 94)
			-- Steps 2/3 OK
			step2Dot.BackgroundColor3 = Color3.fromRGB(34, 197, 94)
			step2Label.Text = "2. MCP bridge connected (OK)"
			step3Dot.BackgroundColor3 = Color3.fromRGB(34, 197, 94)
			step3Label.Text = "3. Ready for commands (OK)"
			pluginState.mcpWaitStartTime = nil
			troubleshootLabel.Visible = false
			stopPulseAnimation()
		elseif not mcpConnected then
			statusLabel.Text = "Waiting for MCP server"
			statusLabel.TextColor3 = Color3.fromRGB(245, 158, 11)
			statusIndicator.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			statusPulse.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			statusText.Text = "WAITING"
			detailStatusLabel.Text = "HTTP: OK  MCP: ..."
			detailStatusLabel.TextColor3 = Color3.fromRGB(245, 158, 11)
			-- Step 2/3 pending
			step2Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			step2Label.Text = "2. MCP bridge connected (waiting...)"
			step3Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			step3Label.Text = "3. Ready for commands (waiting...)"
			-- Track stuck state where HTTP is OK but MCP isn't
			if not pluginState.mcpWaitStartTime then
				pluginState.mcpWaitStartTime = tick()
			end
			local elapsed = tick() - (pluginState.mcpWaitStartTime or tick())
			troubleshootLabel.Visible = elapsed > 8
			startPulseAnimation()
		end

		if data.request and mcpConnected then
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
			statusLabel.Text = "Server unavailable"
			statusLabel.TextColor3 = Color3.fromRGB(239, 68, 68)
			statusIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
			statusPulse.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
			statusText.Text = "ERROR"
			detailStatusLabel.Text = "HTTP: X  MCP: X"
			detailStatusLabel.TextColor3 = Color3.fromRGB(239, 68, 68)
			-- Steps show error
			step1Dot.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
			step1Label.Text = "1. HTTP server reachable (error)"
			step2Dot.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
			step2Label.Text = "2. MCP bridge connected (error)"
			step3Dot.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
			step3Label.Text = "3. Ready for commands (error)"
			pluginState.mcpWaitStartTime = nil
			troubleshootLabel.Visible = false
			stopPulseAnimation()
		elseif pluginState.consecutiveFailures > 5 then
			local waitTime = math.ceil(pluginState.currentRetryDelay)
			statusLabel.Text = "Retrying (" .. waitTime .. "s)"
			statusLabel.TextColor3 = Color3.fromRGB(245, 158, 11)
			statusIndicator.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			statusPulse.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			statusText.Text = "RETRY"
			detailStatusLabel.Text = "HTTP: ...  MCP: ..."
			detailStatusLabel.TextColor3 = Color3.fromRGB(245, 158, 11)
			-- Steps show retrying
			step1Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			step1Label.Text = "1. HTTP server reachable (retrying...)"
			step2Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			step2Label.Text = "2. MCP bridge connected (retrying...)"
			step3Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			step3Label.Text = "3. Ready for commands (retrying...)"
			pluginState.mcpWaitStartTime = nil
			troubleshootLabel.Visible = false
			startPulseAnimation()
		elseif pluginState.consecutiveFailures > 1 then
			statusLabel.Text = "Connecting (attempt " .. pluginState.consecutiveFailures .. ")"
			statusLabel.TextColor3 = Color3.fromRGB(245, 158, 11)
			statusIndicator.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			statusPulse.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			statusText.Text = "CONNECTING"
			detailStatusLabel.Text = "HTTP: ...  MCP: ..."
			detailStatusLabel.TextColor3 = Color3.fromRGB(245, 158, 11)
			-- Steps show connecting
			step1Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			step1Label.Text = "1. HTTP server reachable (connecting...)"
			step2Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			step2Label.Text = "2. MCP bridge connected (connecting...)"
			step3Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
			step3Label.Text = "3. Ready for commands (connecting...)"
			pluginState.mcpWaitStartTime = nil
			troubleshootLabel.Visible = false
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

	-- ============================================
	-- NEW CONSOLIDATED ENDPOINTS
	-- ============================================
	
	-- Consolidated search endpoint
	if endpoint == "/api/search" then
		return handlers.search(data)
	-- Consolidated property endpoints
	elseif endpoint == "/api/get-property" then
		return handlers.getProperty(data)
	elseif endpoint == "/api/set-property" then
		return handlers.setPropertyConsolidated(data)
	-- Consolidated create/delete
	elseif endpoint == "/api/create" then
		return handlers.createConsolidated(data)
	elseif endpoint == "/api/delete" then
		return handlers.deleteConsolidated(data)
	-- Consolidated duplicate
	elseif endpoint == "/api/duplicate" then
		return handlers.duplicateConsolidated(data)
	-- Consolidated script editing
	elseif endpoint == "/api/edit-script" then
		return handlers.editScript(data)
	-- Consolidated attribute
	elseif endpoint == "/api/attribute" then
		return handlers.attributeConsolidated(data)
	-- Consolidated tag
	elseif endpoint == "/api/tag" then
		return handlers.tagConsolidated(data)
	
	-- ============================================
	-- UNCHANGED ENDPOINTS
	-- ============================================
	elseif endpoint == "/api/file-tree" then
		return handlers.getFileTree(data)
	elseif endpoint == "/api/place-info" then
		return handlers.getPlaceInfo(data)
	elseif endpoint == "/api/services" then
		return handlers.getServices(data)
	elseif endpoint == "/api/instance-properties" then
		return handlers.getInstanceProperties(data)
	elseif endpoint == "/api/instance-children" then
		return handlers.getInstanceChildren(data)
	elseif endpoint == "/api/class-info" then
		return handlers.getClassInfo(data)
	elseif endpoint == "/api/project-structure" then
		return handlers.getProjectStructure(data)
	elseif endpoint == "/api/get-script-source" then
		return handlers.getScriptSource(data)
	elseif endpoint == "/api/set-script-source" then
		return handlers.setScriptSource(data)
	elseif endpoint == "/api/insert-asset" then
		return handlers.insertAsset(data)
	elseif endpoint == "/api/preview-asset" then
		return handlers.previewAsset(data)
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

		if instance:IsA("LuaSourceContainer") then
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
		elseif searchType == "content" and instance:IsA("LuaSourceContainer") then
			match = instance.Source:lower():find(query:lower()) ~= nil
		end

		if match then
			table.insert(results, {
				name = instance.Name,
				className = instance.ClassName,
				path = getInstancePath(instance),
				hasSource = instance:IsA("LuaSourceContainer"),
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

		if instance:IsA("LuaSourceContainer") then
			properties.Source = instance.Source
			if instance:IsA("BaseScript") then
				properties.Enabled = tostring(instance.Enabled)
			end
		end

		-- Only Parts have a Shape property; MeshParts do not.
		if instance:IsA("Part") then
			properties.Shape = tostring(instance.Shape)
		end

		-- TopSurface and BottomSurface exist on all BaseParts
		if instance:IsA("BasePart") then
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
			hasSource = child:IsA("LuaSourceContainer"),
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

		if instance:IsA("LuaSourceContainer") then
			node.hasSource = true
			node.scriptType = instance.ClassName
			if instance:IsA("BaseScript") then
				node.enabled = instance.Enabled
			end
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
		elseif propertyName == "Source" and instance:IsA("LuaSourceContainer") then
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
			
			if options.namePattern then
				clone.Name = options.namePattern:gsub("{n}", tostring(i))
			else
				clone.Name = instance.Name .. i
			end

			if options.positionOffset and clone:IsA("BasePart") then
				local offset = options.positionOffset
				local currentPos = clone.Position
				clone.Position = Vector3.new(
					currentPos.X + (offset[1] or 0) * i,
					currentPos.Y + (offset[2] or 0) * i,
					currentPos.Z + (offset[3] or 0) * i
				)
			end

			if options.rotationOffset and clone:IsA("BasePart") then
				local offset = options.rotationOffset
				local currentCFrame = clone.CFrame
				clone.CFrame = currentCFrame * CFrame.Angles(
					math.rad((offset[1] or 0) * i),
					math.rad((offset[2] or 0) * i),
					math.rad((offset[3] or 0) * i)
				)
			end

			if options.scaleOffset and clone:IsA("BasePart") then
				local offset = options.scaleOffset
				local currentSize = clone.Size
				clone.Size = Vector3.new(
					currentSize.X * ((offset[1] or 1) ^ i),
					currentSize.Y * ((offset[2] or 1) ^ i),
					currentSize.Z * ((offset[3] or 1) ^ i)
				)
			end

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

local function evaluateFormula(formula, variables, instance, index)
	
	local value = formula
	
	value = value:gsub("index", tostring(index))
	
	if instance and instance:IsA("BasePart") then
		local pos = instance.Position
		local size = instance.Size
		value = value:gsub("Position%.X", tostring(pos.X))
		value = value:gsub("Position%.Y", tostring(pos.Y))
		value = value:gsub("Position%.Z", tostring(pos.Z))
		value = value:gsub("Size%.X", tostring(size.X))
		value = value:gsub("Size%.Y", tostring(size.Y))
		value = value:gsub("Size%.Z", tostring(size.Z))
		value = value:gsub("magnitude", tostring(pos.magnitude))
	end
	
	if variables then
		for k, v in pairs(variables) do
			value = value:gsub(k, tostring(v))
		end
	end
	
	value = value:gsub("sin%(([%d%.%-]+)%)", function(x) return tostring(math.sin(tonumber(x) or 0)) end)
	value = value:gsub("cos%(([%d%.%-]+)%)", function(x) return tostring(math.cos(tonumber(x) or 0)) end)
	value = value:gsub("sqrt%(([%d%.%-]+)%)", function(x) return tostring(math.sqrt(tonumber(x) or 0)) end)
	value = value:gsub("abs%(([%d%.%-]+)%)", function(x) return tostring(math.abs(tonumber(x) or 0)) end)
	value = value:gsub("floor%(([%d%.%-]+)%)", function(x) return tostring(math.floor(tonumber(x) or 0)) end)
	value = value:gsub("ceil%(([%d%.%-]+)%)", function(x) return tostring(math.ceil(tonumber(x) or 0)) end)
	
	local result = tonumber(value)
	if result then
		return result, nil
	end
	
	local success, evalResult = pcall(function()
		
		local num = tonumber(value)
		if num then
			return num
		end
		
		local a, b = value:match("^([%d%.%-]+)%s*%*%s*([%d%.%-]+)$")
		if a and b then
			return (tonumber(a) or 0) * (tonumber(b) or 0)
		end
		
		a, b = value:match("^([%d%.%-]+)%s*%+%s*([%d%.%-]+)$")
		if a and b then
			return (tonumber(a) or 0) + (tonumber(b) or 0)
		end
		
		a, b = value:match("^([%d%.%-]+)%s*%-%s*([%d%.%-]+)$")
		if a and b then
			return (tonumber(a) or 0) - (tonumber(b) or 0)
		end
		
		a, b = value:match("^([%d%.%-]+)%s*/%s*([%d%.%-]+)$")
		if a and b then
			local divisor = tonumber(b) or 1
			if divisor ~= 0 then
				return (tonumber(a) or 0) / divisor
			end
		end
		
		error("Unsupported formula pattern: " .. value)
	end)
	
	if success and type(evalResult) == "number" then
		return evalResult, nil
	else
		return index, "Complex formulas not supported - using index value"
	end
end

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

handlers.getScriptSource = function(requestData)
	local instancePath = requestData.instancePath
	local startLine = requestData.startLine
	local endLine = requestData.endLine

	if not instancePath then
		return { error = "Instance path is required" }
	end

	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end

	if not instance:IsA("LuaSourceContainer") then
		return { error = "Instance is not a script-like object: " .. instance.ClassName }
	end

	local success, result = pcall(function()
		local fullSource = instance.Source
		local totalLineCount = select(2, string.gsub(fullSource, '\n', '\n')) + 1

		-- If line range is specified, extract only those lines
		local sourceToReturn = fullSource
		local returnedStartLine = 1
		local returnedEndLine = totalLineCount

		if startLine or endLine then
			local lines = {}
			for line in (fullSource .. '\n'):gmatch("([^\n]*)\n") do
				table.insert(lines, line)
			end

			local actualStartLine = math.max(1, startLine or 1)
			local actualEndLine = math.min(#lines, endLine or #lines)

			local selectedLines = {}
			for i = actualStartLine, actualEndLine do
				table.insert(selectedLines, lines[i] or "")
			end

			sourceToReturn = table.concat(selectedLines, '\n')
			returnedStartLine = actualStartLine
			returnedEndLine = actualEndLine
		end

		local resp = {
			instancePath = instancePath,
			className = instance.ClassName,
			name = instance.Name,
			source = sourceToReturn,
			sourceLength = string.len(fullSource),
			lineCount = totalLineCount,
			-- Line range info
			startLine = returnedStartLine,
			endLine = returnedEndLine,
			isPartial = (startLine ~= nil or endLine ~= nil),
			-- Helpful metadata for large scripts
			truncated = false,
		}

		-- If the source is very large (>50000 chars) and no range specified,
		-- return first 1000 lines with truncation notice
		if not startLine and not endLine and string.len(fullSource) > 50000 then
			local lines = {}
			for line in (fullSource .. '\n'):gmatch("([^\n]*)\n") do
				table.insert(lines, line)
				if #lines >= 1000 then break end
			end
			resp.source = table.concat(lines, '\n')
			resp.truncated = true
			resp.endLine = math.min(1000, totalLineCount)
			resp.note = "Script truncated to first 1000 lines. Use startLine/endLine parameters to read specific sections."
		end

		if instance:IsA("BaseScript") then
			resp.enabled = instance.Enabled
		end
		return resp
	end)

	if success then
		return result
	else
		return { error = "Failed to get script source: " .. tostring(result) }
	end
end

handlers.setScriptSource = function(requestData)
	local instancePath = requestData.instancePath
	local newSource = requestData.source

	if not instancePath or not newSource then
		return { error = "Instance path and source are required" }
	end

	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end

	if not instance:IsA("LuaSourceContainer") then
		return { error = "Instance is not a script-like object: " .. instance.ClassName }
	end

	-- Try UpdateSourceAsync first (works with open script editors)
	local updateSuccess, updateResult = pcall(function()
		local oldSourceLength = string.len(instance.Source)

		ScriptEditorService:UpdateSourceAsync(instance, function(oldContent)
			return newSource
		end)

		ChangeHistoryService:SetWaypoint("Set script source: " .. instance.Name)

		return {
			success = true,
			instancePath = instancePath,
			oldSourceLength = oldSourceLength,
			newSourceLength = string.len(newSource),
			method = "UpdateSourceAsync",
			message = "Script source updated successfully (editor-safe)"
		}
	end)

	if updateSuccess then
		return updateResult
	end

	-- Fallback to direct assignment if UpdateSourceAsync fails
	local directSuccess, directResult = pcall(function()
		local oldSource = instance.Source
		instance.Source = newSource

		ChangeHistoryService:SetWaypoint("Set script source: " .. instance.Name)

		return {
			success = true,
			instancePath = instancePath,
			oldSourceLength = string.len(oldSource),
			newSourceLength = string.len(newSource),
			method = "direct",
			message = "Script source updated successfully (direct assignment)"
		}
	end)

	if directSuccess then
		return directResult
	end

	-- Final fallback: replace the script entirely
	local replaceSuccess, replaceResult = pcall(function()
		local parent = instance.Parent
		local name = instance.Name
		local className = instance.ClassName
		local wasBaseScript = instance:IsA("BaseScript")
		local enabled
		if wasBaseScript then
			enabled = instance.Enabled
		end

		local newScript = Instance.new(className)
		newScript.Name = name
		newScript.Source = newSource
		if wasBaseScript then
			newScript.Enabled = enabled
		end

		newScript.Parent = parent
		instance:Destroy()

		ChangeHistoryService:SetWaypoint("Replace script: " .. name)

		return {
			success = true,
			instancePath = getInstancePath(newScript),
			method = "replace",
			message = "Script replaced successfully with new source"
		}
	end)

	if replaceSuccess then
		return replaceResult
	else
		return {
			error = "Failed to set script source. UpdateSourceAsync failed: " .. tostring(updateResult) ..
			        ". Direct assignment failed: " .. tostring(directResult) ..
			        ". Replace method failed: " .. tostring(replaceResult)
		}
	end
end

-- Helper function to split source into lines
local function splitLines(source)
	local lines = {}
	for line in (source .. '\n'):gmatch("([^\n]*)\n") do
		table.insert(lines, line)
	end
	return lines
end

-- Partial Script Editing: Edit specific lines
handlers.editScriptLines = function(requestData)
	local instancePath = requestData.instancePath
	local startLine = requestData.startLine
	local endLine = requestData.endLine
	local newContent = requestData.newContent

	if not instancePath or not startLine or not endLine or not newContent then
		return { error = "Instance path, startLine, endLine, and newContent are required" }
	end

	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end

	if not instance:IsA("LuaSourceContainer") then
		return { error = "Instance is not a script-like object: " .. instance.ClassName }
	end

	local success, result = pcall(function()
		local oldSource = instance.Source
		local lines = splitLines(oldSource)
		local totalLines = #lines

		if startLine < 1 or startLine > totalLines then
			error("startLine out of range (1-" .. totalLines .. ")")
		end
		if endLine < startLine or endLine > totalLines then
			error("endLine out of range (" .. startLine .. "-" .. totalLines .. ")")
		end

		-- Split new content into lines
		local newLines = splitLines(newContent)

		-- Build new source: lines before + new content + lines after
		local resultLines = {}

		-- Lines before the edit
		for i = 1, startLine - 1 do
			table.insert(resultLines, lines[i])
		end

		-- New content lines
		for _, line in ipairs(newLines) do
			table.insert(resultLines, line)
		end

		-- Lines after the edit
		for i = endLine + 1, totalLines do
			table.insert(resultLines, lines[i])
		end

		local newSource = table.concat(resultLines, '\n')

		-- Use UpdateSourceAsync for editor compatibility
		ScriptEditorService:UpdateSourceAsync(instance, function(oldContent)
			return newSource
		end)

		ChangeHistoryService:SetWaypoint("Edit script lines " .. startLine .. "-" .. endLine .. ": " .. instance.Name)

		return {
			success = true,
			instancePath = instancePath,
			editedLines = { startLine = startLine, endLine = endLine },
			linesRemoved = endLine - startLine + 1,
			linesAdded = #newLines,
			newLineCount = #resultLines,
			message = "Script lines edited successfully"
		}
	end)

	if success then
		return result
	else
		return { error = "Failed to edit script lines: " .. tostring(result) }
	end
end

-- Partial Script Editing: Insert lines after a specific line
handlers.insertScriptLines = function(requestData)
	local instancePath = requestData.instancePath
	local afterLine = requestData.afterLine or 0 -- 0 means insert at beginning
	local newContent = requestData.newContent

	if not instancePath or not newContent then
		return { error = "Instance path and newContent are required" }
	end

	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end

	if not instance:IsA("LuaSourceContainer") then
		return { error = "Instance is not a script-like object: " .. instance.ClassName }
	end

	local success, result = pcall(function()
		local oldSource = instance.Source
		local lines = splitLines(oldSource)
		local totalLines = #lines

		if afterLine < 0 or afterLine > totalLines then
			error("afterLine out of range (0-" .. totalLines .. ")")
		end

		-- Split new content into lines
		local newLines = splitLines(newContent)

		-- Build new source
		local resultLines = {}

		-- Lines before insertion point
		for i = 1, afterLine do
			table.insert(resultLines, lines[i])
		end

		-- New content lines
		for _, line in ipairs(newLines) do
			table.insert(resultLines, line)
		end

		-- Lines after insertion point
		for i = afterLine + 1, totalLines do
			table.insert(resultLines, lines[i])
		end

		local newSource = table.concat(resultLines, '\n')

		-- Use UpdateSourceAsync for editor compatibility
		ScriptEditorService:UpdateSourceAsync(instance, function(oldContent)
			return newSource
		end)

		ChangeHistoryService:SetWaypoint("Insert script lines after line " .. afterLine .. ": " .. instance.Name)

		return {
			success = true,
			instancePath = instancePath,
			insertedAfterLine = afterLine,
			linesInserted = #newLines,
			newLineCount = #resultLines,
			message = "Script lines inserted successfully"
		}
	end)

	if success then
		return result
	else
		return { error = "Failed to insert script lines: " .. tostring(result) }
	end
end

-- Partial Script Editing: Delete specific lines
handlers.deleteScriptLines = function(requestData)
	local instancePath = requestData.instancePath
	local startLine = requestData.startLine
	local endLine = requestData.endLine

	if not instancePath or not startLine or not endLine then
		return { error = "Instance path, startLine, and endLine are required" }
	end

	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end

	if not instance:IsA("LuaSourceContainer") then
		return { error = "Instance is not a script-like object: " .. instance.ClassName }
	end

	local success, result = pcall(function()
		local oldSource = instance.Source
		local lines = splitLines(oldSource)
		local totalLines = #lines

		if startLine < 1 or startLine > totalLines then
			error("startLine out of range (1-" .. totalLines .. ")")
		end
		if endLine < startLine or endLine > totalLines then
			error("endLine out of range (" .. startLine .. "-" .. totalLines .. ")")
		end

		-- Build new source without the deleted lines
		local resultLines = {}

		for i = 1, startLine - 1 do
			table.insert(resultLines, lines[i])
		end

		for i = endLine + 1, totalLines do
			table.insert(resultLines, lines[i])
		end

		local newSource = table.concat(resultLines, '\n')

		-- Use UpdateSourceAsync for editor compatibility
		ScriptEditorService:UpdateSourceAsync(instance, function(oldContent)
			return newSource
		end)

		ChangeHistoryService:SetWaypoint("Delete script lines " .. startLine .. "-" .. endLine .. ": " .. instance.Name)

		return {
			success = true,
			instancePath = instancePath,
			deletedLines = { startLine = startLine, endLine = endLine },
			linesDeleted = endLine - startLine + 1,
			newLineCount = #resultLines,
			message = "Script lines deleted successfully"
		}
	end)

	if success then
		return result
	else
		return { error = "Failed to delete script lines: " .. tostring(result) }
	end
end

-- Attribute Tools: Get a single attribute
handlers.getAttribute = function(requestData)
	local instancePath = requestData.instancePath
	local attributeName = requestData.attributeName

	if not instancePath or not attributeName then
		return { error = "Instance path and attribute name are required" }
	end

	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end

	local success, result = pcall(function()
		local value = instance:GetAttribute(attributeName)
		local valueType = typeof(value)

		-- Serialize the value for JSON transport
		local serializedValue = value
		if valueType == "Vector3" then
			serializedValue = { X = value.X, Y = value.Y, Z = value.Z, _type = "Vector3" }
		elseif valueType == "Color3" then
			serializedValue = { R = value.R, G = value.G, B = value.B, _type = "Color3" }
		elseif valueType == "CFrame" then
			serializedValue = { Position = { X = value.Position.X, Y = value.Position.Y, Z = value.Position.Z }, _type = "CFrame" }
		elseif valueType == "UDim2" then
			serializedValue = { X = { Scale = value.X.Scale, Offset = value.X.Offset }, Y = { Scale = value.Y.Scale, Offset = value.Y.Offset }, _type = "UDim2" }
		elseif valueType == "BrickColor" then
			serializedValue = { Name = value.Name, _type = "BrickColor" }
		end

		return {
			instancePath = instancePath,
			attributeName = attributeName,
			value = serializedValue,
			valueType = valueType,
			exists = value ~= nil
		}
	end)

	if success then
		return result
	else
		return { error = "Failed to get attribute: " .. tostring(result) }
	end
end

-- Attribute Tools: Set an attribute
handlers.setAttribute = function(requestData)
	local instancePath = requestData.instancePath
	local attributeName = requestData.attributeName
	local attributeValue = requestData.attributeValue
	local valueType = requestData.valueType -- Optional type hint

	if not instancePath or not attributeName then
		return { error = "Instance path and attribute name are required" }
	end

	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end

	local success, result = pcall(function()
		local value = attributeValue

		-- Handle special type conversions
		if type(attributeValue) == "table" then
			if attributeValue._type == "Vector3" or valueType == "Vector3" then
				value = Vector3.new(attributeValue.X or 0, attributeValue.Y or 0, attributeValue.Z or 0)
			elseif attributeValue._type == "Color3" or valueType == "Color3" then
				value = Color3.new(attributeValue.R or 0, attributeValue.G or 0, attributeValue.B or 0)
			elseif attributeValue._type == "UDim2" or valueType == "UDim2" then
				value = UDim2.new(
					attributeValue.X and attributeValue.X.Scale or 0,
					attributeValue.X and attributeValue.X.Offset or 0,
					attributeValue.Y and attributeValue.Y.Scale or 0,
					attributeValue.Y and attributeValue.Y.Offset or 0
				)
			elseif attributeValue._type == "BrickColor" or valueType == "BrickColor" then
				value = BrickColor.new(attributeValue.Name or "Medium stone grey")
			end
		end

		instance:SetAttribute(attributeName, value)
		ChangeHistoryService:SetWaypoint("Set attribute " .. attributeName .. " on " .. instance.Name)

		return {
			success = true,
			instancePath = instancePath,
			attributeName = attributeName,
			value = attributeValue,
			message = "Attribute set successfully"
		}
	end)

	if success then
		return result
	else
		return { error = "Failed to set attribute: " .. tostring(result) }
	end
end

-- Attribute Tools: Get all attributes
handlers.getAttributes = function(requestData)
	local instancePath = requestData.instancePath

	if not instancePath then
		return { error = "Instance path is required" }
	end

	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end

	local success, result = pcall(function()
		local attributes = instance:GetAttributes()
		local serializedAttributes = {}

		for name, value in pairs(attributes) do
			local valueType = typeof(value)
			local serializedValue = value

			if valueType == "Vector3" then
				serializedValue = { X = value.X, Y = value.Y, Z = value.Z, _type = "Vector3" }
			elseif valueType == "Color3" then
				serializedValue = { R = value.R, G = value.G, B = value.B, _type = "Color3" }
			elseif valueType == "CFrame" then
				serializedValue = { Position = { X = value.Position.X, Y = value.Position.Y, Z = value.Position.Z }, _type = "CFrame" }
			elseif valueType == "UDim2" then
				serializedValue = { X = { Scale = value.X.Scale, Offset = value.X.Offset }, Y = { Scale = value.Y.Scale, Offset = value.Y.Offset }, _type = "UDim2" }
			elseif valueType == "BrickColor" then
				serializedValue = { Name = value.Name, _type = "BrickColor" }
			end

			serializedAttributes[name] = {
				value = serializedValue,
				type = valueType
			}
		end

		local count = 0
		for _ in pairs(serializedAttributes) do count = count + 1 end

		return {
			instancePath = instancePath,
			attributes = serializedAttributes,
			count = count
		}
	end)

	if success then
		return result
	else
		return { error = "Failed to get attributes: " .. tostring(result) }
	end
end

-- Attribute Tools: Delete an attribute
handlers.deleteAttribute = function(requestData)
	local instancePath = requestData.instancePath
	local attributeName = requestData.attributeName

	if not instancePath or not attributeName then
		return { error = "Instance path and attribute name are required" }
	end

	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end

	local success, result = pcall(function()
		local existed = instance:GetAttribute(attributeName) ~= nil
		instance:SetAttribute(attributeName, nil)
		ChangeHistoryService:SetWaypoint("Delete attribute " .. attributeName .. " from " .. instance.Name)

		return {
			success = true,
			instancePath = instancePath,
			attributeName = attributeName,
			existed = existed,
			message = existed and "Attribute deleted successfully" or "Attribute did not exist"
		}
	end)

	if success then
		return result
	else
		return { error = "Failed to delete attribute: " .. tostring(result) }
	end
end

-- Tag Tools: Get all tags on an instance
handlers.getTags = function(requestData)
	local instancePath = requestData.instancePath

	if not instancePath then
		return { error = "Instance path is required" }
	end

	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end

	local success, result = pcall(function()
		local tags = CollectionService:GetTags(instance)

		return {
			instancePath = instancePath,
			tags = tags,
			count = #tags
		}
	end)

	if success then
		return result
	else
		return { error = "Failed to get tags: " .. tostring(result) }
	end
end

-- Tag Tools: Add a tag to an instance
handlers.addTag = function(requestData)
	local instancePath = requestData.instancePath
	local tagName = requestData.tagName

	if not instancePath or not tagName then
		return { error = "Instance path and tag name are required" }
	end

	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end

	local success, result = pcall(function()
		local alreadyHad = CollectionService:HasTag(instance, tagName)
		CollectionService:AddTag(instance, tagName)
		ChangeHistoryService:SetWaypoint("Add tag " .. tagName .. " to " .. instance.Name)

		return {
			success = true,
			instancePath = instancePath,
			tagName = tagName,
			alreadyHad = alreadyHad,
			message = alreadyHad and "Instance already had this tag" or "Tag added successfully"
		}
	end)

	if success then
		return result
	else
		return { error = "Failed to add tag: " .. tostring(result) }
	end
end

-- Tag Tools: Remove a tag from an instance
handlers.removeTag = function(requestData)
	local instancePath = requestData.instancePath
	local tagName = requestData.tagName

	if not instancePath or not tagName then
		return { error = "Instance path and tag name are required" }
	end

	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end

	local success, result = pcall(function()
		local hadTag = CollectionService:HasTag(instance, tagName)
		CollectionService:RemoveTag(instance, tagName)
		ChangeHistoryService:SetWaypoint("Remove tag " .. tagName .. " from " .. instance.Name)

		return {
			success = true,
			instancePath = instancePath,
			tagName = tagName,
			hadTag = hadTag,
			message = hadTag and "Tag removed successfully" or "Instance did not have this tag"
		}
	end)

	if success then
		return result
	else
		return { error = "Failed to remove tag: " .. tostring(result) }
	end
end

-- Tag Tools: Get all instances with a specific tag
handlers.getTagged = function(requestData)
	local tagName = requestData.tagName

	if not tagName then
		return { error = "Tag name is required" }
	end

	local success, result = pcall(function()
		local taggedInstances = CollectionService:GetTagged(tagName)
		local instances = {}

		for _, instance in ipairs(taggedInstances) do
			table.insert(instances, {
				name = instance.Name,
				className = instance.ClassName,
				path = getInstancePath(instance)
			})
		end

		return {
			tagName = tagName,
			instances = instances,
			count = #instances
		}
	end)

	if success then
		return result
	else
		return { error = "Failed to get tagged instances: " .. tostring(result) }
	end
end

-- Asset Tools: Insert an asset from Creator Store
handlers.insertAsset = function(requestData)
	local assetId = requestData.assetId
	local parentPath = requestData.parentPath or "game.Workspace"
	local position = requestData.position

	if not assetId then
		return { error = "Asset ID is required" }
	end

	local parentInstance = getInstanceByPath(parentPath)
	if not parentInstance then
		return { error = "Parent instance not found: " .. parentPath }
	end

	-- Use AssetService:LoadAssetAsync (modern API that supports third-party assets)
	local AssetService = game:GetService("AssetService")
	local Selection = game:GetService("Selection")
	
	local loadSuccess, assetModel = pcall(function()
		return AssetService:LoadAssetAsync(assetId)
	end)
	
	if not loadSuccess then
		-- Return the actual Roblox error for debugging
		return { 
			error = "Failed to load asset",
			robloxError = tostring(assetModel),
			assetId = assetId,
			hint = "Enable 'Allow Loading Third Party Assets' in Game Settings -> Security. The asset must also be public/free."
		}
	end
	
	if not assetModel then
		return { 
			error = "AssetService returned nil",
			assetId = assetId,
			hint = "The asset may not exist or is not accessible."
		}
	end

	local success, result = pcall(function()
		-- Get the actual content (child of the wrapper model)
		local children = assetModel:GetChildren()
		local insertedInstances = {}
		
		for _, child in ipairs(children) do
			-- Set position if provided and it's a BasePart or Model with PrimaryPart
			if position then
				if child:IsA("BasePart") then
					child.Position = Vector3.new(position.x or 0, position.y or 0, position.z or 0)
				elseif child:IsA("Model") then
					if child.PrimaryPart then
						child:SetPrimaryPartCFrame(
							CFrame.new(position.x or 0, position.y or 0, position.z or 0)
						)
					elseif child:FindFirstChildWhichIsA("BasePart") then
						-- Move to approximate position
						local firstPart = child:FindFirstChildWhichIsA("BasePart")
						local offset = child:GetBoundingBox().Position - firstPart.Position
						child:PivotTo(CFrame.new(position.x or 0, position.y or 0, position.z or 0))
					end
				end
			end
			
			child.Parent = parentInstance
			table.insert(insertedInstances, {
				name = child.Name,
				className = child.ClassName,
				path = getInstancePath(child)
			})
		end
		
		-- Clean up the wrapper model
		assetModel:Destroy()
		
		-- Set undo waypoint
		ChangeHistoryService:SetWaypoint("Insert Asset " .. tostring(assetId))
		
		-- Select the inserted objects
		local instancesToSelect = {}
		for _, child in ipairs(parentInstance:GetChildren()) do
			for _, inserted in ipairs(insertedInstances) do
				if child.Name == inserted.name and child.ClassName == inserted.className then
					table.insert(instancesToSelect, child)
					break
				end
			end
		end
		
		if #instancesToSelect > 0 then
			Selection:Set(instancesToSelect)
		end
		
		return {
			success = true,
			assetId = assetId,
			parentPath = parentPath,
			insertedInstances = insertedInstances,
			message = "Asset inserted successfully. Scripts are sandboxed and won't auto-run."
		}
	end)

	if success then
		if result.error then
			return result
		end
		return result
	else
		return { 
			error = "Failed to process asset after loading",
			robloxError = tostring(result),
			assetId = assetId
		}
	end
end

-- Asset Tools: Preview an asset without inserting (inspect hierarchy, properties, attributes)
handlers.previewAsset = function(requestData)
	local assetId = requestData.assetId
	local includeProperties = requestData.includeProperties or true
	local maxDepth = requestData.maxDepth or 10

	if not assetId then
		return { error = "Asset ID is required" }
	end

	-- Use AssetService:LoadAssetAsync (modern API that supports third-party assets)
	local AssetService = game:GetService("AssetService")
	
	local loadSuccess, assetModel = pcall(function()
		return AssetService:LoadAssetAsync(assetId)
	end)
	
	if not loadSuccess then
		return { 
			error = "Failed to load asset for preview",
			robloxError = tostring(assetModel),
			assetId = assetId,
			hint = "Enable 'Allow Loading Third Party Assets' in Game Settings -> Security."
		}
	end
	
	if not assetModel then
		return { 
			error = "AssetService returned nil",
			assetId = assetId
		}
	end

	-- Recursive function to build hierarchy with properties
	local function buildHierarchy(instance, depth)
		if depth > maxDepth then 
			return { name = instance.Name, className = instance.ClassName, truncated = true }
		end
		
		local node = {
			name = instance.Name,
			className = instance.ClassName,
			children = {}
		}
		
		if includeProperties then
			node.properties = {}
			
			-- Get all attributes
			local attrSuccess, attrs = pcall(function()
				return instance:GetAttributes()
			end)
			if attrSuccess and next(attrs) then
				node.attributes = attrs
			end
			
			-- Extract common properties based on class type
			if instance:IsA("BasePart") then
				pcall(function() 
					node.properties.Size = { X = instance.Size.X, Y = instance.Size.Y, Z = instance.Size.Z }
				end)
				pcall(function() 
					node.properties.Position = { X = instance.Position.X, Y = instance.Position.Y, Z = instance.Position.Z }
				end)
				pcall(function() node.properties.Material = tostring(instance.Material) end)
				pcall(function() node.properties.BrickColor = instance.BrickColor.Name end)
				pcall(function() node.properties.Color = { R = instance.Color.R, G = instance.Color.G, B = instance.Color.B } end)
				pcall(function() node.properties.Transparency = instance.Transparency end)
				pcall(function() node.properties.Anchored = instance.Anchored end)
				pcall(function() node.properties.CanCollide = instance.CanCollide end)
			end
			
			if instance:IsA("MeshPart") then
				pcall(function() node.properties.MeshId = instance.MeshId end)
				pcall(function() node.properties.TextureID = instance.TextureID end)
			end
			
			if instance:IsA("Model") then
				pcall(function() 
					if instance.PrimaryPart then
						node.properties.PrimaryPart = instance.PrimaryPart.Name
					end
				end)
			end
			
			if instance:IsA("LuaSourceContainer") then
				pcall(function() 
					local source = instance.Source
					node.properties.SourceLength = #source
					node.properties.SourcePreview = string.sub(source, 1, 200) .. (source and #source > 200 and "..." or "")
				end)
				if instance:IsA("BaseScript") then
					pcall(function() node.properties.Enabled = instance.Enabled end)
				end
			end
			
			if instance:IsA("Decal") or instance:IsA("Texture") then
				pcall(function() node.properties.Texture = instance.Texture end)
			end
			
			if instance:IsA("Sound") then
				pcall(function() node.properties.SoundId = instance.SoundId end)
				pcall(function() node.properties.Volume = instance.Volume end)
			end
		end
		
		for _, child in ipairs(instance:GetChildren()) do
			table.insert(node.children, buildHierarchy(child, depth + 1))
		end
		
		return node
	end

	-- Build hierarchy for all children of the asset wrapper
	local hierarchy = {}
	local allDescendants = assetModel:GetDescendants()
	
	for _, child in ipairs(assetModel:GetChildren()) do
		table.insert(hierarchy, buildHierarchy(child, 0))
	end
	
	-- Collect class counts
	local classCounts = {}
	for _, desc in ipairs(allDescendants) do
		classCounts[desc.ClassName] = (classCounts[desc.ClassName] or 0) + 1
	end
	
	-- Check for specific content types
	local hasScripts = false
	local hasAnimations = false
	local hasSounds = false
	local hasParticles = false
	
	for _, desc in ipairs(allDescendants) do
		if desc:IsA("LuaSourceContainer") then hasScripts = true end
		if desc:IsA("Animation") or desc:IsA("AnimationTrack") then hasAnimations = true end
		if desc:IsA("Sound") then hasSounds = true end
		if desc:IsA("ParticleEmitter") or desc:IsA("Fire") or desc:IsA("Smoke") or desc:IsA("Sparkles") then hasParticles = true end
	end
	
	-- Cleanup - don't leave asset in scene
	assetModel:Destroy()
	
	return {
		success = true,
		assetId = assetId,
		hierarchy = hierarchy,
		summary = {
			totalInstances = #allDescendants,
			classes = classCounts,
			hasScripts = hasScripts,
			hasAnimations = hasAnimations,
			hasSounds = hasSounds,
			hasParticles = hasParticles
		},
		message = "Asset previewed and cleaned up. Use insert_asset to add to scene."
	}
end


-- ============================================
-- CONSOLIDATED HANDLERS
-- ============================================

-- Consolidated search handler
handlers.search = function(requestData)
	local query = requestData.query
	local searchType = requestData.searchType or "name"
	local propertyName = requestData.propertyName
	local propertyValue = requestData.propertyValue
	
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
		elseif searchType == "content" and instance:IsA("LuaSourceContainer") then
			match = instance.Source:lower():find(query:lower()) ~= nil
		elseif searchType == "property" and propertyName then
			local success, value = pcall(function()
				return tostring(instance[propertyName])
			end)
			if success then
				local searchVal = propertyValue or query
				match = value:lower():find(searchVal:lower()) ~= nil
			end
		end
		
		if match then
			table.insert(results, {
				name = instance.Name,
				className = instance.ClassName,
				path = getInstancePath(instance),
				hasSource = instance:IsA("LuaSourceContainer"),
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

-- Consolidated get property handler (supports batch)
handlers.getProperty = function(requestData)
	local paths = requestData.paths
	local propertyName = requestData.propertyName
	
	if not paths or not propertyName then
		return { error = "Paths and propertyName are required" }
	end
	
	-- Normalize to array
	if type(paths) == "string" then
		paths = { paths }
	end
	
	local results = {}
	local errors = {}
	
	for _, path in ipairs(paths) do
		local instance = getInstanceByPath(path)
		if instance then
			local success, value = pcall(function()
				return instance[propertyName]
			end)
			if success then
				table.insert(results, {
					path = path,
					propertyName = propertyName,
					value = tostring(value),
					rawValue = value
				})
			else
				table.insert(errors, { path = path, error = tostring(value) })
			end
		else
			table.insert(errors, { path = path, error = "Instance not found" })
		end
	end
	
	return {
		results = results,
		errors = #errors > 0 and errors or nil,
		count = #results
	}
end

-- Consolidated set property handler (supports batch, formulas, relative ops)
handlers.setPropertyConsolidated = function(requestData)
	local paths = requestData.paths
	local propertyName = requestData.propertyName
	local propertyValue = requestData.propertyValue
	local operation = requestData.operation or "set"
	local component = requestData.component
	local formula = requestData.formula
	local variables = requestData.variables or {}
	
	if not paths or not propertyName then
		return { error = "Paths and propertyName are required" }
	end
	
	-- Normalize to array
	if type(paths) == "string" then
		paths = { paths }
	end
	
	local results = {}
	local errors = {}
	
	for i, path in ipairs(paths) do
		local instance = getInstanceByPath(path)
		if instance then
			local success, err = pcall(function()
				local finalValue = propertyValue
				
				-- Handle formula evaluation
				if formula then
					local env = { index = i, i = i, math = math }
					for k, v in pairs(variables) do
						env[k] = v
					end
					local func = loadstring("return " .. formula)
					if func then
						setfenv(func, env)
						finalValue = func()
					end
				end
				
				-- Handle relative operations
				if operation ~= "set" and operation then
					local currentValue = instance[propertyName]
					if component and (typeof(currentValue) == "Vector3" or typeof(currentValue) == "UDim2") then
						if typeof(currentValue) == "Vector3" then
							local x, y, z = currentValue.X, currentValue.Y, currentValue.Z
							local delta = tonumber(finalValue) or 0
							if component == "X" then
								if operation == "add" then x = x + delta
								elseif operation == "subtract" then x = x - delta
								elseif operation == "multiply" then x = x * delta
								elseif operation == "divide" then x = x / delta end
							elseif component == "Y" then
								if operation == "add" then y = y + delta
								elseif operation == "subtract" then y = y - delta
								elseif operation == "multiply" then y = y * delta
								elseif operation == "divide" then y = y / delta end
							elseif component == "Z" then
								if operation == "add" then z = z + delta
								elseif operation == "subtract" then z = z - delta
								elseif operation == "multiply" then z = z * delta
								elseif operation == "divide" then z = z / delta end
							end
							finalValue = Vector3.new(x, y, z)
						end
					elseif type(currentValue) == "number" then
						local delta = tonumber(finalValue) or 0
						if operation == "add" then finalValue = currentValue + delta
						elseif operation == "subtract" then finalValue = currentValue - delta
						elseif operation == "multiply" then finalValue = currentValue * delta
						elseif operation == "divide" then finalValue = currentValue / delta end
					end
				end
				
				-- Parse special types
				if propertyName == "Size" or propertyName == "Position" then
					if type(finalValue) == "string" then
						local parts = string.split(finalValue, ",")
						if #parts == 3 then
							finalValue = Vector3.new(tonumber(parts[1]) or 0, tonumber(parts[2]) or 0, tonumber(parts[3]) or 0)
						end
					end
				elseif propertyName == "BrickColor" then
					finalValue = BrickColor.new(tostring(finalValue))
				elseif propertyName == "Material" then
					finalValue = Enum.Material[tostring(finalValue)] or instance.Material
				end
				
				instance[propertyName] = finalValue
			end)
			
			if success then
				table.insert(results, { path = path, success = true })
			else
				table.insert(errors, { path = path, error = tostring(err) })
			end
		else
			table.insert(errors, { path = path, error = "Instance not found" })
		end
	end
	
	ChangeHistoryService:SetWaypoint("Set property: " .. propertyName)
	
	return {
		success = #errors == 0,
		modified = #results,
		errors = #errors > 0 and errors or nil
	}
end

-- Consolidated create handler (supports batch with properties)
handlers.createConsolidated = function(requestData)
	local objects = requestData.objects
	
	if not objects then
		return { error = "Objects array is required" }
	end
	
	-- Normalize single object to array
	if objects.className then
		objects = { objects }
	end
	
	local created = {}
	local errors = {}
	
	for _, obj in ipairs(objects) do
		local className = obj.className
		local parentPath = obj.parent
		local name = obj.name
		local properties = obj.properties
		
		if not className or not parentPath then
			table.insert(errors, { error = "className and parent required", object = obj })
		else
			local parent = getInstanceByPath(parentPath)
			if parent then
				local success, newInstance = pcall(function()
					local inst = Instance.new(className)
					if name then inst.Name = name end
					
					if properties then
						for propName, propValue in pairs(properties) do
							pcall(function()
								if propName == "Size" or propName == "Position" then
									if type(propValue) == "table" then
										inst[propName] = Vector3.new(propValue.X or propValue[1] or 0, propValue.Y or propValue[2] or 0, propValue.Z or propValue[3] or 0)
									elseif type(propValue) == "string" then
										local parts = string.split(propValue, ",")
										inst[propName] = Vector3.new(tonumber(parts[1]) or 0, tonumber(parts[2]) or 0, tonumber(parts[3]) or 0)
									end
								elseif propName == "Color" or propName == "Color3" then
									if type(propValue) == "table" then
										inst.Color = Color3.new(propValue.R or propValue[1] or 0, propValue.G or propValue[2] or 0, propValue.B or propValue[3] or 0)
									end
								elseif propName == "BrickColor" then
									inst.BrickColor = BrickColor.new(tostring(propValue))
								elseif propName == "Material" then
									inst.Material = Enum.Material[tostring(propValue)] or Enum.Material.Plastic
								else
									inst[propName] = propValue
								end
							end)
						end
					end
					
					inst.Parent = parent
					return inst
				end)
				
				if success then
					table.insert(created, {
						name = newInstance.Name,
						className = newInstance.ClassName,
						path = getInstancePath(newInstance)
					})
				else
					table.insert(errors, { className = className, parent = parentPath, error = tostring(newInstance) })
				end
			else
				table.insert(errors, { className = className, parent = parentPath, error = "Parent not found" })
			end
		end
	end
	
	ChangeHistoryService:SetWaypoint("Create objects")
	
	return {
		success = #errors == 0,
		created = created,
		count = #created,
		errors = #errors > 0 and errors or nil
	}
end

-- Consolidated delete handler (supports batch)
handlers.deleteConsolidated = function(requestData)
	local paths = requestData.paths
	
	if not paths then
		return { error = "Paths required" }
	end
	
	if type(paths) == "string" then
		paths = { paths }
	end
	
	local deleted = {}
	local errors = {}
	
	for _, path in ipairs(paths) do
		local instance = getInstanceByPath(path)
		if instance then
			local name = instance.Name
			local className = instance.ClassName
			local success, err = pcall(function()
				instance:Destroy()
			end)
			if success then
				table.insert(deleted, { path = path, name = name, className = className })
			else
				table.insert(errors, { path = path, error = tostring(err) })
			end
		else
			table.insert(errors, { path = path, error = "Instance not found" })
		end
	end
	
	ChangeHistoryService:SetWaypoint("Delete objects")
	
	return {
		success = #errors == 0,
		deleted = deleted,
		count = #deleted,
		errors = #errors > 0 and errors or nil
	}
end

-- Consolidated duplicate handler (supports batch with options)
handlers.duplicateConsolidated = function(requestData)
	local duplications = requestData.duplications
	
	if not duplications then
		return { error = "Duplications required" }
	end
	
	-- Normalize single to array
	if duplications.instancePath then
		duplications = { duplications }
	end
	
	local created = {}
	local errors = {}
	
	for _, dup in ipairs(duplications) do
		local instancePath = dup.instancePath
		local count = dup.count or 1
		local options = dup.options or {}
		
		local instance = getInstanceByPath(instancePath)
		if instance then
			for i = 1, count do
				local success, clone = pcall(function()
					local c = instance:Clone()
					
					-- Apply name pattern
					if options.namePattern then
						c.Name = options.namePattern:gsub("{n}", tostring(i)):gsub("{i}", tostring(i))
					else
						c.Name = instance.Name .. "_" .. i
					end
					
					-- Apply position offset
					if options.positionOffset and c:IsA("BasePart") then
						local offset = options.positionOffset
						c.Position = c.Position + Vector3.new(
							(offset[1] or 0) * i,
							(offset[2] or 0) * i,
							(offset[3] or 0) * i
						)
					elseif options.positionOffset and c:IsA("Model") and c.PrimaryPart then
						local offset = options.positionOffset
						c:SetPrimaryPartCFrame(c.PrimaryPart.CFrame + Vector3.new(
							(offset[1] or 0) * i,
							(offset[2] or 0) * i,
							(offset[3] or 0) * i
						))
					end
					
					-- Target parent or same parent
					if options.targetParents and options.targetParents[i] then
						local targetParent = getInstanceByPath(options.targetParents[i])
						c.Parent = targetParent or instance.Parent
					else
						c.Parent = instance.Parent
					end
					
					return c
				end)
				
				if success then
					table.insert(created, {
						name = clone.Name,
						className = clone.ClassName,
						path = getInstancePath(clone)
					})
				else
					table.insert(errors, { instancePath = instancePath, index = i, error = tostring(clone) })
				end
			end
		else
			table.insert(errors, { instancePath = instancePath, error = "Instance not found" })
		end
	end
	
	ChangeHistoryService:SetWaypoint("Duplicate objects")
	
	return {
		success = #errors == 0,
		created = created,
		count = #created,
		errors = #errors > 0 and errors or nil
	}
end

-- Consolidated script editing handler
handlers.editScript = function(requestData)
	local instancePath = requestData.instancePath
	local action = requestData.action
	local startLine = requestData.startLine
	local endLine = requestData.endLine or startLine
	local content = requestData.content or ""
	
	if not instancePath or not action or not startLine then
		return { error = "instancePath, action, and startLine required" }
	end
	
	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end
	
	if not instance:IsA("LuaSourceContainer") then
		return { error = "Instance is not a script" }
	end
	
	local source = instance.Source
	local lines = {}
	for line in (source .. "\n"):gmatch("([^\n]*)\n") do
		table.insert(lines, line)
	end
	
	local success, err = pcall(function()
		if action == "replace" then
			local newLines = {}
			for line in (content .. "\n"):gmatch("([^\n]*)\n") do
				table.insert(newLines, line)
			end
			
			local result = {}
			for i = 1, startLine - 1 do
				table.insert(result, lines[i] or "")
			end
			for _, line in ipairs(newLines) do
				table.insert(result, line)
			end
			for i = endLine + 1, #lines do
				table.insert(result, lines[i])
			end
			instance.Source = table.concat(result, "\n")
			
		elseif action == "insert" then
			local newLines = {}
			for line in (content .. "\n"):gmatch("([^\n]*)\n") do
				table.insert(newLines, line)
			end
			
			local result = {}
			for i = 1, startLine do
				table.insert(result, lines[i] or "")
			end
			for _, line in ipairs(newLines) do
				table.insert(result, line)
			end
			for i = startLine + 1, #lines do
				table.insert(result, lines[i])
			end
			instance.Source = table.concat(result, "\n")
			
		elseif action == "delete" then
			local result = {}
			for i = 1, startLine - 1 do
				table.insert(result, lines[i])
			end
			for i = endLine + 1, #lines do
				table.insert(result, lines[i])
			end
			instance.Source = table.concat(result, "\n")
		end
	end)
	
	if success then
		ChangeHistoryService:SetWaypoint("Edit script: " .. action)
		return {
			success = true,
			instancePath = instancePath,
			action = action,
			linesAffected = endLine - startLine + 1
		}
	else
		return { error = tostring(err) }
	end
end

-- Consolidated attribute handler
handlers.attributeConsolidated = function(requestData)
	local instancePath = requestData.instancePath
	local action = requestData.action
	local attributeName = requestData.attributeName
	local attributeValue = requestData.attributeValue
	local valueType = requestData.valueType
	
	if not instancePath or not action then
		return { error = "instancePath and action required" }
	end
	
	local instance = getInstanceByPath(instancePath)
	if not instance then
		return { error = "Instance not found: " .. instancePath }
	end
	
	if action == "get" then
		if not attributeName then
			return { error = "attributeName required for get" }
		end
		local value = instance:GetAttribute(attributeName)
		return {
			instancePath = instancePath,
			attributeName = attributeName,
			value = value,
			valueType = typeof(value)
		}
		
	elseif action == "get_all" then
		local attributes = instance:GetAttributes()
		local result = {}
		for name, value in pairs(attributes) do
			result[name] = { value = value, type = typeof(value) }
		end
		return {
			instancePath = instancePath,
			attributes = result,
			count = 0 -- TODO: count pairs
		}
		
	elseif action == "set" then
		if not attributeName then
			return { error = "attributeName required for set" }
		end
		
		local finalValue = attributeValue
		if valueType == "Vector3" and type(attributeValue) == "table" then
			finalValue = Vector3.new(attributeValue.X or attributeValue[1] or 0, attributeValue.Y or attributeValue[2] or 0, attributeValue.Z or attributeValue[3] or 0)
		elseif valueType == "Color3" and type(attributeValue) == "table" then
			finalValue = Color3.new(attributeValue.R or attributeValue[1] or 0, attributeValue.G or attributeValue[2] or 0, attributeValue.B or attributeValue[3] or 0)
		elseif valueType == "BrickColor" then
			finalValue = BrickColor.new(tostring(attributeValue))
		end
		
		instance:SetAttribute(attributeName, finalValue)
		ChangeHistoryService:SetWaypoint("Set attribute: " .. attributeName)
		return {
			success = true,
			instancePath = instancePath,
			attributeName = attributeName,
			value = finalValue
		}
		
	elseif action == "delete" then
		if not attributeName then
			return { error = "attributeName required for delete" }
		end
		instance:SetAttribute(attributeName, nil)
		ChangeHistoryService:SetWaypoint("Delete attribute: " .. attributeName)
		return {
			success = true,
			instancePath = instancePath,
			attributeName = attributeName,
			deleted = true
		}
	end
	
	return { error = "Unknown action: " .. tostring(action) }
end

-- Consolidated tag handler
handlers.tagConsolidated = function(requestData)
	local action = requestData.action
	local instancePath = requestData.instancePath
	local tagName = requestData.tagName
	
	if not action then
		return { error = "action required" }
	end
	
	local CollectionService = game:GetService("CollectionService")
	
	if action == "get" then
		if not instancePath then
			return { error = "instancePath required for get" }
		end
		local instance = getInstanceByPath(instancePath)
		if not instance then
			return { error = "Instance not found" }
		end
		local tags = CollectionService:GetTags(instance)
		return {
			instancePath = instancePath,
			tags = tags,
			count = #tags
		}
		
	elseif action == "add" then
		if not instancePath or not tagName then
			return { error = "instancePath and tagName required for add" }
		end
		local instance = getInstanceByPath(instancePath)
		if not instance then
			return { error = "Instance not found" }
		end
		CollectionService:AddTag(instance, tagName)
		ChangeHistoryService:SetWaypoint("Add tag: " .. tagName)
		return {
			success = true,
			instancePath = instancePath,
			tagName = tagName
		}
		
	elseif action == "remove" then
		if not instancePath or not tagName then
			return { error = "instancePath and tagName required for remove" }
		end
		local instance = getInstanceByPath(instancePath)
		if not instance then
			return { error = "Instance not found" }
		end
		CollectionService:RemoveTag(instance, tagName)
		ChangeHistoryService:SetWaypoint("Remove tag: " .. tagName)
		return {
			success = true,
			instancePath = instancePath,
			tagName = tagName
		}
		
	elseif action == "find" then
		if not tagName then
			return { error = "tagName required for find" }
		end
		local tagged = CollectionService:GetTagged(tagName)
		local results = {}
		for _, instance in ipairs(tagged) do
			table.insert(results, {
				name = instance.Name,
				className = instance.ClassName,
				path = getInstancePath(instance)
			})
		end
		return {
			tagName = tagName,
			instances = results,
			count = #results
		}
	end
	
	return { error = "Unknown action: " .. tostring(action) }
end


local function updateUIState()
	if pluginState.isActive then
		statusLabel.Text = "Connecting..."
		statusLabel.TextColor3 = Color3.fromRGB(245, 158, 11)
		statusIndicator.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
		statusPulse.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
		statusText.Text = "CONNECTING"
		if pluginState.consecutiveFailures == 0 then
			detailStatusLabel.Text = "HTTP: ...  MCP: ..."
		else
			detailStatusLabel.Text = "HTTP: X  MCP: X"
		end
		detailStatusLabel.TextColor3 = Color3.fromRGB(245, 158, 11)
		connectButton.Text = "Disconnect"
		connectButton.TextColor3 = Color3.fromRGB(255, 255, 255)
		startPulseAnimation()

		-- Reset steps to connecting state
		step1Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
		step1Label.Text = "1. HTTP server reachable (connecting...)"
		step2Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
		step2Label.Text = "2. MCP bridge connected (connecting...)"
		step3Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
		step3Label.Text = "3. Ready for commands (connecting...)"
		pluginState.mcpWaitStartTime = nil
		troubleshootLabel.Visible = false
		
		if not buttonHover then
			connectButton.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
		end
		
		
		urlInput.TextEditable = false
		urlInput.BackgroundColor3 = Color3.fromRGB(55, 65, 81)
		urlInput.BorderColor3 = Color3.fromRGB(75, 85, 99)
	else
		statusLabel.Text = "Disconnected"
		statusLabel.TextColor3 = Color3.fromRGB(239, 68, 68)
		statusIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
		statusPulse.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
		statusText.Text = "OFFLINE"
		detailStatusLabel.Text = "HTTP: X  MCP: X"
		detailStatusLabel.TextColor3 = Color3.fromRGB(239, 68, 68)
		connectButton.Text = "Connect"
		connectButton.TextColor3 = Color3.fromRGB(255, 255, 255)
		stopPulseAnimation()

		-- Reset steps to offline state
		step1Dot.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
		step1Label.Text = "1. HTTP server reachable (offline)"
		step2Dot.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
		step2Label.Text = "2. MCP bridge connected (offline)"
		step3Dot.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
		step3Label.Text = "3. Ready for commands (offline)"
		pluginState.mcpWaitStartTime = nil
		troubleshootLabel.Visible = false
		
		if not buttonHover then
			connectButton.BackgroundColor3 = Color3.fromRGB(16, 185, 129)
		end
		
		
		urlInput.TextEditable = true
		urlInput.BackgroundColor3 = Color3.fromRGB(55, 65, 81)
		urlInput.BorderColor3 = Color3.fromRGB(99, 102, 241)
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

	pcall(function()
		HttpService:RequestAsync({
			Url = pluginState.serverUrl .. "/disconnect",
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json",
			},
			Body = HttpService:JSONEncode({
				timestamp = tick(),
			}),
		})
	end)

	if pluginState.connection then
		pluginState.connection:Disconnect()
		pluginState.connection = nil
	end
	
	pluginState.consecutiveFailures = 0
	pluginState.currentRetryDelay = 0.5
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
