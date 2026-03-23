import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { searchPagesInputSchema } from '../shared/schemas/search';
import { notionClient } from '../shared/client';

export const searchPages = createTool({
  id: 'notion-search-pages',
  description:
    'Search across all accessible pages and databases in the Notion workspace',
  inputSchema: searchPagesInputSchema,
  outputSchema: z.object({
    results: z.array(z.record(z.string(), z.any())),
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
  }),
  execute: async (inputData) => {
    return await notionClient.request('POST', '/v1/search', {
      query: inputData.query,
      filter: inputData.filter_object
        ? { property: 'object', value: inputData.filter_object }
        : undefined,
      sort: inputData.sort_direction
        ? { direction: inputData.sort_direction, timestamp: 'last_edited_time' }
        : undefined,
      page_size: inputData.page_size,
      start_cursor: inputData.start_cursor,
    });
  },
});
