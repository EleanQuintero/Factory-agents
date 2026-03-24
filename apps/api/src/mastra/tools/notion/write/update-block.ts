import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { updateBlockInputSchema } from '../shared/schemas/write';
import { getNotionClient } from '../shared/client';

export const updateBlock = createTool({
  id: 'notion-update-block',
  description:
    'Update a Notion block content. Provide the block type and new plain text content. The block rich text will be replaced entirely.',
  inputSchema: updateBlockInputSchema,
  outputSchema: z.record(z.string(), z.unknown()),
  execute: async (input) => {
    try {
      const body: Record<string, unknown> = {
        [input.type]: {
          rich_text: [{ type: 'text', text: { content: input.content } }],
        },
      };

      const result = await getNotionClient().request(
        'PATCH',
        `/v1/blocks/${input.block_id}`,
        body,
      );
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
});
