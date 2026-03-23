export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface INotionClient {
  request<T = Record<string, unknown>>(
    method: HttpMethod,
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, string>,
  ): Promise<T>;
}

export class NotionAPIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(`Notion API Error [${status}] ${code}: ${message}`);
    this.name = 'NotionAPIError';
  }
}
