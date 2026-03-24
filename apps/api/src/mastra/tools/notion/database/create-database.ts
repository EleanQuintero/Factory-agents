import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createDatabaseInputSchema } from '../shared/schemas/database';
import { getNotionClient } from '../shared/client';

export const createDatabase = createTool({
  id: 'notion-create-database',
  description:
    'Create a new inline database under a parent page with a specified title and property schema.',
  inputSchema: createDatabaseInputSchema,
  outputSchema: z.record(z.string(), z.unknown()),
  execute: async (input) => {
    try {
      const body: Record<string, unknown> = {
        parent: { page_id: input.parent_page_id },
        title: [{ type: 'text', text: { content: input.title } }],
        is_inline: input.is_inline ?? true,
        properties: input.properties,
      };

      const result = await getNotionClient().request('POST', '/v1/databases', body);
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
});
