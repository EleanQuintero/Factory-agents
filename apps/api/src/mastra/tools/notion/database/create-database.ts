import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createDatabaseInputSchema } from '../shared/schemas/database';
import { notionClient } from '../shared/client';

export const createDatabase = createTool({
  id: 'notion-create-database',
  description:
    'Create a new inline database under a parent page with a specified title and property schema.',
  inputSchema: createDatabaseInputSchema,
  outputSchema: z.record(z.string(), z.any()),
  execute: async (input) => {
    const body: Record<string, unknown> = {
      parent: { page_id: input.parent_page_id },
      title: [{ type: 'text', text: { content: input.title } }],
      is_inline: input.is_inline ?? true,
      initial_data_source: {
        properties: input.properties,
      },
    };

    return await notionClient.request('POST', '/v1/databases', body);
  },
});
