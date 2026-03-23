import { z } from 'zod';
import { notionId } from './common';

/** Input schema for the queryDatabase tool — POST /v1/databases/{database_id}/query */
export const queryDatabaseInputSchema = z.object({
  database_id: notionId.describe('The ID of the database to query'),
  filter: z
    .record(z.string(), z.any())
    .optional()
    .describe(
      'Filter object following the Notion filter format. Example: { "property": "Status", "select": { "equals": "Done" } }',
    ),
  sorts: z
    .array(z.record(z.string(), z.any()))
    .optional()
    .describe(
      'Array of sort objects. Example: [{ "property": "Created", "direction": "descending" }]',
    ),
  page_size: z
    .number()
    .optional()
    .describe('Number of results to return (max 100)'),
  start_cursor: z
    .string()
    .optional()
    .describe('Cursor for the next page of results'),
});

/** Input schema for the createDatabase tool — POST /v1/databases */
export const createDatabaseInputSchema = z.object({
  parent_page_id: notionId.describe(
    'The ID of the parent page where the database will be created',
  ),
  title: z
    .string()
    .describe('Title for the new database'),
  properties: z
    .record(z.string(), z.any())
    .describe(
      'Database property schema as a JSON object. Keys are property names, values are property configurations. Example: { "Name": { "title": {} }, "Status": { "select": { "options": [{ "name": "To Do" }] } } }',
    ),
  is_inline: z
    .boolean()
    .optional()
    .describe('Whether the database should be inline (default: true)'),
});

/** Input schema for the updateDatabase tool — PATCH /v1/databases/{database_id} */
export const updateDatabaseInputSchema = z.object({
  database_id: notionId.describe('The ID of the database to update'),
  title: z
    .string()
    .optional()
    .describe('New title for the database'),
  description: z
    .string()
    .optional()
    .describe('New description for the database'),
  properties: z
    .record(z.string(), z.any())
    .optional()
    .describe(
      'Database property schema updates as a JSON object. Keys are property names, values are property configurations.',
    ),
});

/** Input schema for the createDataSource tool — POST /v1/data_sources */
export const createDataSourceInputSchema = z.object({
  database_id: notionId.describe(
    'The ID of the parent database for the new data source',
  ),
  title: z
    .string()
    .describe('Title for the new data source'),
  properties: z
    .record(z.string(), z.any())
    .describe(
      'Data source property schema as a JSON object. Keys are property names, values are property configurations.',
    ),
});
