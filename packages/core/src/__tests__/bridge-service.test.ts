import { BridgeService } from '../bridge-service.js';

describe('BridgeService', () => {
  let bridgeService: BridgeService;

  beforeEach(() => {
    bridgeService = new BridgeService();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Request Management', () => {
    test('should create and store a pending request', async () => {
      const endpoint = '/api/test';
      const data = { test: 'data' };

      bridgeService.sendRequest(endpoint, data);

      const pendingRequest = bridgeService.getPendingRequest();
      expect(pendingRequest).toBeTruthy();
      expect(pendingRequest?.request.endpoint).toBe(endpoint);
      expect(pendingRequest?.request.data).toEqual(data);
    });

    test('should resolve request when response is received', async () => {
      const endpoint = '/api/test';
      const data = { test: 'data' };
      const response = { result: 'success' };

      const requestPromise = bridgeService.sendRequest(endpoint, data);
      const pendingRequest = bridgeService.getPendingRequest();

      bridgeService.resolveRequest(pendingRequest!.requestId, response);

      const result = await requestPromise;
      expect(result).toEqual(response);
    });

    test('should reject request on error', async () => {
      const endpoint = '/api/test';
      const data = { test: 'data' };
      const error = 'Test error';

      const requestPromise = bridgeService.sendRequest(endpoint, data);
      const pendingRequest = bridgeService.getPendingRequest();

      bridgeService.rejectRequest(pendingRequest!.requestId, error);

      await expect(requestPromise).rejects.toEqual(error);
    });

    test('should timeout request after 30 seconds', async () => {
      const endpoint = '/api/test';
      const data = { test: 'data' };

      const requestPromise = bridgeService.sendRequest(endpoint, data);

      jest.advanceTimersByTime(31000);

      await expect(requestPromise).rejects.toThrow('Request timeout');
    });
  });

  describe('Cleanup Operations', () => {
    test('should clean up old requests', async () => {

      const promises = [
        bridgeService.sendRequest('/api/test1', {}),
        bridgeService.sendRequest('/api/test2', {}),
        bridgeService.sendRequest('/api/test3', {})
      ];

      jest.advanceTimersByTime(31000);

      bridgeService.cleanupOldRequests();

      for (const promise of promises) {
        await expect(promise).rejects.toThrow('Request timeout');
      }

      expect(bridgeService.getPendingRequest()).toBeNull();
    });

    test('should clear all pending requests on disconnect', async () => {

      const promises = [
        bridgeService.sendRequest('/api/test1', {}),
        bridgeService.sendRequest('/api/test2', {}),
        bridgeService.sendRequest('/api/test3', {})
      ];

      bridgeService.clearAllPendingRequests();

      for (const promise of promises) {
        await expect(promise).rejects.toThrow('Connection closed');
      }

      expect(bridgeService.getPendingRequest()).toBeNull();
    });
  });

  describe('Request Priority', () => {
    test('should return oldest request first', async () => {

      bridgeService.sendRequest('/api/test1', { order: 1 });

      jest.advanceTimersByTime(10);

      bridgeService.sendRequest('/api/test2', { order: 2 });

      jest.advanceTimersByTime(10);

      bridgeService.sendRequest('/api/test3', { order: 3 });

      const firstRequest = bridgeService.getPendingRequest();
      expect(firstRequest?.request.data.order).toBe(1);

      bridgeService.resolveRequest(firstRequest!.requestId, {});

      const secondRequest = bridgeService.getPendingRequest();
      expect(secondRequest?.request.data.order).toBe(2);

      bridgeService.resolveRequest(secondRequest!.requestId, {});

      const thirdRequest = bridgeService.getPendingRequest();
      expect(thirdRequest?.request.data.order).toBe(3);

      bridgeService.resolveRequest(thirdRequest!.requestId, {});

      expect(bridgeService.getPendingRequest()).toBeNull();
    });
  });

  describe('In-flight dispatch tracking', () => {
    test('does not hand out the same request twice before it resolves', () => {
      bridgeService.sendRequest('/api/test', { order: 1 }).catch(() => {});

      const first = bridgeService.getPendingRequest();
      expect(first).toBeTruthy();

      // A second poll arriving before the first request has resolved must not
      // be handed the same request again (that causes double execution).
      const second = bridgeService.getPendingRequest();
      expect(second).toBeNull();
    });

    test('hands a second poll the next request instead of repeating the oldest', () => {
      bridgeService.sendRequest('/api/test1', { order: 1 }).catch(() => {});
      jest.advanceTimersByTime(10);
      bridgeService.sendRequest('/api/test2', { order: 2 }).catch(() => {});

      const first = bridgeService.getPendingRequest();
      expect(first?.request.data.order).toBe(1);

      // Without resolving the first, a concurrent poll should pick up the
      // second pending request rather than starving behind the oldest.
      const second = bridgeService.getPendingRequest();
      expect(second?.request.data.order).toBe(2);
    });

    test('re-dispatches a request that got no response after the redispatch TTL', () => {
      bridgeService.sendRequest('/api/test', { order: 1 }).catch(() => {});

      const first = bridgeService.getPendingRequest();
      expect(first).toBeTruthy();
      expect(bridgeService.getPendingRequest()).toBeNull();

      // Plugin never answered (dropped response / restart). After the TTL the
      // request becomes eligible for re-dispatch so it is not lost until the
      // full 30s request timeout.
      jest.advanceTimersByTime(11000);

      const redispatched = bridgeService.getPendingRequest();
      expect(redispatched?.requestId).toBe(first!.requestId);
    });

    test('keeps a dispatched request reservable by its original requestId for /response', () => {
      bridgeService.sendRequest('/api/test', { order: 1 }).catch(() => {});

      const dispatched = bridgeService.getPendingRequest();
      expect(dispatched).toBeTruthy();

      // The request must remain resolvable even though it is no longer offered
      // to new polls.
      const response = { ok: true };
      bridgeService.resolveRequest(dispatched!.requestId, response);

      expect(bridgeService.getPendingRequest()).toBeNull();
    });

    test('prefers fresh undispatched work over an older TTL-expired in-flight request', () => {
      // An old request is dispatched, then stalls (no response arrives).
      bridgeService.sendRequest('/api/old', { order: 1 }).catch(() => {});
      const first = bridgeService.getPendingRequest();
      expect(first?.request.data.order).toBe(1);

      // It crosses the redispatch TTL, and meanwhile newer work arrives.
      jest.advanceTimersByTime(11000);
      bridgeService.sendRequest('/api/new', { order: 2 }).catch(() => {});

      // The fresh undispatched request must be served before the stalled
      // re-offer — otherwise the old request keeps leapfrogging new work.
      const next = bridgeService.getPendingRequest();
      expect(next?.request.data.order).toBe(2);
    });
  });
});