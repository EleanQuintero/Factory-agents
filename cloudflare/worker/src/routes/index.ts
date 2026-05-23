import { Hono } from 'hono';
import type { Env } from '../models/types';
import { handleHealthCheck } from '../controllers/healthController';
import { handleAgentCreate, handleChat } from '../controllers/vmProxyController';
import { handleChatUi } from '../controllers/chatUiController';

export function createRouter() {
  const app = new Hono<{ Bindings: Env }>();

  app.get('/', (c) => handleChatUi(c));

  app.get('/health', async (c) => {
    const result = await handleHealthCheck(c);
    return c.json(result);
  });

  app.post('/agent/create/:agentId', (c) => handleAgentCreate(c));

  app.post('/chat/:agentId', (c) => handleChat(c));

  return app;
}
