import { useEffect } from 'react';
import './toast.css';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  /** ms before auto-dismiss; pass 0 to disable. */
  duration?: number;
}

export function Toast({ message, onDismiss, duration = 6000 }: ToastProps) {
  useEffect(() => {
    if (duration <= 0) return;
    const id = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(id);
  }, [onDismiss, duration]);

  return (
    <div className="toast" role="status">
      <span className="toast__message">{message}</span>
      <button type="button" className="toast__close" onClick={onDismiss} aria-label="Dismiss">
        <svg width="13" height="13" viewBox="0 0 15 15" aria-hidden="true">
          <path d="M3 3l9 9M12 3 3 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
