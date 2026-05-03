import { HTTPException } from 'hono/http-exception';
import type { SupabaseClient } from '../lib/supabase';

/**
 * Check if an agent exists in Supabase
 */
export async function agentExists(agentId: string, supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('agent_configs')
      .select('id')
      .eq('id', agentId)
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that an agent exists, throw 404 if not
 */
export async function validateAgent(agentId: string, supabase: SupabaseClient): Promise<void> {
  const exists = await agentExists(agentId, supabase);

  if (!exists) {
    throw new HTTPException(404, {
      message: 'Agent not found',
      cause: { agentId, code: 'agent_not_found' },
    });
  }
}
