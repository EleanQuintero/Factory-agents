import { Agent } from '@mastra/core/agent';
import { createPage, updatePage, appendBlocks, updateBlock, deleteBlock, archivePage, createComment } from '../../tools/notion/write';

export const notionWriteAgent = new Agent({
  id: 'notion-write-agent',
  name: 'Notion Write Agent',
  description: 'Write operations for Notion. Creates and updates pages, appends/updates/deletes blocks, archives pages, and adds comments. Use for any mutation that changes content in the workspace.',
  instructions: `You are a Notion workspace writer. Use your tools to create, update, and delete content in the workspace.
When creating pages, ensure you have a valid parent (page ID or database ID). When appending blocks, format the children array correctly.
For updating pages, only include the properties that need to change. Always confirm the operation result to the orchestrator.

Critical limits:
- Maximum 100 blocks per append request — split larger content into multiple calls
- Rich text content: max 2000 characters per text object
- URLs: max 2000 characters
- Block arrays support up to 2 levels of nesting
- Use null instead of empty strings for empty values

For detailed rich text format, block type structures, or other API specifics, use the skill tool to load "notion-api" and read its references (references/rich-text.md, references/block-types.md).`,
  model: 'anthropic/claude-haiku-4-5-20251001',
  tools: { createPage, updatePage, appendBlocks, updateBlock, deleteBlock, archivePage, createComment },
});
