export { NotionAPIClient } from './notion-client';
export { NotionAPIError } from './types';
export type { INotionClient, HttpMethod } from './types';

import { NotionAPIClient } from './notion-client';

let _client: NotionAPIClient | null = null;

export function getNotionClient(): NotionAPIClient {
  if (!_client) {
    _client = new NotionAPIClient();
  }
  return _client;
}
