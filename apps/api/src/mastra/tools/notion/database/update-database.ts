import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { updateDatabaseInputSchema } from '../shared/schemas/database';
import { notionClient } from '../shared/client';

export const updateDatabase = createTool({
  id: 'notion-update-database',
  description:
    'Update an existing database title, description, or property schema.',
  inputSchema: updateDatabaseInputSchema,
  outputSchema: z.record(z.string(), z.any()),
  execute: async (input) => {
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

    return await notionClient.request(
      'PATCH',
      `/v1/databases/${input.database_id}`,
      body,
    );
  },
});
