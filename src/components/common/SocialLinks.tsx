import type { ReactNode } from 'react';
import { SITE } from '@/data/site';
import { cn } from '@/lib/cn';
import './social-links.css';

const ICONS: Record<string, ReactNode> = {
  facebook: (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="currentColor">
      <path d="M13.5 21v-7.9h2.66l.4-3.09H13.5V8.02c0-.9.25-1.5 1.53-1.5h1.63V3.76c-.28-.04-1.25-.12-2.38-.12-2.36 0-3.97 1.44-3.97 4.08v2.29H7.64v3.09h2.7V21z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M23.5 7.2a3 3 0 0 0-2.11-2.12C19.5 4.55 12 4.55 12 4.55s-7.5 0-9.39.53A3 3 0 0 0 .5 7.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 4.8 3 3 0 0 0 2.11 2.12c1.89.53 9.39.53 9.39.53s7.5 0 9.39-.53a3 3 0 0 0 2.11-2.12A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-4.8ZM9.6 15.6V8.4l6.25 3.6Z" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.22-6.82-5.97 6.82H1.66l7.73-8.83L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.01 4.13H5.05Z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069Zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073Zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162Zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4Zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44Z" />
    </svg>
  ),
};

interface SocialLinksProps {
  className?: string;
  /** Accessible name for the group. */
  label?: string;
}

/** aiit.network's social channels, rendered as platform icons. */
export function SocialLinks({ className, label = 'AIIT on social media' }: SocialLinksProps) {
  return (
    <ul className={cn('social-links', className)} role="list" aria-label={label}>
      {SITE.social.map((s) => (
        <li key={s.label}>
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="social-links__link"
            data-platform={s.platform}
            aria-label={`AIIT on ${s.label}`}
          >
            {ICONS[s.platform] ?? s.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
