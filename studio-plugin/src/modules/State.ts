import { Connection } from "../types";

const CURRENT_VERSION = "__VERSION__";
const MAX_CONNECTIONS = 5;
const BASE_PORT = 58741;
let activeTabIndex = 0;

function createConnection(port: number): Connection {
	return {
		port,
		serverUrl: `http://localhost:${port}`,
		isActive: false,
		pollInterval: 0.5,
		lastPoll: 0,
		consecutiveFailures: 0,
		maxFailuresBeforeError: 50,
		lastSuccessfulConnection: 0,
		currentRetryDelay: 0.5,
		maxRetryDelay: 5,
		retryBackoffMultiplier: 1.2,
		lastHttpOk: false,
		lastMcpOk: false,
		mcpWaitStartTime: undefined,
		isPolling: false,
		heartbeatConnection: undefined,
	};
}

const connections: Connection[] = [createConnection(BASE_PORT)];

function addConnection(port?: number): number | undefined {
	if (connections.size() >= MAX_CONNECTIONS) {
		return undefined;
	}
	if (port === undefined) {
		let maxPort = BASE_PORT - 1;
		for (const conn of connections) {
			if (conn.port > maxPort) maxPort = conn.port;
		}
		port = maxPort + 1;
	}
	const conn = createConnection(port);
	connections.push(conn);
	return connections.size() - 1;
}

function removeConnection(index: number): boolean {
	if (connections.size() <= 1) return false;
	if (index < 0 || index >= connections.size()) return false;
	if (connections[index].isActive) return false;

	connections.remove(index);

	if (activeTabIndex >= connections.size()) {
		activeTabIndex = connections.size() - 1;
	} else if (activeTabIndex > index) {
		activeTabIndex -= 1;
	}
	return true;
}

function getActiveConnection(): Connection {
	return connections[activeTabIndex];
}

function getConnection(index: number): Connection | undefined {
	return connections[index];
}

function getActiveTabIndex(): number {
	return activeTabIndex;
}

function setActiveTabIndex(index: number): void {
	activeTabIndex = index;
}

function getConnections(): Connection[] {
	return connections;
}

function loadConnections(list: ReadonlyArray<{ port: number; serverUrl: string }>): void {
	connections.clear();
	for (const item of list) {
		if (connections.size() >= MAX_CONNECTIONS) break;
		const conn = createConnection(item.port);
		conn.serverUrl = item.serverUrl;
		connections.push(conn);
	}
	if (connections.size() === 0) {
		connections.push(createConnection(BASE_PORT));
	}
	activeTabIndex = 0;
}

export = {
	CURRENT_VERSION,
	MAX_CONNECTIONS,
	BASE_PORT,
	connections,
	addConnection,
	removeConnection,
	getActiveConnection,
	getConnection,
	getActiveTabIndex,
	setActiveTabIndex,
	getConnections,
	loadConnections,
};
