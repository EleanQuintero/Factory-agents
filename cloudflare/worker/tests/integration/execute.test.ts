import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Env } from '../../src/models/types';
import { corsMiddleware, errorMiddleware } from '../../src/middleware';
import { createRouter } from '../../src/routes';

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

import { createSupabaseClient } from '../../src/lib/supabase';
import { validateAgent } from '../../src/services/agentService';
import { waitForVmReady } from '../../src/services/vmService';

const AGENT_ID = '123e4567-e89b-12d3-a456-426614174000';
const VM_URL = 'https://zenith-factory.fly.dev';

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

describe('POST /chat/:agentId', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(validateAgent).mockResolvedValue(undefined);
    vi.mocked(createSupabaseClient).mockReturnValue({} as ReturnType<typeof createSupabaseClient>);
    vi.mocked(waitForVmReady).mockResolvedValue(true);

    mockEnsureMachine.mockResolvedValue({ id: 'mach-123', state: 'started' });
    mockGetVmUrl.mockReturnValue(VM_URL);

    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it('should proxy chat to VM and stream response', async () => {
    mockFetch.mockResolvedValue(new Response('Hello from agent', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Thread-Id': 'thread-abc',
      },
    }));

    const app = buildApp();
    const response = await app.request(
      `/chat/${AGENT_ID}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Hello' }),
      },
      mockEnv,
    );

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe('Hello from agent');
  });

  it('should return 503 when VM fails to become ready', async () => {
    vi.mocked(waitForVmReady).mockResolvedValue(false);

    const app = buildApp();
    const response = await app.request(
      `/chat/${AGENT_ID}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Hello' }),
      },
      mockEnv,
    );

    expect(response.status).toBe(503);
  });
});

describe('POST /agent/create/:agentId', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(validateAgent).mockResolvedValue(undefined);
    vi.mocked(createSupabaseClient).mockReturnValue({} as ReturnType<typeof createSupabaseClient>);
    vi.mocked(waitForVmReady).mockResolvedValue(true);

    mockEnsureMachine.mockResolvedValue({ id: 'mach-123', state: 'started' });
    mockGetVmUrl.mockReturnValue(VM_URL);

    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it('should proxy agent creation to VM', async () => {
    mockFetch.mockResolvedValue(new Response(
      JSON.stringify({ status: 'created', agentId: 'test-agent' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    ));

    const app = buildApp();
    const response = await app.request(
      `/agent/create/${AGENT_ID}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-1', swarm_config: {} }),
      },
      mockEnv,
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ status: 'created' });
  });
});
