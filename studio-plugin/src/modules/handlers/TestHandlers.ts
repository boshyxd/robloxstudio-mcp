import { HttpService, LogService } from "@rbxts/services";

const StudioTestService = game.GetService("StudioTestService");
const ServerScriptService = game.GetService("ServerScriptService");
const ScriptEditorService = game.GetService("ScriptEditorService");

const STOP_SIGNAL = "__MCP_STOP__";
const NAV_SIGNAL = "__MCP_NAV__";
const NAV_RESULT = "__MCP_NAV_RESULT__";

interface OutputEntry {
	message: string;
	messageType: string;
	timestamp: number;
}

let testRunning = false;
let outputBuffer: OutputEntry[] = [];
let logConnection: RBXScriptConnection | undefined;
let testResult: unknown;
let testError: string | undefined;
let stopListenerScript: Script | undefined;
let navResultCallback: ((json: string) => void) | undefined;
let playtestStartedAt = 0;

// MessageOut from the Edit-mode plugin context does not see playtest server
// output after the Studio DataModel swap, so we rebuild outputBuffer from
// LogService.GetLogHistory() on every poll. History is the single source of
// truth; the live MessageOut connection is kept only to route NAV results.
function rebuildOutputFromHistory(): void {
	const [ok, history] = pcall(() => game.GetService("LogService").GetLogHistory());
	if (!ok) return;
	const entries: OutputEntry[] = [];
	for (const entry of history) {
		if (entry.timestamp < playtestStartedAt) continue;
		const message = entry.message;
		if (message === STOP_SIGNAL) continue;
		if (message.sub(1, NAV_SIGNAL.size()) === NAV_SIGNAL) continue;
		if (message.sub(1, NAV_RESULT.size() + 1) === `${NAV_RESULT}:`) continue;
		entries.push({
			message,
			messageType: tostring(entry.messageType),
			timestamp: entry.timestamp,
		});
	}
	outputBuffer = entries;
}

function buildCommandListenerSource(): string {
	return `local LogService = game:GetService("LogService")
local StudioTestService = game:GetService("StudioTestService")
local PathfindingService = game:GetService("PathfindingService")
local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local NAV_SIG = "${NAV_SIGNAL}"
local NAV_RES = "${NAV_RESULT}"
LogService.MessageOut:Connect(function(msg)
	if msg == "${STOP_SIGNAL}" then
		pcall(function() StudioTestService:EndTest("stopped_by_mcp") end)
	elseif string.sub(msg, 1, #NAV_SIG + 1) == NAV_SIG .. ":" then
		local json = string.sub(msg, #NAV_SIG + 2)
		task.spawn(function()
			local ok, d = pcall(function() return HttpService:JSONDecode(json) end)
			if not ok or not d then
				print(NAV_RES .. ':{"success":false,"error":"parse_error"}')
				return
			end
			local ps = Players:GetPlayers()
			if #ps == 0 then
				print(NAV_RES .. ':{"success":false,"error":"no_players"}')
				return
			end
			local char = ps[1].Character or ps[1].CharacterAdded:Wait()
			local hum = char:FindFirstChildOfClass("Humanoid")
			local root = char:FindFirstChild("HumanoidRootPart")
			if not hum or not root then
				print(NAV_RES .. ':{"success":false,"error":"no_humanoid"}')
				return
			end
			local target
			if d.instancePath then
				local parts = string.split(d.instancePath, ".")
				local cur = game
				for i = 2, #parts do
					cur = cur:FindFirstChild(parts[i])
					if not cur then
						print(NAV_RES .. ':{"success":false,"error":"instance_not_found"}')
						return
					end
				end
				if cur:IsA("BasePart") then target = cur.Position
				elseif cur:IsA("Model") and cur.PrimaryPart then target = cur.PrimaryPart.Position
				else target = cur:GetPivot().Position end
			else
				target = Vector3.new(d.x or 0, d.y or 0, d.z or 0)
			end
			local path = PathfindingService:CreatePath({AgentRadius=2,AgentHeight=5,AgentCanJump=true})
			local pok = pcall(function() path:ComputeAsync(root.Position, target) end)
			local method = "direct"
			if pok and path.Status == Enum.PathStatus.Success then
				method = "pathfinding"
				for _, wp in ipairs(path:GetWaypoints()) do
					hum:MoveTo(wp.Position)
					if wp.Action == Enum.PathWaypointAction.Jump then hum.Jump = true end
					hum.MoveToFinished:Wait()
				end
			else
				hum:MoveTo(target)
				hum.MoveToFinished:Wait()
			end
			local fp = root.Position
			print(NAV_RES .. ':{"success":true,"method":"' .. method .. '","position":[' .. fp.X .. ',' .. fp.Y .. ',' .. fp.Z .. ']}')
		end)
	end
end)`;
}

function injectStopListener() {
	const listener = new Instance("Script");
	listener.Name = "__MCP_CommandListener";
	listener.Parent = ServerScriptService;

	const source = buildCommandListenerSource();
	const [seOk] = pcall(() => {
		ScriptEditorService.UpdateSourceAsync(listener, () => source);
	});
	if (!seOk) {
		(listener as unknown as { Source: string }).Source = source;
	}

	stopListenerScript = listener;
}

