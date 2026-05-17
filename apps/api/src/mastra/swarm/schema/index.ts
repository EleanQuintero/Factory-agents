import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Worker
// ─────────────────────────────────────────────────────────────────────────────

export const WorkerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  instructions: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  tools: z.array(z.string()).default([]),
  optional: z.boolean().optional(),
});

export type Worker = z.infer<typeof WorkerSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export const OrchestratorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  model: z.string().min(1),
  instructions: z.string().optional(),
  tools: z.array(z.string()),
  workers: z.array(WorkerSchema),
});

export type Orchestrator = z.infer<typeof OrchestratorSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SwarmConfig
// ─────────────────────────────────────────────────────────────────────────────

export const SwarmConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  orchestrator: OrchestratorSchema,
});

export type SwarmConfig = z.infer<typeof SwarmConfigSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Requests / Responses
// ─────────────────────────────────────────────────────────────────────────────

export const CreateAgentRequestSchema = z.object({
  swarm_config: SwarmConfigSchema,
  userId: z.string().min(1),
});

export type CreateAgentRequest = z.infer<typeof CreateAgentRequestSchema>;

export const ChatRequestSchema = z.object({
  prompt: z.string().min(1),
  threadId: z.string().optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const AgentResponseSchema = z.object({
  status: z.enum(['created', 'updated', 'error']),
  agentId: z.string(),
  machineId: z.string().optional(),
  error: z.string().optional(),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;