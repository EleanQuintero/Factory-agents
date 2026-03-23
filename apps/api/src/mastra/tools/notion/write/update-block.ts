import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { updateBlockInputSchema } from '../shared/schemas/write';
import { notionClient } from '../shared/client';

export const updateBlock = createTool({
  id: 'notion-update-block',
  description:
    'Update a Notion block content. Provide the block type and new plain text content. The block rich text will be replaced entirely.',
  inputSchema: updateBlockInputSchema,
  outputSchema: z.record(z.string(), z.any()),
  execute: async (input) => {
    const body: Record<string, unknown> = {
      [input.type]: {
        rich_text: [{ type: 'text', text: { content: input.content } }],
      },
    };

    return await notionClient.request(
      'PATCH',
      `/v1/blocks/${input.block_id}`,
      body,
    );
  },
});
