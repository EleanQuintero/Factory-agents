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

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent, searchAgent, notionOrchestrator, notionSearchAgent, notionWriteAgent, notionDatabaseAgent, japaneseSenseiOrchestrator, emailAgent },
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
    ],
  },
  storage: store
  ,
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
