import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getCommentsInputSchema } from '../shared/schemas/search';
import { getNotionClient } from '../shared/client';

export const getComments = createTool({
  id: 'notion-get-comments',
  description:
    'Retrieve comments on a page or block. Use a page ID to get page-level comments. Supports pagination.',
  inputSchema: getCommentsInputSchema,
  outputSchema: z.object({
    results: z.array(z.record(z.string(), z.unknown())),
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
  }),
  execute: async (inputData) => {
    try {
      const query: Record<string, string> = {
        block_id: inputData.block_id,
      };
      if (inputData.page_size !== undefined) {
        query.page_size = String(inputData.page_size);
      }
      if (inputData.start_cursor !== undefined) {
        query.start_cursor = inputData.start_cursor;
      }
      const result = await getNotionClient().request('GET', '/v1/comments', undefined, query);
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
});
