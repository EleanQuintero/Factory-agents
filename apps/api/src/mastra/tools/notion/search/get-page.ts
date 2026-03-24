import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getPageInputSchema } from '../shared/schemas/search';
import { getNotionClient } from '../shared/client';

export const getPage = createTool({
  id: 'notion-get-page',
  description:
    'Retrieve a page and its properties from Notion by page ID. Returns properties, parent, timestamps, and URL — not page content (use getBlockChildren for content).',
  inputSchema: getPageInputSchema,
  outputSchema: z.record(z.string(), z.unknown()),
  execute: async (inputData) => {
    try {
      const result = await getNotionClient().request(
        'GET',
        `/v1/pages/${inputData.page_id}`,
      );
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
});
