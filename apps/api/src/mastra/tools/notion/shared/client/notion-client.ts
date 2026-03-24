import { type HttpMethod, type INotionClient, NotionAPIError } from './types';

const BASE_URL = 'https://api.notion.com';
const API_VERSION = '2022-06-28';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export class NotionAPIClient implements INotionClient {
  private apiKey: string;

  constructor() {
    const key = process.env.NOTION_API_KEY;
    if (!key) {
      throw new Error(
        'NOTION_API_KEY environment variable is required. ' +
          'Set it in your .env file or environment to authenticate with the Notion API.',
      );
    }
    this.apiKey = key;
  }

  async request<T = Record<string, unknown>>(
    method: HttpMethod,
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Notion-Version': API_VERSION,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      const errorBody = await response.json().catch(() => ({
        code: 'unknown',
        message: response.statusText,
      })) as { code?: string; message?: string };

      const errorCode = errorBody.code ?? 'unknown';
      const errorMessage = errorBody.message ?? response.statusText;

      // Rate limited — respect Retry-After or use exponential backoff
      if (response.status === 429) {
        if (attempt < MAX_RETRIES - 1) {
          const retryAfter = response.headers.get('Retry-After');
          const delayMs = retryAfter
            ? Number(retryAfter) * 1000
            : BASE_DELAY_MS * Math.pow(2, attempt);
          await this.sleep(delayMs);
          continue;
        }
        throw new NotionAPIError(429, errorCode, errorMessage);
      }

      // Server errors — retry with exponential backoff
      if (response.status >= 500) {
        if (attempt < MAX_RETRIES - 1) {
          const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
          await this.sleep(delayMs);
          continue;
        }
        throw new NotionAPIError(response.status, errorCode, errorMessage);
      }

      // Client errors (4xx except 429) — do NOT retry
      throw new NotionAPIError(response.status, errorCode, errorMessage);
    }

    // Should not reach here, but satisfy TypeScript
    throw new Error('Unexpected: exceeded retry loop without returning or throwing');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
