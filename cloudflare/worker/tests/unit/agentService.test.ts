import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '../../src/lib/supabase';

// Import the service functions we'll create
// These will fail to import initially - that's expected in RED phase
import { agentExists, validateAgent } from '../../src/services/agentService';

// Helper to create a mock Supabase client with a fluent query chain
function createMockSupabase(singleResult: { data: unknown; error: unknown }): SupabaseClient {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(singleResult),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('agentService', () => {
  describe('agentExists', () => {
    it('should return true when agent exists in Supabase', async () => {
      // Arrange
      const agentId = '123e4567-e89b-12d3-a456-426614174000';
      const supabase = createMockSupabase({ data: { id: agentId }, error: null });

      // Act
      const result = await agentExists(agentId, supabase);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when agent does not exist', async () => {
      // Arrange
      const agentId = '123e4567-e89b-12d3-a456-426614174000';
      const supabase = createMockSupabase({ data: null, error: { message: 'No rows found' } });

      // Act
      const result = await agentExists(agentId, supabase);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when Supabase returns error', async () => {
      // Arrange
      const agentId = '123e4567-e89b-12d3-a456-426614174000';
      const supabase = createMockSupabase({ data: null, error: { message: 'Connection timeout' } });

      // Act
      const result = await agentExists(agentId, supabase);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('validateAgent', () => {
    it('should throw HTTPException 404 when agent not found', async () => {
      // Arrange
      const agentId = '123e4567-e89b-12d3-a456-426614174000';
      const supabase = createMockSupabase({ data: null, error: { message: 'No rows found' } });

      // Act & Assert
      await expect(validateAgent(agentId, supabase)).rejects.toThrow();
    });

    it('should not throw when agent exists', async () => {
      // Arrange
      const agentId = '123e4567-e89b-12d3-a456-426614174000';
      const supabase = createMockSupabase({ data: { id: agentId }, error: null });

      // Act & Assert
      await expect(validateAgent(agentId, supabase)).resolves.toBeUndefined();
    });
  });
});
