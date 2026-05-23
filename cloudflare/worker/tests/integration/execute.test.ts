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
  startMachine: vi.fn(),
  waitForVmReady: vi.fn(),
}));

vi.mock('../../src/lib/flyio', () => ({
  createFlyioClient: vi.fn(),
}));

// ── Imports after mocking ─────────────────────────────────────────────────────

import { createSupabaseClient } from '../../src/lib/supabase';
import { validateAgent } from '../../src/services/agentService';
import { getVmStatus, startMachine, waitForVmReady } from '../../src/services/vmService';
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

function makeRequest(body: Record<string, unknown> = { prompt: 'Hello' }) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /execute/:agentId', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

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

    // Default: supabase client (validateAgent handles the logic)
    vi.mocked(createSupabaseClient).mockReturnValue({} as ReturnType<typeof createSupabaseClient>);

    // Default: VM already running (no pre-warm needed)
    vi.mocked(getVmStatus).mockResolvedValue('running');

    // Mock global fetch for VM proxy calls
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it('should proxy to VM and return 200 on success', async () => {
    const vmResponseBody = { text: 'Hello from agent' };
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(vmResponseBody),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const app = buildApp();
    const response = await app.request(
      `/execute/${AGENT_ID}`,
      makeRequest(),
      mockEnv
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      agentId: AGENT_ID,
      response: { text: 'Hello from agent' },
      timestamp: expect.any(String),
    });
  });

  it('should return 404 when agent does not exist', async () => {
    vi.mocked(validateAgent).mockRejectedValue(
      Object.assign(new Error('Agent not found'), { status: 404 })
    );

    // Use HTTPException so errorMiddleware maps it correctly
    const { HTTPException } = await import('hono/http-exception');
    vi.mocked(validateAgent).mockRejectedValue(
      new HTTPException(404, { message: 'Agent not found' })
    );

    const app = buildApp();
    const response = await app.request(
      `/execute/${AGENT_ID}`,
      makeRequest(),
      mockEnv
    );

    expect(response.status).toBe(404);
  });

  it('should return 503 when VM fails to become ready', async () => {
    vi.mocked(getVmStatus).mockResolvedValue('stopped');
    vi.mocked(startMachine).mockResolvedValue(undefined);
    vi.mocked(waitForVmReady).mockResolvedValue(false); // never becomes ready

    const app = buildApp();
    const response = await app.request(
      `/execute/${AGENT_ID}`,
      makeRequest(),
      mockEnv
    );

    expect(response.status).toBe(503);
  });

  it('should return 400 when prompt is missing', async () => {
    const app = buildApp();
    const response = await app.request(
      `/execute/${AGENT_ID}`,
      makeRequest({ context: { some: 'data' } }), // prompt intentionally omitted
      mockEnv
    );

    expect(response.status).toBe(400);
  });
});
