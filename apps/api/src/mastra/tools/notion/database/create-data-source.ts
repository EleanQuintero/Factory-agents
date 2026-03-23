import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createDataSourceInputSchema } from '../shared/schemas/database';
import { notionClient } from '../shared/client';

export const createDataSource = createTool({
  id: 'notion-create-data-source',
  description:
    'Create a new data source (table) within an existing Notion database. Requires API version 2025-09-03 or later.',
  inputSchema: createDataSourceInputSchema,
  outputSchema: z.record(z.string(), z.any()),
  execute: async (input) => {
    const body: Record<string, unknown> = {
      parent: { type: 'database_id', database_id: input.database_id },
      title: [{ type: 'text', text: { content: input.title } }],
      properties: input.properties,
    };

    return await notionClient.request('POST', '/v1/data_sources', body);
  },
});
