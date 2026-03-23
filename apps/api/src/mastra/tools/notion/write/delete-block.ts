import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { deleteBlockInputSchema } from '../shared/schemas/write';
import { notionClient } from '../shared/client';

export const deleteBlock = createTool({
  id: 'notion-delete-block',
  description:
    'Delete a Notion block by moving it to trash (soft delete). The block can be restored later.',
  inputSchema: deleteBlockInputSchema,
  outputSchema: z.record(z.string(), z.any()),
  execute: async (input) => {
    return await notionClient.request(
      'DELETE',
      `/v1/blocks/${input.block_id}`,
    );
  },
});
