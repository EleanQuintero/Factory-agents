/**
 * AgentFactory — Creates Agent instances from WorkerConfig
 *
 * Supports two creation patterns:
 * - Sync: Direct Agent instantiation (for tools available at boot)
 * - Async: Lazy singleton with retry logic (for external services like Composio)
 *
 * Error boundary: If an optional worker fails to initialize, it's excluded
 * from the swarm with a warning. The swarm continues with remaining workers.
 */

import type { Agent } from '@mastra/core/agent';
import type {
  WorkerConfig,
  ToolRegistry,
  AgentResult,
  SyncAgentResult,
  AsyncAgentResult,
  FailedAgentResult,
  WorkersResult,
  resolveTool,
} from './swarm-config.schema';

// ─────────────────────────────────────────────────────────────────────────────
// AgentFactory
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentFactoryConfig {
  /** Registry of available tools for lookup by name */
  toolRegistry: ToolRegistry;
  /** Custom tool resolver (defaults to registry lookup) */
  resolveTool?: typeof resolveTool;
  /**
   * Number of retry attempts for async worker initialization.
   * Uses exponential backoff between retries.
   * Default: 3
   */
  maxRetries?: number;
  /**
   * Base delay in ms for exponential backoff.
   * Delay = baseDelay * 2^attempt.
   * Default: 500ms
   */
  baseDelayMs?: number;
}

export class AgentFactory {
  private readonly toolRegistry: ToolRegistry;
  private readonly resolveToolFn: typeof resolveTool;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;

  // Cache for async agent singletons
  private readonly asyncCache: Map<string, Agent> = new Map();

  constructor(config: AgentFactoryConfig) {
    this.toolRegistry = config.toolRegistry;
    this.resolveToolFn = config.resolveTool ?? defaultResolveTool;
    this.maxRetries = config.maxRetries ?? 3;
    this.baseDelayMs = config.baseDelayMs ?? 500;
  }

  /**
   * Creates a single worker agent from config.
   * Returns sync result, async result, or failed result based on config.
   */
  createWorker(config: WorkerConfig): AgentResult {
    // Validate required fields
    if (!config.id) {
      return {
        success: false,
        workerId: config.id || 'unknown',
        error: new Error('[AgentFactory] Worker config missing required field: id'),
        optional: config.optional ?? true,
      };
    }

    if (!config.instructions) {
      return {
        success: false,
        workerId: config.id,
        error: new Error(`[AgentFactory] Worker "${config.id}" missing required field: instructions`),
        optional: config.optional ?? true,
      };
    }

    // Determine sync vs async
    if (config.factory) {
      return this.createAsyncWorker(config);
    } else {
      return this.createSyncWorker(config);
    }
  }

  /**
   * Creates all workers from an array of configs.
   * Collects successes and failures separately.
   */
  createWorkers(configs: WorkerConfig[]): WorkersResult {
    const successful = new Map<string, Agent | Promise<Agent>>();
    const failed: FailedAgentResult[] = [];

    for (const config of configs) {
      const result = this.createWorker(config);

      if (result.success) {
        successful.set(config.id, result.agent);
      } else {
        failed.push({
          workerId: result.workerId,
          error: result.error,
          optional: result.optional,
          success: false,
        });

        // Log warning for optional worker failures
        if (result.optional) {
          console.warn(
            `[AgentFactory] Optional worker "${result.workerId}" failed to initialize: ${result.error.message}. ` +
              `Excluding from swarm.`
          );
        }
      }
    }

    return { successful, failed };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private: Sync Workers
  // ─────────────────────────────────────────────────────────────────────────────

  private createSyncWorker(config: WorkerConfig): SyncAgentResult {
    const tools = this.resolveTools(config.tools ?? []);

    const agent = new Agent({
      id: config.id,
      name: config.name,
      description: config.role, // role is used as description for delegation
      instructions: config.instructions!,
      model: config.model,
      tools,
    });

    return { agent, success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private: Async Workers (Lazy Singleton)
  // ─────────────────────────────────────────────────────────────────────────────

  private createAsyncWorker(config: WorkerConfig): AsyncAgentResult {
    // Return a lazy promise that will be resolved when the agent is first accessed
    const factory = async (): Promise<Agent> => {
      // Check cache first
      const cached = this.asyncCache.get(config.id);
      if (cached) return cached;

      // Load and execute factory module
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          const module = await import(config.factory!);
          const createFn = module.default ?? module.createAgent ?? module.factory;

          if (typeof createFn !== 'function') {
            throw new Error(
              `[AgentFactory] Factory "${config.factory}" does not export a valid function. ` +
                `Expected default export or createAgent factory function.`
            );
          }

          const agent = await createFn();
          this.asyncCache.set(config.id, agent);
          return agent;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (attempt < this.maxRetries) {
            const delay = this.baseDelayMs * Math.pow(2, attempt - 1);
            console.warn(
              `[AgentFactory] Worker "${config.id}" init attempt ${attempt}/${this.maxRetries} failed: ${lastError.message}. ` +
                `Retrying in ${delay}ms...`
            );
            await sleep(delay);
          }
        }
      }

      // All retries exhausted
      throw lastError;
    };

    return {
      agent: factory(), // Start the promise immediately
      factory,
      success: true,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private: Tool Resolution
  // ─────────────────────────────────────────────────────────────────────────────

  private resolveTools(toolNames: string[]): Record<string, ReturnType<typeof this.resolveToolFn>> {
    const tools: Record<string, ReturnType<typeof this.resolveToolFn>> = {};

    for (const name of toolNames) {
      try {
        tools[name] = this.resolveToolFn(name, this.toolRegistry);
      } catch (error) {
        console.error(`[AgentFactory] Failed to resolve tool "${name}": ${error}`);
        throw error;
      }
    }

    return tools;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Tool Resolver
// ─────────────────────────────────────────────────────────────────────────────

function defaultResolveTool(name: string, registry: ToolRegistry) {
  const tool = registry.get(name);
  if (!tool) {
    const available = Array.from(registry.keys()).join(', ');
    throw new Error(
      `[AgentFactory] Tool "${name}" not found in registry. ` +
        `Available tools: ${available || '(none)'}. ` +
        `Make sure all tools are registered before creating the factory.`
    );
  }
  return tool;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}