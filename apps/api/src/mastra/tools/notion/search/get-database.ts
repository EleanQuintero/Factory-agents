import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDatabaseInputSchema } from '../shared/schemas/search';
import { getNotionClient } from '../shared/client';

export const getDatabase = createTool({
  id: 'notion-get-database',
  description:
    'Retrieve a database schema and metadata by database ID. Returns the database title, description, property schema, and data sources.',
  inputSchema: getDatabaseInputSchema,
  outputSchema: z.record(z.string(), z.unknown()),
  execute: async (inputData) => {
    try {
      const result = await getNotionClient().request(
        'GET',
        `/v1/databases/${inputData.database_id}`,
      );
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
});
