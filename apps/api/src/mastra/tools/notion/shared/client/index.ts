export { NotionAPIClient } from './notion-client';
export { NotionAPIError } from './types';
export type { INotionClient, HttpMethod } from './types';

import { NotionAPIClient } from './notion-client';

export const notionClient = new NotionAPIClient();
