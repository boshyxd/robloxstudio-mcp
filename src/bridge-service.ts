import { v4 as uuidv4 } from 'uuid';

interface PendingRequest {
  id: string;
  endpoint: string;
  data: any;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export class BridgeService {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestTimeout = 30000; // 30 seconds timeout

  async sendRequest(endpoint: string, data: any): Promise<any> {
    const requestId = uuidv4();
    
    return new Promise((resolve, reject) => {
      const request: PendingRequest = {
        id: requestId,
        endpoint,
        data,
        timestamp: Date.now(),
        resolve,
        reject
      };

      this.pendingRequests.set(requestId, request);

      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, this.requestTimeout);
    });
  }

  getPendingRequest(): { requestId: string; request: { endpoint: string; data: any } } | null {
    // Get oldest pending request
    let oldestRequest: PendingRequest | null = null;
    
    for (const request of this.pendingRequests.values()) {
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
      this.pendingRequests.delete(requestId);
      request.resolve(response);
    }
  }

  rejectRequest(requestId: string, error: any) {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      this.pendingRequests.delete(requestId);
      request.reject(error);
    }
  }

  // Clean up old requests
  cleanupOldRequests() {
    const now = Date.now();
    for (const [id, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.requestTimeout) {
        this.pendingRequests.delete(id);
        request.reject(new Error('Request timeout'));
      }
    }
  }
}