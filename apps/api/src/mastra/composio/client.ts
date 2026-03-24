import { Composio } from '@composio/core';
import { MastraProvider } from '@composio/mastra';

let _client: Composio<MastraProvider> | null = null;

/**
 * Lazy factory for Composio client. Nothing executes at import time.
 * Caches singleton only on success so failed attempts retry on next call.
 */
export function getComposioClient(): Composio<MastraProvider> {
  if (_client) return _client;

  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error(
      'COMPOSIO_API_KEY is not set. Run `composio init` in the project directory or set it in your .env file.'
    );
  }

  _client = new Composio<MastraProvider>({
    apiKey,
    provider: new MastraProvider(),
  });

  return _client;
}
