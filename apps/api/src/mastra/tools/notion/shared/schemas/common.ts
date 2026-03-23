import { z } from 'zod';

/** Notion ID: UUID with dashes or 32-char hex string without dashes */
export const notionId = z
  .string()
  .describe('Notion object ID (UUID format with or without dashes)');

/** Pagination parameters shared across list/query endpoints */
export const paginationParams = z.object({
  page_size: z
    .number()
    .optional()
    .describe('Number of results to return (max 100, default 100)'),
  start_cursor: z
    .string()
    .optional()
    .describe('Cursor for the next page of results'),
});

/** Rich text input for creating/updating text content */
export const richTextInput = z
  .string()
  .describe('Plain text content for a rich text field');

/** Emoji string for page/database icons */
export const emoji = z
  .string()
  .describe('Single emoji character for use as an icon');
