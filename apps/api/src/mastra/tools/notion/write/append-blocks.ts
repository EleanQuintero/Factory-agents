import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { appendBlocksInputSchema } from '../shared/schemas/write';
import { notionClient } from '../shared/client';

export const appendBlocks = createTool({
  id: 'notion-append-blocks',
  description:
    'Append content blocks to a Notion page or block. Accepts a JSON array of block objects. Maximum 100 blocks per request.',
  inputSchema: appendBlocksInputSchema,
  outputSchema: z.record(z.string(), z.any()),
  execute: async (input) => {
    const parsed = JSON.parse(input.children);
    if (!Array.isArray(parsed)) {
      throw new Error('children must be a JSON array of block objects');
    }
    if (parsed.length > 100) {
      throw new Error('Maximum 100 blocks per request');
    }

    return await notionClient.request(
      'PATCH',
      `/v1/blocks/${input.block_id}/children`,
      { children: parsed },
    );
  },
});
