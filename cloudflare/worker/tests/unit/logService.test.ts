import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../src/models/types';
import type { LogEntry } from '../../src/models/types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('logService', () => {
  let mockEnv: Env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_KEY: 'test-key',
      FLY_API_TOKEN: 'test-fly-token',
      FLY_APP_NAME: 'zenith-factory',
      FLY_REGION: 'fra',
      FLY_MACHINE_IMAGE: 'registry.fly.io/zenith-factory:golden-v1',
      ENV: 'development',
    };
  });

  describe('ingestLogs', () => {
    it('should POST logs to agent_logs endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
      });

      const logs: LogEntry[] = [
        {
          agent_id: 'agent-123',
          step: 'completed',
          message: 'Execution finished',
          metadata: {
            timestamp: '2026-05-01T12:00:00.000Z',
            status: 200,
            duration_ms: 1500,
          },
          created_at: '2026-05-01T12:00:00.000Z',
        },
      ];

      // Import the actual implementation
      const { ingestLogs } = await import('../../src/services/logService');
      await ingestLogs(logs, mockEnv);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/rest/v1/agent_logs',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'apikey': 'test-key',
            'Authorization': 'Bearer test-key',
            'Prefer': 'return=minimal',
          }),
        })
      );
    });

    it('should include correct log payload in body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
      });

      const logs: LogEntry[] = [
        {
          agent_id: 'agent-123',
          step: 'completed',
          message: 'Test message',
          metadata: {
            timestamp: '2026-05-01T12:00:00.000Z',
            status: 200,
            duration_ms: 1500,
            headers: { 'content-type': 'application/json' },
          },
          created_at: '2026-05-01T12:00:00.000Z',
        },
      ];

      const { ingestLogs } = await import('../../src/services/logService');
      await ingestLogs(logs, mockEnv);

      const [, options] = mockFetch.mock.calls[0] as [string, { body: string }];
      const capturedBody = JSON.parse(options.body);

      expect(capturedBody).toMatchObject([{
        agent_id: 'agent-123',
        step: 'completed',
        message: 'Test message',
      }]);
    });

    it('should handle multiple logs in single call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
      });

      const logs: LogEntry[] = [
        {
          agent_id: 'agent-123',
          step: 'received',
          message: 'Request received',
          metadata: { timestamp: '2026-05-01T12:00:00.000Z' },
          created_at: '2026-05-01T12:00:00.000Z',
        },
        {
          agent_id: 'agent-123',
          step: 'completed',
          message: 'Execution finished',
          metadata: { timestamp: '2026-05-01T12:00:01.000Z' },
          created_at: '2026-05-01T12:00:01.000Z',
        },
      ];

      const { ingestLogs } = await import('../../src/services/logService');
      await ingestLogs(logs, mockEnv);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should NOT throw on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const logs: LogEntry[] = [
        {
          agent_id: 'agent-123',
          step: 'completed',
          message: 'Test',
          metadata: { timestamp: '2026-05-01T12:00:00.000Z' },
          created_at: '2026-05-01T12:00:00.000Z',
        },
      ];

      // Should not throw
      const { ingestLogs } = await import('../../src/services/logService');
      await expect(ingestLogs(logs, mockEnv)).resolves.toBeUndefined();
    });

    it('should NOT throw on bad response status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const logs: LogEntry[] = [
        {
          agent_id: 'agent-123',
          step: 'completed',
          message: 'Test',
          metadata: { timestamp: '2026-05-01T12:00:00.000Z' },
          created_at: '2026-05-01T12:00:00.000Z',
        },
      ];

      const { ingestLogs } = await import('../../src/services/logService');
      await expect(ingestLogs(logs, mockEnv)).resolves.toBeUndefined();
    });

    it('should swallow errors silently (best-effort logging)', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFetch.mockRejectedValueOnce(new Error('Supabase unavailable'));

      const logs: LogEntry[] = [
        {
          agent_id: 'agent-123',
          step: 'error',
          message: 'Failed to reach Supabase',
          metadata: { timestamp: '2026-05-01T12:00:00.000Z' },
          created_at: '2026-05-01T12:00:00.000Z',
        },
      ];

      const { ingestLogs } = await import('../../src/services/logService');
      
      // Should resolve (not reject) even on error
      await ingestLogs(logs, mockEnv);

      // Should log the error internally
      expect(consoleSpy).toHaveBeenCalledWith(
        '[LOG_INGESTION_ERROR]',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
