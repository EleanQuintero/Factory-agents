import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { render } from '@react-email/render';
import React from 'react';
import { TEMPLATES, type TemplateKey } from '../../agents/email/templates';
import { getResendClient } from './shared/client';

const templateKeys = Object.keys(TEMPLATES) as [TemplateKey, ...TemplateKey[]];

const sendEmailInputSchema = z.object({
  to: z
    .union([z.string().email(), z.array(z.string().email())])
    .describe('Recipient email address or array of email addresses'),
  subject: z.string().describe('Email subject line'),
  template: z
    .enum(templateKeys)
    .describe('Template key from the email templates registry'),
  templateData: z
    .record(z.string(), z.unknown())
    .describe('Props to pass to the selected email template'),
  from: z
    .string()
    .email()
    .optional()
    .describe('Sender email address (defaults to onboarding@resend.dev)'),
  replyTo: z
    .string()
    .email()
    .optional()
    .describe('Reply-to email address'),
  scheduledAt: z
    .string()
    .optional()
    .describe('ISO 8601 datetime to schedule the email for later delivery'),
});

const sendEmailOutputSchema = z.object({
  success: z.boolean(),
  emailId: z.string().optional(),
  error: z.string().optional(),
});

export const sendEmailTool = createTool({
  id: 'email-send',
  description:
    'Send an email using a pre-defined react-email template via Resend. Renders the template to HTML and sends it.',
  inputSchema: sendEmailInputSchema,
  outputSchema: sendEmailOutputSchema,
  execute: async (input) => {
    try {
      const { to, subject, template, templateData, from, replyTo, scheduledAt } = input;

      // Validate template exists
      const templateEntry = TEMPLATES[template];
      if (!templateEntry) {
        return {
          success: false,
          error: `Unknown template: "${template}". Available templates: ${templateKeys.join(', ')}`,
        };
      }

      // Validate required props
      const missingProps = templateEntry.requiredProps.filter(
        (prop) => !(prop in templateData),
      );
      if (missingProps.length > 0) {
        return {
          success: false,
          error: `Missing required template props for "${template}": ${missingProps.join(', ')}`,
        };
      }

      // Render template to HTML
      const Component = templateEntry.component;
      const html = await render(<Component {...templateData} />);

      // Send via Resend
      const resend = getResendClient();
      const { data, error } = await resend.emails.send({
        from: from ?? 'onboarding@resend.dev',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        replyTo: replyTo ?? undefined,
        scheduledAt: scheduledAt ?? undefined,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, emailId: data?.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
});
