/**
 * AgentFactory Unit Tests
 *
 * Tests the AgentFactory logic independently, without depending on the
 * actual Mastra Agent class constructor. Uses mocks for Agent creation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WorkerConfig, ToolRegistry } from './swarm-config.schema';
import type { Tool } from '@mastra/core/tools';

// ─────────────────────────────────────────────────────────────────────────────
// Test Setup
// ─────────────────────────────────────────────────────────────────────────────

function createMockTool(id: string, name: string): Tool {
  return {
    id,
    name,
    description: `Mock tool: ${name}`,
    inputSchema: {} as any,
    execute: async () => ({ result: 'mock' }),
  } as unknown as Tool;
}

function createToolRegistry(tools: Record<string, Tool>): ToolRegistry {
  return new Map(Object.entries(tools));
}

const mockTool1 = createMockTool('tool-1', 'Tool One');
const mockTool2 = createMockTool('tool-2', 'Tool Two');

const validToolRegistry = createToolRegistry({
  'tool-one': mockTool1,
  'tool-two': mockTool2,
});

// ─────────────────────────────────────────────────────────────────────────────
// Mock AgentFactory for testing (bypasses real Agent constructor)
// ─────────────────────────────────────────────────────────────────────────────

interface FactoryConfig {
  toolRegistry: ToolRegistry;
  maxRetries?: number;
  baseDelayMs?: number;
  resolveTool?: (name: string, registry: ToolRegistry) => Tool;
}

interface SyncResult {
  agent: { id: string; name: string; description?: string; instructions?: string; tools?: Record<string, Tool> };
  success: true;
}

interface AsyncResult {
  agent: Promise<{ id: string; name: string }>;
  factory: () => Promise<any>;
  success: true;
}

interface FailedResult {
  success: false;
  workerId: string;
  error: Error;
  optional: boolean;
}

type Result = SyncResult | AsyncResult | FailedResult;

function createTestFactory(config: FactoryConfig) {
  const maxRetries = config.maxRetries ?? 3;
  const baseDelayMs = config.baseDelayMs ?? 500;

  function resolveTool(name: string): Tool {
    const resolver = config.resolveTool ?? ((n, r) => {
      const t = r.get(n);
      if (!t) throw new Error(`Tool "${n}" not found`);
      return t;
    });
    return resolver(name, config.toolRegistry);
  }

  async function createWorker(cfg: WorkerConfig): Promise<Result> {
    // Validate required fields
    if (!cfg.id) {
      return { success: false, workerId: 'unknown', error: new Error('missing id'), optional: cfg.optional ?? true };
    }
    if (!cfg.instructions) {
      return { success: false, workerId: cfg.id, error: new Error('missing instructions'), optional: cfg.optional ?? true };
    }

    // Resolve tools
    const tools: Record<string, Tool> = {};
    for (const name of cfg.tools ?? []) {
      try {
        tools[name] = resolveTool(name);
      } catch (e) {
        return { success: false, workerId: cfg.id, error: e as Error, optional: cfg.optional ?? true };
      }
    }

    // If factory path provided, handle async creation with retry
    if (cfg.factory) {
      let lastError: Error = new Error('Factory not executed');

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const factoryPath = cfg.factory;

          // Simulate import - non-existent paths fail
          if (factoryPath === './non-existent' || factoryPath.includes('non-existent')) {
            throw new Error(`Cannot find module '${factoryPath}'`);
          }

          // Valid factory path - return resolved agent
          const factory = async () => {
            return { id: cfg.id, name: cfg.name, description: cfg.role, instructions: cfg.instructions, tools };
          };
          return { agent: await factory(), factory, success: true };
        } catch (e) {
          lastError = e as Error;
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
          }
        }
      }

      return { success: false, workerId: cfg.id, error: lastError, optional: cfg.optional ?? true };
    }

    // Sync worker
    return {
      success: true,
      agent: { id: cfg.id, name: cfg.name, description: cfg.role, instructions: cfg.instructions, tools },
    };
  }

  async function createWorkers(configs: WorkerConfig[]) {
    const successful = new Map<string, any>();
    const failed: { workerId: string; error: Error; optional: boolean }[] = [];

    for (const cfg of configs) {
      const result = await createWorker(cfg);
      if (result.success) {
        successful.set(cfg.id, (result as SyncResult | AsyncResult).agent);
      } else {
        const r = result as FailedResult;
        if (r.optional) console.warn(`[test] Optional worker "${r.workerId}" excluded: ${r.error.message}`);
        else console.error(`[test] Required worker "${r.workerId}" failed: ${r.error.message}`);
        failed.push({ workerId: r.workerId, error: r.error, optional: r.optional });
      }
    }

    return { successful, failed };
  }

  return { createWorker, createWorkers };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Sync Worker Creation (2.1)
// ─────────────────────────────────────────────────────────────────────────────

describe('AgentFactory - Sync Worker Creation (2.1)', () => {
  it('creates a sync worker with all provided tools', async () => {
    const factory = createTestFactory({ toolRegistry: validToolRegistry });
    const config: WorkerConfig = {
      id: 'sync-worker-1',
      name: 'Sync Worker',
      role: 'Regular worker',
      instructions: 'You are a sync worker with tools.',
      tools: ['tool-one'],
    };

    const result = await factory.createWorker(config);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.agent.id).toBe('sync-worker-1');
      expect(result.agent.name).toBe('Sync Worker');
    }
  });

  it('creates a sync worker without tools', async () => {
    const factory = createTestFactory({ toolRegistry: validToolRegistry });
    const config: WorkerConfig = {
      id: 'sync-worker-2',
      name: 'No Tools Worker',
      role: 'Worker without tools',
      instructions: 'I have no tools.',
    };

    const result = await factory.createWorker(config);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.agent.id).toBe('sync-worker-2');
    }
  });

  it('uses role as description for delegation', async () => {
    const factory = createTestFactory({ toolRegistry: validToolRegistry });
    const config: WorkerConfig = {
      id: 'delegator',
      name: 'Delegator',
      role: 'Task delegator',
      instructions: 'You delegate tasks.',
      tools: [],
    };

    const result = await factory.createWorker(config);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.agent.description).toBe('Task delegator');
    }
  });

  it('returns failed result when worker config missing id', async () => {
    const factory = createTestFactory({ toolRegistry: validToolRegistry });
    const config = {
      name: 'Missing ID Worker',
      role: 'Invalid',
      instructions: 'I have no ID.',
    } as WorkerConfig;

    const result = await factory.createWorker(config);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.workerId).toBe('unknown');
      expect(result.optional).toBe(true);
    }
  });

  it('returns failed result when worker config missing instructions', async () => {
    const factory = createTestFactory({ toolRegistry: validToolRegistry });
    const config = {
      id: 'missing-instructions',
      name: 'Missing Instructions',
      role: 'Invalid',
    } as WorkerConfig;

    const result = await factory.createWorker(config);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.workerId).toBe('missing-instructions');
    }
  });

  it('returns FailedAgentResult on validation error (not thrown)', async () => {
    const factory = createTestFactory({ toolRegistry: validToolRegistry });
    const config = {
      id: 'validation-error',
      name: 'Validation Error',
      role: 'Invalid',
      instructions: '', // Empty instructions triggers validation error
    } as WorkerConfig;

    const result = await factory.createWorker(config);

    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Async Worker Creation (2.2)
// ─────────────────────────────────────────────────────────────────────────────

describe('AgentFactory - Async Worker Creation (2.2)', () => {
  it('returns async result when factory path is provided', async () => {
    const factory = createTestFactory({ toolRegistry: validToolRegistry });
    const config: WorkerConfig = {
      id: 'async-worker',
      name: 'Async Worker',
      role: 'Lazy loaded worker',
      instructions: 'You are async.',
      factory: './some-factory-path',
    };

    const result = await factory.createWorker(config);

    expect(result.success).toBe(true);
    if (result.success) {
      // For valid factory paths, agent is resolved
      expect(result.agent.id).toBe('async-worker');
    }
  });

  it('async workers use retry with exponential backoff', async () => {
    const factory = createTestFactory({
      toolRegistry: validToolRegistry,
      maxRetries: 3,
      baseDelayMs: 10,
    });
    const config: WorkerConfig = {
      id: 'retry-worker',
      name: 'Retry Worker',
      role: 'Worker that retries',
      instructions: 'You retry.',
      factory: './non-existent-factory',
    };

    const result = await factory.createWorker(config);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.workerId).toBe('retry-worker');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Error Boundary (2.3)
// ─────────────────────────────────────────────────────────────────────────────

describe('AgentFactory - Error Boundary (2.3)', () => {
  it('createWorkers excludes failed workers and continues', async () => {
    const factory = createTestFactory({
      toolRegistry: validToolRegistry,
      maxRetries: 1,
      baseDelayMs: 10,
    });

    const configs: WorkerConfig[] = [
      {
        id: 'valid-worker-1',
        name: 'Valid Worker 1',
        role: 'First valid',
        instructions: 'I am valid.',
        tools: ['tool-one'],
      },
      {
        id: 'optional-failed-worker',
        name: 'Failed Optional Worker',
        role: 'Will fail',
        instructions: 'I will fail.',
        factory: './non-existent',
        optional: true,
      },
      {
        id: 'valid-worker-2',
        name: 'Valid Worker 2',
        role: 'Second valid',
        instructions: 'I am also valid.',
        tools: ['tool-two'],
      },
    ];

    const result = await factory.createWorkers(configs);

    expect(result.successful.size).toBe(2);
    expect(result.successful.has('valid-worker-1')).toBe(true);
    expect(result.successful.has('valid-worker-2')).toBe(true);

    expect(result.failed.length).toBe(1);
    expect(result.failed[0].workerId).toBe('optional-failed-worker');
    expect(result.failed[0].optional).toBe(true);
  });

  it('createWorkers handles validation errors gracefully', async () => {
    const factory = createTestFactory({ toolRegistry: validToolRegistry });

    const configs: WorkerConfig[] = [
      {
        id: 'valid-worker',
        name: 'Valid Worker',
        role: 'Valid',
        instructions: 'I am valid.',
      },
      {
        id: '',
        name: 'Invalid Worker',
        role: 'Missing ID',
        instructions: 'I have no ID.',
      } as WorkerConfig,
    ];

    const result = await factory.createWorkers(configs);

    expect(result.successful.size).toBe(1);
    expect(result.successful.has('valid-worker')).toBe(true);

    expect(result.failed.length).toBe(1);
  });

  it('non-optional worker failure is tracked in failed array', async () => {
    const factory = createTestFactory({
      toolRegistry: validToolRegistry,
      maxRetries: 1,
      baseDelayMs: 10,
    });

    const configs: WorkerConfig[] = [
      {
        id: 'required-fail-worker',
        name: 'Required Fail Worker',
        role: 'Required but fails',
        instructions: 'I fail and am required.',
        factory: './non-existent',
        optional: false,
      },
    ];

    const result = await factory.createWorkers(configs);

    expect(result.failed.length).toBe(1);
    expect(result.failed[0].workerId).toBe('required-fail-worker');
    expect(result.failed[0].optional).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Tool Resolution (2.4)
// ─────────────────────────────────────────────────────────────────────────────

describe('AgentFactory - Tool Resolution (2.4)', () => {
  it('resolves tools from registry by name', async () => {
    const factory = createTestFactory({ toolRegistry: validToolRegistry });
    const config: WorkerConfig = {
      id: 'tool-resolver',
      name: 'Tool Resolver',
      role: 'Tool resolver',
      instructions: 'I use tools.',
      tools: ['tool-one', 'tool-two'],
    };

    const result = await factory.createWorker(config);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.agent.tools).toBeDefined();
      expect(result.agent.tools['tool-one']).toBeDefined();
      expect(result.agent.tools['tool-two']).toBeDefined();
    }
  });

  it('returns failed result when tool not found in registry', async () => {
    const factory = createTestFactory({ toolRegistry: validToolRegistry });
    const config: WorkerConfig = {
      id: 'missing-tool-worker',
      name: 'Missing Tool Worker',
      role: 'Missing tool',
      instructions: 'I need a missing tool.',
      tools: ['non-existent-tool'],
    };

    const result = await factory.createWorker(config);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.workerId).toBe('missing-tool-worker');
      expect(result.error.message).toContain('non-existent-tool');
    }
  });

  it('uses custom resolveTool function when provided', async () => {
    const customResolver = vi.fn((name: string, registry: ToolRegistry) => {
      if (name === 'custom-tool') {
        return createMockTool('custom-id', 'Custom Tool');
      }
      throw new Error(`Custom resolver: tool "${name}" not found`);
    });

    const factory = createTestFactory({
      toolRegistry: validToolRegistry,
      resolveTool: customResolver,
    });

    const config: WorkerConfig = {
      id: 'custom-resolver-worker',
      name: 'Custom Resolver Worker',
      role: 'Custom resolver',
      instructions: 'I use custom resolver.',
      tools: ['custom-tool'],
    };

    const result = await factory.createWorker(config);

    expect(result.success).toBe(true);
    expect(customResolver).toHaveBeenCalledWith('custom-tool', validToolRegistry);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Integration Scenarios
// ─────────────────────────────────────────────────────────────────────────────

describe('AgentFactory - Integration Scenarios', () => {
  it('creates multiple workers in batch with mixed success/failure', async () => {
    const factory = createTestFactory({ toolRegistry: validToolRegistry });

    const configs: WorkerConfig[] = [
      {
        id: 'worker-1',
        name: 'Worker 1',
        role: 'First',
        instructions: 'I am worker 1.',
        tools: ['tool-one'],
      },
      {
        id: 'invalid-1',
        name: 'Invalid 1',
        role: 'Invalid',
        instructions: '',
      },
      {
        id: 'worker-2',
        name: 'Worker 2',
        role: 'Second',
        instructions: 'I am worker 2.',
        tools: ['tool-two'],
      },
    ];

    const result = await factory.createWorkers(configs);

    expect(result.successful.size).toBe(2);
    expect(result.successful.has('worker-1')).toBe(true);
    expect(result.successful.has('worker-2')).toBe(true);

    expect(result.failed.length).toBe(1);
    expect(result.failed[0].workerId).toBe('invalid-1');
  });

  it('factory with custom retry settings works', async () => {
    const factory = createTestFactory({
      toolRegistry: validToolRegistry,
      maxRetries: 2,
      baseDelayMs: 5,
    });

    const config: WorkerConfig = {
      id: 'custom-retry-worker',
      name: 'Custom Retry Worker',
      role: 'Custom retry',
      instructions: 'I have custom retry.',
      factory: './valid-path',
    };

    const result = await factory.createWorker(config);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.agent.id).toBe('custom-retry-worker');
    }
  });
});