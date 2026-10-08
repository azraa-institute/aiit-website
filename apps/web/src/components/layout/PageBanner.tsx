import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PageBannerProps {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  /**
   * .page-banner__title's default max-width (18ch) is tuned for a short
   * page name (About, FAQs, Shop) at this component's large display size --
   * fine there, but a long sentence-style title (Webinar's, pulled from
   * content and often 70-80+ characters) breaks into a wall of 1-2-word
   * lines instead. Pass 'wide' for that case rather than loosening the
   * default for every page.
   */
  titleWidth?: 'default' | 'wide';
}

/** The restrained header block for non-hero interior pages. */
export function PageBanner({ eyebrow, title, intro, titleWidth = 'default' }: PageBannerProps) {
  return (
    <header className="page-banner">
      <div className="container container--wide">
        {eyebrow && <p className="eyebrow page-banner__eyebrow">{eyebrow}</p>}
        <h1 className={cn('page-banner__title', titleWidth === 'wide' && 'page-banner__title--wide')}>{title}</h1>
        {intro && <p className="page-banner__intro">{intro}</p>}
      </div>
    </header>
  );
}
