import type { Env, LogEntry } from '../models/types';

/**
 * Ingest logs to Supabase agent_logs table
 *
 * This function is called via ctx.waitUntil() so it completes
 * even after the response is sent to the client.
 *
 * Best-effort logging: errors are swallowed and logged to console.
 * The client response is never affected by log ingestion failures.
 */
export async function ingestLogs(logs: LogEntry[], env: Env): Promise<void> {
  if (logs.length === 0) {
    return;
  }

  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/agent_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(logs),
    });

    // Best-effort: even if Supabase returns error, we don't throw
    if (!response.ok) {
      console.error('[LOG_INGESTION_ERROR]', {
        status: response.status,
        statusText: response.statusText,
        logsCount: logs.length,
      });
    }
  } catch (error) {
    // Swallow all errors - logging should never affect client response
    console.error('[LOG_INGESTION_ERROR]', error);
  }
}
