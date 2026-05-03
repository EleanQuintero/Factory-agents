import { createClient } from '@supabase/supabase-js';
import type { Env, AgentConfig } from '../models/types';

// Database type definition (for typed client)
export type Database = {
  public: {
    Tables: {
      agent_configs: {
        Row: AgentConfig;
        Insert: Omit<AgentConfig, 'created_at' | 'updated_at'>;
        Update: Partial<AgentConfig>;
      };
      agent_logs: {
        Row: {
          id: string;
          agent_id: string;
          step: string;
          message: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: Omit<
          {
            id: string;
            agent_id: string;
            step: string;
            message: string;
            metadata: Record<string, unknown>;
            created_at: string;
          },
          'id'
        >;
        Update: Partial<{
          id: string;
          agent_id: string;
          step: string;
          message: string;
          metadata: Record<string, unknown>;
          created_at: string;
        }>;
      };
    };
  };
};

export function createSupabaseClient(env: Env) {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Re-export types for use in other layers
export type SupabaseClient = ReturnType<typeof createSupabaseClient>;
