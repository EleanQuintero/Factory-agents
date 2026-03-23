import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { archivePageInputSchema } from '../shared/schemas/write';
import { notionClient } from '../shared/client';

export const archivePage = createTool({
  id: 'notion-archive-page',
  description:
    'Archive or unarchive a Notion page. Set archived to true to move to trash, false to restore.',
  inputSchema: archivePageInputSchema,
  outputSchema: z.record(z.string(), z.any()),
  execute: async (input) => {
    return await notionClient.request(
      'PATCH',
      `/v1/pages/${input.page_id}`,
      { archived: input.archived },
    );
  },
});
