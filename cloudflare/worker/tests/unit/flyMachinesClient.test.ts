import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FlyMachinesClient, type FlyClientEnv } from '../../src/lib/fly/client';
import {
  FlyAuthError,
  FlyNotFoundError,
  FlyTimeoutError,
  FlyConflictError,
  FlyValidationError,
  FlyRateLimitError,
  FlyServerError,
  FlyApiError,
} from '../../src/lib/fly/types';
import type { Machine } from '../../src/lib/fly/types';

const TEST_ENV: FlyClientEnv = {
  FLY_API_TOKEN: 'test-token',
  FLY_APP_NAME: 'zenith-factory',
  FLY_REGION: 'fra',
  FLY_MACHINE_IMAGE: 'registry.fly.io/zenith-factory:golden-v1',
};

const BASE_URL = 'https://api.machines.dev/v1';

function makeMachine(overrides: Partial<Machine> = {}): Machine {
  return {
    id: 'mach-123',
    name: 'vm-user-001',
    state: 'started',
    region: 'fra',
    instance_id: 'inst-abc',
    private_ip: 'fdaa::1',
    config: { image: TEST_ENV.FLY_MACHINE_IMAGE },
    image_ref: { registry: 'registry.fly.io', repository: 'zenith-factory', digest: 'sha256:abc' },
    events: [],
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }));
}

function errorResponse(status: number, body = 'error') {
  return Promise.resolve(new Response(body, { status }));
}

