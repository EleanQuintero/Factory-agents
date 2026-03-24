import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { deleteBlockInputSchema } from '../shared/schemas/write';
import { getNotionClient } from '../shared/client';

export const deleteBlock = createTool({
  id: 'notion-delete-block',
  description:
    'Delete a Notion block by moving it to trash (soft delete). The block can be restored later.',
  inputSchema: deleteBlockInputSchema,
  outputSchema: z.record(z.string(), z.unknown()),
  execute: async (input) => {
    try {
      const result = await getNotionClient().request(
        'DELETE',
        `/v1/blocks/${input.block_id}`,
      );
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
});
