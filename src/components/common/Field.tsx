import { useId, useState } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import './field.css';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (id: string) => ReactNode;
  className?: string;
}

function FieldShell({ label, hint, error, required, children, className }: FieldShellProps) {
  const id = useId();
  return (
    <div className={cn('field', error && 'field--error', className)}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children(id)}
      {hint && !error && <p className="field__hint">{hint}</p>}
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = { label: string; hint?: string; error?: string } & InputHTMLAttributes<HTMLInputElement>;

export function TextField({ label, hint, error, required, className, ...rest }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} className={className}>
      {(id) => <input id={id} className="field__control" required={required} {...rest} />}
    </FieldShell>
  );
}

/**
 * Password input with a show/hide toggle. Same API as TextField — the `type`
 * is managed internally, so callers pass everything except `type`.
 */
export function PasswordField({
  label,
  hint,
  error,
  required,
  className,
  type: _type,
  ...rest
}: TextFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} className={className}>
      {(id) => (
        <div className="field__password">
          <input
            id={id}
            className="field__control"
            required={required}
            {...rest}
            type={show ? 'text' : 'password'}
          />
          <button
            type="button"
            className="field__reveal"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? (
              <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <circle cx="10" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <path d="M3 3l14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <circle cx="10" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            )}
          </button>
        </div>
      )}
    </FieldShell>
  );
}

type TextAreaProps = { label: string; hint?: string; error?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ label, hint, error, required, className, ...rest }: TextAreaProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} className={className}>
      {(id) => (
        <textarea id={id} className="field__control field__control--area" rows={4} required={required} {...rest} />
      )}
    </FieldShell>
  );
}

type SelectFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
} & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField({ label, hint, error, required, options, className, ...rest }: SelectFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} className={className}>
      {(id) => (
        <div className="field__select-wrap">
          <select id={id} className="field__control" required={required} {...rest}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <svg className="field__chevron" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
            <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </div>
      )}
    </FieldShell>
  );
}
