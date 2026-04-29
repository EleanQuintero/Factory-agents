/**
 * SwarmLoader — Loads swarm configuration and creates orchestrator + workers
 *
 * Orchestrates the AgentFactory to create workers, then wires them to the
 * orchestrator via `agents: {}` (all sync) or `agents: async () => {}` (any async).
 */

import type { Agent } from '@mastra/core/agent';
import type {
  SwarmConfig,
  LoadedSwarm,
  ToolRegistry,
} from './swarm-config.schema';
import { AgentFactory } from './AgentFactory';

// ─────────────────────────────────────────────────────────────────────────────
// SwarmLoader
// ─────────────────────────────────────────────────────────────────────────────

export interface SwarmLoaderConfig {
  /** Registry of available tools for lookup by name */
  toolRegistry: ToolRegistry;
  /**
   * Base delay in ms for exponential backoff on async worker retries.
   * Default: 500ms
   */
  baseDelayMs?: number;
  /**
   * Maximum retry attempts for async worker initialization.
   * Default: 3
   */
  maxRetries?: number;
}

/**
 * Loads a swarm from configuration:
 * 1. Validates config structure
 * 2. Creates all workers via AgentFactory
 * 3. Creates orchestrator with workers wired via `agents` property
 * 4. Returns orchestrator + worker map + failed workers list
 *
 * Behavior:
 * - If orchestrator creation fails and failFast=true: throws error
 * - If orchestrator creation fails and failFast=false: returns partial swarm
 * - If optional worker fails: excludes it, logs warning, continues
 * - If required (non-optional) worker fails: fails if failFast=true, else logs error
 */
export function loadSwarm(config: SwarmConfig, loaderConfig?: SwarmLoaderConfig): LoadedSwarm {
  // Validate basic config structure
  if (!config.id || !config.name || !config.orchestrator) {
    throw new Error(
      `[SwarmLoader] Invalid swarm config: missing required fields. ` +
        `Required: id, name, orchestrator. Got: ${JSON.stringify({ id: config.id, name: config.name, hasOrchestrator: !!config.orchestrator })}`
    );
  }

  // Create factory
  const factory = new AgentFactory({
    toolRegistry: loaderConfig?.toolRegistry ?? new Map(),
    baseDelayMs: loaderConfig?.baseDelayMs ?? 500,
    maxRetries: loaderConfig?.maxRetries ?? 3,
  });

  // Create workers
  const workersResult = factory.createWorkers(config.orchestrator.workers ?? []);

  // Log warnings for failed workers
  for (const failure of workersResult.failed) {
    if (failure.optional) {
      console.warn(`[SwarmLoader] Optional worker "${failure.workerId}" excluded: ${failure.error.message}`);
    } else {
      console.error(`[SwarmLoader] Required worker "${failure.workerId}" failed: ${failure.error.message}`);
    }
  }

  // Check if orchestrator creation should fail
  const failFast = config.failFast !== false; // Default to true

  // Determine if we have any async workers
  const hasAsyncWorkers = Array.from(workersResult.successful.values()).some(
    v => v instanceof Promise
  );

  // Create orchestrator with appropriate wiring
  const orchestrator = createOrchestrator(
    config.orchestrator,
    workersResult.successful,
    hasAsyncWorkers
  );

  // Return loaded swarm
  return {
    orchestrator,
    workers: workersResult.successful,
    failedWorkers: workersResult.failed.map(f => ({
      id: f.workerId,
      error: f.error,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator Creation
// ─────────────────────────────────────────────────────────────────────────────

function createOrchestrator(
  orchestratorConfig: SwarmConfig['orchestrator'],
  workers: Map<string, Agent | Promise<Agent>>,
  hasAsyncWorkers: boolean
): Agent {
  // Build the agents object for the orchestrator
  // If we have async workers, we need to use the async form
  // Otherwise use static object for better performance

  if (hasAsyncWorkers) {
    // Async workers: use the async callback form
    return new Agent({
      id: orchestratorConfig.id,
      name: orchestratorConfig.name,
      instructions: orchestratorConfig.instructions ?? getDefaultOrchestratorInstructions(orchestratorConfig),
      model: orchestratorConfig.model,
      agents: async () => {
        const resolvedWorkers: Record<string, Agent> = {};

        for (const [id, worker] of workers) {
          if (worker instanceof Promise) {
            try {
              const resolved = await worker;
              resolvedWorkers[id] = resolved;
            } catch (error) {
              console.warn(`[SwarmLoader] Async worker "${id}" failed to resolve: ${error}`);
            }
          } else {
            resolvedWorkers[id] = worker;
          }
        }

        return resolvedWorkers;
      },
    });
  } else {
    // All sync workers: use static object for better performance
    const syncWorkers: Record<string, Agent> = {};
    for (const [id, worker] of workers) {
      if (!(worker instanceof Promise)) {
        syncWorkers[id] = worker;
      }
    }

    return new Agent({
      id: orchestratorConfig.id,
      name: orchestratorConfig.name,
      instructions: orchestratorConfig.instructions ?? getDefaultOrchestratorInstructions(orchestratorConfig),
      model: orchestratorConfig.model,
      agents: syncWorkers,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Instructions Generator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates default orchestrator instructions based on available workers.
 * This is used when no explicit instructions are provided in the config.
 */
function getDefaultOrchestratorInstructions(
  orchestratorConfig: SwarmConfig['orchestrator']
): string {
  const workerDescriptions = orchestratorConfig.workers
    .map(w => `- ${w.id}: ${w.role || w.name}`)
    .join('\n');

  return `You are the orchestrator for the "${orchestratorConfig.name}" swarm.

Your role is to coordinate specialized workers to complete user requests.

Available workers:
${workerDescriptions}

Delegation strategy:
- Analyze the user's request to determine what capabilities are needed
- Delegate to the appropriate worker based on their role/description
- Synthesize the results from workers into a coherent response
- If a worker is unavailable, inform the user and suggest alternatives

You are responsible for the overall quality and completeness of the response.`;
}