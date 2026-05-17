import type { Request, Response } from 'express';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { loadSwarm } from '../SwarmLoader';
import { buildToolRegistry } from '../swarm-config.schema';
import { validateCreateAgentRequest, validateChatRequest } from '../validators';
import type { SwarmConfig } from '../schema';
import type { Agent } from '@mastra/core/agent';
import type { Tool } from '@mastra/core/tools';

// Re-export types
export type { VmStatus } from '../types';

// Tool registry — built from compiled tools.mjs
// tools.mjs is part of the compiled output (.mastra/output/tools.mjs)
// This contains all available tools (notion, email, tavily, etc.)
async function buildToolRegistryFromOutput(): Promise<Map<string, Tool>> {
  try {
    // When node runs vm-server.mjs, cwd is /app/mastra/output (set by WORKDIR in Dockerfile)
    // tools.mjs is in the same directory
    const toolsPath = path.resolve('tools.mjs');
    const { tools } = await import(`file://${toolsPath}`);
    const registry = new Map<string, Tool>();
    for (const tool of tools) {
      registry.set(tool.id, tool);
    }
    return registry;
  } catch (error) {
    // If tools fail to load (e.g., React dependency issues), use empty registry
    console.warn('[agent.controller] Tool registry failed to load, using empty registry:', error instanceof Error ? error.message : String(error));
    return new Map<string, Tool>();
  }
}

// In-memory cache for the current agent (1 per VM)
let currentAgent: Agent | null = null;
let currentSwarmConfig: SwarmConfig | null = null;
let currentUserId: string | null = null;
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

    const { swarm_config, userId } = validateCreateAgentRequest(req.body);

    // Load swarm with tool registry
    const loadedSwarm = loadSwarm(swarm_config, { toolRegistry, userId });

    // Cache the orchestrator (1 per VM)
    currentAgent = loadedSwarm.orchestrator;
    currentSwarmConfig = swarm_config;
    currentUserId = userId;

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

    const { swarm_config, userId } = validateCreateAgentRequest(req.body);

    // Reload swarm with new config
    const loadedSwarm = loadSwarm(swarm_config, { toolRegistry, userId });

    currentAgent = loadedSwarm.orchestrator;
    currentSwarmConfig = swarm_config;
    currentUserId = userId;

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

    const thread = threadId ?? randomUUID();
    const resource = currentUserId ?? agentId;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Thread-Id', thread);

    const stream = await currentAgent.stream(prompt, {
      memory: { thread, resource },
    });

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
      userId: currentUserId,
      ready: currentAgent !== null,
    },
  });
}