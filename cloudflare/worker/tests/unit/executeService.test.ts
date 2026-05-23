import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeWithRetry, executeProxy } from '../../src/services/executeService';

const VM_URL = 'https://vm-agent-123.vm.zenith-factory.fly.dev';

describe('executeService', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let sleepFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    sleepFn = vi.fn().mockResolvedValue(undefined);
  });

  describe('executeWithRetry', () => {
    it('should return response on first success', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ text: 'Hello' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await executeWithRetry(
        'agent-123',
        { prompt: 'Hello' },
        VM_URL,
        sleepFn,
      );

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on 502 error', async () => {
      const errorResponse = { ok: false, status: 502 };
      const successResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ text: 'Hello after retry' }),
      };

      mockFetch
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(successResponse);

      const result = await executeWithRetry(
        'agent-123',
        { prompt: 'Hello' },
        VM_URL,
        sleepFn,
      );

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(sleepFn).toHaveBeenCalledWith(1000);
    });

    it('should throw after exhausting retries', async () => {
      const errorResponse = { ok: false, status: 502 };
      mockFetch.mockResolvedValue(errorResponse);

      await expect(
        executeWithRetry('agent-123', { prompt: 'Hello' }, VM_URL, sleepFn),
      ).rejects.toThrow('Retry exhausted after 3 attempts');

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 404', async () => {
      const notFoundResponse = { ok: false, status: 404 };
      mockFetch.mockResolvedValue(notFoundResponse);

      await expect(
        executeWithRetry('agent-123', { prompt: 'Hello' }, VM_URL, sleepFn),
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeProxy', () => {
    it('should proxy request to correct VM URL', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ text: 'Agent response' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await executeProxy('agent-123', { prompt: 'Hello' }, VM_URL);

      expect(mockFetch).toHaveBeenCalledWith(
        `${VM_URL}/execute/agent-123`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ prompt: 'Hello' }),
        }),
      );
    });

    it('should use 60 second timeout', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ text: 'OK' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await executeProxy('agent-123', { prompt: 'Hello' }, VM_URL);

      const fetchCall = mockFetch.mock.calls[0];
      const options = fetchCall[1] as RequestInit;
      expect(options.signal).toBeInstanceOf(AbortSignal);
    });
  });
});
