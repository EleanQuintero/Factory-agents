import { HTTPException } from 'hono/http-exception';
import type { FlyioClient } from '../lib/flyio';
import type { ExecuteRequest } from '../models/types';

const EXECUTE_TIMEOUT_MS = 60_000; // 60 seconds
/** Total attempts = 1 initial + MAX_RETRIES retries (spec: "2 retries" = 3 total) */
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000; // 1 second backoff

export class RetryExhaustedError extends HTTPException {
  constructor(public readonly attempts: number) {
    super(502, {
      message: `Retry exhausted after ${attempts} attempts`,
      cause: { code: 'retry_exhausted' },
    });
    this.name = 'RetryExhaustedError';
  }
}

/**
 * Execute request with retry logic for 502 errors
 *
 * @returns Response object (caller must clone if reading body)
 */
export async function executeWithRetry(
  agentId: string,
  request: ExecuteRequest,
  flyio: FlyioClient,
  sleepFn: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))
): Promise<Response> {
  const vmUrl = flyio.getVmUrl(agentId);
  const executeUrl = `${vmUrl}/execute/${agentId}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), EXECUTE_TIMEOUT_MS);

      const response = await fetch(executeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Only retry on 502 (Bad Gateway - VM restarting)
      if (!response.ok && response.status === 502) {
        lastError = new Error('502 Bad Gateway');
        await sleepFn(RETRY_DELAY_MS);
        continue;
      }

      // Non-502 non-ok responses: throw immediately (no retry)
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HTTPException(504, {
          message: 'Gateway timeout',
          cause: { code: 'execution_timeout' },
        });
      }

      // Re-throw non-502 errors immediately (no retry)
      if (!(error instanceof Error) || !error.message.includes('502')) {
        throw error;
      }

      if (attempt < MAX_RETRIES) {
        lastError = error as Error;
        await sleepFn(RETRY_DELAY_MS);
        continue;
      }

      throw error;
    }
  }

  throw new RetryExhaustedError(MAX_RETRIES + 1);
}

/**
 * Proxy execute request to Fly.io VM
 *
 * @returns Response - caller must clone if reading body multiple times
 */
export async function executeProxy(
  agentId: string,
  request: ExecuteRequest,
  flyio: FlyioClient
): Promise<Response> {
  const vmUrl = flyio.getVmUrl(agentId);
  const executeUrl = `${vmUrl}/execute/${agentId}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXECUTE_TIMEOUT_MS);

  try {
    const response = await fetch(executeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new HTTPException(504, {
        message: 'Gateway timeout',
        cause: { code: 'execution_timeout' },
      });
    }

    throw error;
  }
}
