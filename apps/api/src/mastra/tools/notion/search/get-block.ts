import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getBlockInputSchema } from '../shared/schemas/search';
import { notionClient } from '../shared/client';

export const getBlock = createTool({
  id: 'notion-get-block',
  description:
    'Retrieve a single block by ID. Returns the block object with its type, content, and has_children flag.',
  inputSchema: getBlockInputSchema,
  outputSchema: z.record(z.string(), z.any()),
  execute: async (inputData) => {
    return await notionClient.request(
      'GET',
      `/v1/blocks/${inputData.block_id}`,
    );
  },
});
