import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Env } from '../../src/models/types';
import { corsMiddleware, errorMiddleware } from '../../src/middleware';
import { createRouter } from '../../src/routes';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../src/lib/supabase', () => ({
  createSupabaseClient: vi.fn(),
}));

vi.mock('../../src/services/agentService', () => ({
  validateAgent: vi.fn(),
}));

vi.mock('../../src/services/vmService', () => ({
  waitForVmReady: vi.fn(),
}));

const mockEnsureMachine = vi.fn();
const mockGetVmUrl = vi.fn();

vi.mock('../../src/lib/fly/client', () => ({
  FlyMachinesClient: vi.fn().mockImplementation(() => ({
    ensureMachine: mockEnsureMachine,
    getVmUrl: mockGetVmUrl,
  })),
}));

// ── Imports after mocking ─────────────────────────────────────────────────────

import { createSupabaseClient } from '../../src/lib/supabase';
import { validateAgent } from '../../src/services/agentService';
import { waitForVmReady } from '../../src/services/vmService';

// ── Helpers ───────────────────────────────────────────────────────────────────

const AGENT_ID = '123e4567-e89b-12d3-a456-426614174000';
const VM_URL = `https://vm-${AGENT_ID}.vm.zenith-factory.fly.dev`;

const mockEnv: Env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_KEY: 'service-key',
  FLY_API_TOKEN: 'fly-token',
  FLY_APP_NAME: 'zenith-factory',
  FLY_REGION: 'fra',
  FLY_MACHINE_IMAGE: 'registry.fly.io/zenith-factory:golden-v1',
  ENV: 'development',
};

function buildApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.use('*', corsMiddleware());
  app.use('*', errorMiddleware());
  app.route('/', createRouter());
  return app;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(validateAgent).mockResolvedValue(undefined);
    vi.mocked(createSupabaseClient).mockReturnValue({} as ReturnType<typeof createSupabaseClient>);

    mockEnsureMachine.mockResolvedValue({ id: 'mach-123', state: 'started' });
    mockGetVmUrl.mockReturnValue(VM_URL);
  });

  it('should return 200 with ready status when VM is already running', async () => {
    vi.mocked(waitForVmReady).mockResolvedValue(true);

    const app = buildApp();
    const response = await app.request(`/health?agentId=${AGENT_ID}`, {}, mockEnv);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      status: 'ready',
      agentId: AGENT_ID,
      vmStatus: 'running',
      vmUrl: VM_URL,
      timestamp: expect.any(String),
    });
  });

  it('should call ensureMachine and return ready', async () => {
    vi.mocked(waitForVmReady).mockResolvedValue(true);

    const app = buildApp();
    const response = await app.request(`/health?agentId=${AGENT_ID}`, {}, mockEnv);

    expect(response.status).toBe(200);
    expect(mockEnsureMachine).toHaveBeenCalledWith(AGENT_ID);

    const body = await response.json() as { status: string };
    expect(body.status).toBe('ready');
  });
});
