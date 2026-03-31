import * as React from 'react';
import { StudyReminderTemplate } from './study-reminder';
import { TaskSummaryTemplate } from './task-summary';
import { InfoDigestTemplate } from './info-digest';
import type { StudyReminderProps } from './study-reminder';
import type { TaskSummaryProps } from './task-summary';
import type { InfoDigestProps } from './info-digest';

export type TemplateKey = 'study-reminder' | 'task-summary' | 'info-digest';

export const TEMPLATES: Record<
  TemplateKey,
  {
    component: React.ComponentType<any>;
    description: string;
    requiredProps: string[];
  }
> = {
  'study-reminder': {
    component: StudyReminderTemplate,
    description:
      'Study session reminder with characters to review (Japanese Sensei)',
    requiredProps: ['studentName', 'lessonTopic', 'reviewItems'],
  },
  'task-summary': {
    component: TaskSummaryTemplate,
    description: 'Summary of completed and pending tasks',
    requiredProps: ['recipientName', 'period'],
  },
  'info-digest': {
    component: InfoDigestTemplate,
    description:
      'General informational email with sections and optional CTA',
    requiredProps: ['recipientName', 'title', 'sections'],
  },
};

export { StudyReminderTemplate, TaskSummaryTemplate, InfoDigestTemplate };
export type { StudyReminderProps, TaskSummaryProps, InfoDigestProps };
