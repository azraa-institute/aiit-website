import { useEffect, useState } from 'react';

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  done: boolean;
}

function diff(target: number): Countdown {
  const total = Math.max(0, target - Date.now());
  return {
    total,
    done: total <= 0,
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total / 3_600_000) % 24),
    minutes: Math.floor((total / 60_000) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}

/**
 * Live countdown to an ISO date string. Returns null when the target date is
 * missing or unparseable (e.g. a "to be announced" webinar).
 */
export function useCountdown(iso: string | null | undefined): Countdown | null {
  const target = iso ? Date.parse(iso) : NaN;
  const valid = !Number.isNaN(target);
  const [state, setState] = useState<Countdown | null>(valid ? diff(target) : null);

  useEffect(() => {
    if (!valid) {
      setState(null);
      return;
    }
    setState(diff(target));
    const id = window.setInterval(() => setState(diff(target)), 1000);
    return () => window.clearInterval(id);
  }, [target, valid]);

  return state;
}
