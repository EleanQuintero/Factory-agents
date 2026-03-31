import { Text, Section, Heading, Button, Hr } from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

export interface InfoDigestProps {
  recipientName: string;
  title: string;
  intro?: string;
  sections: Array<{
    heading: string;
    content: string;
    highlight?: boolean;
  }>;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}

export function InfoDigestTemplate({
  recipientName,
  title,
  intro,
  sections,
  ctaLabel,
  ctaUrl,
  footerNote,
}: InfoDigestProps) {
  const previewText = `${title} - Your latest digest`;

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
          {title}
        </Heading>
        <Text
          style={{
            color: '#a0a0a0',
            fontSize: '15px',
            lineHeight: '1.6',
            margin: '0',
          }}
        >
          Hey {recipientName}, here&apos;s what you need to know.
        </Text>
      </Section>

      {/* Intro */}
      {intro && (
        <Section style={{ marginBottom: '24px' }}>
          <Text
            style={{
              color: '#c0c0c0',
              fontSize: '14px',
              lineHeight: '1.7',
              margin: '0',
            }}
          >
            {intro}
          </Text>
        </Section>
      )}

      <Hr style={{ borderColor: '#2a2a2a', margin: '24px 0' }} />

      {/* Content sections */}
      {sections.map((section, index) => (
        <Section
          key={index}
          style={{
            marginBottom: '20px',
            ...(section.highlight
              ? {
                  borderLeft: '3px solid #7c3aed',
                  paddingLeft: '16px',
                }
              : {}),
          }}
        >
          <Heading
            as="h2"
            style={{
              color: '#e0e0e0',
              fontSize: '17px',
              fontWeight: 600,
              margin: '0 0 8px 0',
            }}
          >
            {section.heading}
          </Heading>
          <Text
            style={{
              color: section.highlight ? '#d0c0f0' : '#a0a0a0',
              fontSize: '14px',
              lineHeight: '1.7',
              margin: '0',
              ...(section.highlight
                ? {
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #2a2a4a',
                    borderLeft: 'none',
                    borderRadius: '0 8px 8px 0',
                    padding: '12px 16px',
                  }
                : {}),
            }}
          >
            {section.content}
          </Text>
        </Section>
      ))}

      {/* CTA Button */}
      {ctaLabel && ctaUrl && (
        <Section style={{ textAlign: 'center' as const, marginTop: '32px' }}>
          <Button
            href={ctaUrl}
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
            {ctaLabel}
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
        {footerNote ?? 'Curated by your personal digest assistant.'}
      </Text>
    </BaseLayout>
  );
}
