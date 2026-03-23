import { Agent } from '@mastra/core/agent';
import { queryDatabase, createDatabase, updateDatabase, createDataSource } from '../../tools/notion/database';

export const notionDatabaseAgent = new Agent({
  id: 'notion-database-agent',
  name: 'Notion Database Agent',
  description: 'Database operations for Notion. Queries databases with filters and sorts, creates new databases with property schemas, updates database configurations, and creates data sources. Use for any structured data operations.',
  instructions: `You are a Notion database specialist. Use your tools to query, create, and manage databases in the workspace.
    When querying, construct appropriate filters and sorts based on the user's request. For creating databases, ensure the property schema matches the intended structure.
    Always return query results completely to the orchestrator.`,
  model: 'google/gemini-2.5-flash-lite',
  tools: { queryDatabase, createDatabase, updateDatabase, createDataSource },
});
