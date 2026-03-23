import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDatabaseInputSchema } from '../shared/schemas/search';
import { notionClient } from '../shared/client';

export const getDatabase = createTool({
  id: 'notion-get-database',
  description:
    'Retrieve a database schema and metadata by database ID. Returns the database title, description, property schema, and data sources.',
  inputSchema: getDatabaseInputSchema,
  outputSchema: z.record(z.string(), z.any()),
  execute: async (inputData) => {
    return await notionClient.request(
      'GET',
      `/v1/databases/${inputData.database_id}`,
    );
  },
});
