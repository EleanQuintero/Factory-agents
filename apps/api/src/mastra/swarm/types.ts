import type { SwarmConfig } from '@factory/contracts';

export interface LoadedAgent {
  config: SwarmConfig;
  orchestrator: Agent;
  workers: Map<string, Agent>;
  toolRegistry: ToolRegistry;
  createdAt: number;
}

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