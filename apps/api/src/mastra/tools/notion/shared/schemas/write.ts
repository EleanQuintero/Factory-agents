import { z } from 'zod';
import { notionId } from './common';

/** Input schema for the createPage tool — POST /v1/pages */
export const createPageInputSchema = z.object({
  parent_type: z
    .enum(['page_id', 'database_id'])
    .describe('Type of parent: "page_id" for a page, "database_id" for a database'),
  parent_id: notionId.describe('The ID of the parent page or database'),
  title: z
    .string()
    .optional()
    .describe('Title for the new page (used as the title property)'),
  properties: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Page properties as a JSON object. For database rows, keys are property names and values follow the Notion property value format.',
    ),
  children: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe(
      'Array of Notion block objects to add as page content. Max 100 blocks per request.',
    ),
  icon_emoji: z
    .string()
    .optional()
    .describe('Emoji character to set as the page icon'),
});

/** Input schema for the updatePage tool — PATCH /v1/pages/{page_id} */
export const updatePageInputSchema = z.object({
  page_id: notionId.describe('The ID of the page to update'),
  title: z
    .string()
    .optional()
    .describe('New title for the page'),
  icon_emoji: z
    .string()
    .optional()
    .describe('Emoji character to set as the page icon'),
  properties: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Page properties to update as a JSON object. Keys are property names and values follow the Notion property value format.',
    ),
});

/** Input schema for the appendBlocks tool — PATCH /v1/blocks/{block_id}/children */
export const appendBlocksInputSchema = z.object({
  block_id: notionId.describe(
    'The ID of the page or block to append children to',
  ),
  children: z
    .array(z.record(z.string(), z.unknown()))
    .describe(
      'Array of Notion block objects to append. Max 100 blocks per request.',
    ),
});

/** Input schema for the updateBlock tool — PATCH /v1/blocks/{block_id} */
export const updateBlockInputSchema = z.object({
  block_id: notionId.describe('The ID of the block to update'),
  type: z
    .string()
    .describe(
      'The block type (e.g., "paragraph", "heading_1", "to_do", "bulleted_list_item")',
    ),
  content: z
    .string()
    .describe('The new plain text content for the block'),
});

/** Input schema for the deleteBlock tool — DELETE /v1/blocks/{block_id} */
export const deleteBlockInputSchema = z.object({
  block_id: notionId.describe('The ID of the block to delete (move to trash)'),
});

/** Input schema for the archivePage tool — PATCH /v1/pages/{page_id} */
export const archivePageInputSchema = z.object({
  page_id: notionId.describe('The ID of the page to archive or unarchive'),
  archived: z
    .boolean()
    .describe('Set to true to archive (trash), false to unarchive (restore)'),
});

/** Input schema for the createComment tool — POST /v1/comments */
export const createCommentInputSchema = z.object({
  parent_type: z
    .enum(['page_id', 'discussion_id'])
    .describe(
      'Type of parent: "page_id" for a page-level comment, "discussion_id" to reply to an existing discussion',
    ),
  parent_id: notionId.describe(
    'The ID of the page or discussion thread to comment on',
  ),
  text: z
    .string()
    .describe('The plain text content of the comment'),
});
