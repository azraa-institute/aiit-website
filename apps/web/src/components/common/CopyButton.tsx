import { useState } from 'react';
import { cn } from '@/lib/cn';
import './copy-button.css';

interface IconProps {
  className?: string;
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 10.5V3.5a1 1 0 0 1 1-1h7" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface CopyButtonProps {
  value: string;
  /** Text next to the icon. Omit for an icon-only button (e.g. inside a table cell). */
  label?: string;
  copiedLabel?: string;
  /** Accessible name for an icon-only button; defaults to "Copy"/"Copied". */
  title?: string;
  className?: string;
}

/** A button that copies `value` to the clipboard and flips to a checkmark for 2s. Shared by every "copy this link/code/secret" spot across the site. */
export function CopyButton({ value, label, copiedLabel = 'Copied', title, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable, the value is still shown as selectable text */
    }
  }

  const iconOnly = !label;
  const accessibleLabel = copied ? copiedLabel : title ?? label ?? 'Copy';

  return (
    <button
      type="button"
      className={cn('copy-btn', iconOnly && 'copy-btn--icon-only', copied && 'is-copied', className)}
      onClick={copy}
      aria-label={iconOnly ? accessibleLabel : undefined}
      title={iconOnly ? accessibleLabel : undefined}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {label ? <span>{copied ? copiedLabel : label}</span> : null}
    </button>
  );
}
