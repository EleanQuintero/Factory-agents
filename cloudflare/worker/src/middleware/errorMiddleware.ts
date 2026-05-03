import { HTTPException } from 'hono/http-exception';
import type { Context, Next } from 'hono';
import type { Env, ErrorResponse } from '../models/types';
import { RetryExhaustedError } from '../services/executeService';

/**
 * Error handling middleware
 *
 * Behavior:
 * - Production: Returns generic "Internal server error" without details
 * - Staging/Development: Returns full error message
 *
 * Catches:
 * - HTTPException with cause.code === 'retry_exhausted' → 502
 * - HTTPException with cause.code === 'execution_timeout' → 504
 * - HTTPException (other typed errors from controllers)
 * - Unknown errors (500)
 */
export function errorMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    try {
      await next();
    } catch (error) {
      const isProd = c.env.ENV === 'production';
      const timestamp = new Date().toISOString();

      // Check for typed errors from our services (HTTPException with cause.code)
      if (error instanceof HTTPException) {
        const cause = error.cause as { code?: string } | undefined;

        if (cause?.code === 'retry_exhausted') {
          const errorResponse: ErrorResponse = {
            error: 'retry_exhausted',
            message: isProd ? undefined : error.message,
            timestamp,
          };
          return c.json(errorResponse, 502);
        }

        if (cause?.code === 'execution_timeout') {
          const errorResponse: ErrorResponse = {
            error: 'execution_timeout',
            message: isProd ? undefined : error.message,
            timestamp,
          };
          return c.json(errorResponse, 504);
        }

        // Handle other HTTPExceptions (thrown by controllers)
        const response = error.getResponse() as Response;
        const rawData = await response.json().catch(() => ({ error: error.message }));
        const errorData = rawData as Record<string, unknown>;

        const errorResponse: ErrorResponse = {
          error: typeof errorData.error === 'string' ? errorData.error : 'Request error',
          message: isProd
            ? undefined
            : typeof errorData.message === 'string'
              ? errorData.message
              : error.message,
          agentId: typeof errorData.agentId === 'string' ? errorData.agentId : undefined,
          timestamp,
        };

        return c.json(errorResponse, error.status);
      }

      // Handle unknown errors
      console.error('[UNHANDLED_ERROR]', error);

      const errorResponse: ErrorResponse = {
        error: 'Internal server error',
        message: isProd ? undefined : error instanceof Error ? error.message : String(error),
        timestamp,
      };

      return c.json(errorResponse, 500);
    }
  };
}

