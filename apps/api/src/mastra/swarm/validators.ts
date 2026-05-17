import { z } from 'zod';
import {
  CreateAgentRequestSchema,
  ChatRequestSchema,
  type CreateAgentRequest,
  type ChatRequest,
} from './schema';

export { CreateAgentRequestSchema, ChatRequestSchema };
export type { CreateAgentRequest, ChatRequest };

/**
 * Validates a CreateAgentRequest body using Zod input type
 */
export function validateCreateAgentRequest(
  body: z.input<typeof CreateAgentRequestSchema>
): CreateAgentRequest {
  const result = CreateAgentRequestSchema.safeParse(body);
  if (!result.success) {
    throw new Error(
      `Invalid create agent request: ${result.error.issues.map(i => i.message).join('; ')}`
    );
  }
  return result.data;
}

/**
 * Validates a ChatRequest body using Zod input type
 */
export function validateChatRequest(body: z.input<typeof ChatRequestSchema>): ChatRequest {
  const result = ChatRequestSchema.safeParse(body);
  if (!result.success) {
    throw new Error(
      `Invalid chat request: ${result.error.issues.map(i => i.message).join('; ')}`
    );
  }
  return result.data;
}