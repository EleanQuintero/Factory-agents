import { Text, Section, Heading, Hr } from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

export interface TaskSummaryProps {
  recipientName: string;
  period: string;
  completedTasks: Array<{
    title: string;
    completedAt?: string;
  }>;
  pendingTasks: Array<{
    title: string;
    dueDate?: string;
    priority?: 'high' | 'medium' | 'low';
  }>;
  summary?: string;
}

const priorityColors: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: '#3b1118', text: '#f87171', label: 'High' },
  medium: { bg: '#3b2e11', text: '#fbbf24', label: 'Medium' },
  low: { bg: '#11302a', text: '#34d399', label: 'Low' },
};

export function TaskSummaryTemplate({
  recipientName,
  period,
  completedTasks,
  pendingTasks,
  summary,
}: TaskSummaryProps) {
  const previewText = `Task Summary for ${period}: ${completedTasks.length} done, ${pendingTasks.length} pending`;

  return (
    <BaseLayout preview={previewText}>
      {/* Header */}
      <Section style={{ marginBottom: '24px' }}>
        <Heading
          as="h1"
          style={{
            color: '#e0e0e0',
            fontSize: '26px',
            fontWeight: 700,
            margin: '0 0 8px 0',
            lineHeight: '1.3',
          }}
        >
          Task Summary &#128203;
        </Heading>
        <Text
          style={{
            color: '#a0a0a0',
            fontSize: '15px',
            lineHeight: '1.6',
            margin: '0',
          }}
        >
          Hey {recipientName}, here&apos;s your overview for <strong style={{ color: '#c4b5fd' }}>{period}</strong>.
        </Text>
      </Section>

      {/* Summary note */}
      {summary && (
        <Section style={{ marginBottom: '24px' }}>
          <Text
            style={{
              backgroundColor: '#1a1a2e',
              border: '1px solid #2a2a4a',
              borderRadius: '8px',
              padding: '16px',
              color: '#c0c0c0',
              fontSize: '14px',
              lineHeight: '1.6',
              margin: '0',
            }}
          >
            {summary}
          </Text>
        </Section>
      )}

      {/* Stats row */}
      <Section style={{ marginBottom: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', padding: '0 6px 0 0' }}>
                <div
                  style={{
                    backgroundColor: '#0f2a1e',
                    border: '1px solid #1a4a32',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center' as const,
                  }}
                >
                  <Text style={{ color: '#34d399', fontSize: '28px', fontWeight: 700, margin: '0' }}>
                    {completedTasks.length}
                  </Text>
                  <Text style={{ color: '#6ee7b7', fontSize: '12px', fontWeight: 600, margin: '4px 0 0 0', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                    Completed
                  </Text>
                </div>
              </td>
              <td style={{ width: '50%', padding: '0 0 0 6px' }}>
                <div
                  style={{
                    backgroundColor: '#2a1a0f',
                    border: '1px solid #4a3218',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center' as const,
                  }}
                >
                  <Text style={{ color: '#fbbf24', fontSize: '28px', fontWeight: 700, margin: '0' }}>
                    {pendingTasks.length}
                  </Text>
                  <Text style={{ color: '#fcd34d', fontSize: '12px', fontWeight: 600, margin: '4px 0 0 0', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                    Pending
                  </Text>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Hr style={{ borderColor: '#2a2a2a', margin: '24px 0' }} />

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <Section style={{ marginBottom: '24px' }}>
          <Heading
            as="h2"
            style={{
              color: '#e0e0e0',
              fontSize: '18px',
              fontWeight: 600,
              margin: '0 0 12px 0',
            }}
          >
            &#9989; Completed
          </Heading>
          {completedTasks.map((task, index) => (
            <div
              key={index}
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid #1e1e1e',
                display: 'flex',
              }}
            >
              <Text
                style={{
                  color: '#a0a0a0',
                  fontSize: '14px',
                  margin: '0',
                  textDecoration: 'line-through',
                  lineHeight: '1.5',
                }}
              >
                {task.title}
                {task.completedAt && (
                  <span
                    style={{
                      color: '#606060',
                      fontSize: '12px',
                      marginLeft: '8px',
                    }}
                  >
                    {task.completedAt}
                  </span>
                )}
              </Text>
            </div>
          ))}
        </Section>
      )}

      {/* Pending tasks */}
      {pendingTasks.length > 0 && (
        <Section style={{ marginBottom: '24px' }}>
          <Heading
            as="h2"
            style={{
              color: '#e0e0e0',
              fontSize: '18px',
              fontWeight: 600,
              margin: '0 0 12px 0',
            }}
          >
            &#9203; Pending
          </Heading>
          {pendingTasks.map((task, index) => {
            const priority = task.priority ?? 'medium';
            const colors = priorityColors[priority];
            return (
              <div
                key={index}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid #1e1e1e',
                }}
              >
                <Text
                  style={{
                    color: '#e0e0e0',
                    fontSize: '14px',
                    margin: '0',
                    lineHeight: '1.5',
                  }}
                >
                  {task.title}
                  <span
                    style={{
                      display: 'inline-block',
                      backgroundColor: colors.bg,
                      color: colors.text,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      marginLeft: '8px',
                      verticalAlign: 'middle',
                    }}
                  >
                    {colors.label}
                  </span>
                  {task.dueDate && (
                    <span
                      style={{
                        color: '#606060',
                        fontSize: '12px',
                        marginLeft: '8px',
                      }}
                    >
                      Due: {task.dueDate}
                    </span>
                  )}
                </Text>
              </div>
            );
          })}
        </Section>
      )}

      <Hr style={{ borderColor: '#2a2a2a', margin: '24px 0 16px 0' }} />

      {/* Footer */}
      <Text
        style={{
          color: '#606060',
          fontSize: '12px',
          lineHeight: '1.5',
          textAlign: 'center' as const,
          margin: '0',
        }}
      >
        Stay focused, stay productive.
        <br />
        Generated by your task assistant.
      </Text>
    </BaseLayout>
  );
}
