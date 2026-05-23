import type { Context } from 'hono';
import type { Env, HealthResponse } from '../models/types';
import { FlyMachinesClient } from '../lib/fly/client';
import { createSupabaseClient } from '../lib/supabase';
import { validateAgent } from '../services/agentService';
import { waitForVmReady } from '../services/vmService';

export async function handleHealthCheck(c: Context<{ Bindings: Env }>): Promise<HealthResponse> {
  const agentId = c.req.query('agentId');

  if (!agentId) {
    throw new Error('agentId query parameter is required');
  }

  const supabase = createSupabaseClient(c.env);
  await validateAgent(agentId, supabase);

  const fly = new FlyMachinesClient(c.env);
  const machine = await fly.ensureMachine(agentId);
  const vmUrl = fly.getVmUrl();

  const ready = await waitForVmReady(vmUrl, machine.id);

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
