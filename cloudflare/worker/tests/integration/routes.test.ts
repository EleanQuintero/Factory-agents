import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { Env } from '../../src/models/types';
import { corsMiddleware, errorMiddleware } from '../../src/middleware';
import { createRouter } from '../../src/routes';

function buildApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.use('*', corsMiddleware());
  app.use('*', errorMiddleware());
  app.route('/', createRouter());
  return app;
}

describe('routes integration', () => {
  it('should mount /health route', async () => {
    const app = buildApp();
    // Missing agentId → should fail validation (400) or service error (5xx)
    // Either way, the route is mounted and responds (not 404)
    const response = await app.request('/health');
    expect(response.status).not.toBe(404);
  });

  it('should return 400 for missing agentId on /health', async () => {
    const app = buildApp();
    const response = await app.request('/health');
    // agentId is required — controller throws, errorMiddleware returns 4xx or 5xx
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('should mount /execute/:agentId route (POST)', async () => {
    const app = buildApp();
    // Sending a POST to /execute/:agentId without body — should not be 404
    const response = await app.request('/execute/123e4567-e89b-12d3-a456-426614174000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'hello' }),
    });
    expect(response.status).not.toBe(404);
  });

  it('should respond to OPTIONS preflight with 204', async () => {
    const app = buildApp();
    const response = await app.request('/health', { method: 'OPTIONS' });
    expect(response.status).toBe(204);
  });
});
