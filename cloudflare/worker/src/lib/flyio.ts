import type { Env, VmStatus, FlyCreateMachineResponse } from '../models/types';

const FLY_API_GRAPHQL = 'https://api.fly.io/graphql';

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

export function createFlyioClient(env: Env) {
  const headers = {
    'Authorization': `Bearer ${env.FLY_API_TOKEN}`,
    'Content-Type': 'application/json',
  };

  async function query<T>(queryStr: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(FLY_API_GRAPHQL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: queryStr, variables }),
    });

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors?.length) {
      throw new Error(result.errors[0].message);
    }

    return result.data as T;
  }

  return {
    /**
     * Get VM status for an agent
     */
    async getMachineStatus(agentId: string): Promise<VmStatus> {
      const appName = `zenith-factory-${agentId}`;

      try {
        const data = await query<{
          app: { machine: { id: string; state: string } | null };
        }>(`
          query GetMachine($appName: String!, $machineName: String!) {
            app(name: $appName) {
              machine(name: $machineName) {
                id
                state
              }
            }
          }
        `, { appName, machineName: agentId });

        if (!data.app?.machine) return 'none';
        return data.app.machine.state as VmStatus;
      } catch {
        return 'none';
      }
    },

    /**
     * Create a new VM from golden image
     */
    async createMachine(agentId: string): Promise<string> {
      const appName = `zenith-factory-${agentId}`;

      const data = await query<FlyCreateMachineResponse>(`
        mutation CreateMachine($input: CreateMachineInput!) {
          createMachine(input: $input) {
            id
            name
          }
        }
      `, {
        input: {
          appName,
          image: 'zenith-factory-golden:latest',
          region: 'iad',
          size: 'shared-cpu-1x',
          memory: '1gb',
          autoDestroy: false,
        },
      });

      return data.createMachine.id;
    },

    /**
     * Start an existing VM
     */
    async startMachine(agentId: string): Promise<void> {
      const appName = `zenith-factory-${agentId}`;

      await query(`
        mutation StartMachine($appName: String!, $machineName: String!) {
          startMachine(appName: $appName, machineName: $machineName) {
            id
            state
          }
        }
      `, { appName, machineName: agentId });
    },

    /**
     * Get VM URL for an agent
     */
    getVmUrl(agentId: string): string {
      return `https://zenith-factory-${agentId}.fly.dev`;
    },
  };
}

export type FlyioClient = ReturnType<typeof createFlyioClient>;
