import { HttpService, RunService } from "@rbxts/services";
import State from "./State";
import Utils from "./Utils";
import UI from "./UI";
import Settings from "./Settings";
import QueryHandlers from "./handlers/QueryHandlers";
import PropertyHandlers from "./handlers/PropertyHandlers";
import InstanceHandlers from "./handlers/InstanceHandlers";
import ScriptHandlers from "./handlers/ScriptHandlers";
import MetadataHandlers from "./handlers/MetadataHandlers";
import TestHandlers from "./handlers/TestHandlers";
import BuildHandlers from "./handlers/BuildHandlers";
import AssetHandlers from "./handlers/AssetHandlers";
import CaptureHandlers from "./handlers/CaptureHandlers";
import InputHandlers from "./handlers/InputHandlers";
import { Connection, RequestPayload, PollResponse, ReadyResponse } from "../types";

const instanceId = HttpService.GenerateGUID(false);
let assignedRole: string | undefined;

function detectRole(): string {
	if (!RunService.IsRunMode()) return "edit";
	if (RunService.IsServer()) return "server";
	return "client";
}

type Handler = (data: Record<string, unknown>) => unknown;

const routeMap: Record<string, Handler> = {

	"/api/file-tree": QueryHandlers.getFileTree,
	"/api/search-files": QueryHandlers.searchFiles,
	"/api/place-info": QueryHandlers.getPlaceInfo,
	"/api/services": QueryHandlers.getServices,
	"/api/search-objects": QueryHandlers.searchObjects,
	"/api/instance-properties": QueryHandlers.getInstanceProperties,
	"/api/instance-children": QueryHandlers.getInstanceChildren,
	"/api/search-by-property": QueryHandlers.searchByProperty,
	"/api/class-info": QueryHandlers.getClassInfo,
	"/api/project-structure": QueryHandlers.getProjectStructure,
	"/api/grep-scripts": QueryHandlers.grepScripts,
	"/api/get-descendants": QueryHandlers.getDescendants,
	"/api/compare-instances": QueryHandlers.compareInstances,
	"/api/get-output-log": QueryHandlers.getOutputLog,

	"/api/set-property": PropertyHandlers.setProperty,
	"/api/set-properties": PropertyHandlers.setProperties,
	"/api/mass-set-property": PropertyHandlers.massSetProperty,
	"/api/mass-get-property": PropertyHandlers.massGetProperty,
	"/api/create-object": InstanceHandlers.createObject,
	"/api/create-ui-tree": InstanceHandlers.createUITree,
	"/api/mass-create-objects": InstanceHandlers.massCreateObjects,
	"/api/delete-object": InstanceHandlers.deleteObject,
	"/api/smart-duplicate": InstanceHandlers.smartDuplicate,
	"/api/mass-duplicate": InstanceHandlers.massDuplicate,
	"/api/clone-object": InstanceHandlers.cloneObject,
	"/api/move-object": InstanceHandlers.moveObject,

	"/api/get-script-source": ScriptHandlers.getScriptSource,
	"/api/set-script-source": ScriptHandlers.setScriptSource,
	"/api/edit-script-lines": ScriptHandlers.editScriptLines,
	"/api/insert-script-lines": ScriptHandlers.insertScriptLines,
	"/api/delete-script-lines": ScriptHandlers.deleteScriptLines,

	"/api/get-attribute": MetadataHandlers.getAttribute,
	"/api/set-attribute": MetadataHandlers.setAttribute,
	"/api/get-attributes": MetadataHandlers.getAttributes,
	"/api/delete-attribute": MetadataHandlers.deleteAttribute,
	"/api/get-tags": MetadataHandlers.getTags,
	"/api/add-tag": MetadataHandlers.addTag,
	"/api/remove-tag": MetadataHandlers.removeTag,
	"/api/get-tagged": MetadataHandlers.getTagged,
	"/api/get-selection": MetadataHandlers.getSelection,
	"/api/execute-luau": MetadataHandlers.executeLuau,
	"/api/undo": MetadataHandlers.undo,
	"/api/redo": MetadataHandlers.redo,
	"/api/bulk-set-attributes": MetadataHandlers.bulkSetAttributes,

	"/api/start-playtest": TestHandlers.startPlaytest,
	"/api/stop-playtest": TestHandlers.stopPlaytest,
	"/api/get-playtest-output": TestHandlers.getPlaytestOutput,
	"/api/character-navigation": TestHandlers.characterNavigation,

	"/api/export-build": BuildHandlers.exportBuild,
	"/api/import-build": BuildHandlers.importBuild,
	"/api/import-scene": BuildHandlers.importScene,
	"/api/search-materials": BuildHandlers.searchMaterials,

	"/api/insert-asset": AssetHandlers.insertAsset,
	"/api/preview-asset": AssetHandlers.previewAsset,

	"/api/capture-screenshot": CaptureHandlers.captureScreenshot,
	"/api/simulate-mouse-input": InputHandlers.simulateMouseInput,
	"/api/simulate-keyboard-input": InputHandlers.simulateKeyboardInput,

	"/api/find-and-replace-in-scripts": ScriptHandlers.findAndReplaceInScripts,
	"/api/get-script-analysis": ScriptHandlers.getScriptAnalysis,
};

