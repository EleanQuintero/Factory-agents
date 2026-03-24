import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { queryDatabaseInputSchema } from '../shared/schemas/database';
import { getNotionClient } from '../shared/client';

export const queryDatabase = createTool({
  id: 'notion-query-database',
  description:
    'Query a Notion database with optional filters, sorts, and pagination. Returns matching rows (pages) from the database.',
  inputSchema: queryDatabaseInputSchema,
  outputSchema: z.record(z.string(), z.unknown()),
  execute: async (input) => {
    try {
      const body: Record<string, unknown> = {};

      if (input.filter) {
        body.filter = input.filter;
      }
      if (input.sorts) {
        body.sorts = input.sorts;
      }
      if (input.page_size !== undefined) {
        body.page_size = input.page_size;
      }
      if (input.start_cursor) {
        body.start_cursor = input.start_cursor;
      }

      const result = await getNotionClient().request(
        'POST',
        `/v1/databases/${input.database_id}/query`,
        Object.keys(body).length > 0 ? body : undefined,
      );
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
});
