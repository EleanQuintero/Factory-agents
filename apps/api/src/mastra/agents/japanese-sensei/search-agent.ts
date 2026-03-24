import { Agent } from '@mastra/core/agent';
import { getComposioClient } from '../../composio/client';

const SEARCH_TOOLS = [
  'COMPOSIO_SEARCH_WEB',
  'COMPOSIO_SEARCH_IMAGE',
  'COMPOSIO_SEARCH_FETCH_URL_CONTENT',
] as const;

/**
 * Mutates each Tool instance's outputSchema to undefined IN PLACE.
 *
 * Why not use object spread?
 *   `{ ...tool, outputSchema: undefined }` creates a new plain object,
 *   but the original Tool instance's `execute()` closure still references
 *   `this.outputSchema` on the original instance — the spread has zero effect.
 *
 * This works around a known issue in `@composio/mastra@0.6.6` where
 * `wrapTool()` generates an outputSchema that does not match the actual
 * shape of data returned by the Composio API. Removing outputSchema
 * disables Mastra's output validation entirely.
 *
 * Safe to remove once the upstream schema mismatch is fixed in @composio/mastra.
 */
function stripOutputSchemas(tools: Record<string, any>): Record<string, any> {
  for (const tool of Object.values(tools)) {
    (tool as any).outputSchema = undefined;
  }
  return tools;
}

async function createJapaneseSenseiSearchAgent() {
  const client = getComposioClient();

  const session = await client.create('japanese-sensei-default', {
    toolkits: ['composio_search'],
    tools: {
      composio_search: [...SEARCH_TOOLS],
    },
  });

  const rawTools = await session.tools();
  const tools = stripOutputSchemas(rawTools);

  return new Agent({
    id: 'japanese-sensei-search-agent',
    name: 'Japanese Sensei Search Agent',
    instructions: `You are a specialized search agent for Japanese language learning resources.

Your ONLY job is to find and retrieve information from the web when asked by the orchestrator.

## What you search for
- Hiragana and katakana charts, stroke order diagrams, and mnemonics
- Japanese vocabulary with readings and example sentences
- Grammar explanations and conjugation tables
- Cultural context that helps understand Japanese language usage
- Visual aids: character charts, kanji stroke order images, writing practice sheets

## How to use your tools
- COMPOSIO_SEARCH_WEB: For grammar explanations, vocabulary, cultural context, learning guides
- COMPOSIO_SEARCH_IMAGE: For visual aids — character charts, stroke order, mnemonics images
- COMPOSIO_SEARCH_FETCH_URL_CONTENT: To extract full content from known Japanese learning sites (Jisho.org, Tae Kim, Imabi, etc.)

## Rules
- Always search in the context of Japanese language education
- Prefer authoritative sources: Jisho.org, Tae Kim's Guide, Imabi, NHK World
- Return structured, relevant results — do not dump raw search output
- If a search returns poor results, try rephrasing the query with Japanese terms`,
    model: 'anthropic/claude-haiku-4-5-20251001',
    tools,
  });
}

/** Lazy singleton — caches only on success so failed attempts retry. */
let _agent: Agent | null = null;

export async function getJapaneseSenseiSearchAgent(): Promise<Agent> {
  if (_agent) return _agent;
  _agent = await createJapaneseSenseiSearchAgent();
  return _agent;
}