function processRequest(request: RequestPayload): unknown {
	const endpoint = request.endpoint;
	const data = request.data ?? {};

	const handler = routeMap[endpoint];
	if (handler) {
		return handler(data as Record<string, unknown>);
	} else {
		return { error: `Unknown endpoint: ${endpoint}` };
	}
}

function sendResponse(conn: Connection, requestId: string, responseData: unknown) {
	pcall(() => {
		HttpService.RequestAsync({
			Url: `${conn.serverUrl}/response`,
			Method: "POST",
			Headers: { "Content-Type": "application/json" },
			Body: HttpService.JSONEncode({ requestId, response: responseData }),
		});
	});
}

function getConnectionStatus(connIndex: number): string {
	const conn = State.getConnection(connIndex);
	if (!conn || !conn.isActive) return "disconnected";
	if (conn.consecutiveFailures >= conn.maxFailuresBeforeError) return "error";
	if (conn.lastHttpOk) return "connected";
	return "connecting";
}

function pollForRequests(connIndex: number) {
	const conn = State.getConnection(connIndex);
	if (!conn || !conn.isActive) return;
	if (conn.isPolling) return;

	conn.isPolling = true;

	const [success, result] = pcall(() => {
		return HttpService.RequestAsync({
			Url: `${conn.serverUrl}/poll?instanceId=${instanceId}`,
			Method: "GET",
			Headers: { "Content-Type": "application/json" },
		});
	});

	conn.isPolling = false;

	const ui = UI.getElements();
	UI.updateTabDot(connIndex);

	if (success && (result.Success || result.StatusCode === 503)) {
		conn.consecutiveFailures = 0;
		conn.currentRetryDelay = 0.5;
		conn.lastSuccessfulConnection = tick();

		const data = HttpService.JSONDecode(result.Body) as PollResponse;
		const mcpConnected = data.mcpConnected === true;
		conn.lastHttpOk = true;
		conn.lastMcpOk = mcpConnected;

		if (connIndex === State.getActiveTabIndex()) {
			const el = ui;
			el.step1Dot.BackgroundColor3 = Color3.fromRGB(34, 197, 94);
			el.step1Label.Text = "HTTP server (OK)";

			if (mcpConnected && !el.statusLabel.Text.find("Connected")[0]) {
				el.statusLabel.Text = "Connected";
				el.statusLabel.TextColor3 = Color3.fromRGB(34, 197, 94);
				el.statusIndicator.BackgroundColor3 = Color3.fromRGB(34, 197, 94);
				el.statusPulse.BackgroundColor3 = Color3.fromRGB(34, 197, 94);
				el.statusText.Text = "ONLINE";
				el.detailStatusLabel.Text = "HTTP: OK  MCP: OK";
				el.detailStatusLabel.TextColor3 = Color3.fromRGB(34, 197, 94);
				el.step2Dot.BackgroundColor3 = Color3.fromRGB(34, 197, 94);
				el.step2Label.Text = "MCP bridge (OK)";
				el.step3Dot.BackgroundColor3 = Color3.fromRGB(34, 197, 94);
				el.step3Label.Text = "Commands (OK)";
				conn.mcpWaitStartTime = undefined;
				el.troubleshootLabel.Visible = false;
				UI.stopPulseAnimation();
			} else if (!mcpConnected) {
				el.statusLabel.Text = "Waiting for MCP server";
				el.statusLabel.TextColor3 = Color3.fromRGB(245, 158, 11);
				el.statusIndicator.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
				el.statusPulse.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
				el.statusText.Text = "WAITING";
				el.detailStatusLabel.Text = "HTTP: OK  MCP: ...";
				el.detailStatusLabel.TextColor3 = Color3.fromRGB(245, 158, 11);
				el.step2Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
				el.step2Label.Text = "MCP bridge (waiting...)";
				el.step3Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
				el.step3Label.Text = "Commands (waiting...)";
				if (conn.mcpWaitStartTime === undefined) {
					conn.mcpWaitStartTime = tick();
				}
				const elapsed = tick() - (conn.mcpWaitStartTime ?? tick());
				el.troubleshootLabel.Visible = elapsed > 8;
				UI.startPulseAnimation();
			}
		}

		if (data.request && mcpConnected) {
			task.spawn(() => {
				const [ok, response] = pcall(() => processRequest(data.request!));
				if (ok) {
					sendResponse(conn, data.requestId!, response);
				} else {
					sendResponse(conn, data.requestId!, { error: tostring(response) });
				}
			});
		}
	} else if (conn.isActive) {
		conn.consecutiveFailures++;

		if (conn.consecutiveFailures > 1) {
			conn.currentRetryDelay = math.min(
				conn.currentRetryDelay * conn.retryBackoffMultiplier,
				conn.maxRetryDelay,
			);
		}


		if (connIndex === State.getActiveTabIndex()) {
			const el = ui;
			if (conn.consecutiveFailures >= conn.maxFailuresBeforeError) {
				el.statusLabel.Text = "Server unavailable";
				el.statusLabel.TextColor3 = Color3.fromRGB(239, 68, 68);
				el.statusIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68);
				el.statusPulse.BackgroundColor3 = Color3.fromRGB(239, 68, 68);
				el.statusText.Text = "ERROR";
				el.detailStatusLabel.Text = "HTTP: X  MCP: X";
				el.detailStatusLabel.TextColor3 = Color3.fromRGB(239, 68, 68);
				el.step1Dot.BackgroundColor3 = Color3.fromRGB(239, 68, 68);
				el.step1Label.Text = "HTTP server (error)";
				el.step2Dot.BackgroundColor3 = Color3.fromRGB(239, 68, 68);
				el.step2Label.Text = "MCP bridge (error)";
				el.step3Dot.BackgroundColor3 = Color3.fromRGB(239, 68, 68);
				el.step3Label.Text = "Commands (error)";
				conn.mcpWaitStartTime = undefined;
				el.troubleshootLabel.Visible = false;
				UI.stopPulseAnimation();
			} else if (conn.consecutiveFailures > 5) {
				const waitTime = math.ceil(conn.currentRetryDelay);
				el.statusLabel.Text = `Retrying (${waitTime}s)`;
				el.statusLabel.TextColor3 = Color3.fromRGB(245, 158, 11);
				el.statusIndicator.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
				el.statusPulse.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
				el.statusText.Text = "RETRY";
				el.detailStatusLabel.Text = "HTTP: ...  MCP: ...";
				el.detailStatusLabel.TextColor3 = Color3.fromRGB(245, 158, 11);
				el.step1Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
				el.step1Label.Text = "HTTP server (retrying...)";
				el.step2Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
				el.step2Label.Text = "MCP bridge (retrying...)";
				el.step3Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
				el.step3Label.Text = "Commands (retrying...)";
				conn.mcpWaitStartTime = undefined;
				el.troubleshootLabel.Visible = false;
				UI.startPulseAnimation();
			} else if (conn.consecutiveFailures > 1) {
				el.statusLabel.Text = `Connecting (attempt ${conn.consecutiveFailures})`;
				el.statusLabel.TextColor3 = Color3.fromRGB(245, 158, 11);
				el.statusIndicator.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
				el.statusPulse.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
				el.statusText.Text = "CONNECTING";
				el.detailStatusLabel.Text = "HTTP: ...  MCP: ...";
				el.detailStatusLabel.TextColor3 = Color3.fromRGB(245, 158, 11);
				el.step1Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
				el.step1Label.Text = "HTTP server (connecting...)";
				el.step2Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
				el.step2Label.Text = "MCP bridge (connecting...)";
				el.step3Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
				el.step3Label.Text = "Commands (connecting...)";
				conn.mcpWaitStartTime = undefined;
				el.troubleshootLabel.Visible = false;
				UI.startPulseAnimation();
			}
		}
	}
}


