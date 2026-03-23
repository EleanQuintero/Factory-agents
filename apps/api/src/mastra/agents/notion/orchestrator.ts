import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { notionSearchAgent } from './search-agent';
import { notionWriteAgent } from './write-agent';
import { notionDatabaseAgent } from './database-agent';

export const notionOrchestrator = new Agent({
  id: 'notion-orchestrator',
  name: 'Notion Orchestrator',
  instructions: `You coordinate Notion workspace operations using specialized sub-agents.

Available agents:
- notion-search-agent: READ-ONLY. Search pages/databases, get page content, retrieve blocks, fetch database schemas, get comments.
- notion-write-agent: WRITE operations. Create/update pages, append/update/delete blocks, archive pages, add comments.
- notion-database-agent: DATABASE operations. Query databases with filters/sorts, create/update databases, create data sources.

Delegation strategy:
1. For reading/searching: delegate to notion-search-agent
2. For creating/updating/deleting content: delegate to notion-write-agent
3. For querying databases or managing database schemas: delegate to notion-database-agent
4. For complex tasks: chain delegations (e.g., search first, then write)

Always respond in the same language the user used.`,
  model: 'google/gemini-2.5-flash',
  agents: { notionSearchAgent, notionWriteAgent, notionDatabaseAgent },
  memory: new Memory(),
});
