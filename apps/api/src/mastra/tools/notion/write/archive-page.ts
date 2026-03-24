import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { archivePageInputSchema } from '../shared/schemas/write';
import { getNotionClient } from '../shared/client';

export const archivePage = createTool({
  id: 'notion-archive-page',
  description:
    'Archive or unarchive a Notion page. Set archived to true to move to trash, false to restore.',
  inputSchema: archivePageInputSchema,
  outputSchema: z.record(z.string(), z.unknown()),
  execute: async (input) => {
    try {
      const result = await getNotionClient().request(
        'PATCH',
        `/v1/pages/${input.page_id}`,
        { archived: input.archived },
      );
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
});