function activatePlugin(connIndex?: number) {
	const idx = connIndex ?? State.getActiveTabIndex();
	const conn = State.getConnection(idx);
	if (!conn) return;

	const ui = UI.getElements();

	conn.isActive = true;
	conn.consecutiveFailures = 0;
	conn.currentRetryDelay = 0.5;
	ui.screenGui.Enabled = true;

	if (idx === State.getActiveTabIndex()) {
		conn.serverUrl = ui.urlInput.Text;
		const [portStr] = conn.serverUrl.match(":(%d+)$");
		if (portStr) conn.port = tonumber(portStr) ?? conn.port;
		UI.updateTabLabel(idx);
		UI.updateUIState();
	}
	UI.updateTabDot(idx);
	Settings.syncFromConnections(State.getConnections());

	task.spawn(() => {
		if (!conn.heartbeatConnection) {
			conn.heartbeatConnection = RunService.Heartbeat.Connect(() => {
				const now = tick();
				const currentInterval = conn.consecutiveFailures > 5 ? conn.currentRetryDelay : conn.pollInterval;
				if (now - conn.lastPoll > currentInterval) {
					conn.lastPoll = now;
					pollForRequests(idx);
				}
			});
		}

		const [readyOk, readyResult] = pcall(() => {
			return HttpService.RequestAsync({
				Url: `${conn.serverUrl}/ready`,
				Method: "POST",
				Headers: { "Content-Type": "application/json" },
				Body: HttpService.JSONEncode({ instanceId, role: detectRole(), pluginReady: true, timestamp: tick() }),
			});
		});
		if (readyOk && readyResult.Success) {
			const [parseOk, readyData] = pcall(() => HttpService.JSONDecode(readyResult.Body) as ReadyResponse);
			if (parseOk && readyData.assignedRole) {
				assignedRole = readyData.assignedRole;
			}
		}
	});
}

