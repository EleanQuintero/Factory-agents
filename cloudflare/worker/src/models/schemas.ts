import { z } from 'zod';

export const executeRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  context: z.record(z.unknown()).optional(),
});

export type ExecuteRequestInput = z.infer<typeof executeRequestSchema>;

export const healthQuerySchema = z.object({
  agentId: z.string().uuid('Invalid agent ID format'),
});

export type HealthQueryInput = z.infer<typeof healthQuerySchema>;
