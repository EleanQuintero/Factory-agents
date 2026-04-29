/**
 * Swarm Engine — Barrel Export
 *
 * Single entry point for all swarm engine exports.
 */

// Schema types and utilities
export {
  type ModelConfig,
  type ToolRef,
  type ToolRegistry,
  type BaseAgentConfig,
  type WorkerConfig,
  type OrchestratorConfig,
  type SwarmConfig,
  type AgentResult,
  type SyncAgentResult,
  type AsyncAgentResult,
  type FailedAgentResult,
  type WorkersResult,
  type LoadedSwarm,
  type ToolResolver,
  resolveTool,
  buildToolRegistry,
} from './swarm-config.schema';

// AgentFactory
export { AgentFactory, type AgentFactoryConfig } from './AgentFactory';

// SwarmLoader
export { loadSwarm, type SwarmLoaderConfig } from './SwarmLoader';