import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getPageInputSchema } from '../shared/schemas/search';
import { notionClient } from '../shared/client';

export const getPage = createTool({
  id: 'notion-get-page',
  description:
    'Retrieve a page and its properties from Notion by page ID. Returns properties, parent, timestamps, and URL — not page content (use getBlockChildren for content).',
  inputSchema: getPageInputSchema,
  outputSchema: z.record(z.string(), z.any()),
  execute: async (inputData) => {
    return await notionClient.request(
      'GET',
      `/v1/pages/${inputData.page_id}`,
    );
  },
});
