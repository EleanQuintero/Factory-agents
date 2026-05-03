import { Hono } from 'hono';
import type { Env } from '../models/types';
import { handleHealthCheck } from '../controllers/healthController';
import { handleExecute } from '../controllers/executeController';

export function createRouter() {
  const app = new Hono<{ Bindings: Env }>();

  // GET /health?agentId=xxx
  app.get('/health', async (c) => {
    const result = await handleHealthCheck(c);
    return c.json(result);
  });

  // POST /execute/:agentId
  app.post('/execute/:agentId', async (c) => {
    const result = await handleExecute(c);
    return c.json(result);
  });

  return app;
}
