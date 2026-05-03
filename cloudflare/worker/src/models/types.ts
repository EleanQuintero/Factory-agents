// Cloudflare Worker Env (injected by runtime)
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  FLY_API_TOKEN: string;
  ENV: 'development' | 'staging' | 'production';
}

// Agent config from Supabase
export interface AgentConfig {
  id: string;
  name: string;
  model: string;
  tools: string[];
  system_prompt: string | null;
  user_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Log entry for Supabase
export interface LogEntry {
  agent_id: string;
  step: 'received' | 'validating' | 'proxying' | 'executing' | 'completed' | 'error';
  message: string;
  metadata: {
    timestamp: string;
    status?: number;
    duration_ms?: number;
    headers?: Record<string, string>;
    error?: string;
  };
  created_at: string;
}

// VM status from Fly.io
export type VmStatus = 'none' | 'stopped' | 'starting' | 'running';

// Execute request body
export interface ExecuteRequest {
  prompt: string;
  context?: Record<string, unknown>;
}

// Execute response
export interface ExecuteResponse {
  agentId: string;
  response: {
    text?: string;
    actions?: unknown[];
    error?: string;
  };
  timestamp: string;
}

// Health response
export interface HealthResponse {
  status: 'ready' | 'starting' | 'error';
  agentId: string;
  vmStatus: VmStatus;
  vmUrl: string;
  timestamp: string;
}

// Error response (standardized)
export interface ErrorResponse {
  error: string;
  message?: string;
  agentId?: string;
  timestamp: string;
}

// Fly.io GraphQL responses
export interface FlyMachine {
  id: string;
  name: string;
  state: string;
}

export interface FlyCreateMachineResponse {
  createMachine: {
    id: string;
    name: string;
  };
}
