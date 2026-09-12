import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import './button.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'link';
type Size = 'sm' | 'md' | 'lg';

interface BaseProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
  /** Show a trailing arrow that animates on hover. */
  arrow?: boolean;
  fullWidth?: boolean;
  /** Shows a spinner and implies disabled -- for an in-flight async action (e.g. form submit). */
  loading?: boolean;
}

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & { as?: 'button' };
type ButtonAsLink = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & { as: 'a'; href: string };
type ButtonAsRoute = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps | 'href'> & { as: 'link'; to: string };

type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsRoute;

function classes(
  variant: Variant,
  size: Size,
  arrow?: boolean,
  fullWidth?: boolean,
  loading?: boolean,
  extra?: string,
) {
  return cn(
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    arrow && 'btn--arrow',
    fullWidth && 'btn--block',
    loading && 'btn--loading',
    extra,
  );
}

const Arrow = () => (
  <svg className="btn__arrow" width="18" height="10" viewBox="0 0 18 10" aria-hidden="true">
    <path d="M12.5 1 17 5l-4.5 4M17 5H0" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

const Spinner = () => <span className="btn__spinner" aria-hidden="true" />;

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', children, className, arrow, fullWidth, loading, ...rest }, ref) => {
    const cls = classes(variant, size, arrow, fullWidth, loading, className);
    const content = (
      <>
        {loading && <Spinner />}
        <span className="btn__label">{children}</span>
        {arrow && !loading && <Arrow />}
      </>
    );

    if (rest.as === 'link') {
      const { to, as: _as, ...linkRest } = rest as ButtonAsRoute;
      return (
        <Link to={to} className={cls} ref={ref as React.Ref<HTMLAnchorElement>} {...linkRest}>
          {content}
        </Link>
      );
    }
    if (rest.as === 'a') {
      const { as: _as, ...anchorRest } = rest as ButtonAsLink;
      return (
        <a className={cls} ref={ref as React.Ref<HTMLAnchorElement>} {...anchorRest}>
          {content}
        </a>
      );
    }
    const { as: _as, disabled, ...buttonRest } = rest as ButtonAsButton;
    return (
      <button
        className={cls}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        ref={ref as React.Ref<HTMLButtonElement>}
        {...buttonRest}
      >
        {content}
      </button>
    );
  },
);

Button.displayName = 'Button';
