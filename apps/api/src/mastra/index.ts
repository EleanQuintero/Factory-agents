import { chatRoute } from '@mastra/ai-sdk';
import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import { CloudExporter, DefaultExporter, Observability, SensitiveDataFilter } from '@mastra/observability';

import { weatherAgent } from './agents/weather-agent';
import { weatherWorkflow } from './workflows/weather-workflow';
import store from './storage/pgsql';
import { searchAgent } from './agents/search-agent';
import { notionOrchestrator, notionSearchAgent, notionWriteAgent, notionDatabaseAgent } from './agents/notion';
import { japaneseSenseiOrchestrator } from './agents/japanese-sensei';
import { emailAgent } from './agents/email';
import { workspace } from './workspace';

// Swarm engine imports
import { loadSwarm, buildToolRegistry } from './swarm';
import * as notionTools from './tools/notion';
import { weatherTool } from './tools/weather-tool';
import * as emailTools from './tools/email';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Registry for Swarm Engine
// ─────────────────────────────────────────────────────────────────────────────

const toolRegistry = buildToolRegistry({
  // Notion tools
  'notion-search-pages': notionTools.searchPages,
  'notion-get-page': notionTools.getPage,
  'notion-get-block-children': notionTools.getBlockChildren,
  'notion-get-block': notionTools.getBlock,
  'notion-get-database': notionTools.getDatabase,
  'notion-get-comments': notionTools.getComments,
  'notion-create-page': notionTools.createPage,
  'notion-update-page': notionTools.updatePage,
  'notion-append-blocks': notionTools.appendBlocks,
  'notion-update-block': notionTools.updateBlock,
  'notion-delete-block': notionTools.deleteBlock,
  'notion-archive-page': notionTools.archivePage,
  'notion-create-comment': notionTools.createComment,
  'notion-query-database': notionTools.queryDatabase,
  'notion-create-database': notionTools.createDatabase,
  'notion-update-database': notionTools.updateDatabase,
  // Weather tool
  'weather-tool': weatherTool,
  // Email tools
  'get-email-status': emailTools.getEmailStatus,
  'list-recent-emails': emailTools.listRecentEmails,
});

// ─────────────────────────────────────────────────────────────────────────────
// Static Agents (existing hardcoded agents)
// ─────────────────────────────────────────────────────────────────────────────

const staticAgents = {
  weatherAgent,
  searchAgent,
  notionOrchestrator,
  notionSearchAgent,
  notionWriteAgent,
  notionDatabaseAgent,
  japaneseSenseiOrchestrator,
  emailAgent,
};

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Agents (from Swarm Loader)
// ─────────────────────────────────────────────────────────────────────────────

let dynamicAgents: Record<string, any> = {};
let swarmLoadError: string | null = null;

try {
  // Load the example swarm config
  // In production, this could load multiple swarms from a configs directory
  const notionSwarmConfig = await import('./swarm/examples/notion-swarm.json').then(m => m.default);

  const loadedSwarm = loadSwarm(notionSwarmConfig, { toolRegistry });

  // Register the orchestrator as a dynamic agent
  dynamicAgents = {
    [loadedSwarm.orchestrator.id]: loadedSwarm.orchestrator,
  };

  // Log any workers that failed to initialize
  if (loadedSwarm.failedWorkers.length > 0) {
    console.warn('[index] Swarm loaded with excluded workers:', loadedSwarm.failedWorkers);
  }

  console.log(`[index] Swarm "${notionSwarmConfig.name}" loaded successfully`);
} catch (error) {
  // Swarm loading failed - log but don't crash startup
  swarmLoadError = error instanceof Error ? error.message : String(error);
  console.error(`[index] Failed to load swarm config: ${swarmLoadError}`);
  console.warn('[index] Continuing with static agents only (backward compatible)');
}

// ─────────────────────────────────────────────────────────────────────────────
// Mastra Instance
// ─────────────────────────────────────────────────────────────────────────────

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { ...staticAgents, ...dynamicAgents },
  workspace,
  server: {
    apiRoutes: [
      chatRoute({
        path: '/chat/weather',
        agent: 'weather-agent',
      }),
      chatRoute({
        path: '/chat/search',
        agent: 'search-agent',
      }),
      chatRoute({
        path: '/chat/notion',
        agent: 'notion-orchestrator',
      }),
      chatRoute({
        path: '/chat/japanese',
        agent: 'japanese-sensei',
      }),
      chatRoute({
        path: '/chat/email',
        agent: 'email-agent',
      }),
      // Dynamic swarm routes (if loaded)
      ...(dynamicAgents['notion-team-orchestrator']
        ? [
            chatRoute({
              path: '/chat/notion-team',
              agent: 'notion-team-orchestrator',
            }),
          ]
        : []),
    ],
  },
  storage: store,
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new DefaultExporter(), // Persists traces to storage for Mastra Studio
          new CloudExporter(), // Sends traces to Mastra Cloud (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
