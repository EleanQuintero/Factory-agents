import type { Context, Next } from 'hono';
import type { Env } from '../models/types';

/**
 * CORS middleware - adds required CORS headers to all responses
 *
 * Headers added:
 * - Access-Control-Allow-Origin: * (allows all origins)
 * - Access-Control-Allow-Methods: GET, POST, OPTIONS
 * - Access-Control-Allow-Headers: Content-Type, Authorization
 */
export function corsMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Add CORS headers to response
    c.res.headers.set('Access-Control-Allow-Origin', '*');
    c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // If preflight (OPTIONS), return early with 204 No Content
    if (c.req.method === 'OPTIONS') {
      return c.body(null, 204);
    }

    await next();
  };
}
