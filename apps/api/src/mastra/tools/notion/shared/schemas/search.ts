import { z } from 'zod';
import { notionId } from './common';

/** Input schema for the searchPages tool — POST /v1/search */
export const searchPagesInputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe('Search query string to match against page and database titles'),
  filter_object: z
    .enum(['page', 'database'])
    .optional()
    .describe('Filter results by object type: "page" or "database"'),
  sort_direction: z
    .enum(['ascending', 'descending'])
    .optional()
    .describe('Sort direction by last_edited_time'),
  page_size: z
    .number()
    .optional()
    .describe('Number of results to return (max 100)'),
  start_cursor: z
    .string()
    .optional()
    .describe('Cursor for the next page of results'),
});

/** Input schema for the getPage tool — GET /v1/pages/{page_id} */
export const getPageInputSchema = z.object({
  page_id: notionId.describe('The ID of the page to retrieve'),
});

/** Input schema for the getBlockChildren tool — GET /v1/blocks/{block_id}/children */
export const getBlockChildrenInputSchema = z.object({
  block_id: notionId.describe(
    'The ID of the block or page whose children to retrieve',
  ),
  page_size: z
    .number()
    .optional()
    .describe('Number of child blocks to return (max 100)'),
  start_cursor: z
    .string()
    .optional()
    .describe('Cursor for the next page of results'),
});

/** Input schema for the getBlock tool — GET /v1/blocks/{block_id} */
export const getBlockInputSchema = z.object({
  block_id: notionId.describe('The ID of the block to retrieve'),
});

/** Input schema for the getDatabase tool — GET /v1/databases/{database_id} */
export const getDatabaseInputSchema = z.object({
  database_id: notionId.describe(
    'The ID of the database to retrieve schema and metadata for',
  ),
});

/** Input schema for the getComments tool — GET /v1/comments?block_id={block_id} */
export const getCommentsInputSchema = z.object({
  block_id: notionId.describe(
    'The ID of the block or page whose comments to retrieve',
  ),
  page_size: z
    .number()
    .optional()
    .describe('Number of comments to return (max 100)'),
  start_cursor: z
    .string()
    .optional()
    .describe('Cursor for the next page of results'),
});
