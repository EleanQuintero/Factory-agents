export async function waitForVmReady(
  vmUrl: string,
  machineId: string,
  sleepFn: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<boolean> {
  await sleepFn(3000);

  for (let i = 0; i < 20; i++) {
    try {
      const response = await fetch(`${vmUrl}/health`, {
        headers: { 'fly-force-instance-id': machineId },
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        return true;
      }
    } catch {
      // VM not ready yet
    }

    await sleepFn(1000);
  }

  return false;
}
