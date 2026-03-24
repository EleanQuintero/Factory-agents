import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getBlockInputSchema } from '../shared/schemas/search';
import { getNotionClient } from '../shared/client';

export const getBlock = createTool({
  id: 'notion-get-block',
  description:
    'Retrieve a single block by ID. Returns the block object with its type, content, and has_children flag.',
  inputSchema: getBlockInputSchema,
  outputSchema: z.record(z.string(), z.unknown()),
  execute: async (inputData) => {
    try {
      const result = await getNotionClient().request(
        'GET',
        `/v1/blocks/${inputData.block_id}`,
      );
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
});
