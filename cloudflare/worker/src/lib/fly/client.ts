import type {
  Machine,
  CreateMachineRequest,
  WaitOptions,
  StartMachineResponse,
  OkResponse,
  UpdateMachineRequest,
} from './types';
import {
  FlyApiError,
  FlyAuthError,
  FlyNotFoundError,
  FlyTimeoutError,
  FlyConflictError,
  FlyValidationError,
  FlyRateLimitError,
  FlyServerError,
} from './types';

const FLY_API = 'https://api.machines.dev/v1';

export interface FlyClientEnv {
  FLY_API_TOKEN: string;
  FLY_APP_NAME: string;
  FLY_REGION: string;
  FLY_MACHINE_IMAGE: string;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  opts = { maxAttempts: 4, baseDelayMs: 250 },
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < opts.maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof FlyRateLimitError || err instanceof FlyServerError) {
        lastErr = err;
        await new Promise((r) =>
          setTimeout(r, opts.baseDelayMs * 2 ** i + Math.random() * 100),
        );
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export class FlyMachinesClient {
  constructor(private env: FlyClientEnv) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${FLY_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.env.FLY_API_TOKEN}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      const msg = `Fly ${res.status} on ${init?.method ?? 'GET'} ${path}: ${body}`;
      switch (res.status) {
        case 401: throw new FlyAuthError(res.status, body, msg);
        case 404: throw new FlyNotFoundError(res.status, body, msg);
        case 408: throw new FlyTimeoutError(res.status, body, msg);
        case 409: throw new FlyConflictError(res.status, body, msg);
        case 422: throw new FlyValidationError(res.status, body, msg);
        case 429: throw new FlyRateLimitError(res.status, body, msg);
        default:
          if (res.status >= 500) throw new FlyServerError(res.status, body, msg);
          throw new FlyApiError(res.status, body, msg);
      }
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  async listMachines(): Promise<Machine[]> {
    return withRetry(() =>
      this.request(`/apps/${this.env.FLY_APP_NAME}/machines`),
    );
  }

  async getMachine(id: string): Promise<Machine> {
    return withRetry(() =>
      this.request(`/apps/${this.env.FLY_APP_NAME}/machines/${id}`),
    );
  }

  async getMachineByName(name: string): Promise<Machine | null> {
    const list = await this.listMachines();
    return list.find((m) => m.name === name) ?? null;
  }

  async createMachine(req: CreateMachineRequest): Promise<Machine> {
    return withRetry(() =>
      this.request(`/apps/${this.env.FLY_APP_NAME}/machines`, {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    );
  }

  async updateMachine(id: string, req: UpdateMachineRequest): Promise<Machine> {
    return withRetry(() =>
      this.request(`/apps/${this.env.FLY_APP_NAME}/machines/${id}`, {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    );
  }

  async startMachine(id: string): Promise<StartMachineResponse> {
    return withRetry(() =>
      this.request(`/apps/${this.env.FLY_APP_NAME}/machines/${id}/start`, {
        method: 'POST',
      }),
    );
  }

  async stopMachine(
    id: string,
    opts?: { signal?: string; timeout?: string },
  ): Promise<OkResponse> {
    return withRetry(() =>
      this.request(`/apps/${this.env.FLY_APP_NAME}/machines/${id}/stop`, {
        method: 'POST',
        body: opts ? JSON.stringify(opts) : undefined,
      }),
    );
  }

  async suspendMachine(id: string): Promise<OkResponse> {
    return withRetry(() =>
      this.request(`/apps/${this.env.FLY_APP_NAME}/machines/${id}/suspend`, {
        method: 'POST',
      }),
    );
  }

  async destroyMachine(id: string, force = false): Promise<OkResponse> {
    const qs = force ? '?force=true' : '';
    return withRetry(() =>
      this.request(`/apps/${this.env.FLY_APP_NAME}/machines/${id}${qs}`, {
        method: 'DELETE',
      }),
    );
  }

  async waitForState(id: string, opts: WaitOptions): Promise<OkResponse> {
    const qs = new URLSearchParams({
      state: opts.state,
      timeout: String(opts.timeout ?? 30),
      ...(opts.instance_id && { instance_id: opts.instance_id }),
    });
    return this.request(
      `/apps/${this.env.FLY_APP_NAME}/machines/${id}/wait?${qs}`,
    );
  }

  async ensureMachine(userId: string): Promise<Machine> {
    const name = `vm-${userId}`;
    const existing = await this.getMachineByName(name);

    if (!existing) {
      const machine = await this.createMachine(
        this.buildTenantConfig(userId),
      );
      await this.waitForState(machine.id, { state: 'started', timeout: 30 });
      return machine;
    }

    if (existing.state === 'stopped' || existing.state === 'suspended') {
      await this.startMachine(existing.id);
      await this.waitForState(existing.id, { state: 'started', timeout: 10 });
    }

    return existing;
  }

  getVmUrl(userId: string): string {
    return `https://vm-${userId}.vm.${this.env.FLY_APP_NAME}.fly.dev`;
  }

  private buildTenantConfig(userId: string): CreateMachineRequest {
    return {
      name: `vm-${userId}`,
      region: this.env.FLY_REGION,
      config: {
        image: this.env.FLY_MACHINE_IMAGE,
        env: {
          TENANT_USER_ID: userId,
          NODE_OPTIONS: '--dns-result-order=ipv4first',
        },
        services: [
          {
            protocol: 'tcp',
            internal_port: 3000,
            ports: [
              { port: 443, handlers: ['tls', 'http'] },
              { port: 80, handlers: ['http'] },
            ],
            autostart: true,
            autostop: 'suspend',
            min_machines_running: 0,
          },
        ],
        guest: { cpu_kind: 'shared', cpus: 1, memory_mb: 1024 },
        auto_destroy: false,
        restart: { policy: 'on-failure', max_retries: 3 },
      },
    };
  }
}