describe('FlyMachinesClient', () => {
  let client: FlyMachinesClient;
  let fetchSpy: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    client = new FlyMachinesClient(TEST_ENV);
    fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('listMachines', () => {
    it('should return list of machines', async () => {
      const machines = [makeMachine(), makeMachine({ id: 'mach-456', name: 'vm-user-002' })];
      fetchSpy.mockReturnValue(jsonResponse(machines));

      const result = await client.listMachines();

      expect(result).toHaveLength(2);
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/apps/zenith-factory/machines`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });
  });

  describe('getMachine', () => {
    it('should return a single machine by id', async () => {
      const machine = makeMachine();
      fetchSpy.mockReturnValue(jsonResponse(machine));

      const result = await client.getMachine('mach-123');

      expect(result.id).toBe('mach-123');
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/apps/zenith-factory/machines/mach-123`,
        expect.anything(),
      );
    });
  });

  describe('getMachineByName', () => {
    it('should find machine by name from list', async () => {
      const machines = [
        makeMachine({ name: 'vm-user-001' }),
        makeMachine({ id: 'mach-456', name: 'vm-user-002' }),
      ];
      fetchSpy.mockReturnValue(jsonResponse(machines));

      const result = await client.getMachineByName('vm-user-002');

      expect(result?.id).toBe('mach-456');
    });

    it('should return null when machine not found', async () => {
      fetchSpy.mockReturnValue(jsonResponse([]));

      const result = await client.getMachineByName('vm-nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createMachine', () => {
    it('should POST machine config and return created machine', async () => {
      const machine = makeMachine();
      fetchSpy.mockReturnValue(jsonResponse(machine));

      const result = await client.createMachine({
        name: 'vm-user-001',
        region: 'fra',
        config: { image: TEST_ENV.FLY_MACHINE_IMAGE },
      });

      expect(result.id).toBe('mach-123');
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/apps/zenith-factory/machines`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('updateMachine', () => {
    it('should POST full config to machine endpoint', async () => {
      const machine = makeMachine();
      fetchSpy.mockReturnValue(jsonResponse(machine));

      await client.updateMachine('mach-123', {
        config: { image: 'registry.fly.io/zenith-factory:golden-v2' },
        current_version: '01HXXX',
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/apps/zenith-factory/machines/mach-123`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('startMachine', () => {
    it('should POST to start endpoint', async () => {
      fetchSpy.mockReturnValue(jsonResponse({ previous_state: 'stopped', migrated: false }));

      const result = await client.startMachine('mach-123');

      expect(result.previous_state).toBe('stopped');
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/apps/zenith-factory/machines/mach-123/start`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('stopMachine', () => {
    it('should POST to stop endpoint without options', async () => {
      fetchSpy.mockReturnValue(jsonResponse({ ok: true }));

      await client.stopMachine('mach-123');

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/apps/zenith-factory/machines/mach-123/stop`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should include signal and timeout when provided', async () => {
      fetchSpy.mockReturnValue(jsonResponse({ ok: true }));

      await client.stopMachine('mach-123', { signal: 'SIGINT', timeout: '30s' });

      const call = fetchSpy.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.signal).toBe('SIGINT');
      expect(body.timeout).toBe('30s');
    });
  });

  describe('suspendMachine', () => {
    it('should POST to suspend endpoint', async () => {
      fetchSpy.mockReturnValue(jsonResponse({ ok: true }));

      await client.suspendMachine('mach-123');

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/apps/zenith-factory/machines/mach-123/suspend`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('destroyMachine', () => {
    it('should DELETE machine', async () => {
      fetchSpy.mockReturnValue(jsonResponse({ ok: true }));

      await client.destroyMachine('mach-123');

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/apps/zenith-factory/machines/mach-123`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('should add force query param when requested', async () => {
      fetchSpy.mockReturnValue(jsonResponse({ ok: true }));

      await client.destroyMachine('mach-123', true);

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/apps/zenith-factory/machines/mach-123?force=true`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('waitForState', () => {
    it('should call wait endpoint with query params', async () => {
      fetchSpy.mockReturnValue(jsonResponse({ ok: true }));

      await client.waitForState('mach-123', { state: 'started', timeout: 15 });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('/machines/mach-123/wait?');
      expect(url).toContain('state=started');
      expect(url).toContain('timeout=15');
    });

    it('should default timeout to 30s', async () => {
      fetchSpy.mockReturnValue(jsonResponse({ ok: true }));

      await client.waitForState('mach-123', { state: 'started' });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('timeout=30');
    });
  });

  describe('getVmUrl', () => {
    it('should build correct subdomain URL', () => {
      const url = client.getVmUrl('user-001');
      expect(url).toBe('https://vm-user-001.vm.zenith-factory.fly.dev');
    });
  });

  describe('error mapping', () => {
    const errorCases = [
      { status: 401, errorClass: FlyAuthError, name: 'FlyAuthError' },
      { status: 404, errorClass: FlyNotFoundError, name: 'FlyNotFoundError' },
      { status: 408, errorClass: FlyTimeoutError, name: 'FlyTimeoutError' },
      { status: 409, errorClass: FlyConflictError, name: 'FlyConflictError' },
      { status: 422, errorClass: FlyValidationError, name: 'FlyValidationError' },
    ] as const;

    for (const { status, errorClass, name } of errorCases) {
      it(`should throw ${name} on ${status}`, async () => {
        fetchSpy.mockReturnValue(errorResponse(status, `error-${status}`));

        await expect(client.getMachine('mach-123')).rejects.toThrow(errorClass);
      });
    }

    it('should throw FlyApiError on unexpected 4xx', async () => {
      fetchSpy.mockReturnValue(errorResponse(418, 'teapot'));

      await expect(client.getMachine('mach-123')).rejects.toThrow(FlyApiError);
    });
  });

  describe('retry on 429 and 5xx', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry on 429 and succeed', async () => {
      fetchSpy
        .mockReturnValueOnce(errorResponse(429, 'rate limited'))
        .mockReturnValueOnce(jsonResponse([makeMachine()]));

      const result = await client.listMachines();

      expect(result).toHaveLength(1);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 and succeed', async () => {
      fetchSpy
        .mockReturnValueOnce(errorResponse(500, 'internal'))
        .mockReturnValueOnce(jsonResponse([makeMachine()]));

      const result = await client.listMachines();

      expect(result).toHaveLength(1);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retry attempts on 429', async () => {
      fetchSpy.mockImplementation(() => errorResponse(429, 'rate limited'));

      await expect(client.listMachines()).rejects.toThrow(FlyRateLimitError);
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });

    it('should throw after max retry attempts on 5xx', async () => {
      fetchSpy.mockImplementation(() => errorResponse(503, 'unavailable'));

      await expect(client.listMachines()).rejects.toThrow(FlyServerError);
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });

    it('should NOT retry on non-retryable errors', async () => {
      fetchSpy.mockReturnValue(errorResponse(401, 'unauthorized'));

      await expect(client.listMachines()).rejects.toThrow(FlyAuthError);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('ensureMachine', () => {
    it('should create machine when none exists', async () => {
      const newMachine = makeMachine({ id: 'mach-new', name: 'vm-user-001' });
      fetchSpy
        .mockReturnValueOnce(jsonResponse([]))
        .mockReturnValueOnce(jsonResponse(newMachine))
        .mockReturnValueOnce(jsonResponse({ ok: true }));

      const result = await client.ensureMachine('user-001');

      expect(result.id).toBe('mach-new');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('should start machine when stopped', async () => {
      const stopped = makeMachine({ state: 'stopped' });
      fetchSpy
        .mockReturnValueOnce(jsonResponse([stopped]))
        .mockReturnValueOnce(jsonResponse({ previous_state: 'stopped', migrated: false }))
        .mockReturnValueOnce(jsonResponse({ ok: true }));

      const result = await client.ensureMachine('user-001');

      expect(result.id).toBe('mach-123');
      const startCall = fetchSpy.mock.calls[1][0] as string;
      expect(startCall).toContain('/start');
    });

    it('should start machine when suspended', async () => {
      const suspended = makeMachine({ state: 'suspended' });
      fetchSpy
        .mockReturnValueOnce(jsonResponse([suspended]))
        .mockReturnValueOnce(jsonResponse({ previous_state: 'suspended', migrated: false }))
        .mockReturnValueOnce(jsonResponse({ ok: true }));

      const result = await client.ensureMachine('user-001');

      expect(result.id).toBe('mach-123');
    });

    it('should return machine as-is when already started', async () => {
      const running = makeMachine({ state: 'started' });
      fetchSpy.mockReturnValueOnce(jsonResponse([running]));

      const result = await client.ensureMachine('user-001');

      expect(result.id).toBe('mach-123');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
