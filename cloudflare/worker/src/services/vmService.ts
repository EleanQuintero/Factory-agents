import type { FlyioClient } from '../lib/flyio';
import type { VmStatus } from '../models/types';

/**
 * Get VM status for an agent
 */
export async function getVmStatus(agentId: string, flyio: FlyioClient): Promise<VmStatus> {
  return flyio.getMachineStatus(agentId);
}

/**
 * Create a new VM from golden image
 */
export async function createMachine(agentId: string, flyio: FlyioClient): Promise<string> {
  return flyio.createMachine(agentId);
}

/**
 * Start an existing VM
 */
export async function startMachine(agentId: string, flyio: FlyioClient): Promise<void> {
  return flyio.startMachine(agentId);
}

/**
 * Wait for VM to be ready using hybrid polling
 *
 * Strategy:
 * 1. Fixed wait: 2 seconds (boot grace period)
 * 2. Poll every 500ms for up to 3 seconds (6 attempts)
 * 3. Total max wait: 5 seconds
 *
 * @param vmUrl - The VM URL to poll
 * @param sleepFn - Sleep function (injectable for testing)
 * @returns true if VM became ready, false if timeout
 */
export async function waitForVmReady(
  vmUrl: string,
  sleepFn: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))
): Promise<boolean> {
  // Phase 1: Grace period (boot time)
  await sleepFn(2000);

  // Phase 2: Poll until ready (max 6 attempts × 500ms = 3s)
  for (let i = 0; i < 6; i++) {
    try {
      const response = await fetch(`${vmUrl}/health`, {
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        return true;
      }
    } catch {
      // VM not ready yet, continue polling
    }

    await sleepFn(500);
  }

  return false;
}
