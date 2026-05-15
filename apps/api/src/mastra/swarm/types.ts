import type { SwarmConfig } from '@factory/contracts';
import type { Agent } from '@mastra/core/agent';
import type { Tool } from '@mastra/core/tools';

// Re-export existing types from swarm-config.schema
export type { LoadedSwarm as LoadedAgent } from './swarm-config.schema';

export interface VmStatus {
  status: 'ok';
  vm: {
    uptime: number;
    memory: string;
  };
  agent: {
    agentId: string | null;
    userId: string | null;
    ready: boolean;
  };
}