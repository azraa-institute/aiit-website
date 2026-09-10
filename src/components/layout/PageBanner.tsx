import type { ReactNode } from 'react';

interface PageBannerProps {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
}

/** The restrained header block for non-hero interior pages. */
export function PageBanner({ eyebrow, title, intro }: PageBannerProps) {
  return (
    <header className="page-banner">
      <div className="container container--wide">
        {eyebrow && <p className="eyebrow page-banner__eyebrow">{eyebrow}</p>}
        <h1 className="page-banner__title">{title}</h1>
        {intro && <p className="page-banner__intro">{intro}</p>}
      </div>
    </header>
  );
}