function deactivatePlugin(connIndex?: number, skipPersist?: boolean) {
	const idx = connIndex ?? State.getActiveTabIndex();
	const conn = State.getConnection(idx);
	if (!conn) return;

	conn.isActive = false;
	conn.lastMcpOk = false;

	if (idx === State.getActiveTabIndex()) UI.updateUIState();
	UI.updateTabDot(idx);
	if (!skipPersist) Settings.syncFromConnections(State.getConnections());

	pcall(() => {
		HttpService.RequestAsync({
			Url: `${conn.serverUrl}/disconnect`,
			Method: "POST",
			Headers: { "Content-Type": "application/json" },
			Body: HttpService.JSONEncode({ instanceId, timestamp: tick() }),
		});
	});

	if (conn.heartbeatConnection) {
		conn.heartbeatConnection.Disconnect();
		conn.heartbeatConnection = undefined;
	}

	conn.consecutiveFailures = 0;
	conn.currentRetryDelay = 0.5;
}

function deactivateAll() {
	for (let i = 0; i < State.getConnections().size(); i++) {
		if (State.getConnections()[i].isActive) {
			deactivatePlugin(i, true);
		}
	}
}

function checkForUpdates() {
	task.spawn(() => {
		const [success, result] = pcall(() => {
			return HttpService.RequestAsync({
				Url: "https://registry.npmjs.org/robloxstudio-mcp/latest",
				Method: "GET",
				Headers: { Accept: "application/json" },
			});
		});

		if (success && result.Success) {
			const [ok, data] = pcall(() => HttpService.JSONDecode(result.Body) as { version?: string });
			if (ok && data?.version) {
				const latestVersion = data.version;
				if (Utils.compareVersions(State.CURRENT_VERSION, latestVersion) < 0) {
					const ui = UI.getElements();
					ui.updateBannerText.Text = `v${latestVersion} available - github.com/boshyxd/robloxstudio-mcp`;
					ui.updateBanner.Visible = true;
					UI.layoutContentArea(true);
				}
			}
		}
	});
}

function autoConnectOnStartup() {
	if (RunService.IsRunMode()) return;
	if (!Settings.getAutoConnect()) return;
	const saved = Settings.getSavedPorts();
	const connections = State.getConnections();
	for (let i = 0; i < connections.size(); i++) {
		const entry = saved[i];
		if (entry && entry.wasActive) {
			activatePlugin(i);
		}
	}
}

export = {
	getConnectionStatus,
	activatePlugin,
	deactivatePlugin,
	deactivateAll,
	checkForUpdates,
	autoConnectOnStartup,
};
