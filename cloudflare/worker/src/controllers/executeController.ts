import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env, ExecuteRequest, ExecuteResponse, LogEntry } from '../models/types';
import { executeRequestSchema } from '../models/schemas';
import { FlyMachinesClient } from '../lib/fly/client';
import { createSupabaseClient } from '../lib/supabase';
import { validateAgent } from '../services/agentService';
import { executeWithRetry } from '../services/executeService';
import { ingestLogs } from '../services/logService';
import { waitForVmReady } from '../services/vmService';

export async function handleExecute(c: Context<{ Bindings: Env }>): Promise<ExecuteResponse> {
  const agentId = c.req.param('agentId');

  if (!agentId) {
    throw new HTTPException(400, { message: 'agentId path parameter is required' });
  }

  const body = await c.req.json<ExecuteRequest>().catch(() => {
    throw new HTTPException(400, { message: 'Invalid JSON body' });
  });

  const parsed = executeRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: parsed.error.errors[0]?.message ?? 'Invalid request body',
    });
  }

  const supabase = createSupabaseClient(c.env);
  await validateAgent(agentId, supabase);

  const fly = new FlyMachinesClient(c.env);
  const machine = await fly.ensureMachine(agentId);
  const vmUrl = fly.getVmUrl(agentId);

  if (machine.state !== 'started') {
    const ready = await waitForVmReady(vmUrl);
    if (!ready) {
      throw new HTTPException(503, { message: 'VM did not become ready within timeout' });
    }
  }

  const vmResponse = await executeWithRetry(agentId, parsed.data, vmUrl);

  if (!vmResponse.ok) {
    throw new HTTPException(502, {
      message: `VM execution failed with status ${vmResponse.status}`,
    });
  }

  const vmJson = await vmResponse.json<{ text?: string; actions?: unknown[] }>();

  const logEntry: LogEntry = {
    agent_id: agentId,
    step: 'completed',
    message: 'VM execution completed successfully',
    metadata: {
      timestamp: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
  };

  const logPromise = ingestLogs([logEntry], c.env).catch(() => {});

  try {
    c.executionCtx.waitUntil(logPromise);
  } catch {
    // No ExecutionContext (test env)
  }

  return {
    agentId,
    response: {
      text: vmJson.text,
      actions: vmJson.actions,
    },
    timestamp: new Date().toISOString(),
  };
}
