import { Connection } from "../types";

interface SavedPort {
	port: number;
	serverUrl: string;
	wasActive: boolean;
}

interface SettingsData {
	autoConnectOnLoad: boolean;
	savedPorts: SavedPort[];
}

const SETTINGS_KEY = "MCPPluginSettings_v1";

function defaults(): SettingsData {
	return { autoConnectOnLoad: false, savedPorts: [] };
}

let pluginRef: Plugin | undefined;
let cached: SettingsData = defaults();

function sanitize(raw: unknown): SettingsData {
	const data = defaults();
	if (!raw || !typeIs(raw, "table")) return data;
	const tbl = raw as { autoConnectOnLoad?: unknown; savedPorts?: unknown };

	if (tbl.autoConnectOnLoad === true) data.autoConnectOnLoad = true;

	if (typeIs(tbl.savedPorts, "table")) {
		const arr = tbl.savedPorts as unknown[];
		for (const entry of arr) {
			if (!entry || !typeIs(entry, "table")) continue;
			const p = entry as { port?: unknown; serverUrl?: unknown; wasActive?: unknown };
			if (!typeIs(p.port, "number")) continue;
			if (!typeIs(p.serverUrl, "string")) continue;
			data.savedPorts.push({
				port: p.port,
				serverUrl: p.serverUrl,
				wasActive: p.wasActive === true,
			});
		}
	}
	return data;
}

function persist(): void {
	if (!pluginRef) return;
	const p = pluginRef;
	pcall(() => p.SetSetting(SETTINGS_KEY, cached as unknown as object));
}

function init(p: Plugin): void {
	pluginRef = p;
	const [ok, raw] = pcall(() => p.GetSetting(SETTINGS_KEY));
	cached = ok ? sanitize(raw) : defaults();
}

function getAutoConnect(): boolean {
	return cached.autoConnectOnLoad;
}

function setAutoConnect(value: boolean): void {
	cached.autoConnectOnLoad = value;
	persist();
}

function getSavedPorts(): SavedPort[] {
	return cached.savedPorts;
}

function syncFromConnections(connections: readonly Connection[]): void {
	const ports: SavedPort[] = [];
	for (const c of connections) {
		ports.push({ port: c.port, serverUrl: c.serverUrl, wasActive: c.isActive });
	}
	cached.savedPorts = ports;
	persist();
}

export = {
	init,
	getAutoConnect,
	setAutoConnect,
	getSavedPorts,
	syncFromConnections,
};