function cleanupStopListener() {
	if (stopListenerScript) {
		pcall(() => stopListenerScript!.Destroy());
		stopListenerScript = undefined;
	}
}

function startPlaytest(requestData: Record<string, unknown>) {
	const mode = requestData.mode as string | undefined;
	const numPlayers = requestData.numPlayers as number | undefined;

	if (mode !== "play" && mode !== "run") {
		return { error: 'mode must be "play" or "run"' };
	}

	if (testRunning) {
		return { error: "A test is already running" };
	}

	testRunning = true;
	outputBuffer = [];
	testResult = undefined;
	testError = undefined;
	playtestStartedAt = tick();

	cleanupStopListener();

	logConnection = LogService.MessageOut.Connect((message) => {
		if (message.sub(1, NAV_RESULT.size() + 1) === `${NAV_RESULT}:` && navResultCallback) {
			navResultCallback(message.sub(NAV_RESULT.size() + 2));
		}
	});

	const [injected, injErr] = pcall(() => injectStopListener());
	if (!injected) {
		warn(`[MCP] Failed to inject stop listener: ${injErr}`);
	}

	if (numPlayers !== undefined && mode === "run") {
		const TestService = game.GetService("TestService") as TestService & { NumberOfPlayers: number };
		TestService.NumberOfPlayers = math.clamp(numPlayers, 1, 8);
	}

	task.spawn(() => {
		const [ok, result] = pcall(() => {
			if (mode === "play") {
				return StudioTestService.ExecutePlayModeAsync({});
			}
			return StudioTestService.ExecuteRunModeAsync({});
		});

		if (ok) {
			testResult = result;
		} else {
			testError = tostring(result);
		}

		if (logConnection) {
			logConnection.Disconnect();
			logConnection = undefined;
		}
		rebuildOutputFromHistory();
		testRunning = false;

		cleanupStopListener();
	});

	const msg = numPlayers !== undefined
		? `Playtest started in ${mode} mode with ${numPlayers} player(s)`
		: `Playtest started in ${mode} mode`;
	return { success: true, message: msg };
}

function stopPlaytest(_requestData: Record<string, unknown>) {
	if (testRunning) {
		rebuildOutputFromHistory();
		warn(STOP_SIGNAL);
		return {
			success: true,
			output: [...outputBuffer],
			outputCount: outputBuffer.size(),
			message: "Playtest stop signal sent.",
		};
	}

	const endTest = StudioTestService as unknown as Instance & { EndTest(reason: string): void };
	const [endOk] = pcall(() => {
		endTest.EndTest("stopped_by_mcp");
	});
	if (endOk) {
		return {
			success: true,
			output: [],
			outputCount: 0,
			message: "Playtest stopped via StudioTestService.",
		};
	}

	return { error: "No MCP-started test is running and direct stop failed. The playtest may have been started manually." };
}

function getPlaytestOutput(_requestData: Record<string, unknown>) {
	if (testRunning) {
		rebuildOutputFromHistory();
	}
	return {
		isRunning: testRunning,
		output: [...outputBuffer],
		outputCount: outputBuffer.size(),
		testResult: testResult !== undefined ? tostring(testResult) : undefined,
		testError,
	};
}

// Must be called on the playtest server role; EndTest errors in Edit context.
function endTest(_requestData: Record<string, unknown>) {
	const target = StudioTestService as unknown as Instance & { EndTest(reason: string): void };
	const [ok, err] = pcall(() => target.EndTest("stopped_by_mcp"));
	if (ok) return { success: true };
	return { error: tostring(err) };
}

function characterNavigation(requestData: Record<string, unknown>) {
	if (!testRunning) {
		return { error: "Playtest must be running. Start a playtest in 'play' mode first." };
	}

	const position = requestData.position as number[] | undefined;
	const instancePath = requestData.instancePath as string | undefined;
	const waitForCompletion = (requestData.waitForCompletion as boolean) ?? true;
	const timeout = (requestData.timeout as number) ?? 25;

	if (!position && !instancePath) {
		return { error: "Either position [x, y, z] or instancePath is required" };
	}

	let navData: string;
	if (position) {
		navData = HttpService.JSONEncode({ x: position[0], y: position[1], z: position[2] });
	} else {
		navData = HttpService.JSONEncode({ instancePath });
	}

	warn(`${NAV_SIGNAL}:${navData}`);

	if (!waitForCompletion) {
		return { success: true, message: "Navigation command sent" };
	}

	let result: string | undefined;
	navResultCallback = (json: string) => {
		result = json;
	};

	const startTime = tick();
	while (!result && tick() - startTime < timeout) {
		task.wait(0.2);
	}
	navResultCallback = undefined;

	if (result) {
		const [ok, parsed] = pcall(() => HttpService.JSONDecode(result!));
		if (ok) return parsed;
		return { success: true, rawResult: result };
	}
	return { error: `Navigation timed out after ${timeout} seconds` };
}

export = {
	startPlaytest,
	stopPlaytest,
	endTest,
	getPlaytestOutput,
	characterNavigation,
};
