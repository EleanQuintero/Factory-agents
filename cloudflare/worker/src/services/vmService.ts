/**
 * Wait for VM application to be ready using hybrid polling.
 *
 * This is app-level readiness (HTTP health endpoint), NOT Fly machine state.
 * Fly's waitForState confirms the machine is 'started', but the app inside
 * the container may still be booting. This function polls until /health responds 200.
 *
 * Strategy:
 * 1. Fixed wait: 2 seconds (boot grace period)
 * 2. Poll every 500ms for up to 3 seconds (6 attempts)
 * 3. Total max wait: 5 seconds
 */
export async function waitForVmReady(
  vmUrl: string,
  sleepFn: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))
): Promise<boolean> {
  await sleepFn(2000);

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

