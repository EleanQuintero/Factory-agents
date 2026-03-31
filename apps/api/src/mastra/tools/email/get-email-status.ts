import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getResendClient } from './shared/client';

const getEmailStatusInputSchema = z.object({
  emailId: z.string().describe('The Resend email ID to retrieve status for'),
});

const getEmailStatusOutputSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      id: z.string(),
      from: z.string(),
      to: z.array(z.string()).nullable(),
      subject: z.string().nullable(),
      created_at: z.string(),
      last_event: z.string().nullable(),
    })
    .optional(),
  error: z.string().optional(),
});

export const getEmailStatusTool = createTool({
  id: 'email-get-status',
  description:
    'Retrieve the delivery status and details of a previously sent email by its Resend email ID.',
  inputSchema: getEmailStatusInputSchema,
  outputSchema: getEmailStatusOutputSchema,
  execute: async (input) => {
    try {
      const resend = getResendClient();
      const { data, error } = await resend.emails.get(input.emailId);

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          id: data!.id,
          from: data!.from,
          to: data!.to,
          subject: data!.subject,
          created_at: data!.created_at,
          last_event: data!.last_event,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
});
