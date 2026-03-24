import { Agent } from '@mastra/core/agent';
import { queryDatabase, createDatabase, updateDatabase } from '../../tools/notion/database';

export const notionDatabaseAgent = new Agent({
  id: 'notion-database-agent',
  name: 'Notion Database Agent',
  description: 'Database operations for Notion. Queries databases with filters and sorts, creates new databases with property schemas, and updates database configurations. Use for any structured data operations.',
  instructions: `You are a Notion database specialist. Use your tools to query, create, and manage databases in the workspace.
When querying, construct appropriate filters and sorts based on the user's request. For creating databases, ensure the property schema matches the intended structure.
Always return query results completely to the orchestrator.

Filter rules:
- Match filter type to property type: use "rich_text" filter for text properties, "number" for numbers, "select" for selects, etc.
- Compound filters use "and" or "or" arrays
- Timestamps support "before", "after", "on_or_before", "on_or_after", "past_week", "next_week", etc.
- Every database must have exactly ONE title property
- Pagination: check has_more and use start_cursor for next pages

For detailed filter/sort syntax and property type schemas, use the skill tool to load "notion-api" and read references/filters-and-sorts.md and references/property-types.md.`,
  model: 'anthropic/claude-haiku-4-5-20251001',
  tools: { queryDatabase, createDatabase, updateDatabase },
});
