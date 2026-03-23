import { chatRoute } from '@mastra/ai-sdk';
import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import { CloudExporter, DefaultExporter, Observability, SensitiveDataFilter } from '@mastra/observability';

import { weatherAgent } from './agents/weather-agent';
import { weatherWorkflow } from './workflows/weather-workflow';
import store from './storage/pgsql';
import { searchAgent } from './agents/search-agent';
import { notionOrchestrator } from './agents/notion';

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent, searchAgent, notionOrchestrator },
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
