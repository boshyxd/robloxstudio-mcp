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
// Marker for the playtest's start time so backfillFromHistory can filter the
// LogService history to entries produced during this playtest.
let playtestStartedAt = 0;

// LogService.MessageOut connections established in Edit-mode plugin context
// don't reliably fire for playtest server output in current Roblox builds — the
// Studio DataModel swap on entering play orphans pre-play connections, leaving
// `outputBuffer` empty even when the playtest writes plenty of output.
//
// LogService.GetLogHistory(), in contrast, returns the unified output panel
// history including playtest entries. Polling it on every getPlaytestOutput
// call and on stop_playtest backfills anything MessageOut missed, while keeping
// the live MessageOut hookup so non-broken Studio builds still see real-time
// updates without doing the extra work.
function backfillFromHistory(): void {
	const [ok, history] = pcall(() => game.GetService("LogService").GetLogHistory());
	if (!ok) return;
	const seen = new Set<string>();
	for (const entry of outputBuffer) {
		seen.add(`${entry.timestamp}|${entry.message}`);
	}
	for (const entry of history) {
		if (entry.timestamp < playtestStartedAt) continue;
		const message = entry.message;
		if (message === STOP_SIGNAL) continue;
		if (message.sub(1, NAV_SIGNAL.size()) === NAV_SIGNAL) continue;
		if (message.sub(1, NAV_RESULT.size() + 1) === `${NAV_RESULT}:`) continue;
		const key = `${entry.timestamp}|${message}`;
		if (seen.has(key)) continue;
		seen.add(key);
		outputBuffer.push({
			message,
			messageType: tostring(entry.messageType),
			timestamp: entry.timestamp,
		});
	}
	outputBuffer.sort((a, b) => a.timestamp < b.timestamp);
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

	logConnection = LogService.MessageOut.Connect((message, messageType) => {
		if (message === STOP_SIGNAL) return;
		if (message.sub(1, NAV_SIGNAL.size()) === NAV_SIGNAL) return;
		if (message.sub(1, NAV_RESULT.size() + 1) === `${NAV_RESULT}:`) {
			if (navResultCallback) {
				navResultCallback(message.sub(NAV_RESULT.size() + 2));
			}
			return;
		}
		outputBuffer.push({
			message,
			messageType: messageType.Name,
			timestamp: tick(),
		});
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
		// Final backfill so stop_playtest and any post-play getPlaytestOutput call
		// see the full playtest log even if the live MessageOut hookup didn't fire.
		backfillFromHistory();
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
		// Snapshot LogService history before signalling stop so the response
		// already contains the playtest output even if the spawned task hasn't
		// returned from ExecutePlayModeAsync yet.
		backfillFromHistory();
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
	// Pull the latest LogService history into outputBuffer on every poll —
	// MessageOut alone is unreliable across Studio's Edit↔Play DataModel swap.
	if (testRunning) {
		backfillFromHistory();
	}
	return {
		isRunning: testRunning,
		output: [...outputBuffer],
		outputCount: outputBuffer.size(),
		testResult: testResult !== undefined ? tostring(testResult) : undefined,
		testError,
	};
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
	getPlaytestOutput,
	characterNavigation,
};
