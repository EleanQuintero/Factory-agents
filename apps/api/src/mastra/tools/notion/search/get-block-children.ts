import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getBlockChildrenInputSchema } from '../shared/schemas/search';
import { getNotionClient } from '../shared/client';

export const getBlockChildren = createTool({
  id: 'notion-get-block-children',
  description:
    'Retrieve the child blocks (content) of a page or block. Use a page ID to get page content. Supports pagination for large pages.',
  inputSchema: getBlockChildrenInputSchema,
  outputSchema: z.object({
    results: z.array(z.record(z.string(), z.unknown())),
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
  }),
  execute: async (inputData) => {
    try {
      const query: Record<string, string> = {};
      if (inputData.page_size !== undefined) {
        query.page_size = String(inputData.page_size);
      }
      if (inputData.start_cursor !== undefined) {
        query.start_cursor = inputData.start_cursor;
      }
      const result = await getNotionClient().request(
        'GET',
        `/v1/blocks/${inputData.block_id}/children`,
        undefined,
        query,
      );
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
});
