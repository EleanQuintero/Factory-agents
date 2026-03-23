import { Agent } from '@mastra/core/agent';
import { createPage, updatePage, appendBlocks, updateBlock, deleteBlock, archivePage, createComment } from '../../tools/notion/write';

export const notionWriteAgent = new Agent({
  id: 'notion-write-agent',
  name: 'Notion Write Agent',
  description: 'Write operations for Notion. Creates and updates pages, appends/updates/deletes blocks, archives pages, and adds comments. Use for any mutation that changes content in the workspace.',
  instructions: `You are a Notion workspace writer. Use your tools to create, update, and delete content in the workspace.
    When creating pages, ensure you have a valid parent (page ID or database ID). When appending blocks, format the children array correctly.
    For updating pages, only include the properties that need to change. Always confirm the operation result to the orchestrator.`,
  model: 'google/gemini-2.5-flash-lite',
  tools: { createPage, updatePage, appendBlocks, updateBlock, deleteBlock, archivePage, createComment },
});
