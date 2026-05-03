import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env, ExecuteRequest, ExecuteResponse } from '../models/types';
import { executeRequestSchema } from '../models/schemas';
import { createFlyioClient } from '../lib/flyio';
import { createSupabaseClient } from '../lib/supabase';
import { validateAgent } from '../services/agentService';
import { executeWithRetry } from '../services/executeService';
import { ingestLogs } from '../services/logService';
import { getVmStatus, startMachine, waitForVmReady } from '../services/vmService';

/**
 * POST /execute/:agentId
 *
 * Proxy execution request to the agent's Fly.io VM with retry logic.
 * Includes VM pre-warm check: starts VM if not running before proxying.
 * Logs are ingested asynchronously via ctx.waitUntil().
 */
export async function handleExecute(c: Context<{ Bindings: Env }>): Promise<ExecuteResponse> {
  const agentId = c.req.param('agentId');

  if (!agentId) {
    throw new HTTPException(400, { message: 'agentId path parameter is required' });
  }

  // Parse and validate request body
  const body = await c.req.json<ExecuteRequest>().catch(() => {
    throw new HTTPException(400, { message: 'Invalid JSON body' });
  });

  const parsed = executeRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: parsed.error.errors[0]?.message ?? 'Invalid request body',
    });
  }

  // Validate agent exists in Supabase
  const supabase = createSupabaseClient(c.env);
  await validateAgent(agentId, supabase);

  // Pre-warm: ensure VM is running before proxying
  const flyio = createFlyioClient(c.env);
  const vmUrl = flyio.getVmUrl(agentId);
  const vmStatus = await getVmStatus(agentId, flyio);

  if (vmStatus !== 'running') {
    await startMachine(agentId, flyio);
    const ready = await waitForVmReady(vmUrl);
    if (!ready) {
      throw new HTTPException(503, { message: 'VM did not become ready within timeout' });
    }
  }

  // Proxy to Fly.io VM with retry on 502
  const vmResponse = await executeWithRetry(agentId, parsed.data, flyio);

  if (!vmResponse.ok) {
    throw new HTTPException(502, {
      message: `VM execution failed with status ${vmResponse.status}`,
    });
  }

  // Clone before reading — body can only be consumed once
  const vmJson = await vmResponse.json<{ text?: string; actions?: unknown[] }>();

  // Build log entry for async ingestion
  const logEntry: import('../models/types').LogEntry = {
    agent_id: agentId,
    step: 'completed',
    message: 'VM execution completed successfully',
    metadata: {
      timestamp: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
  };

  // Async log ingestion — does not block the response
  // executionCtx may be unavailable in test environments
  const logPromise = ingestLogs([logEntry], c.env).catch(() => {
    // Swallow log errors — never fail the execute response
  });

  try {
    c.executionCtx.waitUntil(logPromise);
  } catch {
    // No ExecutionContext (test env) — log runs as a floating promise
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
