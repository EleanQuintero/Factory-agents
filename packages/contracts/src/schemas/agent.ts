import { z } from 'zod';

export const WorkerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  instructions: z.string().min(1),
  tools: z.array(z.string()),
});

export const OrchestratorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  model: z.string().min(1),
  instructions: z.string().optional(),
  tools: z.array(z.string()),
  workers: z.array(WorkerSchema),
});

export const SwarmConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  orchestrator: OrchestratorSchema,
});

export const CreateAgentRequestSchema = z.object({
  swarm_config: SwarmConfigSchema,
  userId: z.string().min(1),
});

export const ChatRequestSchema = z.object({
  prompt: z.string().min(1),
  threadId: z.string().optional(),
});

export const AgentResponseSchema = z.object({
  status: z.enum(['created', 'updated', 'error']),
  agentId: z.string(),
  machineId: z.string().optional(),
  error: z.string().optional(),
});