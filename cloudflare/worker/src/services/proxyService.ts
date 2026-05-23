import { HTTPException } from 'hono/http-exception';

const PROXY_TIMEOUT_MS = 120_000;

export async function proxyToVm(
  vmUrl: string,
  path: string,
  machineId: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const response = await fetch(`${vmUrl}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        'fly-force-instance-id': machineId,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new HTTPException(504, {
        message: 'Gateway timeout — VM did not respond within 120s',
        cause: { code: 'proxy_timeout' },
      });
    }

    throw error;
  }
}
