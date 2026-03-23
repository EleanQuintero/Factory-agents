import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createPageInputSchema } from '../shared/schemas/write';
import { notionClient } from '../shared/client';

export const createPage = createTool({
  id: 'notion-create-page',
  description:
    'Create a new page in Notion. Can create a page under a parent page or as a row in a database. Optionally includes initial content blocks.',
  inputSchema: createPageInputSchema,
  outputSchema: z.record(z.string(), z.any()),
  execute: async (input) => {
    const body: Record<string, unknown> = {
      parent: { [input.parent_type]: input.parent_id },
    };

    // Build properties — title takes precedence for the title property
    const properties: Record<string, unknown> = input.properties
      ? { ...input.properties }
      : {};

    if (input.title) {
      properties['title'] = {
        title: [{ text: { content: input.title } }],
      };
    }

    if (Object.keys(properties).length > 0) {
      body.properties = properties;
    }

    // Parse children JSON string if provided
    if (input.children) {
      const parsed = JSON.parse(input.children);
      if (!Array.isArray(parsed)) {
        throw new Error('children must be a JSON array of block objects');
      }
      if (parsed.length > 100) {
        throw new Error('Maximum 100 blocks per request');
      }
      body.children = parsed;
    }

    // Set icon if provided
    if (input.icon_emoji) {
      body.icon = { type: 'emoji', emoji: input.icon_emoji };
    }

    return await notionClient.request('POST', '/v1/pages', body);
  },
});
