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
  getVmStatus: vi.fn(),
  createMachine: vi.fn(),
  startMachine: vi.fn(),
  waitForVmReady: vi.fn(),
}));

vi.mock('../../src/lib/flyio', () => ({
  createFlyioClient: vi.fn(),
}));

// ── Imports after mocking ─────────────────────────────────────────────────────

import { createSupabaseClient } from '../../src/lib/supabase';
import { validateAgent } from '../../src/services/agentService';
import { getVmStatus, createMachine, startMachine, waitForVmReady } from '../../src/services/vmService';
import { createFlyioClient } from '../../src/lib/flyio';

// ── Helpers ───────────────────────────────────────────────────────────────────

const AGENT_ID = '123e4567-e89b-12d3-a456-426614174000';
const VM_URL = `https://zenith-factory-${AGENT_ID}.fly.dev`;

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

    // Default: agent exists
    vi.mocked(validateAgent).mockResolvedValue(undefined);

    // Default: flyio client with getVmUrl
    vi.mocked(createFlyioClient).mockReturnValue({
      getVmUrl: () => VM_URL,
      getMachineStatus: vi.fn(),
      createMachine: vi.fn(),
      startMachine: vi.fn(),
    } as ReturnType<typeof createFlyioClient>);

    // Default: supabase client
    vi.mocked(createSupabaseClient).mockReturnValue({} as ReturnType<typeof createSupabaseClient>);
  });

  it('should return 200 with ready status when VM is already running', async () => {
    vi.mocked(getVmStatus).mockResolvedValue('running');
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

  it('should create VM and return ready when VM does not exist', async () => {
    vi.mocked(getVmStatus).mockResolvedValue('none');
    vi.mocked(createMachine).mockResolvedValue('machine-id-123');
    vi.mocked(waitForVmReady).mockResolvedValue(true);

    const app = buildApp();
    const response = await app.request(`/health?agentId=${AGENT_ID}`, {}, mockEnv);

    expect(response.status).toBe(200);
    expect(createMachine).toHaveBeenCalledWith(AGENT_ID, expect.anything());

    const body = await response.json() as { status: string };
    expect(body.status).toBe('ready');
  });
});
