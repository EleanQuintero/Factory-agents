import { Hono } from 'hono';
import type { Env } from './models/types';
import { corsMiddleware, errorMiddleware } from './middleware';
import { createRouter } from './routes';

const app = new Hono<{ Bindings: Env }>();

// Apply middleware globally (order matters - first applied = outermost handler)
app.use('*', corsMiddleware());
app.use('*', errorMiddleware());

// Mount routes
app.route('/', createRouter());

// Export default for Cloudflare Workers
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};
