import type { Request, Response } from 'express';
import { loadSwarm } from '../SwarmLoader';
import { buildToolRegistry } from '../swarm-config.schema';
import { validateCreateAgentRequest, validateChatRequest } from '../validators';
import type { SwarmConfig } from '@factory/contracts';
import type { Agent } from '@mastra/core/agent';
import type { Tool } from '@mastra/core/tools';

// Re-export types
export type { VmStatus } from '../types';

// Tool registry — built from compiled tools.mjs
// tools.mjs is part of the compiled output (.mastra/output/tools.mjs)
// This contains all available tools (notion, email, tavily, etc.)
async function buildToolRegistryFromOutput(): Promise<Map<string, Tool>> {
  const { tools } = await import('../../.mastra/output/tools.mjs');
  const registry = new Map<string, Tool>();
  for (const tool of tools) {
    registry.set(tool.id, tool);
  }
  return registry;
}

// In-memory cache for the current agent (1 per VM)
let currentAgent: Agent | null = null;
let currentSwarmConfig: SwarmConfig | null = null;
let toolRegistry: Map<string, Tool> | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// GET /health
// ─────────────────────────────────────────────────────────────────────────────

export async function handleHealth(_req: Request, res: Response): Promise<void> {
  res.json({ status: 'ok', timestamp: Date.now() });
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Agent
// POST /agent/create
// ─────────────────────────────────────────────────────────────────────────────

export async function handleCreateAgent(req: Request, res: Response): Promise<void> {
  try {
    // Initialize tool registry on first request
    if (!toolRegistry) {
      toolRegistry = await buildToolRegistryFromOutput();
    }

    const { swarm_config } = validateCreateAgentRequest(req.body);

    // Load swarm with tool registry
    const loadedSwarm = loadSwarm(swarm_config, { toolRegistry });

    // Cache the orchestrator (1 per VM)
    currentAgent = loadedSwarm.orchestrator;
    currentSwarmConfig = swarm_config;

    res.status(201).json({
      status: 'created',
      agentId: swarm_config.id,
      machineId: swarm_config.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({
      status: 'error',
      agentId: '',
      machineId: '',
      error: message,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Update Agent
// POST /agent/update
// ─────────────────────────────────────────────────────────────────────────────

export async function handleUpdateAgent(req: Request, res: Response): Promise<void> {
  try {
    if (!toolRegistry) {
      toolRegistry = await buildToolRegistryFromOutput();
    }

    const { swarm_config } = validateCreateAgentRequest(req.body);

    // Reload swarm with new config
    const loadedSwarm = loadSwarm(swarm_config, { toolRegistry });

    currentAgent = loadedSwarm.orchestrator;
    currentSwarmConfig = swarm_config;

    res.status(200).json({
      status: 'updated',
      agentId: swarm_config.id,
      machineId: swarm_config.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({
      status: 'error',
      agentId: '',
      machineId: '',
      error: message,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat
// POST /chat/:agentId
// ─────────────────────────────────────────────────────────────────────────────

export async function handleChat(req: Request, res: Response): Promise<void> {
  const { agentId } = req.params;

  if (!currentAgent) {
    res.status(400).json({
      status: 'error',
      agentId,
      machineId: '',
      error: 'Agent not initialized. POST /agent/create first.',
    });
    return;
  }

  try {
    const { prompt, threadId } = validateChatRequest(req.body);

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Stream the response
    const stream = await currentAgent.stream(prompt);

    for await (const chunk of stream.textStream) {
      res.write(chunk);
    }

    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (res.headersSent) {
      res.end(`\n\nError: ${message}`);
      return;
    }

    res.status(500).json({
      status: 'error',
      agentId,
      machineId: '',
      error: message,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Status
// GET /status
// ─────────────────────────────────────────────────────────────────────────────

export function handleStatus(_req: Request, res: Response): void {
  const memUsage = process.memoryUsage();

  res.json({
    status: 'ok',
    vm: {
      uptime: Math.floor(process.uptime()),
      memory: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    },
    agent: {
      agentId: currentSwarmConfig?.id ?? null,
      userId: null,
      ready: currentAgent !== null,
    },
  });
}