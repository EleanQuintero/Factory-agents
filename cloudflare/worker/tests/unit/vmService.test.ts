import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitForVmReady } from '../../src/services/vmService';

describe('vmService', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let sleep: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    sleep = vi.fn().mockResolvedValue(undefined);
  });

  describe('waitForVmReady', () => {
    it('should return true when VM responds with 200', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const result = await waitForVmReady('https://vm-user-001.vm.zenith-factory.fly.dev', sleep);

      expect(result).toBe(true);
      expect(sleep).toHaveBeenCalledWith(2000);
    });

    it('should return false after timeout', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const result = await waitForVmReady('https://vm-user-001.vm.zenith-factory.fly.dev', sleep);

      expect(result).toBe(false);
      expect(sleep.mock.calls.length).toBe(7); // 1 grace + 6 polls
    });

    it('should poll multiple times until VM is ready', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({ ok: true, status: 200 });
      });

      const result = await waitForVmReady('https://vm-user-001.vm.zenith-factory.fly.dev', sleep);

      expect(result).toBe(true);
      expect(callCount).toBe(3);
    });
  });
});
