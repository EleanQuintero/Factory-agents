import { Text, Section, Heading, Link, Button, Hr } from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

export interface StudyReminderProps {
  studentName: string;
  lessonTopic: string;
  reviewItems: Array<{
    japanese: string;
    romaji: string;
    meaning?: string;
  }>;
  lastSessionDate?: string;
  nextGoal?: string;
  streakDays?: number;
  studyUrl?: string;
}

export function StudyReminderTemplate({
  studentName,
  lessonTopic,
  reviewItems,
  lastSessionDate,
  nextGoal,
  streakDays,
  studyUrl,
}: StudyReminderProps) {
  const previewText = `Time to review: ${lessonTopic} - ${reviewItems.length} items waiting for you`;

  return (
    <BaseLayout preview={previewText}>
      {/* Greeting with optional streak badge */}
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
          Hey {studentName}! {""}
          <span style={{ fontSize: '28px' }}>&#127804;</span>
        </Heading>
        {streakDays !== undefined && streakDays > 0 && (
          <Text
            style={{
              display: 'inline-block',
              backgroundColor: '#f59e0b',
              color: '#0f0f0f',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              margin: '0 0 16px 0',
            }}
          >
            &#128293; {streakDays}-day streak!
          </Text>
        )}
        <Text
          style={{
            color: '#a0a0a0',
            fontSize: '15px',
            lineHeight: '1.6',
            margin: '8px 0 0 0',
          }}
        >
          It&apos;s time for your Japanese study session! Let&apos;s keep the momentum going.
          {lastSessionDate && (
            <span> Your last session was on {lastSessionDate}.</span>
          )}
        </Text>
      </Section>

      <Hr style={{ borderColor: '#2a2a2a', margin: '24px 0' }} />

      {/* Lesson topic */}
      <Section style={{ marginBottom: '24px' }}>
        <Heading
          as="h2"
          style={{
            color: '#e0e0e0',
            fontSize: '18px',
            fontWeight: 600,
            margin: '0 0 8px 0',
          }}
        >
          Today&apos;s Focus
        </Heading>
        <Text
          style={{
            backgroundColor: '#1a1a2e',
            border: '1px solid #2a2a4a',
            borderRadius: '8px',
            padding: '16px',
            color: '#c4b5fd',
            fontSize: '16px',
            fontWeight: 600,
            margin: '0',
          }}
        >
          &#128218; {lessonTopic}
        </Text>
      </Section>

      {/* Review table */}
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
          Characters to Review
        </Heading>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderBottom: '2px solid #c4b5fd',
                  color: '#c4b5fd',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em',
                }}
              >
                Japanese
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderBottom: '2px solid #c4b5fd',
                  color: '#c4b5fd',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em',
                }}
              >
                Romaji
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderBottom: '2px solid #c4b5fd',
                  color: '#c4b5fd',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em',
                }}
              >
                Meaning
              </th>
            </tr>
          </thead>
          <tbody>
            {reviewItems.map((item, index) => (
              <tr key={index}>
                <td
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid #1e1e1e',
                    color: '#e0e0e0',
                    fontSize: '20px',
                  }}
                >
                  {item.japanese}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid #1e1e1e',
                    color: '#a0a0a0',
                    fontSize: '14px',
                  }}
                >
                  {item.romaji}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid #1e1e1e',
                    color: '#a0a0a0',
                    fontSize: '14px',
                  }}
                >
                  {item.meaning ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Next goal */}
      {nextGoal && (
        <Section style={{ marginBottom: '24px' }}>
          <Text
            style={{
              backgroundColor: '#0f2a1e',
              border: '1px solid #1a4a32',
              borderRadius: '8px',
              padding: '16px',
              color: '#6ee7b7',
              fontSize: '14px',
              lineHeight: '1.5',
              margin: '0',
            }}
          >
            <strong style={{ color: '#a7f3d0' }}>&#127919; Next Goal:</strong>{' '}
            {nextGoal}
          </Text>
        </Section>
      )}

      {/* CTA Button */}
      {studyUrl && (
        <Section style={{ textAlign: 'center' as const, marginTop: '32px' }}>
          <Button
            href={studyUrl}
            style={{
              backgroundColor: '#7c3aed',
              color: '#ffffff',
              padding: '14px 32px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Start Studying &#127804;
          </Button>
        </Section>
      )}

      <Hr style={{ borderColor: '#2a2a2a', margin: '32px 0 16px 0' }} />

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
        Keep going! Every kanji you learn brings you closer to fluency.
        <br />
        Sent with love from your Japanese Sensei.
      </Text>
    </BaseLayout>
  );
}
