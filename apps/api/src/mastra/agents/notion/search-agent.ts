import { Agent } from '@mastra/core/agent';
import { searchPages, getPage, getBlockChildren, getBlock, getDatabase, getComments } from '../../tools/notion/search';

export const notionSearchAgent = new Agent({
  id: 'notion-search-agent',
  name: 'Notion Search Agent',
  description: 'Read-only Notion operations. Searches pages and databases, retrieves page properties, reads block content, fetches database schemas, and gets comments. Cannot create, update, or delete anything.',
  instructions: `You are a Notion workspace reader. Use your tools to find and retrieve information from the workspace.
When searching, try the most specific query first. If the user asks for page content, use getBlockChildren with the page ID.
For database schemas, use getDatabase. Always return complete results to the orchestrator.

Pagination: When results include has_more=true, use the next_cursor value as start_cursor in a follow-up request to get the next page of results. Always check for pagination and fetch all pages unless told otherwise.

If you need detailed API reference for pagination or other Notion concepts, use the skill tool to load "notion-api".`,
  model: 'anthropic/claude-haiku-4-5-20251001',
  tools: { searchPages, getPage, getBlockChildren, getBlock, getDatabase, getComments },
});
