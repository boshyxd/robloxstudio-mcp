/// <reference types="@rbxts/types/plugin" />

export interface Connection {
	port: number;
	serverUrl: string;
	isActive: boolean;
	pollInterval: number;
	maxIdlePollInterval: number;
	currentPollInterval: number;
	lastPoll: number;
	consecutiveFailures: number;
	maxFailuresBeforeError: number;
	lastSuccessfulConnection: number;
	currentRetryDelay: number;
	maxRetryDelay: number;
	retryBackoffMultiplier: number;
	lastHttpOk: boolean;
	lastMcpOk: boolean;
	mcpWaitStartTime?: number;
	isPolling: boolean;
	heartbeatConnection?: RBXScriptConnection;
}

export interface RequestData {
	[key: string]: unknown;
}

export interface RequestPayload {
	endpoint: string;
	data?: RequestData;
}

export interface PollResponse {
	mcpConnected: boolean;
	request?: RequestPayload;
	requestId?: string;
}

export interface ReadyResponse {
	success: boolean;
	assignedRole?: string;
}

declare global {
	function loadstring(code: string): LuaTuple<[(() => unknown) | undefined, string?]>;
}
