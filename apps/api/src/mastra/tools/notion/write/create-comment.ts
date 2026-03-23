import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createCommentInputSchema } from '../shared/schemas/write';
import { notionClient } from '../shared/client';

export const createComment = createTool({
  id: 'notion-create-comment',
  description:
    'Add a comment to a Notion page or reply to an existing discussion thread.',
  inputSchema: createCommentInputSchema,
  outputSchema: z.record(z.string(), z.any()),
  execute: async (input) => {
    const body: Record<string, unknown> = {
      rich_text: [{ type: 'text', text: { content: input.text } }],
    };

    if (input.parent_type === 'page_id') {
      body.parent = { page_id: input.parent_id };
    } else {
      body.discussion_id = input.parent_id;
    }

    return await notionClient.request('POST', '/v1/comments', body);
  },
});
