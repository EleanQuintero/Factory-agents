/**
 * Swarm Engine — Configuration Schema
 *
 * Defines the TypeScript interfaces for declarative swarm configuration.
 * Tools are resolved via registry lookup by name.
 */

import type { Agent } from '@mastra/core/agent';
import type { Tool } from '@mastra/core/tools';

// ─────────────────────────────────────────────────────────────────────────────
// Model Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Model config string format: "provider/model-name"
 * Examples: "anthropic/claude-haiku-4-5-20251001", "google/gemini-2.5-flash"
 */
export type ModelConfig = string;

// ─────────────────────────────────────────────────────────────────────────────
// Tool Registry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tool reference by name. Resolved via registry lookup at load time.
 * Worker receives all listed tools from Mastra's tool registry.
 */
export type ToolRef = string;

/**
 * Registry of available tools, keyed by tool name (not tool.id).
 * This is initialized once at startup and shared across all factories.
 */
export type ToolRegistry = Map<string, Tool>;

// ─────────────────────────────────────────────────────────────────────────────
// Base Agent Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shared fields for both orchestrator and worker agents.
 */
export interface BaseAgentConfig {
  /** Unique identifier for this agent within the swarm */
  id: string;
  /** Human-readable name for debugging/logging */
  name: string;
  /** System instructions (like agent.instructions in Mastra) */
  instructions?: string;
  /** Model config string "provider/model-name". Defaults to project default */
  model?: ModelConfig;
  /** List of tool names to attach. Resolved from registry at load time */
  tools?: ToolRef[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Worker agent configuration.
 * Workers can be sync (created immediately) or async/lazy (created on demand).
 */
export interface WorkerConfig extends BaseAgentConfig {
  /**
   * Role/description for delegation decisions.
   * The orchestrator LLM uses this to decide when to delegate to this worker.
   * Examples: "Busca páginas en Notion", "Envía emails transaccionales"
   */
  role: string;

  /**
   * Path to an async factory module for lazy-loaded agents.
   * If omitted, the worker is created synchronously at config load time.
   *
   * The factory should export a default async function that returns an Agent:
   * `export default async function(): Promise<Agent> { ... }`
   *
   * Example: "./factories/composio-search" → loads composio-search.ts which
   * exports a createAgent() function that may fail and needs retry logic.
   */
  factory?: string;

  /**
   * If true and factory fails, the swarm still boots with this worker excluded.
   * If false and factory fails, the swarm fails-fast (failFast takes precedence
   * at the orchestrator level).
   * Default: true
   */
  optional?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Orchestrator (master) agent configuration.
 * Always created synchronously. Workers are wired via `agents: {}` or
 * `agents: async () => {}` depending on whether any async workers exist.
 */
export interface OrchestratorConfig extends BaseAgentConfig {
  /**
   * List of worker configurations. Each worker becomes a sub-agent
   * that the orchestrator can delegate to.
   */
  workers: WorkerConfig[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Swarm Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Top-level swarm configuration.
 * One swarm = one orchestrator + its workers + metadata.
 */
export interface SwarmConfig {
  /** Unique identifier for this swarm */
  id: string;
  /** Human-readable name for debugging/logging */
  name: string;
  /** Orchestrator (master) agent configuration */
  orchestrator: OrchestratorConfig;
  /**
   * Fail the entire swarm bootstrap if orchestrator creation fails.
   * Default: true
   */
  failFast?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Results
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of a successfully created sync agent.
 */
export interface SyncAgentResult {
  agent: Agent;
  success: true;
}

/**
 * Result of a successfully created async agent (lazy singleton Promise).
 */
export interface AsyncAgentResult {
  /** Promise that resolves to an Agent when first accessed and initialized */
  agent: Promise<Agent>;
  /** Reference to the factory function for retry logic */
  factory: () => Promise<Agent>;
  success: true;
}

/**
 * Result when agent creation failed.
 */
export interface FailedAgentResult {
  /** The worker config that failed */
  workerId: string;
  /** The error that occurred */
  error: Error;
  /** Whether this worker was optional */
  optional: boolean;
  success: false;
}

/** Union type for all possible agent creation results */
export type AgentResult = SyncAgentResult | AsyncAgentResult | FailedAgentResult;

/**
 * Result of creating all workers in a swarm.
 */
export interface WorkersResult {
  /** Map of successful agents (key = worker id, value = Agent or Promise<Agent>) */
  successful: Map<string, Agent | Promise<Agent>>;
  /** List of workers that failed to initialize */
  failed: FailedAgentResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Loaded Swarm
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of loading a complete swarm configuration.
 */
export interface LoadedSwarm {
  /** The orchestrator agent instance */
  orchestrator: Agent;
  /** Map of successful workers (Agent or Promise<Agent>) */
  workers: Map<string, Agent | Promise<Agent>>;
  /** List of workers that were excluded due to initialization failure */
  failedWorkers: { id: string; error: Error }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves a tool name to an actual Tool instance from the registry.
 * Throws if the tool is not found.
 */
export type ToolResolver = (name: string, registry: ToolRegistry) => Tool;

/**
 * Default tool resolver implementation.
 * Looks up the tool by name in the provided registry.
 * Throws a descriptive error if not found.
 */
export function resolveTool(name: string, registry: ToolRegistry): Tool {
  const tool = registry.get(name);
  if (!tool) {
    const available = Array.from(registry.keys()).join(', ');
    throw new Error(
      `[SwarmConfig] Tool "${name}" not found in registry. ` +
        `Available tools: ${available || '(none)'}`
    );
  }
  return tool;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Registry Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a ToolRegistry from a map of tool name → tool instance.
 * Call this at startup to create the registry passed to AgentFactory.
 *
 * @example
 * ```typescript
 * import { searchPages, getPage } from './tools/notion/search';
 * import { weatherTool } from './tools/weather-tool';
 *
 * const registry = buildToolRegistry({
 *   'notion-search-pages': searchPages,
 *   'notion-get-page': getPage,
 *   'weather-tool': weatherTool,
 * });
 * ```
 */
export function buildToolRegistry(tools: Record<string, Tool>): ToolRegistry {
  return new Map(Object.entries(tools));
}