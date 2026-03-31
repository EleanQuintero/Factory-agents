import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getResendClient } from './shared/client';

const listRecentEmailsInputSchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .optional()
    .describe('Number of recent emails to retrieve (default 10, max 100)'),
});

const emailSummarySchema = z.object({
  id: z.string(),
  to: z.array(z.string()).nullable(),
  subject: z.string().nullable(),
  created_at: z.string(),
  last_event: z.string().nullable(),
});

const listRecentEmailsOutputSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      emails: z.array(emailSummarySchema),
    })
    .optional(),
  error: z.string().optional(),
});

export const listRecentEmailsTool = createTool({
  id: 'email-list-recent',
  description:
    'List recently sent emails from the Resend account with their delivery status.',
  inputSchema: listRecentEmailsInputSchema,
  outputSchema: listRecentEmailsOutputSchema,
  execute: async (input) => {
    try {
      const resend = getResendClient();

      // Resend SDK v4 does not expose emails.list() — use the raw GET endpoint
      const { data, error } = await resend.get<{
        data: Array<{
          id: string;
          to: string[] | null;
          subject: string | null;
          created_at: string;
          last_event: string | null;
        }>;
      }>('/emails');

      if (error) {
        return { success: false, error: error.message };
      }

      const emails = (data?.data ?? [])
        .slice(0, input.limit ?? 10)
        .map((email: { id: string; to: string[] | null; subject: string | null; created_at: string; last_event: string | null }) => ({
          id: email.id,
          to: email.to,
          subject: email.subject,
          created_at: email.created_at,
          last_event: email.last_event,
        }));

      return { success: true, data: { emails } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
});
