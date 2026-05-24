import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../models/types';
import { FlyMachinesClient } from '../lib/fly/client';
import { createSupabaseClient } from '../lib/supabase';
import { validateAgent } from '../services/agentService';
import { waitForVmReady } from '../services/vmService';
import { proxyToVm } from '../services/proxyService';

async function ensureVmReady(c: Context<{ Bindings: Env }>, agentId: string) {
  const supabase = createSupabaseClient(c.env);
  await validateAgent(agentId, supabase);

  const fly = new FlyMachinesClient(c.env);
  const machine = await fly.ensureMachine(agentId);
  const vmUrl = fly.getVmUrl();

  const ready = await waitForVmReady(vmUrl, machine.id);
  if (!ready) {
    throw new HTTPException(503, { message: 'VM did not become ready within timeout' });
  }

  return { vmUrl, machineId: machine.id };
}

export async function handleAgentCreate(c: Context<{ Bindings: Env }>) {
  const agentId = c.req.param('agentId');
  if (!agentId) {
    throw new HTTPException(400, { message: 'agentId path parameter is required' });
  }

  const body = await c.req.text();
  const { vmUrl, machineId } = await ensureVmReady(c, agentId);

  const vmResponse = await proxyToVm(vmUrl, '/agent/create', machineId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  return new Response(vmResponse.body, {
    status: vmResponse.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleChat(c: Context<{ Bindings: Env }>) {
  const agentId = c.req.param('agentId');
  if (!agentId) {
    throw new HTTPException(400, { message: 'agentId path parameter is required' });
  }

  const body = await c.req.text();
  const { vmUrl, machineId } = await ensureVmReady(c, agentId);

  const vmResponse = await proxyToVm(vmUrl, `/chat/${agentId}`, machineId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  return new Response(vmResponse.body, {
    status: vmResponse.status,
    headers: {
      'Content-Type': vmResponse.headers.get('Content-Type') ?? 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Thread-Id': vmResponse.headers.get('X-Thread-Id') ?? '',
    },
  });
}
