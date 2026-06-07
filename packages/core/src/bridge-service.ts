import { v4 as uuidv4 } from 'uuid';

export interface PluginInstance {
  instanceId: string;
  role: string;
  lastActivity: number;
  connectedAt: number;
}

interface PendingRequest {
  id: string;
  endpoint: string;
  data: any;
  target: string;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

const STALE_INSTANCE_MS = 30000;

export interface PlaytestOutputEntry {
  message: string;
  messageType: string;
  timestamp: number;
}

export class BridgeService {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private instances: Map<string, PluginInstance> = new Map();
  private nextClientIndex = 1;
  private requestTimeout = 30000;

  private playtestActive = false;
  private playtestBuffer: PlaytestOutputEntry[] = [];
  private playtestStopRequested = false;

  resetPlaytest() {
    this.playtestBuffer = [];
    this.playtestStopRequested = false;
    this.playtestActive = true;
  }

  endPlaytest() {
    this.playtestActive = false;
    this.playtestStopRequested = false;
  }

  pushPlaytestOutput(entries: PlaytestOutputEntry[]) {
    if (!this.playtestActive) return;
    for (const entry of entries) {
      this.playtestBuffer.push(entry);
    }
  }

  getPlaytestBuffer(): PlaytestOutputEntry[] {
    return [...this.playtestBuffer];
  }

  requestPlaytestStop() {
    if (this.playtestActive) this.playtestStopRequested = true;
  }

  isPlaytestStopRequested(): boolean {
    return this.playtestActive && this.playtestStopRequested;
  }

  isPlaytestActive(): boolean {
    return this.playtestActive;
  }

  registerInstance(instanceId: string, role: string): string {
    let assignedRole = role;
    if (role === 'client') {
      assignedRole = `client-${this.nextClientIndex}`;
      this.nextClientIndex++;
    }

    this.instances.set(instanceId, {
      instanceId,
      role: assignedRole,
      lastActivity: Date.now(),
      connectedAt: Date.now(),
    });

    return assignedRole;
  }

  unregisterInstance(instanceId: string) {
    this.instances.delete(instanceId);

    for (const [id, req] of this.pendingRequests.entries()) {
      const targetRole = req.target;
      const hasHandler = Array.from(this.instances.values()).some(i => i.role === targetRole);
      if (!hasHandler) {
        clearTimeout(req.timeoutId);
        this.pendingRequests.delete(id);
        req.reject(new Error(`Target instance "${targetRole}" disconnected`));
      }
    }
  }

  getInstances(): PluginInstance[] {
    return Array.from(this.instances.values());
  }

  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  updateInstanceActivity(instanceId: string) {
    const inst = this.instances.get(instanceId);
    if (inst) {
      inst.lastActivity = Date.now();
    }
  }

  cleanupStaleInstances() {
    const now = Date.now();
    for (const [id, inst] of this.instances.entries()) {
      if (now - inst.lastActivity > STALE_INSTANCE_MS) {
        this.unregisterInstance(id);
      }
    }
  }

  async sendRequest(endpoint: string, data: any, target = 'edit'): Promise<any> {
    const requestId = uuidv4();

    return new Promise((resolve, reject) => {

      const timeoutId = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, this.requestTimeout);

      const request: PendingRequest = {
        id: requestId,
        endpoint,
        data,
        target,
        timestamp: Date.now(),
        resolve,
        reject,
        timeoutId
      };

      this.pendingRequests.set(requestId, request);
    });
  }

  getPendingRequest(callerRole = 'edit'): { requestId: string; request: { endpoint: string; data: any } } | null {

    let oldestRequest: PendingRequest | null = null;

    for (const request of this.pendingRequests.values()) {
      if (request.target !== callerRole) continue;
      if (!oldestRequest || request.timestamp < oldestRequest.timestamp) {
        oldestRequest = request;
      }
    }

    if (oldestRequest) {
      return {
        requestId: oldestRequest.id,
        request: {
          endpoint: oldestRequest.endpoint,
          data: oldestRequest.data
        }
      };
    }

    return null;
  }

  resolveRequest(requestId: string, response: any) {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      clearTimeout(request.timeoutId);
      this.pendingRequests.delete(requestId);
      request.resolve(response);
    }
  }

  rejectRequest(requestId: string, error: any) {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      clearTimeout(request.timeoutId);
      this.pendingRequests.delete(requestId);
      request.reject(error);
    }
  }

  cleanupOldRequests() {
    const now = Date.now();
    for (const [id, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.requestTimeout) {
        clearTimeout(request.timeoutId);
        this.pendingRequests.delete(id);
        request.reject(new Error('Request timeout'));
      }
    }
  }

  clearAllPendingRequests() {
    for (const [, request] of this.pendingRequests.entries()) {
      clearTimeout(request.timeoutId);
      request.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }
}