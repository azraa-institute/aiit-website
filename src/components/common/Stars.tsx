import './stars.css';

interface StarsProps {
  value: number;
  count?: number;
  size?: number;
}

export function Stars({ value, count, size = 14 }: StarsProps) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className="stars" title={`${value.toFixed(1)} out of 5`}>
      <span className="stars__track" style={{ fontSize: size }}>
        <span className="stars__glyphs" aria-hidden="true">
          ★★★★★
        </span>
        <span className="stars__fill" style={{ width: `${pct}%` }} aria-hidden="true">
          ★★★★★
        </span>
      </span>
      <span className="stars__value">
        {value > 0 ? value.toFixed(1) : 'New'}
        {count ? <span className="stars__count"> ({count})</span> : null}
      </span>
    </span>
  );
}
