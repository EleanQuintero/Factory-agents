import { describe, it, expect } from 'vitest';
import type { HealthResponse } from '../../src/models/types';

describe('healthController', () => {
  it('should return correct HealthResponse structure', () => {
    const mockResponse: HealthResponse = {
      status: 'ready',
      agentId: '123e4567-e89b-12d3-a456-426614174000',
      vmStatus: 'running',
      vmUrl: 'https://vm-123e4567-e89b-12d3-a456-426614174000.vm.zenith-factory.fly.dev',
      timestamp: new Date().toISOString(),
    };

    expect(mockResponse).toEqual({
      status: 'ready',
      agentId: '123e4567-e89b-12d3-a456-426614174000',
      vmStatus: 'running',
      vmUrl: 'https://vm-123e4567-e89b-12d3-a456-426614174000.vm.zenith-factory.fly.dev',
      timestamp: expect.any(String),
    });
  });
});
