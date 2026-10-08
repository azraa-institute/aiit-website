import './trust-bar.css';

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5 19.5 6.5V11.5C19.5 16 16.3 19.8 12 21C7.7 19.8 4.5 16 4.5 11.5V6.5L12 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8.75 12 11 14.25 15.25 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 3 5 13.5h5.5L10.5 21 19 10h-5.5L13 3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8.5" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 19c0-3 2.5-5.25 5.5-5.25S14.5 16 14.5 19" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16.5" cy="9.5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15 13.6c2.4.2 4.5 2.2 4.5 4.9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const ITEMS = [
  { Icon: ShieldIcon, title: 'Secure Payment', desc: 'Your information is protected' },
  { Icon: BoltIcon, title: 'Instant Access', desc: 'Get started immediately' },
  { Icon: PeopleIcon, title: 'Trusted by Learners', desc: 'Payments processed securely by our partners' },
];

/** The "Secure Payment / Instant Access / Trusted by Learners" trust strip under the payment-method picker. Purely informational -- renders regardless of which providers are actually configured. */
export function TrustBar() {
  return (
    <ul className="trust-bar">
      {ITEMS.map(({ Icon, title, desc }) => (
        <li key={title} className="trust-bar__item">
          <span className="trust-bar__icon" aria-hidden="true">
            <Icon />
          </span>
          <span className="trust-bar__text">
            <span className="trust-bar__title">{title}</span>
            <span className="trust-bar__desc">{desc}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
