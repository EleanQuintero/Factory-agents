import { HTTPException } from 'hono/http-exception';
import type { ExecuteRequest } from '../models/types';

const EXECUTE_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export class RetryExhaustedError extends HTTPException {
  constructor(public readonly attempts: number) {
    super(502, {
      message: `Retry exhausted after ${attempts} attempts`,
      cause: { code: 'retry_exhausted' },
    });
    this.name = 'RetryExhaustedError';
  }
}

export async function executeWithRetry(
  agentId: string,
  request: ExecuteRequest,
  vmUrl: string,
  sleepFn: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))
): Promise<Response> {
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

      if (!response.ok && response.status === 502) {
        lastError = new Error('502 Bad Gateway');
        await sleepFn(RETRY_DELAY_MS);
        continue;
      }

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

export async function executeProxy(
  agentId: string,
  request: ExecuteRequest,
  vmUrl: string,
): Promise<Response> {
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
