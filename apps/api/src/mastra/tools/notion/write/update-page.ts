import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { updatePageInputSchema } from '../shared/schemas/write';
import { getNotionClient } from '../shared/client';

export const updatePage = createTool({
  id: 'notion-update-page',
  description:
    'Update a Notion page. Can change the title, icon, or any page/database-row properties.',
  inputSchema: updatePageInputSchema,
  outputSchema: z.record(z.string(), z.unknown()),
  execute: async (input) => {
    try {
      const body: Record<string, unknown> = {};

      // Build properties — include title update if provided
      const properties: Record<string, unknown> = input.properties
        ? { ...input.properties }
        : {};

      if (input.title) {
        properties['title'] = {
          title: [{ text: { content: input.title } }],
        };
      } else if (
        properties['title'] &&
        typeof properties['title'] === 'object' &&
        !Array.isArray(properties['title']) &&
        !(properties['title'] as Record<string, unknown>)['title']
      ) {
        // LLM passed title inside properties with wrong format — normalize it
        const raw = properties['title'] as Record<string, unknown>;
        const text =
          typeof raw === 'string'
            ? raw
            : (raw as { text?: { content?: string } })?.text?.content ??
              String(raw);
        properties['title'] = {
          title: [{ text: { content: text } }],
        };
      }

      if (Object.keys(properties).length > 0) {
        body.properties = properties;
      }

      // Set icon if provided
      if (input.icon_emoji) {
        body.icon = { type: 'emoji', emoji: input.icon_emoji };
      }

      const result = await getNotionClient().request(
        'PATCH',
        `/v1/pages/${input.page_id}`,
        body,
      );
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
});
