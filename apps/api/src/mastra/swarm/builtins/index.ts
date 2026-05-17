import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { Composio } from '@composio/core';
import { MastraProvider } from '@composio/mastra';
import { z } from 'zod';
import type { WorkerConfig } from '../swarm-config.schema';

export type BuiltinFactory = (
  workerConfig: WorkerConfig,
  context: { userId: string }
) => Promise<Agent>;

const composioSearch: BuiltinFactory = async (workerConfig, { userId }) => {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error('[builtin:composio-search] COMPOSIO_API_KEY is not set');
  }

  const client = new Composio<MastraProvider>({
    apiKey,
    provider: new MastraProvider(),
  });

  const session = await client.create(userId, {
    toolkits: ['composio_search'],
    tools: {
      composio_search: ['COMPOSIO_SEARCH_WEB', 'COMPOSIO_SEARCH_FETCH_URL_CONTENT'],
    },
  });

  const rawTools = await session.tools();
  // workaround del bug de outputSchema en @composio/mastra@0.6.6
  for (const tool of Object.values(rawTools)) {
    (tool as { outputSchema?: unknown }).outputSchema = undefined;
  }

  return new Agent({
    id: workerConfig.id,
    name: workerConfig.name,
    description: workerConfig.role,
    instructions:
      workerConfig.instructions ??
      'Sos un agente de búsqueda web. Usá tus tools para encontrar información actual y resumí los resultados de forma clara y concisa. Citá las fuentes.',
    model: workerConfig.model ?? 'anthropic/claude-haiku-4-5-20251001',
    tools: rawTools,
  });
};

const resendEmail: BuiltinFactory = async (workerConfig) => {
  const sendTool = createTool({
    id: 'send-email',
    description:
      'Envía un email vía Resend. Recibe destinatario, asunto y cuerpo HTML.',
    inputSchema: z.object({
      to: z
        .string()
        .email()
        .describe('Email del destinatario'),
      subject: z.string().describe('Asunto del email'),
      html: z
        .string()
        .describe('Cuerpo del email en HTML (puede ser HTML simple sin templates)'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      emailId: z.string().optional(),
      error: z.string().optional(),
    }),
    execute: async (input) => {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        return { success: false, error: 'RESEND_API_KEY is not set' };
      }
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: [input.to],
            subject: input.subject,
            html: input.html,
          }),
        });

        const payload = (await res.json()) as { id?: string; message?: string; name?: string };
        if (!res.ok) {
          return { success: false, error: payload.message ?? `HTTP ${res.status}` };
        }
        return { success: true, emailId: payload.id };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
      }
    },
  });

  return new Agent({
    id: workerConfig.id,
    name: workerConfig.name,
    description: workerConfig.role,
    instructions:
      workerConfig.instructions ??
      'Sos un agente que envía emails. Cuando te pidan mandar un email, usá tu tool `send-email` con un HTML simple y bien formateado. No inventes destinatarios — usá los que te pase el orquestador.',
    model: workerConfig.model ?? 'anthropic/claude-haiku-4-5-20251001',
    tools: { 'send-email': sendTool },
  });
};

export const BUILTIN_WORKERS: Record<string, BuiltinFactory> = {
  'composio-search': composioSearch,
  'resend-email': resendEmail,
};

export function isBuiltinWorker(id: string): boolean {
  return id in BUILTIN_WORKERS;
}
