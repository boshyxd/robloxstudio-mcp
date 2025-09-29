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
screenGui.Title = "MCP Server v1.5.1"

local mainFrame = Instance.new("Frame")
mainFrame.Size = UDim2.new(1, 0, 1, 0)
mainFrame.BackgroundColor3 = Color3.fromRGB(17, 24, 39)
mainFrame.BorderSizePixel = 0
mainFrame.Parent = screenGui

local scrollFrame = Instance.new("ScrollingFrame")
scrollFrame.Size = UDim2.new(1, -20, 1, -80)
scrollFrame.Position = UDim2.new(0, 10, 0, 10)
scrollFrame.BackgroundTransparency = 1
scrollFrame.BorderSizePixel = 0
scrollFrame.CanvasSize = UDim2.new(0, 0, 0, 600)
scrollFrame.ScrollBarThickness = 8
scrollFrame.Parent = mainFrame

local function createLabel(text, position, size, parent)
	local label = Instance.new("TextLabel")
	label.Text = text
	label.Position = position
	label.Size = size
	label.BackgroundTransparency = 1
	label.TextColor3 = Color3.fromRGB(209, 213, 219)
	label.Font = Enum.Font.Code
	label.TextSize = 14
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.Parent = parent
	return label
end

local function createButton(text, position, size, parent)
	local button = Instance.new("TextButton")
	button.Text = text
	button.Position = position
	button.Size = size
	button.BackgroundColor3 = Color3.fromRGB(59, 130, 246)
	button.TextColor3 = Color3.fromRGB(255, 255, 255)
	button.BorderSizePixel = 0
	button.Font = Enum.Font.Code
	button.TextSize = 14
	button.Parent = parent
	return button
end

local statusLabel = createLabel("Estado: Desconectado", UDim2.new(0, 10, 0, 10), UDim2.new(1, -20, 0, 20), scrollFrame)
local serverLabel = createLabel("Servidor: " .. pluginState.serverUrl, UDim2.new(0, 10, 0, 40), UDim2.new(1, -20, 0, 20), scrollFrame)
local mcpLabel = createLabel("MCP: " .. pluginState.mcpServerUrl, UDim2.new(0, 10, 0, 70), UDim2.new(1, -20, 0, 20), scrollFrame)
local connectButton = createButton("Conectar a MCP", UDim2.new(0, 10, 0, 100), UDim2.new(1, -20, 0, 30), scrollFrame)
local responseLabel = createLabel("Respuesta: Ninguna", UDim2.new(0, 10, 0, 140), UDim2.new(1, -20, 0, 400), scrollFrame)
responseLabel.TextWrapped = true
responseLabel.TextYAlignment = Enum.TextYAlignment.Top

local function updateUIState()
	if pluginState.isActive then
		statusLabel.Text = "Estado: Conectado"
		connectButton.Text = "Desconectar MCP"
		connectButton.BackgroundColor3 = Color3.fromRGB(220, 38, 38)
	else
		statusLabel.Text = "Estado: Desconectado"
		connectButton.Text = "Conectar a MCP"
		connectButton.BackgroundColor3 = Color3.fromRGB(59, 130, 246)
	end
end

-- Función para probar la conexión MCP
local function testMCPConnection(url)
	local success, result = pcall(function()
		return HttpService:RequestAsync({
			Url = url .. "/status",
			Method = "GET",
			Headers = {
				["Content-Type"] = "application/json",
			},
		})
	end)
	
	if success and result.Success then
		statusLabel.Text = "Estado: Conexión exitosa"
		return true
	else
		statusLabel.Text = "Estado: Error de conexión - " .. (result and result.StatusMessage or "Sin respuesta")
		return false
	end
end

local function pollForRequests()
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
		local data = HttpService:JSONDecode(result.Body)
		responseLabel.Text = "Respuesta: " .. result.Body
		if data.hasRequests then
			local requestSuccess, requestResult = pcall(function()
				return HttpService:RequestAsync({
					Url = pluginState.serverUrl .. "/request",
					Method = "POST",
					Headers = {
						["Content-Type"] = "application/json",
					},
					Body = HttpService:JSONEncode({
						timestamp = tick(),
					}),
				})
			end)
			if requestSuccess and requestResult.Success then
				local requestData = HttpService:JSONDecode(requestResult.Body)
				responseLabel.Text = "Solicitud: " .. requestResult.Body
			end
		end
	else
		pluginState.consecutiveFailures = pluginState.consecutiveFailures + 1
		if pluginState.consecutiveFailures > pluginState.maxFailuresBeforeError then
			responseLabel.Text = "Error: Demasiados fallos consecutivos (" .. pluginState.consecutiveFailures .. ")"
			pluginState.currentRetryDelay = math.min(
				pluginState.currentRetryDelay * pluginState.retryBackoffMultiplier,
				pluginState.maxRetryDelay
			)
		else
			local errorMessage = result and result.StatusMessage or "Error de conexión"
			responseLabel.Text = "Error: " .. errorMessage
		end
	end
end

local function activatePlugin()
	pluginState.isActive = true
	updateUIState()
	pcall(function()
		HttpService:RequestAsync({
			Url = pluginState.serverUrl .. "/connect",
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json",
			},
			Body = HttpService:JSONEncode({
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
		-- Probar conexión antes de activar
		if testMCPConnection(pluginState.mcpServerUrl) then
			activatePlugin()
		else
			responseLabel.Text = "Error: No se pudo conectar al servidor MCP. Verifique que el servidor esté ejecutándose."
		end
	end
end)

button.Click:Connect(function()
	screenGui.Enabled = not screenGui.Enabled
end)

plugin.Unloading:Connect(function()
	deactivatePlugin()
end)

updateUIState()
