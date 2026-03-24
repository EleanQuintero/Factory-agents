import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { updateDatabaseInputSchema } from '../shared/schemas/database';
import { getNotionClient } from '../shared/client';

export const updateDatabase = createTool({
  id: 'notion-update-database',
  description:
    'Update an existing database title, description, or property schema.',
  inputSchema: updateDatabaseInputSchema,
  outputSchema: z.record(z.string(), z.unknown()),
  execute: async (input) => {
    try {
      const body: Record<string, unknown> = {};

      if (input.title !== undefined) {
        body.title = [{ type: 'text', text: { content: input.title } }];
      }
      if (input.description !== undefined) {
        body.description = [{ type: 'text', text: { content: input.description } }];
      }
      if (input.properties !== undefined) {
        body.properties = input.properties;
      }

      const result = await getNotionClient().request(
        'PATCH',
        `/v1/databases/${input.database_id}`,
        body,
      );
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
});
