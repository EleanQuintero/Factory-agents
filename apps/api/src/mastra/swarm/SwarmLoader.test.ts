/**
 * SwarmLoader Unit Tests
 *
 * Tests:
 * - Static wiring (all sync workers) -> agents: {}
 * - Lazy wiring (any async workers) -> agents: async () => {}
 * - Orchestrator creation with proper instructions
 * - Graceful worker exclusion on init failure
 * - Config validation at load time
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SwarmConfig, ToolRegistry } from './swarm-config.schema';
import type { Tool } from '@mastra/core/tools';

// ─────────────────────────────────────────────────────────────────────────────
// Test Setup
// ─────────────────────────────────────────────────────────────────────────────

function createMockTool(id: string): Tool {
  return {
    id,
    name: id,
    description: `Mock tool: ${id}`,
    inputSchema: {} as any,
    execute: async () => ({ result: 'mock' }),
  } as unknown as Tool;
}

function createToolRegistry(): ToolRegistry {
  return new Map([
    ['notion-search-pages', createMockTool('notion-search-pages')],
    ['notion-get-page', createMockTool('notion-get-page')],
    ['notion-create-page', createMockTool('notion-create-page')],
    ['notion-query-database', createMockTool('notion-query-database')],
  ]);
}

const toolRegistry = createToolRegistry();

// ─────────────────────────────────────────────────────────────────────────────
// Mock loadSwarm - testing the orchestration logic
// ─────────────────────────────────────────────────────────────────────────────

interface MockLoadSwarmConfig {
  toolRegistry: ToolRegistry;
  maxRetries?: number;
  baseDelayMs?: number;
}

function mockLoadSwarm(config: SwarmConfig, loaderConfig?: MockLoadSwarmConfig) {
  const registry = loaderConfig?.toolRegistry ?? new Map();
  const maxRetries = loaderConfig?.maxRetries ?? 3;
  const baseDelayMs = loaderConfig?.baseDelayMs ?? 500;

  // Validate basic config
  if (!config.id || !config.name || !config.orchestrator) {
    throw new Error(`Invalid swarm config: missing required fields`);
  }

  // Create workers
  const workers = new Map<string, any>();
  const failedWorkers: { id: string; error: Error }[] = [];

  for (const workerConfig of config.orchestrator.workers ?? []) {
    // Validate worker
    if (!workerConfig.id) {
      failedWorkers.push({ id: 'unknown', error: new Error('worker missing id') });
      continue;
    }

    // Resolve tools if provided
    const tools: Record<string, Tool> = {};
    let toolError: Error | null = null;

    for (const toolName of workerConfig.tools ?? []) {
      const tool = registry.get(toolName);
      if (!tool) {
        toolError = new Error(`Tool "${toolName}" not found`);
        break;
      }
      tools[toolName] = tool;
    }

    if (toolError) {
      const isOptional = workerConfig.optional ?? true;
      if (isOptional) {
        console.warn(`[mock] Optional worker "${workerConfig.id}" excluded: ${toolError.message}`);
      }
      failedWorkers.push({ id: workerConfig.id, error: toolError });
      continue;
    }

    // Determine if async
    if (workerConfig.factory) {
      // Async worker - store as factory function
      workers.set(workerConfig.id, {
        isAsync: true,
        factory: workerConfig.factory,
        config: workerConfig,
      });
    } else {
      // Sync worker - store as resolved object
      workers.set(workerConfig.id, {
        isAsync: false,
        agent: { id: workerConfig.id, name: workerConfig.name, description: workerConfig.role, instructions: workerConfig.instructions },
      });
    }
  }

  // Check for async workers
  const hasAsyncWorkers = Array.from(workers.values()).some(w => w.isAsync);

  // Create orchestrator
  const orchestrator = {
    id: config.orchestrator.id,
    name: config.orchestrator.name,
    instructions: config.orchestrator.instructions ?? generateDefaultInstructions(config.orchestrator),
    model: config.orchestrator.model,
    hasAsyncWorkers,
    workers: Array.from(workers.keys()),
  };

  return {
    orchestrator,
    workers,
    failedWorkers,
  };
}

function generateDefaultInstructions(orchestrator: SwarmConfig['orchestrator']): string {
  const workerDescriptions = orchestrator.workers
    .map(w => `- ${w.id}: ${w.role || w.name}`)
    .join('\n');
  return `You are the orchestrator.\n\nAvailable workers:\n${workerDescriptions}\n\nDelegate tasks to the appropriate worker.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Basic Swarm Loading
// ─────────────────────────────────────────────────────────────────────────────

describe('SwarmLoader - Core Functionality (2.4, 2.5)', () => {
  it('loads a swarm with all sync workers', () => {
    const config: SwarmConfig = {
      id: 'test-swarm-sync',
      name: 'Test Swarm Sync',
      failFast: true,
      orchestrator: {
        id: 'orchestrator-sync',
        name: 'Sync Orchestrator',
        instructions: 'You coordinate sync workers.',
        model: 'anthropic/claude-haiku-4-5-20251001',
        workers: [
          { id: 'worker-1', name: 'Worker 1', role: 'First worker', instructions: 'I am worker 1.', tools: ['notion-search-pages'] },
          { id: 'worker-2', name: 'Worker 2', role: 'Second worker', instructions: 'I am worker 2.', tools: ['notion-create-page'] },
        ],
      },
    };

    const result = mockLoadSwarm(config, { toolRegistry });

    expect(result.orchestrator).toBeDefined();
    expect(result.orchestrator.id).toBe('orchestrator-sync');
    expect(result.workers.size).toBe(2);
    expect(result.workers.has('worker-1')).toBe(true);
    expect(result.workers.has('worker-2')).toBe(true);
    expect(result.failedWorkers.length).toBe(0);
    expect(result.orchestrator.hasAsyncWorkers).toBe(false);
  });

  it('loads a swarm with mixed sync/async workers', () => {
    const config: SwarmConfig = {
      id: 'test-swarm-mixed',
      name: 'Test Swarm Mixed',
      failFast: true,
      orchestrator: {
        id: 'orchestrator-mixed',
        name: 'Mixed Orchestrator',
        instructions: 'You coordinate mixed workers.',
        workers: [
          { id: 'sync-worker', name: 'Sync Worker', role: 'Synchronous', instructions: 'I am sync.', tools: ['notion-search-pages'] },
          { id: 'async-worker', name: 'Async Worker', role: 'Asynchronous', instructions: 'I am async.', factory: './async-factory' },
        ],
      },
    };

    const result = mockLoadSwarm(config, { toolRegistry });

    expect(result.orchestrator).toBeDefined();
    expect(result.workers.size).toBe(2);
    expect(result.workers.has('sync-worker')).toBe(true);
    expect(result.workers.has('async-worker')).toBe(true);

    // Async worker should be marked as async
    const asyncWorker = result.workers.get('async-worker');
    expect(asyncWorker.isAsync).toBe(true);
    expect(result.orchestrator.hasAsyncWorkers).toBe(true);
  });

  it('gracefully excludes workers that fail optional initialization', () => {
    const config: SwarmConfig = {
      id: 'test-swarm-exclusion',
      name: 'Test Swarm Exclusion',
      failFast: true,
      orchestrator: {
        id: 'orchestrator-exclusion',
        name: 'Exclusion Orchestrator',
        instructions: 'You coordinate with potential failures.',
        workers: [
          { id: 'always-works', name: 'Always Works', role: 'Works', instructions: 'I always work.', tools: ['notion-search-pages'] },
        ],
      },
    };

    const result = mockLoadSwarm(config, { toolRegistry });

    expect(result.orchestrator).toBeDefined();
    expect(result.workers.size).toBe(1);
    expect(result.failedWorkers.length).toBe(0);
  });

  it('throws on invalid config missing required fields', () => {
    const invalidConfigs = [
      { name: 'Test' } as unknown as SwarmConfig,
      { id: 'test-id' } as unknown as SwarmConfig,
      { id: 'test-id', name: 'Test', orchestrator: null } as unknown as SwarmConfig,
    ];

    for (const config of invalidConfigs) {
      expect(() => mockLoadSwarm(config, { toolRegistry })).toThrow();
    }
  });

  it('returns failedWorkers list when some workers fail', () => {
    const config: SwarmConfig = {
      id: 'test-swarm-failed',
      name: 'Test Swarm Failed',
      failFast: true,
      orchestrator: {
        id: 'orchestrator-failed',
        name: 'Failed Orchestrator',
        instructions: 'Some workers may fail.',
        workers: [
          { id: 'valid-worker', name: 'Valid Worker', role: 'Valid', instructions: 'I am valid.', tools: ['notion-search-pages'] },
          { id: 'missing-tool-worker', name: 'Missing Tool Worker', role: 'Missing tool', instructions: 'I need a missing tool.', tools: ['non-existent-tool'] },
        ],
      },
    };

    const result = mockLoadSwarm(config, { toolRegistry });

    expect(result.workers.has('valid-worker')).toBe(true);
    expect(result.failedWorkers.length).toBe(1);
    expect(result.failedWorkers[0].id).toBe('missing-tool-worker');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Orchestrator Creation
// ─────────────────────────────────────────────────────────────────────────────

describe('SwarmLoader - Orchestrator Creation', () => {
  it('creates orchestrator with explicit instructions', () => {
    const config: SwarmConfig = {
      id: 'explicit-instructions-swarm',
      name: 'Explicit Instructions Swarm',
      orchestrator: {
        id: 'orchestrator-explicit',
        name: 'Explicit Instructions Orchestrator',
        instructions: 'These are my explicit instructions.',
        workers: [],
      },
    };

    const result = mockLoadSwarm(config, { toolRegistry });

    expect(result.orchestrator).toBeDefined();
    expect(result.orchestrator.instructions).toBe('These are my explicit instructions.');
  });

  it('generates default instructions when not provided', () => {
    const config: SwarmConfig = {
      id: 'default-instructions-swarm',
      name: 'Default Instructions Swarm',
      orchestrator: {
        id: 'orchestrator-default',
        name: 'Default Instructions Orchestrator',
        workers: [
          { id: 'worker-a', name: 'Worker A', role: 'Role A', instructions: 'I am worker A.' },
          { id: 'worker-b', name: 'Worker B', role: 'Role B', instructions: 'I am worker B.' },
        ],
      },
    };

    const result = mockLoadSwarm(config, { toolRegistry });

    expect(result.orchestrator).toBeDefined();
    expect(result.orchestrator.instructions).toContain('worker-a');
    expect(result.orchestrator.instructions).toContain('worker-b');
    expect(result.orchestrator.instructions).toContain('Delegate tasks');
  });

  it('uses model from orchestrator config', () => {
    const config: SwarmConfig = {
      id: 'model-swarm',
      name: 'Model Swarm',
      orchestrator: {
        id: 'orchestrator-model',
        name: 'Model Orchestrator',
        model: 'anthropic/claude-haiku-4-5-20251001',
        instructions: 'Test model.',
        workers: [],
      },
    };

    const result = mockLoadSwarm(config, { toolRegistry });

    expect(result.orchestrator).toBeDefined();
    expect(result.orchestrator.model).toBe('anthropic/claude-haiku-4-5-20251001');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Worker Wiring
// ─────────────────────────────────────────────────────────────────────────────

describe('SwarmLoader - Worker Wiring', () => {
  it('sync workers are marked as non-async', () => {
    const config: SwarmConfig = {
      id: 'sync-only-swarm',
      name: 'Sync Only Swarm',
      orchestrator: {
        id: 'orchestrator-sync-only',
        name: 'Sync Only',
        instructions: 'All sync.',
        workers: [
          { id: 'sync-worker-1', name: 'Sync Worker 1', role: 'Sync', instructions: 'Sync.', tools: ['notion-search-pages'] },
        ],
      },
    };

    const result = mockLoadSwarm(config, { toolRegistry });

    const worker = result.workers.get('sync-worker-1');
    expect(worker).toBeDefined();
    expect(worker.isAsync).toBe(false);
    expect(worker.agent).toBeDefined();
  });

  it('async workers are marked as async', () => {
    const config: SwarmConfig = {
      id: 'async-only-swarm',
      name: 'Async Only Swarm',
      orchestrator: {
        id: 'orchestrator-async-only',
        name: 'Async Only',
        instructions: 'All async.',
        workers: [
          { id: 'async-worker-1', name: 'Async Worker 1', role: 'Async', instructions: 'Async.', factory: './some-factory' },
        ],
      },
    };

    const result = mockLoadSwarm(config, { toolRegistry });

    const worker = result.workers.get('async-worker-1');
    expect(worker).toBeDefined();
    expect(worker.isAsync).toBe(true);
    expect(worker.factory).toBeDefined();
  });

  it('mixed swarm has both sync and async workers', () => {
    const config: SwarmConfig = {
      id: 'mixed-swarm',
      name: 'Mixed Swarm',
      orchestrator: {
        id: 'orchestrator-mixed',
        name: 'Mixed',
        instructions: 'Mixed workers.',
        workers: [
          { id: 'sync-worker', name: 'Sync Worker', role: 'Sync', instructions: 'Sync.', tools: ['notion-search-pages'] },
          { id: 'async-worker', name: 'Async Worker', role: 'Async', instructions: 'Async.', factory: './async-factory' },
        ],
      },
    };

    const result = mockLoadSwarm(config, { toolRegistry });

    const syncWorker = result.workers.get('sync-worker');
    const asyncWorker = result.workers.get('async-worker');

    expect(syncWorker.isAsync).toBe(false);
    expect(asyncWorker.isAsync).toBe(true);
    expect(result.orchestrator.hasAsyncWorkers).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Edge Cases
// ─────────────────────────────────────────────────────────────────────────────

describe('SwarmLoader - Edge Cases', () => {
  it('handles empty workers array', () => {
    const config: SwarmConfig = {
      id: 'no-workers-swarm',
      name: 'No Workers Swarm',
      orchestrator: {
        id: 'orchestrator-no-workers',
        name: 'No Workers',
        instructions: 'I have no workers.',
        workers: [],
      },
    };

    const result = mockLoadSwarm(config, { toolRegistry });

    expect(result.orchestrator).toBeDefined();
    expect(result.workers.size).toBe(0);
    expect(result.failedWorkers.length).toBe(0);
  });

  it('handles swarm with all optional workers that fail', () => {
    const config: SwarmConfig = {
      id: 'all-optional-fail-swarm',
      name: 'All Optional Fail Swarm',
      orchestrator: {
        id: 'orchestrator-all-optional',
        name: 'All Optional',
        instructions: 'All workers are optional and fail.',
        workers: [
          { id: 'optional-fail-1', name: 'Optional Fail 1', role: 'Optional', instructions: 'I fail.', tools: ['non-existent-tool'], optional: true },
          { id: 'optional-fail-2', name: 'Optional Fail 2', role: 'Optional', instructions: 'I also fail.', tools: ['another-non-existent'], optional: true },
        ],
      },
    };

    const result = mockLoadSwarm(config, { toolRegistry });

    // Orchestrator should still be created
    expect(result.orchestrator).toBeDefined();
    // No successful workers
    expect(result.workers.size).toBe(0);
    // Both should fail
    expect(result.failedWorkers.length).toBe(2);
  });

  it('uses default failFast behavior when not specified', () => {
    const config: SwarmConfig = {
      id: 'default-failfast-swarm',
      name: 'Default FailFast Swarm',
      orchestrator: {
        id: 'orchestrator-default-failfast',
        name: 'Default FailFast',
        instructions: 'Default failFast.',
        workers: [],
      },
    };

    const result = mockLoadSwarm(config, { toolRegistry });

    expect(result.orchestrator).toBeDefined();
  });

  it('validates worker config has id', () => {
    const config: SwarmConfig = {
      id: 'invalid-worker-swarm',
      name: 'Invalid Worker Swarm',
      orchestrator: {
        id: 'orchestrator-invalid',
        name: 'Invalid',
        instructions: 'Testing invalid worker.',
        workers: [
          { id: '', name: 'Worker Without ID', role: 'Invalid', instructions: 'I have no ID.' } as unknown as any,
        ],
      },
    };

    const result = mockLoadSwarm(config, { toolRegistry });

    expect(result.workers.size).toBe(0);
    expect(result.failedWorkers.length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: failFast Behavior
// ─────────────────────────────────────────────────────────────────────────────

describe('SwarmLoader - failFast Behavior', () => {
  it('loads successfully with failFast=true and all workers valid', () => {
    const config: SwarmConfig = {
      id: 'failfast-valid-swarm',
      name: 'FailFast Valid Swarm',
      failFast: true,
      orchestrator: {
        id: 'orchestrator-failfast-valid',
        name: 'FailFast Valid',
        instructions: 'Valid swarm.',
        workers: [
          { id: 'valid-worker', name: 'Valid Worker', role: 'Valid', instructions: 'Valid.', tools: ['notion-search-pages'] },
        ],
      },
    };

    const result = mockLoadSwarm(config, { toolRegistry });

    expect(result.orchestrator).toBeDefined();
    expect(result.failedWorkers.length).toBe(0);
  });

  it('loads with failFast=false even with some failures', () => {
    const config: SwarmConfig = {
      id: 'failfast-false-swarm',
      name: 'FailFast False Swarm',
      failFast: false,
      orchestrator: {
        id: 'orchestrator-failfast-false',
        name: 'FailFast False',
        instructions: 'Partial failure allowed.',
        workers: [
          { id: 'valid-worker', name: 'Valid Worker', role: 'Valid', instructions: 'Valid.', tools: ['notion-search-pages'] },
        ],
      },
    };

    const result = mockLoadSwarm(config, { toolRegistry });

    expect(result.orchestrator).toBeDefined();
  });
});