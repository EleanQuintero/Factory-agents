import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { appendBlocksInputSchema } from '../shared/schemas/write';
import { getNotionClient } from '../shared/client';

export const appendBlocks = createTool({
  id: 'notion-append-blocks',
  description:
    'Append content blocks to a Notion page or block. Accepts a JSON array of block objects. Maximum 100 blocks per request.',
  inputSchema: appendBlocksInputSchema,
  outputSchema: z.record(z.string(), z.unknown()),
  execute: async (input) => {
    try {
      if (input.children.length > 100) {
        throw new Error('Maximum 100 blocks per request');
      }

      const result = await getNotionClient().request(
        'PATCH',
        `/v1/blocks/${input.block_id}/children`,
        { children: input.children },
      );
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
});
