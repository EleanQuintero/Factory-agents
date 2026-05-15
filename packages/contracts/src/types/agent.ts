import { z } from 'zod';
import type {
  SwarmConfigSchema,
  CreateAgentRequestSchema,
  ChatRequestSchema,
  AgentResponseSchema,
} from '../schemas/agent';

export type SwarmConfig = z.infer<typeof SwarmConfigSchema>;
export type CreateAgentRequest = z.infer<typeof CreateAgentRequestSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;