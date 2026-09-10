import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SectionProps {
  children: ReactNode;
  id?: string;
  as?: ElementType;
  tone?: 'paper' | 'ivory' | 'ink';
  size?: 'default' | 'lg' | 'tight';
  hairline?: boolean;
  className?: string;
}

/** Consistent vertical rhythm + tonal context. `tone="ink"` also flips tokens. */
export function Section({
  children,
  id,
  as: Tag = 'section',
  tone = 'paper',
  size = 'default',
  hairline = false,
  className,
}: SectionProps) {
  return (
    <Tag
      id={id}
      className={cn(
        'section',
        size === 'lg' && 'section--lg',
        size === 'tight' && 'section--tight',
        tone === 'ivory' && 'section--ivory',
        tone === 'ink' && 'section--ink on-ink',
        hairline && 'section--hairline-top',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: 'start' | 'center';
  className?: string;
  id?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'center',
  className,
  id,
}: SectionHeadingProps) {
  return (
    <div
      className={cn('section-heading', align === 'start' && 'section-heading--start', className)}
      data-reveal
    >
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="section-heading__title heading" id={id}>
        {title}
      </h2>
      {intro && <p className="section-heading__intro lead">{intro}</p>}
    </div>
  );
}
