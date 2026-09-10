import { useCountdown } from '@/lib/useCountdown';
import './countdown.css';

interface CountdownProps {
  startsAt: string | null;
  fallback?: string;
  compact?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Countdown display; renders `fallback` when no date is set. */
export function Countdown({ startsAt, fallback = 'Date to be announced', compact }: CountdownProps) {
  const c = useCountdown(startsAt);

  if (!c) {
    return (
      <p className={`countdown countdown--pending ${compact ? 'countdown--compact' : ''}`}>
        <span className="countdown__pending-dot" aria-hidden="true" />
        {fallback}
      </p>
    );
  }

  if (c.done) {
    return <p className="countdown countdown--pending">This session has started</p>;
  }

  const units: [string, number][] = [
    ['Days', c.days],
    ['Hours', c.hours],
    ['Minutes', c.minutes],
    ['Seconds', c.seconds],
  ];

  return (
    <div
      className={`countdown ${compact ? 'countdown--compact' : ''}`}
      role="timer"
      aria-label={`${c.days} days, ${c.hours} hours, ${c.minutes} minutes until the session begins`}
    >
      {units.map(([label, value], i) => (
        <div className="countdown__unit" key={label}>
          <span className="countdown__value">{pad(value)}</span>
          <span className="countdown__label">{label}</span>
          {i < units.length - 1 && <span className="countdown__sep" aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}
