import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FlyioClient } from '../../src/lib/flyio';

// Mock delay helper - vi.fn() for sleep
const sleep = vi.fn(() => Promise.resolve());

// Import after mocking
import { getVmStatus, createMachine, startMachine, waitForVmReady } from '../../src/services/vmService';

describe('vmService', () => {
  let mockFlyio: Partial<FlyioClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    sleep.mockResolvedValue(undefined);

    mockFlyio = {
      getMachineStatus: vi.fn(),
      createMachine: vi.fn(),
      startMachine: vi.fn(),
      getVmUrl: (agentId: string) => `https://zenith-factory-${agentId}.fly.dev`,
    };
  });

  describe('getVmStatus', () => {
    it('should return running when VM is active', async () => {
      (mockFlyio.getMachineStatus as ReturnType<typeof vi.fn>).mockResolvedValue('running');
      const result = await getVmStatus('agent-123', mockFlyio as FlyioClient);
      expect(result).toBe('running');
    });

    it('should return stopped when VM exists but is not running', async () => {
      (mockFlyio.getMachineStatus as ReturnType<typeof vi.fn>).mockResolvedValue('stopped');
      const result = await getVmStatus('agent-123', mockFlyio as FlyioClient);
      expect(result).toBe('stopped');
    });

    it('should return none when VM does not exist', async () => {
      (mockFlyio.getMachineStatus as ReturnType<typeof vi.fn>).mockResolvedValue('none');
      const result = await getVmStatus('agent-123', mockFlyio as FlyioClient);
      expect(result).toBe('none');
    });
  });

  describe('createMachine', () => {
    it('should call flyio.createMachine with agentId', async () => {
      (mockFlyio.createMachine as ReturnType<typeof vi.fn>).mockResolvedValue('machine-123');
      const result = await createMachine('agent-123', mockFlyio as FlyioClient);
      expect(mockFlyio.createMachine).toHaveBeenCalledWith('agent-123');
      expect(result).toBe('machine-123');
    });
  });

  describe('startMachine', () => {
    it('should call flyio.startMachine with agentId', async () => {
      (mockFlyio.startMachine as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      await startMachine('agent-123', mockFlyio as FlyioClient);
      expect(mockFlyio.startMachine).toHaveBeenCalledWith('agent-123');
    });
  });

  describe('waitForVmReady', () => {
    it('should return true when VM responds with 200', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      // Inject our mock fetch
      global.fetch = mockFetch;

      const vmUrl = 'https://zenith-factory-agent-123.fly.dev';
      const result = await waitForVmReady(vmUrl, sleep);

      expect(result).toBe(true);
      expect(sleep).toHaveBeenCalledWith(2000); // Initial grace period
    });

    it('should return false after timeout', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      global.fetch = mockFetch;

      const vmUrl = 'https://zenith-factory-agent-123.fly.dev';
      const result = await waitForVmReady(vmUrl, sleep);

      expect(result).toBe(false);
      // Should have tried grace period + 6 polls = 7 sleep calls (6 polls, but first poll after grace)
      // Actually: 1 grace period + 6 polls = 7 total sleep calls
      expect(sleep.mock.calls.length).toBe(7); // 2000ms + 6 × 500ms
    });

    it('should poll multiple times until VM is ready', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({ ok: true, status: 200 });
      });

      global.fetch = mockFetch;

      const vmUrl = 'https://zenith-factory-agent-123.fly.dev';
      const result = await waitForVmReady(vmUrl, sleep);

      expect(result).toBe(true);
      expect(callCount).toBe(3);
    });
  });
});
