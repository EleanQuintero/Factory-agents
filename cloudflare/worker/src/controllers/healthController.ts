import type { Context } from 'hono';
import type { Env, HealthResponse } from '../models/types';
import { createFlyioClient } from '../lib/flyio';
import { createSupabaseClient } from '../lib/supabase';
import { validateAgent } from '../services/agentService';
import { getVmStatus, createMachine, startMachine, waitForVmReady } from '../services/vmService';

/**
 * GET /health?agentId=xxx
 *
 * Pre-warm agent VM (create if not exists, start if stopped, wait until ready)
 */
export async function handleHealthCheck(c: Context<{ Bindings: Env }>): Promise<HealthResponse> {
  const agentId = c.req.query('agentId');

  if (!agentId) {
    throw new Error('agentId query parameter is required');
  }

  // Validate agent exists in Supabase
  const supabase = createSupabaseClient(c.env);
  await validateAgent(agentId, supabase);

  // Get Fly.io client
  const flyio = createFlyioClient(c.env);
  const vmUrl = flyio.getVmUrl(agentId);

  // Check current VM status
  const status = await getVmStatus(agentId, flyio);

  if (status === 'none') {
    // Create VM from golden image
    await createMachine(agentId, flyio);
  } else if (status !== 'running') {
    // Start VM if stopped
    await startMachine(agentId, flyio);
  }

  // Wait for VM to be ready
  const ready = await waitForVmReady(vmUrl);

  if (!ready) {
    throw new Error('VM did not become ready within timeout');
  }

  return {
    status: 'ready',
    agentId,
    vmStatus: 'running',
    vmUrl,
    timestamp: new Date().toISOString(),
  };
}
